import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthLayout } from "@/features/auth/components/auth-layout";

export function LoginPage() {
  return (
    <AuthLayout>
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
