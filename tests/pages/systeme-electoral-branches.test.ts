import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { unescapeHtml } from "../helpers";

const electoralPath = path.resolve(process.cwd(), "content/electoral-system.json");

describe("Electoral system page — branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock(electoralPath);
  });

  it("renders how_it_works steps, a flagged election and the election calendar", async () => {
    vi.doMock(electoralPath, () => ({
      default: {
        overview: { summary_fr: "Resume FR", summary_en: "Resume EN" },
        elections: [
          {
            id: "election-test",
            name_fr: "Election test FR",
            name_en: "Election test EN",
            system_fr: "Systeme FR",
            system_en: "Systeme EN",
            status: "needs-verification",
            elects_fr: "Elit FR",
            elects_en: "Elit EN",
            how_it_works: [
              { step_fr: "Etape FR", step_en: "Etape EN" },
              { rule_fr: "Regle etape FR", rule_en: "Regle etape EN" },
              "Etape brute",
            ],
            key_rules: [{ rule_fr: "Regle FR", rule_en: "Regle EN" }, "Regle brute"],
            frequency_years: 5,
            last_held: "2020",
            next_scheduled: "2025",
            recent_results_summary: { summary_fr: "Resultats FR", summary_en: "Resultats EN" },
          },
        ],
        election_calendar: [
          { election_fr: "Election calendrier FR", election_en: "Election calendar EN", year: "2030", note_fr: "Note FR", note_en: "Note EN" },
          { election: "Election brute", date: "2031", note: "Note brute" },
          { election: "Election sans note", date: "2032" },
        ],
      },
    }));

    const { default: SystemeElectoral } = await import("../../src/pages/systeme-electoral.astro");
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(SystemeElectoral));

    expect(html).toContain("Etape FR");
    expect(html).toContain("Regle etape FR");
    expect(html).toContain("Etape brute");
    expect(html).toContain("Election test FR");
    expect(html).toContain("Regle brute");
    expect(html).toContain("Election calendrier FR");
    expect(html).toContain("Election brute");
    expect(html).toContain("Note brute");
    expect(html).toContain("Election sans note");
  });
});
