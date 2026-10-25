import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import i18n from "../i18n/config.js";
import { Work } from "./Work.js";

function renderWork() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Work />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("Work", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the monorepo card linking to its page", () => {
    renderWork();
    expect(screen.getByRole("heading", { name: "Portfolio monorepo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore the monorepo/i })).toHaveAttribute(
      "href",
      "/monorepo",
    );
  });

  it("leaves the architecture graph to the monorepo page", () => {
    const { container } = renderWork();
    expect(container.querySelector(".react-flow")).toBeNull();
  });
});
