"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { authClient } from "@/server/better-auth/client";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LoginFormData, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      // better-auth typically returns a URL to redirect the browser to.
      // If it auto-redirects in your version, this call is still safe.
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });

      // If a URL is provided, navigate explicitly.
      const url =
        (result as unknown as { url?: string; data?: { url?: string } })?.data
          ?.url ??
        (result as unknown as { url?: string; data?: { url?: string } })?.url;

      if (url) {
        window.location.assign(url);
      }
    } catch {
      setError("Failed to sign in with Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const errors: Partial<Record<keyof LoginFormData, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormData;

        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      setLoading(false);
      return;
      
    }

    try {
      const signInResult = await authClient.signIn.email({
        email: result.data.email,
        password: result.data.password,
      });

      if (signInResult.error) {
        setError(signInResult.error.message ?? "Failed to sign in");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-[#2e026d] to-[#15162c] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/10 p-8 shadow-xl backdrop-blur-sm">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">
          Welcome back
        </h1>
        <p className="mb-8 text-center text-sm text-white/60">
          Sign in to your account to continue
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer"
        >
          <Image
            src="/logos/google.svg"
            alt=""
            width={18}
            height={18}
            className="shrink-0"
            aria-hidden
          />
          <span>{googleLoading ? "Redirecting..." : "Continue with Google"}</span>
        </button>

        {/* <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div> */}

        {/* <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`rounded-lg border bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none transition focus:ring-1 ${
                fieldErrors.email
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                  : "border-white/10 focus:border-purple-400 focus:ring-purple-400"
              }`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-300">{fieldErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-white/80"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`rounded-lg border bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none transition focus:ring-1 ${
                fieldErrors.password
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                  : "border-white/10 focus:border-purple-400 focus:ring-purple-400"
              }`}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-300">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-purple-600 px-4 py-2.5 font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form> */}

        {/* Registration is temporarily disabled */}
      </div>
    </main>
  );
}
