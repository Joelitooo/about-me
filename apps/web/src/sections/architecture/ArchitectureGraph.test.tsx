import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import i18n from "../../i18n/config.js";
import { mockReactFlow } from "../../test/mockReactFlow.js";
import { ThemeProvider } from "../../theme/ThemeProvider.js";
import { Work } from "../Work.js";

function renderWork() {
  return render(
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <div style={{ width: 800, height: 600 }}>
          <Work />
        </div>
      </I18nextProvider>
    </ThemeProvider>,
  );
}

describe("ArchitectureGraph", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    mockReactFlow();
  });

  it("keeps the case-study row and shows tunnel detail by default", () => {
    renderWork();

    expect(screen.getByRole("heading", { name: "Portfolio monorepo" })).toBeInTheDocument();
    expect(screen.getByText(/self-hosted fullstack portfolio/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View repo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View live" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Selected architecture detail" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing is port-forwarded on the home router/i)).toBeInTheDocument();
  });

  it("updates the detail panel when another node is selected", async () => {
    renderWork();

    const webNode = document.querySelector('.react-flow__node[data-id="web"]');
    expect(webNode).not.toBeNull();
    fireEvent.click(webNode!);

    expect(await screen.findByText(/static Vite build served by nginx/i)).toBeInTheDocument();
  });
});
