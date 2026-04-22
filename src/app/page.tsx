
import { getSession } from "@/server/better-auth/server";
import { CookieConsent } from "@/components/cookie-consent";
import { Header } from "@/components/header";
import { FeaturesSection } from "@/components/home/features-section";
import { Footer } from "@/components/home/footer";
import { HeroSection } from "@/components/home/hero-section";
import { IntegrationsSection } from "@/components/home/integrations-section";
import { StatsSection } from "@/components/home/stats-section";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="bg-[#060610] text-white">
      <div className="relative">
        <Header isLoggedIn={!!session} />
      </div>

      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <IntegrationsSection />

      {/* <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/3 px-6 py-8 text-center backdrop-blur-sm">
            <p className="text-base text-white/65">
              {session ? `Logged in as ${session.user?.name ?? "User"}` : "Ready to automate your first workflow?"}
            </p>
            {!session ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="rounded-full border border-white/15 bg-black/20 px-8 py-3 font-semibold no-underline transition hover:bg-white/10"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-8 py-3 font-semibold text-white no-underline transition hover:from-violet-400 hover:to-fuchsia-400"
                >
                  Sign up
                </Link>
              </div>
            ) : (
              <form>
                <button
                  className="rounded-full border border-white/15 bg-black/20 px-8 py-3 font-semibold no-underline transition hover:bg-white/10"
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
      </section> */}

      <Footer />
      <CookieConsent />
    </main>
  );
}
