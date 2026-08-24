import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Chronologie from "../../src/pages/chronologie.astro";
import data from "../../content/timeline.json";
import { unescapeHtml } from "../helpers";

describe("Timeline page", () => {
  it("renders the legend, filters and every event", async () => {
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Chronologie));

    expect(html).toContain("Chronologie politique");
    expect(html).toContain("Types d'événements");
    const events = (data as any).events as any[];
    expect(html).toContain(String(events.length));
    for (const ev of events) {
      expect(html).toContain(ev.title_fr);
    }
  });
});
