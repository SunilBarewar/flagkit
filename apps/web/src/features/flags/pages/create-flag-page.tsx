import { FlaskConical, Plus, Sparkles, ToggleRight, Users } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const templates = [
  {
    icon: Plus,
    title: "Start from scratch",
    description: "Default settings, customize everything yourself",
  },
  {
    icon: ToggleRight,
    title: "Percentage rollout",
    description: "Roll out to a percentage of all users",
  },
  {
    icon: Users,
    title: "Targeted release",
    description: "Release to specific users or group segments",
  },
  {
    icon: Sparkles,
    title: "Multivariate",
    description: "Test multiple variants with different payloads",
  },
  {
    icon: FlaskConical,
    title: "Targeted multivariate",
    description: "Test variants for specific user or group segments",
  },
];

export function CreateFlagPage() {
  return (
    <>
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
        <Button asChild variant="outline" className="self-start">
          <Link to={paths.dashboard}>
            <ArrowLeft /> Back to feature flags
          </Link>
        </Button>

        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Create a feature flag</h1>
          <p className="text-muted-foreground">Choose a template or start from scratch</p>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="cursor-pointer text-center shadow-card transition-shadow [--card-spacing:--spacing(6)] hover:shadow-md"
            >
              <CardHeader className="justify-items-center gap-1.5">
                <div className="mb-2 flex size-14 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                  <Icon className="size-6" />
                </div>
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}
