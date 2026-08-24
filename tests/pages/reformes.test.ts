import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Reformes from "../../src/pages/reformes.astro";
import data from "../../content/reforms.json";
import { unescapeHtml } from "../helpers";

describe("Reforms page", () => {
  it("renders every reform card", async () => {
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Reformes));

    expect(html).toContain("Les grandes réformes");
    for (const r of (data as any).reforms as any[]) {
      expect(html).toContain(r.name_fr ?? r.name);
    }
  });
});
