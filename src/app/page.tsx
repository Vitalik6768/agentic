import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";
import { Header } from "@/components/header";

export default async function Home() {
  const session = await getSession();

  return (
    // <HydrateClient>
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-linear-to-b from-[#1a103f] via-[#1b1742] to-[#090c1e] pt-16 text-white">
        <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-cyan-400/15 blur-[120px]" />
        <Header isLoggedIn={!!session} />
        <div className="container relative z-10 flex flex-col items-center justify-center gap-10 px-4 py-16">
          <div className="rounded-full border border-white/20 bg-white/8 px-4 py-1 text-sm text-white/90 backdrop-blur-sm">
            Build and run intelligent workflows
          </div>
          <h1 className="text-center text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            <span className="bg-linear-to-r from-fuchsia-300 via-violet-300 to-cyan-200 bg-clip-text text-transparent">
              Agentic
            </span>{" "}
            App
          </h1>
          <p className="max-w-2xl text-center text-lg text-white/80">
            Design automations, trigger executions, and manage credentials from one sleek workspace.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-2xl border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15"
              href="https://create.t3.gg/en/usage/first-steps"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">First Steps →</h3>
              <div className="text-lg text-white/85">
                Just the basics - Everything you need to know to set up your
                database and authentication.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-2xl border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15"
              href="https://create.t3.gg/en/introduction"
              target="_blank"
            >

              <h3 className="text-2xl font-bold">Documentation →</h3>
              <div className="text-lg text-white/85">
                Learn more about Create T3 App, the libraries it uses, and how
                to deploy it.
              </div>
            </Link>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-5 backdrop-blur-sm">
            <p className="text-2xl text-white">
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-center text-xl text-white">
                {session && <span>Logged in as {session.user?.name}</span>}
              </p>
              {!session ? (
                <div className="flex gap-4">
                  <Link
                    href="/login"
                    className="rounded-full border border-white/25 bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-10 py-3 font-semibold no-underline transition hover:from-violet-400 hover:to-fuchsia-400"
                  >
                    Sign up
                  </Link>
                </div>
              ) : (
                <form>
                  <button
                    className="rounded-full border border-white/25 bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                    formAction={async () => {
                      "use server";
                      await auth.api.signOut({
                        headers: await headers(),
                      });
                      redirect("/");
                    }}
                  >
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>
  );
}
