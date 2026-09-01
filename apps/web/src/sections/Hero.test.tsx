import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";

import i18n from "../i18n/config.js";
import { SITE } from "../lib/site.js";
import { Hero } from "./Hero.js";

function renderHero() {
  return render(
    <I18nextProvider i18n={i18n}>
      <Hero />
    </I18nextProvider>,
  );
}

describe("Hero", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("introduces the name and role in the heading", () => {
    renderHero();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Hi, I am Joel Silva, Frontend Software Engineer",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(SITE.name)).toBeInTheDocument();
  });

  it("renders both calls to action", () => {
    renderHero();
    expect(screen.getByRole("link", { name: "See my work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download CV" })).toBeInTheDocument();
  });

  it("keeps the technology backdrop out of the accessibility tree", () => {
    const { container } = renderHero();
    const backdrop = container.querySelector(".tech-backdrop");
    expect(backdrop).not.toBeNull();
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    // The logos are CSS masks, so nothing decorative should surface as an image.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
