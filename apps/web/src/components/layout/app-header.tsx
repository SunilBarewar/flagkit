import { LogOut, Search, Settings, Sparkles } from "lucide-react";
import { ProjectPicker } from "@/components/layout/project-picker";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks";

export function AppHeader() {
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-40 grid h-14 grid-cols-[1fr_minmax(0,32rem)_1fr] items-center gap-4 border-b bg-sidebar px-4">
      <div className="flex items-center gap-2">
        <ProjectPicker />
      </div>

      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-card hover:bg-accent/50"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search this project</span>
        <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-xs font-medium">⌘K</kbd>
      </button>

      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Assistant">
          <Sparkles />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => logout.mutate()}>
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
