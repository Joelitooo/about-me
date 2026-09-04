import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface FoundMeModalProps {
  open: boolean;
  onClose: () => void;
}

/** Tiny easter egg opened from the React mark in the hero backdrop. */
export function FoundMeModal({ open, onClose }: FoundMeModalProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="found-me-title"
        className="max-w-sm rounded-md border border-line bg-surface px-6 py-5 text-center text-ink"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="found-me-title" className="text-lg text-ink">
          {t("easterEgg.foundMe")}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="mt-4 inline-flex rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-semibold text-ink transition-[border-color,color] duration-150 hover:border-accent"
          onClick={onClose}
        >
          {t("easterEgg.close")}
        </button>
      </div>
    </div>
  );
}
