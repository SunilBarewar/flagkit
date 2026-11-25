import { KeyRound, LogOut } from "lucide-react";
import { useState } from "react";
import { ProjectPicker } from "@/components/layout/project-picker";
import { Button } from "@/components/ui/button";
import { ApiKeyDialog } from "@/features/projects/components/api-key-dialog";
import { useLogout } from "@/features/auth/hooks";

export function AppHeader() {
  const logout = useLogout();
  const [showKey, setShowKey] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-sidebar px-4">
      <ProjectPicker />

      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setShowKey(true)}>
          <KeyRound /> API key
        </Button>
        <Button variant="outline" aria-label="Log out" onClick={() => logout.mutate()}>
          <LogOut /> Logout
        </Button>
      </div>
      {showKey && <ApiKeyDialog onClose={() => setShowKey(false)} />}
    </header>
  );
}
