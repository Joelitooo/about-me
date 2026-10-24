import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import i18n from "../../i18n/config.js";
import { Monorepo } from "../../routes/Monorepo.js";
import { mockReactFlow } from "../../test/mockReactFlow.js";
import { ThemeProvider } from "../../theme/ThemeProvider.js";

function renderMonorepo() {
  return render(
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/monorepo"]}>
          <div style={{ width: 800, height: 600 }}>
            <Monorepo />
          </div>
        </MemoryRouter>
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

  it("renders the monorepo page and shows tunnel detail by default", () => {
    renderMonorepo();

    expect(
      screen.getByRole("heading", { level: 1, name: "Portfolio monorepo" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/self-hosted fullstack portfolio/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View repo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to work/i })).toHaveAttribute("href", "/#work");
    expect(screen.getByText("packages/shared")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Selected architecture detail" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing is port-forwarded on the home router/i)).toBeInTheDocument();
  });

  it("updates the detail panel when another node is selected", async () => {
    renderMonorepo();

    const webNode = document.querySelector('.react-flow__node[data-id="web"]');
    expect(webNode).not.toBeNull();
    fireEvent.click(webNode!);

    expect(await screen.findByText(/static Vite build served by nginx/i)).toBeInTheDocument();
  });
});
