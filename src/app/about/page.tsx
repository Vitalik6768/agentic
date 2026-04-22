import type { Metadata } from "next";

import { Header } from "@/components/header";
import { Footer } from "@/components/home/footer";
import { CookieConsent } from "@/components/cookie-consent";
import { getSession } from "@/server/better-auth/server";

export const metadata: Metadata = {
  title: "About | Agentic Core",
  description: "Learn what Agentic Core is building and why.",
};

export default async function AboutPage() {
  const session = await getSession();

  return (
    <main className="bg-[#060610] text-white">
      <div className="relative">
        <Header isLoggedIn={!!session} />
      </div>

      <section className="relative overflow-hidden pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)]" />
        <div className="mx-auto max-w-6xl px-6 pb-14">
          <p className="text-sm font-semibold tracking-wide text-violet-200/90">About</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
            Build and run intelligent workflows.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base text-white/65 sm:text-lg">
            Agentic Core is an automation platform for teams that want reliable orchestration,
            expressive interfaces, and production-grade execution—built on a modern Next.js stack.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <h2 className="text-lg font-semibold">Our mission</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Help builders ship durable automation faster by combining workflows, credentials, and
              execution history into one coherent system.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <h2 className="text-lg font-semibold">Designed for production</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              We focus on safety rails, observability, and predictable behavior—so “it ran” means it
              actually ran, every time.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <h2 className="text-lg font-semibold">Built for teams</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              From simple prototypes to multi-step pipelines, Agentic Core aims to keep collaboration
              straightforward and changes auditable.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-transparent p-8">
            <h2 className="text-2xl font-semibold">What you can do here</h2>
            <ul className="mt-5 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
              <li className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
                Model and run workflows with repeatable execution semantics.
              </li>
              <li className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
                Manage credentials and permissions with clear boundaries.
              </li>
              <li className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
                Create interfaces for humans to trigger and review automation.
              </li>
              <li className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
                Inspect execution history to debug and iterate quickly.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <Footer />
      <CookieConsent />
    </main>
  );
}

