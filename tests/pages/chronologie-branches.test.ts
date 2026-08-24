import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { unescapeHtml } from "../helpers";

const timelinePath = path.resolve(process.cwd(), "content/timeline.json");

describe("Timeline page — branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock(timelinePath);
  });

  it("renders unmapped event types and a flagged event without political impact", async () => {
    vi.doMock(timelinePath, () => ({
      default: {
        events: [
          {
            date: "2010-01-01",
            type: "unmapped-type",
            title_fr: "Titre inconnu",
            title_en: "Unknown title",
            description_fr: "Description FR",
            description_en: "Description EN",
            status: "needs-verification",
          },
          {
            date: "2010-06-01",
            type: "unmapped-type",
            title_fr: "Titre inconnu 2",
            title_en: "Unknown title 2",
            description_fr: "Description FR 2",
            description_en: "Description EN 2",
          },
        ],
      },
    }));

    const { default: Chronologie } = await import("../../src/pages/chronologie.astro");
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Chronologie));

    expect(html).toContain("unmapped-type");
    expect(html).toContain("Titre inconnu");
  });
});
