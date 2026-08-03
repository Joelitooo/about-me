import type { ReactNode } from "react";

interface SectionHeaderProps {
  index: string;
  title: string;
  children: ReactNode;
  id: string;
  className?: string;
}

export function SectionHeader({ index, title, children, id, className = "" }: SectionHeaderProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 border-t border-line px-6 py-28 lg:px-10 lg:py-36 2xl:px-16 ${className}`}
    >
      <div className="grid gap-6 lg:grid-cols-[7rem_minmax(0,1fr)] lg:gap-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">{index}</p>
        <div>
          <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </section>
  );
}
