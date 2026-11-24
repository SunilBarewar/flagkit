import { createBrowserRouter } from "react-router";
import { LoginPage } from "@/features/auth/pages/login-page";
import { SignupPage } from "@/features/auth/pages/signup-page";
import { CreateFlagPage } from "@/pages/create-flag-page";
import { GuestRoute, ProtectedRoute } from "./guards";
import { paths } from "./paths";

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: paths.login, element: <LoginPage /> },
      { path: paths.signup, element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [{ path: paths.home, element: <CreateFlagPage /> }],
  },
]);
