#!/usr/bin/env node
// Fetches the National Assembly's open data (deputies + solemn/censure votes)
// and regenerates content/deputes.json and content/votes-assemblee.json.
//
// Usage:
//   node scripts/update-deputes-votes.mjs           run once and exit
//   node scripts/update-deputes-votes.mjs --watch   run once, then refresh on an interval
//
// Interval is configurable via UPDATE_INTERVAL_MS (defaults to 24h).
// Data source: https://data.assemblee-nationale.fr (Licence Ouverte / Open Licence)

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "..", "content");

const LEGISLATURE = "17";
const DEPUTES_CSV_URL = `https://data.assemblee-nationale.fr/static/openData/repository/${LEGISLATURE}/amo/deputes_actifs_csv_opendata/liste_deputes_excel.csv`;
const SCRUTINS_ZIP_URL = `https://data.assemblee-nationale.fr/static/openData/repository/${LEGISLATURE}/loi/scrutins/Scrutins.json.zip`;

// The AN also records thousands of routine amendment votes ("scrutin public
// ordinaire" / SPO). Those are too numerous and granular to surface per
// deputy, so only the meaningful ones are kept:
//   SPS = scrutin public solennel (final vote on the whole bill)
//   MOC = motion de censure (no-confidence motion)
const RELEVANT_VOTE_TYPES = new Set(["SPS", "MOC"]);

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const WATCH_INTERVAL_MS = Number(process.env.UPDATE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// The CSV is published as semicolon-delimited, Latin-1 (ISO-8859-1) encoded,
// with every field wrapped in double quotes. None of the AN's fields contain
// a literal semicolon, so a naive split is safe here.
function parseDeputesCsv(buffer) {
  const text = buffer.toString("latin1");
  const [, ...rows] = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const deputes = [];
  for (const row of rows) {
    const cols = row.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
    const [id, prenom, nom, region, departement, circonscription, profession, groupe, groupeAbrege] = cols;
    if (!id) continue;
    deputes.push({
      id: `PA${id}`,
      prenom,
      nom,
      region,
      departement,
      circonscription: circonscription ? Number(circonscription) : null,
      profession,
      groupe,
      groupe_abrege: groupeAbrege,
    });
  }
  return deputes;
}

function extractPositions(scrutin) {
  const groupesField = scrutin.ventilationVotes?.organe?.groupes?.groupe ?? [];
  const groupes = Array.isArray(groupesField) ? groupesField : [groupesField];
  const positions = {};
  const buckets = [
    ["pours", "pour"],
    ["contres", "contre"],
    ["abstentions", "abstention"],
    ["nonVotants", "nonVotant"],
  ];
  for (const groupe of groupes) {
    const decompte = groupe.vote?.decompteNominatif ?? {};
    for (const [key, label] of buckets) {
      const bucket = decompte[key];
      if (!bucket?.votant) continue;
      const votants = Array.isArray(bucket.votant) ? bucket.votant : [bucket.votant];
      for (const votant of votants) {
        if (votant.acteurRef) positions[votant.acteurRef] = label;
      }
    }
  }
  return positions;
}

function parseScrutinEntry(json) {
  const s = json.scrutin;
  const typeCode = s.typeVote?.codeTypeVote;
  if (!RELEVANT_VOTE_TYPES.has(typeCode)) return null;
  return {
    id: s.uid,
    numero: s.numero,
    date: s.dateScrutin,
    type: typeCode,
    type_libelle: s.typeVote?.libelleTypeVote ?? null,
    titre: s.titre ?? null,
    dossier: s.objet?.dossierLegislatif?.libelle ?? null,
    sort: s.sort?.code ?? null,
    synthese: {
      votants: Number(s.syntheseVote?.nombreVotants ?? 0),
      pour: Number(s.syntheseVote?.decompte?.pour ?? 0),
      contre: Number(s.syntheseVote?.decompte?.contre ?? 0),
      abstention: Number(s.syntheseVote?.decompte?.abstentions ?? 0),
    },
    positions: extractPositions(s),
  };
}

async function fetchScrutins() {
  const zipBuffer = await fetchBuffer(SCRUTINS_ZIP_URL);
  const zip = new AdmZip(zipBuffer);
  const votes = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !entry.entryName.endsWith(".json")) continue;
    let parsed;
    try {
      parsed = JSON.parse(entry.getData().toString("utf8"));
    } catch {
      continue; // skip a corrupt entry rather than aborting the whole update
    }
    const vote = parseScrutinEntry(parsed);
    if (vote) votes.push(vote);
  }
  votes.sort((a, b) => (a.date === b.date ? Number(a.numero) - Number(b.numero) : a.date < b.date ? -1 : 1));
  return votes;
}

async function writeJson(filename, data) {
  const filePath = join(CONTENT_DIR, filename);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`  wrote ${filePath}`);
}

export async function update() {
  console.log(`[${new Date().toISOString()}] Updating Assemblée nationale data (legislature ${LEGISLATURE})…`);

  const [deputesCsv, votes] = await Promise.all([fetchBuffer(DEPUTES_CSV_URL), fetchScrutins()]);
  const deputes = parseDeputesCsv(deputesCsv);
  const lastUpdated = new Date().toISOString();

  await writeJson("deputes.json", {
    _meta: {
      section: "deputes",
      legislature: LEGISLATURE,
      source: "https://data.assemblee-nationale.fr/acteurs/deputes-en-exercice",
      license: "Licence Ouverte / Open Licence",
      last_updated: lastUpdated,
    },
    deputes,
  });

  await writeJson("votes-assemblee.json", {
    _meta: {
      section: "votes-assemblee",
      legislature: LEGISLATURE,
      scope: "Scrutins solennels et motions de censure uniquement (hors scrutins publics ordinaires sur amendements)",
      source: "https://data.assemblee-nationale.fr/travaux-parlementaires/votes",
      license: "Licence Ouverte / Open Licence",
      last_updated: lastUpdated,
    },
    votes,
  });

  console.log(`Done: ${deputes.length} deputes, ${votes.length} votes.`);
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
