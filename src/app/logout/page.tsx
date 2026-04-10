import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/header";
import { Footer } from "@/components/home/footer";
import { getSession } from "@/server/better-auth/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LogoutPage() {
  const session = await getSession();
  // This route is a "logged out confirmation" page.
  // If the user still has an active session, send them away.
  if (session) {
    redirect("/");
  }

  return (
    <main className="bg-[#060610] text-white">
      <div className="relative">
        <Header isLoggedIn={false} />
      </div>

      <section className="py-20 pt-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/3 px-6 py-10 text-center backdrop-blur-sm">
            <h1 className="text-3xl font-semibold">You’ve been logged out</h1>
            <p className="text-base text-white/65">Your session has ended.</p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-8 py-3 font-semibold text-white no-underline transition hover:from-violet-400 hover:to-fuchsia-400"
              >
                Return to login
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/15 bg-black/20 px-8 py-3 font-semibold no-underline transition hover:bg-white/10"
              >
                Go to home
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
