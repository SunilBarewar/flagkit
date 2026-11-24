import { FlaskConical, Gauge, KeyRound, ShieldCheck, ToggleRight, Users } from "lucide-react";

const features = [
  {
    icon: ToggleRight,
    title: "Instant toggles",
    description: "Turn features on or off in a click. Changes apply without a deploy.",
  },
  {
    icon: Gauge,
    title: "Percentage rollouts",
    description: "Release to 5% of users, watch what happens, then keep going.",
  },
  {
    icon: Users,
    title: "Targeted releases",
    description: "Show a feature to specific users or groups before everyone else.",
  },
  {
    icon: FlaskConical,
    title: "Multivariate flags",
    description: "Test multiple variants side by side and find out which one wins.",
  },
  {
    icon: KeyRound,
    title: "Projects and API keys",
    description: "Keep products separate, each with its own flags and its own key.",
  },
  {
    icon: ShieldCheck,
    title: "A kill switch",
    description: "If something goes wrong, switch it off right away and stay calm.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to release safely
        </h2>
        <p className="mt-4 text-muted-foreground">
          Simple controls for the whole life of a feature, from first test to full launch.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border bg-card p-6 shadow-card transition-shadow hover:shadow-md"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
              <Icon className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
