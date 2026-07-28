import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import { UmamiAnalytics } from "./components/UmamiAnalytics.js";
import "./i18n/config.js";
import "./index.css";
import { queryClient } from "./lib/queryClient.js";
import { router } from "./router.js";
import { ThemeProvider } from "./theme/ThemeProvider.js";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UmamiAnalytics />
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
