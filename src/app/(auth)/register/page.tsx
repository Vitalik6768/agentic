"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import Image from "next/image";

import { authClient } from "@/server/better-auth/client";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormData, string>>
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

    const result = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const errors: Partial<Record<keyof RegisterFormData, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RegisterFormData;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const signUpResult = await authClient.signUp.email({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message ?? "Failed to create account");
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
          Create an account
        </h1>
        <p className="mb-8 text-center text-sm text-white/60">
          Sign up to get started
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

{/* 
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-white/80">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`rounded-lg border bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none transition focus:ring-1 ${
                fieldErrors.name
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                  : "border-white/10 focus:border-purple-400 focus:ring-purple-400"
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-300">{fieldErrors.name}</p>
            )}
          </div>

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

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-white/80"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`rounded-lg border bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none transition focus:ring-1 ${
                fieldErrors.confirmPassword
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                  : "border-white/10 focus:border-purple-400 focus:ring-purple-400"
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-300">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-purple-600 px-4 py-2.5 font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form> */}

        <p className="mt-6 text-center text-sm text-white/60">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-purple-400 hover:text-purple-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
