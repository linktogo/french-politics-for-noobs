import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Glossaire from "../../src/pages/glossaire.astro";
import glossaryData from "../../content/glossary.json";
import { unescapeHtml } from "../helpers";

describe("Glossary page", () => {
  it("renders every term with its category", async () => {
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Glossaire));

    expect(html).toContain("Glossaire politique");
    const terms = glossaryData.terms as any[];
    expect(html).toContain(`${terms.length} termes`);
    for (const term of terms) {
      expect(html).toContain(term.term_fr);
    }
  });
});
