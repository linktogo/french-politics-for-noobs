import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import SpectrumStrip from "../../src/components/SpectrumStrip.astro";

describe("SpectrumStrip", () => {
  it("renders every party node on the spectrum", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SpectrumStrip);

    expect(html).toContain("Spectre politique");
    expect(html).toContain("data-id=\"rn\"");
    expect(html).toContain("data-id=\"lfi\"");
    expect(html).toContain("data-id=\"renaissance\"");
    expect(html).toContain("data-id=\"lr\"");
    expect(html).toContain("data-id=\"ps\"");
    expect(html).toContain("data-id=\"modem\"");
    expect(html).toContain("data-id=\"pcf\"");
    expect(html).toContain("data-id=\"eelv\"");
    expect(html).toContain("data-id=\"horizons\"");
    expect(html).toContain("data-id=\"reconquete\"");
  });
});
