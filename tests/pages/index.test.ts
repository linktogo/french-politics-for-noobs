import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Index from "../../src/pages/index.astro";
import { unescapeHtml } from "../helpers";

describe("Home page", () => {
  it("renders the hero and every content section", async () => {
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Index));

    expect(html).toContain("La politique française");
    expect(html).toContain("Les partis politiques");
    expect(html).toContain("Les institutions");
    expect(html).toContain("Le système électoral");
    expect(html).toContain("La chronologie");
    expect(html).toContain("Les réformes");
    expect(html).toContain("Le glossaire");
  });
});
