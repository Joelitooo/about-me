import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";

import i18n from "../i18n/config.js";
import { FoundMeModal } from "./FoundMeModal.js";

function renderModal(open: boolean, onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <I18nextProvider i18n={i18n}>
        <FoundMeModal open={open} onClose={onClose} />
      </I18nextProvider>,
    ),
  };
}

describe("FoundMeModal", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("stays out of the accessibility tree while closed", () => {
    renderModal(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the found-me copy when open", () => {
    renderModal(true);
    expect(screen.getByRole("dialog", { name: "Ha ha you found me!" })).toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const { onClose } = renderModal(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", () => {
    const { onClose } = renderModal(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
