type UmamiTracker = {
  track: (name: string, data?: Record<string, string | number | boolean>) => void;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

/** Thin Umami wrapper — no-ops when the script is absent (local/dev/tests). */
export function trackEvent(name: string, data?: Record<string, string | number | boolean>): void {
  window.umami?.track(name, data);
}
