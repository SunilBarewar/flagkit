import { Flag, Gauge, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";

const highlights = [
  { icon: Zap, text: "Toggle features instantly, no deploys" },
  { icon: Gauge, text: "Roll out gradually to a percentage of users" },
  { icon: ShieldCheck, text: "Safe by default, with a kill switch" },
];

/** Split screen: a brand panel on the left, the auth form on the right (hidden on small screens). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:order-last">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flag className="size-4" />
          </span>
          Flagkit
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Flagkit · Feature flags, made simple
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative max-w-md space-y-4">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">
            Ship features with confidence.
          </h2>
          <p className="text-lg text-primary-foreground/80">
            Control who sees what, roll out gradually and turn things off in a click.
          </p>
        </div>

        <div className="relative my-10 rounded-2xl bg-card p-5 text-card-foreground shadow-xl ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">new_checkout</p>
              <p className="text-xs text-muted-foreground">Rolling out to 25% of users</p>
            </div>
            <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
              <span className="absolute right-1 size-4 rounded-full bg-white shadow" />
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/4 rounded-full bg-primary" />
          </div>
        </div>

        <ul className="relative space-y-3">
          {highlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
