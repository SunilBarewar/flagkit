import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSession } from "@/features/auth/session";
import { paths } from "./paths";

function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}


export function ProtectedRoute() {
  const { data: account, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (!account) return <Navigate to={paths.login} replace state={{ from: location }} />;
  return <Outlet />;
}

export function GuestRoute() {
  const { data: account, isPending } = useSession();

  if (isPending) return <FullPageSpinner />;
  if (account) return <Navigate to={paths.home} replace />;
  return <Outlet />;
}
