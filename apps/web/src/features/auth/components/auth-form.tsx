import { zodResolver } from "@hookform/resolvers/zod";
import { CredentialsBody } from "@flagkit/shared/schemas";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paths } from "@/routes/paths";
import { useAuthMutation } from "@/features/auth/hooks";
import type { AuthMode } from "@/features/auth/hooks";

const copy = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to manage your feature flags",
    submit: "Log in",
    switchText: "Don't have an account?",
    switchLink: "Sign up",
    switchTo: paths.signup,
  },
  signup: {
    title: "Create your account",
    subtitle: "Start shipping features safely in minutes",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Log in",
    switchTo: paths.login,
  },
} as const;

export function AuthForm({ mode }: { mode: AuthMode }) {
  const text = copy[mode];
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsBody>({ resolver: zodResolver(CredentialsBody) });

  const mutation = useAuthMutation(mode);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{text.title}</h1>
        <p className="text-muted-foreground">{text.subtitle}</p>
      </div>

      <form
        onSubmit={handleSubmit((body) => mutation.mutate(body))}
        className="space-y-5"
        noValidate
      >
        {mutation.error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {mutation.error.message}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="h-10"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">Enter a valid email address</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="At least 8 characters"
              className="h-10 pr-10"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">Password must be at least 8 characters</p>
          )}
        </div>

        <Button type="submit" size="lg" className="h-10 w-full" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {text.submit}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {text.switchText}{" "}
        <Link to={text.switchTo} className="font-medium text-primary hover:underline">
          {text.switchLink}
        </Link>
      </p>
    </div>
  );
}
