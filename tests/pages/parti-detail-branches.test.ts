import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import PartyDetail from "../../src/pages/partis/[id].astro";
import { unescapeHtml } from "../helpers";

const baseIdentity = {
  full_name_fr: "Parti Fictif",
  full_name_en: "Fictional Party",
  abbreviation: "PF / Fictif",
  founded: 2000,
  color: "#123456",
  position_on_spectrum_fr: "Centre",
  position_on_spectrum_en: "Centre",
};

async function render(party: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return unescapeHtml(await container.renderToString(PartyDetail, { props: { party } }));
}

describe("Party detail page — branch coverage", () => {
  it("renders only the identity header when every optional section is absent", async () => {
    const html = await render({ identity: baseIdentity });

    expect(html).toContain("Parti Fictif");
    expect(html).not.toContain("Idéologie et valeurs");
    expect(html).not.toContain("Historique");
    expect(html).not.toContain("Figures clés");
    expect(html).not.toContain("Bilan législatif");
    expect(html).not.toContain("Programme 2027");
  });

  it("renders ideology (EU position only), a flagged timeline, key figures and legislative notes", async () => {
    const html = await render({
      identity: baseIdentity,
      ideology: {
        core_values_fr: ["Valeur A"],
        core_values_en: ["Value A"],
        eu_position_fr: "Position EU FR",
        eu_position_en: "EU position EN",
      },
      history: {
        timeline: [
          { year: 2001, event_fr: "Evenement 1", event_en: "Event 1", status: "needs-verification" },
          { year: 2002, event_fr: "Evenement 2", event_en: "Event 2" },
        ],
      },
      key_figures: [
        {
          name: "Figure Un",
          role_fr: "Role FR",
          role_en: "Role EN",
          is_leader: true,
          status: "needs-verification",
          note_fr: "Note FR",
          note_en: "Note EN",
        },
        { name: "Figure Deux", role_fr: "Role FR 2", role_en: "Role EN 2" },
      ],
      legislative_record: {
        note_fr: "Bilan FR",
        note_en: "Bilan EN",
        parliamentary_positions: [
          { subject_fr: "Sujet 1", subject_en: "Subject 1", position_fr: "Pour", position_en: "For", status: "needs-verification" },
          { subject_fr: "Sujet 2", subject_en: "Subject 2", position_fr: "Contre", position_en: "Against" },
        ],
      },
    });

    expect(html).toContain("Position EU FR");
    expect(html).not.toContain("Tensions internes");
    expect(html).toContain("Evenement 1");
    expect(html).toContain("Evenement 2");
    expect(html).toContain("Figure Un");
    expect(html).toContain("Note FR");
    expect(html).toContain("Figure Deux");
    expect(html).toContain("Bilan FR");
    expect(html).toContain("Sujet 1");
    expect(html).not.toContain("Reformes majeures");
  });

  it("renders ideology with internal tensions only (no EU position)", async () => {
    const html = await render({
      identity: baseIdentity,
      ideology: {
        core_values_fr: ["Valeur A"],
        core_values_en: ["Value A"],
        internal_tensions_fr: "Tensions FR",
        internal_tensions_en: "Tensions EN",
      },
    });

    expect(html).toContain("Tensions FR");
    expect(html).not.toContain("Position sur l'Europe");
  });

  it("renders ideology without core values (empty-array fallback)", async () => {
    const html = await render({
      identity: baseIdentity,
      ideology: {
        eu_position_fr: "Position EU FR",
        eu_position_en: "Position EU EN",
      },
    });

    expect(html).toContain("Position EU FR");
    expect(html).toContain("Valeurs fondamentales");
  });

  it("renders a history summary (no timeline) with a verification badge, major reforms and the full 2027 program", async () => {
    const html = await render({
      identity: baseIdentity,
      history_summary: {
        summary_fr: "Resume FR",
        summary_en: "Resume EN",
        status: "needs-verification",
      },
      legislative_record: {
        major_reforms_when_in_power: [{ year: 1999, reform_fr: "Reforme majeure" }],
      },
      program_2027: {
        note_fr: "Note programme FR",
        note_en: "Note programme EN",
        presidential_candidate_fr: "Candidat FR",
        presidential_candidate_en: "Candidate EN",
        key_policies: {
          status: "draft",
          immigration: {
            position_fr: ["Point A", "Point B"],
            position_en: ["Point A EN", "Point B EN"],
            status: "needs-verification",
          },
          economy: {
            position_fr: "Position économie FR",
            position_en: "Position economy EN",
          },
          enOnly: {
            position_en: ["Point EN seul"],
          },
          frOnlyList: {
            position_fr: ["Point FR liste seule"],
          },
          enOnlyString: {
            position_en: "Point EN seul texte",
          },
          frOnlyString: {
            position_fr: "Point FR seul texte",
          },
          foobar_fr: "Position foobar FR",
          foobar_en: "Position foobar EN",
          plainkey: "Position brute FR/EN",
          orphan_en: "Orphan EN sans FR",
          lonely_fr: "Lonely FR sans EN",
        },
        sources_for_verification: [
          "Voir https://example.com/source-officielle",
          "Source sans URL",
        ],
      },
    });

    expect(html).toContain("Resume FR");
    expect(html).toContain("Reforme majeure");
    expect(html).toContain("Candidat FR");
    expect(html).toContain("Point A");
    expect(html).toContain("Position économie FR");
    expect(html).toContain("Position foobar FR");
    expect(html).toContain("Position brute FR/EN");
    expect(html).toContain("Point EN seul");
    expect(html).toContain("Point FR liste seule");
    expect(html).toContain("Point EN seul texte");
    expect(html).toContain("Point FR seul texte");
    expect(html).toContain("Lonely FR sans EN");
    expect(html).toContain("https://example.com/source-officielle");
    expect(html).toContain("Source sans URL");
  });

  it("renders a history summary without a badge and a minimal 2027 program", async () => {
    const html = await render({
      identity: baseIdentity,
      history_summary: {
        summary_fr: "Resume FR 2",
        summary_en: "Resume EN 2",
      },
      program_2027: {
        note_fr: "Note FR",
        note_en: "Note EN",
      },
    });

    expect(html).toContain("Resume FR 2");
    expect(html).not.toContain("Candidat presidentiel");
    expect(html).not.toContain("Sources :");
  });
});
