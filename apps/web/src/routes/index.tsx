import { Navigate, createBrowserRouter } from "react-router";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LoginPage } from "@/features/auth/pages/login-page";
import { SignupPage } from "@/features/auth/pages/signup-page";
import { LandingPage } from "@/features/landing/pages/landing-page";
import { CreateFlagPage } from "@/features/flags/pages/create-flag-page";
import { EditFlagPage } from "@/features/flags/pages/edit-flag-page";
import { TestFlagPage } from "@/features/flags/pages/test-flag-page";
import { FlagsPage } from "@/features/flags/pages/flags-page";
import { DashboardRedirect } from "@/features/projects/dashboard-redirect";
import { GuestRoute, ProtectedRoute } from "./guards";
import { paths } from "./paths";

export const router = createBrowserRouter([
  { path: paths.landing, element: <LandingPage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: paths.login, element: <LoginPage /> },
      { path: paths.signup, element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: paths.dashboard, element: <DashboardRedirect /> },
      {
        path: paths.projectPattern,
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="flags" replace /> },
          { path: "flags", element: <FlagsPage /> },
          { path: "flags/new", element: <CreateFlagPage /> },
          { path: "flags/:flagId", element: <EditFlagPage /> },
          { path: "flags/:flagId/test", element: <TestFlagPage /> },
        ],
      },
    ],
  },
]);
