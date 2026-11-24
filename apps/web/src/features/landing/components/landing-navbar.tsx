import { Flag } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { paths } from "@/routes/paths";

export function LandingNavbar() {
  const { data: account } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to={paths.landing} className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flag className="size-4" />
          </span>
          Flagkit
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {account ? (
            <Button asChild>
              <Link to={paths.dashboard}>Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to={paths.login}>Log in</Link>
              </Button>
              <Button asChild>
                <Link to={paths.signup}>Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
