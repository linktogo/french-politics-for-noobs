import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { unescapeHtml } from "../helpers";

const institutionsPath = path.resolve(process.cwd(), "content/institutions.json");

describe("Institutions page — branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock(institutionsPath);
  });

  it("renders an unmapped branch, a flagged institution and a minimal legislative step", async () => {
    vi.doMock(institutionsPath, () => ({
      default: {
        institutions: [
          {
            branch: "unmapped-branch",
            name_fr: "Institution Fictive",
            name_en: "Fictional Institution",
            role_fr: "Role FR",
            role_en: "Role EN",
            status: "needs-verification",
            composition: { members: 10, title_fr: "Titre FR" },
          },
        ],
        legislative_process: {
          steps: [
            { step_fr: "Etape 1", step_en: "Step 1" },
            { name_fr: "Etape 2", name_en: "Step 2" },
            { title_fr: "Etape 3", title_en: "Step 3" },
            { step_fr: "Etape 4", step_en: "Step 4", detail_fr: "Detail FR", detail_en: "Detail EN" },
          ],
        },
      },
    }));

    const { default: Institutions } = await import("../../src/pages/institutions.astro");
    const container = await AstroContainer.create();
    const html = unescapeHtml(await container.renderToString(Institutions));

    expect(html).toContain("unmapped-branch");
    expect(html).toContain("Institution Fictive");
    expect(html).toContain("Etape 1");
    expect(html).toContain("Etape 2");
    expect(html).toContain("Etape 3");
    expect(html).toContain("Titre FR");
    expect(html).toContain("Detail FR");
  });
});
