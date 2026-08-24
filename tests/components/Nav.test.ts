import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Nav from "../../src/components/Nav.astro";

describe("Nav", () => {
  it("renders all nav items and highlights the current path", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Nav, {
      request: new Request("https://example.com/partis"),
    });

    expect(html).toContain("Partis");
    expect(html).toContain("Institutions");
    expect(html).toContain("bg-civic-800/60");
  });

  it("renders the inactive style when path does not match any nav item", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Nav, {
      request: new Request("https://example.com/"),
    });

    expect(html).toContain("text-amber-100/70");
  });
});
