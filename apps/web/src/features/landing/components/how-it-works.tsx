const steps = [
  {
    title: "Create a flag",
    description: "Pick a template or start from scratch, and give it a clear key.",
  },
  {
    title: "Choose who gets it",
    description: "Set a rollout percentage or target the users you care about.",
  },
  {
    title: "Check it in your app",
    description: "Ask Flagkit if a flag is on, and change your mind whenever you like.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-y bg-sidebar">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-muted-foreground">Three steps from idea to controlled release.</p>
        </div>

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
