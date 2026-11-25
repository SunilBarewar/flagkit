import { Info } from "lucide-react";

interface CardProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

export function Card({ title, hint, children }: CardProps) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        {title}
        {hint && (
          <Info className="size-4 text-muted-foreground" aria-label={hint}>
            <title>{hint}</title>
          </Info>
        )}
      </h2>
      {children}
    </section>
  );
}
