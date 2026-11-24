import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LoginPage } from "@/features/auth/pages/login-page";
import { SignupPage } from "@/features/auth/pages/signup-page";
import { LandingPage } from "@/features/landing/pages/landing-page";
import { CreateFlagPage } from "@/features/flags/pages/create-flag-page";
import { FlagsPage } from "@/features/flags/pages/flags-page";
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
      {
        element: <DashboardLayout />,
        children: [
          { path: paths.dashboard, element: <FlagsPage /> },
          { path: paths.newFlag, element: <CreateFlagPage /> },
        ],
      },
    ],
  },
]);
