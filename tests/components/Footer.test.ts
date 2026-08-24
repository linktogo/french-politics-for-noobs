import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Footer from "../../src/components/Footer.astro";

describe("Footer", () => {
  it("renders the site sections and brand copy", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer);

    expect(html).toContain("La politique Française pour les nuls");
    expect(html).toContain("Partis politiques");
    expect(html).toContain("Glossaire");
  });
});
