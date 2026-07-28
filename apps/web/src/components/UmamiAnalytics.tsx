import { useEffect } from "react";

const SCRIPT_DATASET_FLAG = "umamiPortfolio";

/**
 * Loads the self-hosted Umami tracker when VITE_UMAMI_URL and
 * VITE_UMAMI_WEBSITE_ID are both set. No-op otherwise.
 *
 * Umami's script listens to History API changes, so React Router
 * navigations are recorded as pageviews without extra wiring.
 */
export function UmamiAnalytics() {
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_UMAMI_URL?.replace(/\/$/, "");
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

    if (!baseUrl || !websiteId) {
      return;
    }

    if (document.querySelector(`script[${SCRIPT_DATASET_FLAG}]`)) {
      return;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.src = `${baseUrl}/script.js`;
    script.dataset.websiteId = websiteId;
    script.setAttribute(SCRIPT_DATASET_FLAG, "true");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
