import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthLayout } from "@/features/auth/components/auth-layout";

export function SignupPage() {
  return (
    <AuthLayout>
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
