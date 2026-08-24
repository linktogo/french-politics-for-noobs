import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Layout from "../../src/layouts/Layout.astro";

describe("Layout", () => {
  it("renders the default description when none is provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Layout, {
      props: { title: "Accueil" },
      slots: { default: "<p>Contenu</p>" },
    });

    expect(html).toContain("Accueil — La politique Française pour les nuls");
    expect(html).toContain("Comprendre la politique française, sans parti pris.");
    expect(html).toContain("<p>Contenu</p>");
  });

  it("renders a custom description when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Layout, {
      props: { title: "Glossaire", description: "Description personnalisée" },
      slots: { default: "<p>Slot</p>" },
    });

    expect(html).toContain("Description personnalisée");
  });
});
