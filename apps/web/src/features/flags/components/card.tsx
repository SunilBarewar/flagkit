import { InfoTip } from "@/components/ui/info-tip";

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
        {hint && <InfoTip>{hint}</InfoTip>}
      </h2>
      {children}
    </section>
  );
}
