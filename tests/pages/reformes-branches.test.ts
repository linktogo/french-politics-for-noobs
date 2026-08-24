import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { unescapeHtml } from "../helpers";

const reformsPath = path.resolve(process.cwd(), "content/reforms.json");

describe("Reforms page — branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock(reformsPath);
  });

  it("renders a minimal reform (no context, changes, perspectives or status) and one with plain fallbacks", async () => {
    vi.doMock(reformsPath, () => ({
      default: {
        reforms: [
          {
            area: "retraites",
            date_enacted: "2020",
            president: "President X",
            prime_minister: "PM Y",
            name: "Reforme sans nom FR",
          },
          {
            area: "unmapped-area",
            date_enacted: "2021",
            president: "President X",
            prime_minister: "PM Y",
            name_fr: "Reforme complete FR",
            name_en: "Complete reform EN",
            status: "needs-verification",
            controversy_level: "unmapped-level",
            context: "Contexte brut",
            what_changed: ["Changement brut"],
            perspectives: {
              supporters: "Soutien brut",
              opponents: "Opposition brute",
            },
            current_status: "Statut brut",
          },
        ],
      },
    }));

    const { default: Reformes } = await import("../../src/pages/reformes.astro");
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Reformes));

    expect(html).toContain("Reforme sans nom FR");
    expect(html).toContain("Reforme complete FR");
    expect(html).toContain("unmapped-area");
    expect(html).toContain("unmapped-level");
    expect(html).toContain("Contexte brut");
    expect(html).toContain("Changement brut");
    expect(html).toContain("Soutien brut");
    expect(html).toContain("Opposition brute");
    expect(html).toContain("Statut brut");
  });
});
