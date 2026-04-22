import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/better-auth";
import { LogOutIcon } from "lucide-react";

type HeaderProps = {
  isLoggedIn: boolean;
};

export const Header = ({ isLoggedIn }: HeaderProps) => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/35 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.9)]" />
          Agentic
        </Link>

        <nav className="flex items-center gap-2">
          {!isLoggedIn ? (
            <>
              <Link
                href="/login"
                className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold text-white/90 no-underline transition hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:from-violet-400 hover:to-fuchsia-400"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>

              <form>
                <button
                  className="inline-flex items-center gap-2 px-2 py-2 text-sm font-semibold text-white/85 transition hover:text-white"
                  formAction={async () => {
                    "use server";
                    await auth.api.signOut({
                      headers: await headers(),
                    });
                    redirect("/logout");
                  }}
                >
                  <LogOutIcon className="size-4" />
                  Logout
                </button>
              </form>
              <Link
                href="/workflows"
                className="rounded-full border border-violet-300/30 bg-violet-500/90 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:-translate-y-0.5 hover:bg-violet-400"
              >
                Dashboard
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};