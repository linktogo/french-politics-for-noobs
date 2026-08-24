import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { unescapeHtml } from "../helpers";

const othersPath = path.resolve(process.cwd(), "content/parties/others.json");

describe("Parties index page — branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock(othersPath);
  });

  it("renders the current leader when identity.current_leader_fr is set", async () => {
    vi.doMock(othersPath, () => ({
      default: {
        parties: [
          {
            party_id: "eelv",
            identity: {
              full_name_fr: "Parti Fictif",
              full_name_en: "Fictional Party",
              abbreviation: "PF",
              founded: 2000,
              color: "#00aa00",
              position_on_spectrum_fr: "Gauche",
              position_on_spectrum_en: "Left",
              current_leader_fr: "Jean Dupont.",
              current_leader_en: "John Doe.",
            },
          },
        ],
      },
    }));

    const { default: PartiesIndex } = await import("../../src/pages/partis/index.astro");
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(PartiesIndex));

    expect(html).toContain("Jean Dupont");
  });
});
