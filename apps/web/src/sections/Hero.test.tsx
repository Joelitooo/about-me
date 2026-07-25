import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";

import i18n from "../i18n/config.js";
import { Hero } from "./Hero.js";

describe("Hero", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the hero greeting", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Hero />
      </I18nextProvider>,
    );
    expect(screen.getByText(/hi, i'm/i)).toBeInTheDocument();
  });
});
