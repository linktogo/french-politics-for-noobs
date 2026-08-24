import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import SystemeElectoral from "../../src/pages/systeme-electoral.astro";
import data from "../../content/electoral-system.json";
import { unescapeHtml } from "../helpers";

describe("Electoral system page", () => {
  it("renders every election type and the calendar", async () => {
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(SystemeElectoral));

    expect(html).toContain("Le système électoral français");
    for (const el of (data as any).elections as any[]) {
      expect(html).toContain(el.name_fr);
    }
  });
});
