/**
 * Shared contracts used by both apps/web and apps/api.
 * Refined in later phases as real endpoints and events are defined.
 */

/** Payload submitted by the contact form (web) and validated by the API. */
export interface ContactMessageDto {
  name: string;
  email: string;
  message: string;
}

/** Supported UI locales. */
export type Locale = "en" | "pt" | "pl";

/** Lightweight analytics event shape (custom tracking alongside Umami). */
export interface TrackingEvent {
  name: string;
  path: string;
  timestamp: string; // ISO 8601
  locale?: Locale;
  metadata?: Record<string, string | number | boolean>;
}

/** Standard health-check response returned by the API. */
export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  uptimeSeconds: number;
}
