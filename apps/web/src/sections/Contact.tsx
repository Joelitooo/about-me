import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { postContactMessage } from "../lib/apiClient.js";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function Contact() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: postContactMessage,
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

  return (
    <section id="contact" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-3xl font-bold tracking-tight text-ink">{t("contact.title")}</h2>

        <form className="max-w-xl space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-ink">
              {t("contact.name")}
            </label>
            <input
              id="contact-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
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
              className="w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
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
              className="w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
              required
            />
          </div>

          {validationError ? (
            <p className="text-sm text-red-600" role="alert">
              {validationError === "email" ? t("contact.email") : t("contact.error")}
            </p>
          ) : null}
          {mutation.isSuccess ? (
            <p className="text-sm text-green-700" role="status">
              {t("contact.success")}
            </p>
          ) : null}
          {mutation.isError ? (
            <p className="text-sm text-red-600" role="alert">
              {t("contact.error")}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {t("contact.send")}
          </button>
        </form>
      </div>
    </section>
  );
}
