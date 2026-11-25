import { LogOut } from "lucide-react";
import { ProjectPicker } from "@/components/layout/project-picker";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks";

export function AppHeader() {
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-sidebar px-4">
      <ProjectPicker />

      <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => logout.mutate()}>
        <LogOut />
      </Button>
    </header>
  );
}
