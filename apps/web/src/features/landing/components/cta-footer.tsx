import { Flag } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground">
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 size-80 rounded-full bg-black/10 blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to ship with less worry?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
            Create your account and your first flag in a couple of minutes.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 h-11 px-6 text-base">
            <Link to={paths.signup}>Get started free</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Flag className="size-3.5" />
          </span>
          Flagkit
        </div>
        <p>Feature flags, made simple.</p>
      </div>
    </footer>
  );
}
