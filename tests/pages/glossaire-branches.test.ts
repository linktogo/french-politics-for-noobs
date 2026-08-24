import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { unescapeHtml } from "../helpers";

const glossaryPath = path.resolve(process.cwd(), "content/glossary.json");

describe("Glossary page — branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock(glossaryPath);
  });

  it("renders an unmapped category, a flagged term, examples and related terms", async () => {
    vi.doMock(glossaryPath, () => ({
      default: {
        terms: [
          {
            id: "terme-1",
            category: "unmapped-category",
            term_fr: "Terme Un",
            term_en: "Term One",
            definition_fr: "Definition FR",
            definition_en: "Definition EN",
            status: "needs-verification",
            example_fr: "Exemple FR",
            example_en: "Example EN",
            related_terms: ["terme-2"],
          },
          {
            id: "terme-2",
            category: "unmapped-category",
            term_fr: "Terme Deux",
            term_en: "Term Two",
            definition_fr: "Definition FR 2",
            definition_en: "Definition EN 2",
          },
        ],
      },
    }));

    const { default: Glossaire } = await import("../../src/pages/glossaire.astro");
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Glossaire));

    expect(html).toContain("unmapped-category");
    expect(html).toContain("Exemple FR");
    expect(html).toContain("Terme Deux");
  });
});
