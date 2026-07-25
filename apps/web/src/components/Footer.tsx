import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-ink/10 bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-ink-soft">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
