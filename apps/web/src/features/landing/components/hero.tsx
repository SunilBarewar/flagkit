import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";

const flags = [
  { key: "new_checkout", note: "Rolling out to 25% of users", on: true, percent: 25 },
  { key: "dark_mode", note: "Enabled for everyone", on: true, percent: 100 },
  { key: "ai_assistant", note: "Off, ready when you are", on: false, percent: 0 },
];

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${on ? "bg-primary" : "bg-input"}`}
    >
      <span
        className={`absolute size-4 rounded-full bg-white shadow transition-all ${on ? "right-1" : "left-1"}`}
      />
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-brand-soft blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
          <span className="size-1.5 rounded-full bg-primary" />
          Feature flags, made simple
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
          Ship features with <span className="text-primary">confidence</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Control who sees what, roll out gradually and turn anything off in a click. No redeploys,
          no stress.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-11 px-6 text-base">
            <Link to={paths.signup}>
              Get started free <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 px-6 text-base">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>

        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border bg-card p-3 text-left shadow-xl">
          <div className="space-y-2 rounded-xl bg-background p-3">
            {flags.map((flag) => (
              <div
                key={flag.key}
                className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium">{flag.key}</p>
                  <p className="text-xs text-muted-foreground">{flag.note}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${flag.percent}%` }}
                    />
                  </div>
                </div>
                <Toggle on={flag.on} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
