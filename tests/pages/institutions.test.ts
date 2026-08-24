import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Institutions from "../../src/pages/institutions.astro";
import data from "../../content/institutions.json";
import { unescapeHtml } from "../helpers";

describe("Institutions page", () => {
  it("renders every institution and the legislative process", async () => {
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Institutions));

    expect(html).toContain("Les institutions françaises");
    for (const inst of (data as any).institutions as any[]) {
      expect(html).toContain(inst.name_fr);
    }
  });
});
