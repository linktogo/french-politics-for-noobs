import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import PartiesIndex from "../../src/pages/partis/index.astro";
import { unescapeHtml } from "../helpers";

describe("Parties index page", () => {
  it("renders a card for every party on the spectrum", async () => {
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(PartiesIndex));

    expect(html).toContain("Les partis politiques");
    for (const id of ["pcf", "lfi", "eelv", "ps", "renaissance", "modem", "horizons", "lr", "rn", "reconquete"]) {
      expect(html).toContain(`partis/${id}`);
    }
  });
});
