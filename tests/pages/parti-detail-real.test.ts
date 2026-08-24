import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import PartyDetail, { getStaticPaths } from "../../src/pages/partis/[id].astro";
import { unescapeHtml } from "../helpers";

describe("Party detail page — real content", () => {
  it("exposes a static path for every party and renders each one", async () => {
    const paths = getStaticPaths();
    const ids = paths.map((p) => p.params.id);

    expect(ids).toEqual(
      expect.arrayContaining(["rn", "lfi", "renaissance", "lr", "ps", "modem", "eelv", "pcf", "horizons", "reconquete"])
    );

    const container = await AstroContainer.create();
    for (const { props } of paths) {
      const html = unescapeHtml(await container.renderToString(PartyDetail, { props }));
      expect(html).toContain((props as any).party.identity.full_name_fr);
    }
  });
});
