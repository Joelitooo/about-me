import { useMutation } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "../components/SectionHeader.js";
import { trackEvent } from "../lib/analytics.js";
import { postContactMessage } from "../lib/apiClient.js";
import { SITE } from "../lib/site.js";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function Contact() {
  const { t } = useTranslation();
  const errorId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<"required" | "email" | null>(null);

  const mutation = useMutation({
    mutationFn: postContactMessage,
    onSuccess: () => {
      trackEvent("contact_submit_success");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setValidationError("required");
      return;
    }
    if (!isValidEmail(email.trim())) {
      setValidationError("email");
      return;
    }

    mutation.mutate({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
  }

  const showError = validationError !== null || mutation.isError;
  const errorMessage =
    validationError === "email"
      ? t("contact.invalidEmail")
      : validationError === "required"
        ? t("contact.required")
        : mutation.isError
          ? t("contact.error")
          : null;

  const inputClassName =
    "w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none transition-[border-color] duration-150 focus-visible:border-accent";

  return (
    <SectionHeader id="contact" index="03 / CONTACT" title={t("contact.title")}>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-5">
          <p className="max-w-[40ch] text-lg leading-relaxed text-ink-soft">
            {t("contact.invite")}
          </p>
          <a
            href={`mailto:${SITE.email}`}
            className="inline-block font-mono text-sm text-accent transition-colors duration-150 hover:text-accent-hover"
          >
            {SITE.email}
          </a>
          <div className="flex flex-wrap gap-4 font-mono text-sm">
            <a
              href={SITE.links.github}
              target="_blank"
              rel="noreferrer"
              className="text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              GitHub
            </a>
            <a
              href={SITE.links.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-ink">
              {t("contact.name")}
            </label>
            <input
              id="contact-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              aria-invalid={validationError === "required"}
              aria-describedby={showError ? errorId : undefined}
              required
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-ink">
              {t("contact.email")}
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
              aria-invalid={validationError !== null}
              aria-describedby={showError ? errorId : undefined}
              required
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-ink">
              {t("contact.message")}
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className={inputClassName}
              aria-invalid={validationError === "required"}
              aria-describedby={showError ? errorId : undefined}
              required
            />
          </div>

          {errorMessage ? (
            <p id={errorId} className="text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {mutation.isSuccess ? (
            <p className="text-sm text-success" role="status">
              {t("contact.success")}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-on-accent transition-[background-color,color] duration-150 hover:bg-accent-hover disabled:opacity-60"
          >
            {t("contact.send")}
          </button>
        </form>
      </div>
    </SectionHeader>
  );
}
