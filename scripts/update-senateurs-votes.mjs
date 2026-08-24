#!/usr/bin/env node
// Fetches the Senate's open data (senators + public roll-call votes) and
// regenerates content/senateurs.json and content/votes-senat.json.
//
// Usage:
//   node scripts/update-senateurs-votes.mjs           run once and exit
//   node scripts/update-senateurs-votes.mjs --watch   run once, then refresh on an interval
//
// Interval is configurable via UPDATE_INTERVAL_MS (defaults to 24h).
// Data source: https://data.senat.fr (senators list) and https://www.senat.fr/scrutin-public/
// (vote results), both published under the Licence Ouverte / Open Licence.
//
// Unlike the National Assembly, the Senate does not publish a single bulk
// export of its roll-call votes: each "scrutin public" lives on its own page,
// with a small companion JSON holding the nominative results. Most Senate
// votes are taken by show of hands and never produce a "scrutin public" at
// all, so — unlike the Assemblée's SPS/MOC filter — every scrutin found here
// is already a meaningful, individually-recorded vote; none are filtered out.

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "..", "content");

const SENATEURS_CSV_URL = "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv";
const SCRUTIN_BASE_URL = "https://www.senat.fr/scrutin-public/";

// Senate composition changes gradually (partial renewal every 3 years), so
// there is no clean "legislature start" to anchor on the way there is for
// the Assemblée. Scoped to the current government sequence instead; bump
// this back if older votes are ever needed.
const MIN_YEAR = Number(process.env.SENATE_MIN_YEAR) || 2024;

const VOTE_LABELS = { p: "pour", c: "contre", a: "abstention", n: "nonVotant" };

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const WATCH_INTERVAL_MS = Number(process.env.UPDATE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

// The Senate serves votes.json per scrutin (one HTTP request each), so
// requests are capped to avoid hammering the server.
const FETCH_CONCURRENCY = 8;

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function fetchJsonOrNull(url) {
  const res = await fetch(url);
  if (!res.ok) return null; // a missing votes.json shouldn't abort the whole run
  return res.json();
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// senat.fr serves pages declared as UTF-8, but every accented character is
// written out as an HTML entity rather than a raw UTF-8 byte. Named entities
// below 256 follow the standard HTML4 Latin-1 order (nbsp=160 … yuml=255).
const LATIN1_ENTITY_NAMES =
  "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(
    " ",
  );
const ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  oelig: "œ",
  OElig: "Œ",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  ndash: "–",
  mdash: "—",
};
LATIN1_ENTITY_NAMES.forEach((name, i) => {
  ENTITY_MAP[name] = String.fromCodePoint(160 + i);
});

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => ENTITY_MAP[name] ?? match);
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// Minimal RFC4180-style CSV parser: handles quoted fields containing commas
// and "" as an escaped quote. The Senate's export needs this (unlike the
// Assemblée's semicolon CSV, its fields legitimately contain commas).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseSenateursCsv(buffer) {
  const text = buffer.toString("latin1");
  const rows = parseCsv(text).filter((row) => row.length > 1);
  // The export leads with a block of `% ...` comment lines describing the
  // SQL query that produced it; the real header is the first non-comment row.
  const headerIndex = rows.findIndex((row) => row[0] === "Matricule");
  if (headerIndex === -1) return [];
  const dataRows = rows.slice(headerIndex + 1);

  const senateurs = [];
  for (const row of dataRows) {
    const [
      matricule,
      civilite,
      nom,
      prenom,
      etat,
      ,
      ,
      groupe,
      ,
      commission,
      circonscription,
      fonctionBureau,
      email,
      ,
      categorieSocioprofessionnelle,
      profession,
    ] = row;
    if (!matricule || etat !== "ACTIF") continue;
    senateurs.push({
      id: matricule,
      civilite: civilite || null,
      nom,
      prenom,
      groupe: groupe || null,
      commission: commission || null,
      circonscription: circonscription || null,
      fonction_bureau: fonctionBureau || null,
      email: email && email.includes("@") ? email : null,
      categorie_socioprofessionnelle: categorieSocioprofessionnelle || null,
      profession: profession || null,
    });
  }
  return senateurs;
}

// Parses a year's listing page (e.g. scrutin-public/scr2025.html) into one
// entry per scrutin: metadata lives here, votes are fetched separately below.
function parseYearPage(html) {
  const entries = [];
  const items = html.split('<li class="list-group-item').slice(1);
  for (const item of items) {
    const dateMatch = item.match(/<div class="list-group-subtitle">([^<]*)<\/div>/);
    const date = dateMatch ? decodeEntities(dateMatch[1]).trim() : null;

    const blocks = item.match(/<p class="my-2">[\s\S]*?<\/p>/g) ?? [];
    for (const block of blocks) {
      const linkMatch = block.match(/<a href="([^"]+\.html)">Scrutin N&deg;(\d+)<\/a>/);
      if (!linkMatch) continue;
      const [, relUrl, numero] = linkMatch;

      const badgeMatch = block.match(/<span class="badge[^"]*">([^<]*)<\/span>/);
      const sort = badgeMatch ? decodeEntities(badgeMatch[1]).trim() : null;

      const dossierMatch = block.match(/<a href="(\/dossier-legislatif[^"]+)"/);
      const dossierUrl = dossierMatch ? `https://www.senat.fr${dossierMatch[1]}` : null;

      const titre = stripTags(block.replace(/<span class="badge[\s\S]*$/, ""))
        .replace(/^Scrutin N°\d+\s*:\s*/, "")
        .replace(/\s*-?\s*consulter le dossier législatif\s*\.?\s*$/, "")
        .trim();

      entries.push({
        id: relUrl.slice(relUrl.lastIndexOf("/") + 1).replace(/\.html$/, ""),
        numero: Number(numero),
        date,
        titre,
        dossier: dossierUrl,
        sort,
        jsonUrl: `${SCRUTIN_BASE_URL}${relUrl.replace(/\.html$/, ".json")}`,
      });
    }
  }
  return entries;
}

async function fetchYearScrutins(year) {
  let html;
  try {
    html = await fetchText(`${SCRUTIN_BASE_URL}scr${year}.html`);
  } catch {
    return []; // no page for that year (e.g. the current year hasn't started yet)
  }
  return parseYearPage(html);
}

function buildSynthese(votes) {
  const synthese = { votants: 0, pour: 0, contre: 0, abstention: 0 };
  for (const { vote } of votes) {
    if (vote === "p") synthese.pour++;
    else if (vote === "c") synthese.contre++;
    else if (vote === "a") synthese.abstention++;
    if (vote !== "n") synthese.votants++;
  }
  return synthese;
}

async function fetchScrutins() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = MIN_YEAR; year <= currentYear; year++) years.push(year);

  const perYear = await mapWithConcurrency(years, FETCH_CONCURRENCY, fetchYearScrutins);
  const scrutinMetas = perYear.flat();

  const votes = await mapWithConcurrency(scrutinMetas, FETCH_CONCURRENCY, async (meta) => {
    const data = await fetchJsonOrNull(meta.jsonUrl);
    if (!data?.votes) return null;
    const positions = {};
    for (const { matricule, vote } of data.votes) {
      if (matricule && VOTE_LABELS[vote]) positions[matricule] = VOTE_LABELS[vote];
    }
    return {
      id: meta.id,
      numero: meta.numero,
      date: meta.date,
      type: "scrutin public",
      titre: meta.titre || null,
      dossier: meta.dossier,
      sort: meta.sort,
      synthese: buildSynthese(data.votes),
      positions,
    };
  });

  return votes.filter(Boolean).sort((a, b) => (a.date === b.date ? a.numero - b.numero : (a.date ?? "") < (b.date ?? "") ? -1 : 1));
}

async function writeJson(filename, data) {
  const filePath = join(CONTENT_DIR, filename);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`  wrote ${filePath}`);
}

export async function update() {
  console.log(`[${new Date().toISOString()}] Updating Sénat data (from ${MIN_YEAR})…`);

  const [senateursCsv, votes] = await Promise.all([fetchBuffer(SENATEURS_CSV_URL), fetchScrutins()]);
  const senateurs = parseSenateursCsv(senateursCsv);
  const lastUpdated = new Date().toISOString();

  await writeJson("senateurs.json", {
    _meta: {
      section: "senateurs",
      source: "https://data.senat.fr/les-senateurs/",
      license: "Licence Ouverte / Open Licence",
      last_updated: lastUpdated,
    },
    senateurs,
  });

  await writeJson("votes-senat.json", {
    _meta: {
      section: "votes-senat",
      scope: `Scrutins publics du Sénat à partir de ${MIN_YEAR} (les votes à main levée, non enregistrés nominativement, ne sont pas publiés par le Sénat)`,
      source: "https://www.senat.fr/scrutin-public/",
      license: "Licence Ouverte / Open Licence",
      last_updated: lastUpdated,
    },
    votes,
  });

  console.log(`Done: ${senateurs.length} sénateurs, ${votes.length} votes.`);
}

function runOnce() {
  return update().catch((err) => {
    console.error("Update failed:", err);
    process.exitCode = 1;
  });
}

function main() {
  runOnce();

  if (process.argv.includes("--watch")) {
    console.log(`Watch mode enabled: refreshing every ${(WATCH_INTERVAL_MS / 3_600_000).toFixed(1)}h.`);
    const interval = setInterval(runOnce, WATCH_INTERVAL_MS);
    const shutdown = () => {
      clearInterval(interval);
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
