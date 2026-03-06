import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Sparkles } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-24">
      <div className="absolute inset-0 bg-linear-to-b from-[#15052f] via-[#130825] to-[#060613]" />
      <div className="absolute inset-x-0 top-0 h-[520px] bg-radial-[ellipse_at_top] from-fuchsia-500/25 via-violet-500/15 to-transparent" />
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-[120px]" />
      <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />
      
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Build and run intelligent workflows</span>
          </div>

          <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            <span className="bg-linear-to-r from-fuchsia-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
              Agentic
            </span>{" "}
            <span className="text-white">Core</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
            Design automations, trigger executions, and manage credentials from one sleek workspace. 
            Connect your apps, automate your workflows, and scale your business.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2 bg-linear-to-r from-violet-500 to-fuchsia-500 px-8 text-white shadow-[0_12px_28px_rgba(168,85,247,0.35)] hover:from-violet-400 hover:to-fuchsia-400">
              <Link href="/register">
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 border-white/10 bg-black/20 text-white/90 hover:bg-white/10">
              <Link href="/workflows">
                <Play className="h-4 w-4" />
                Watch Demo
              </Link>
            </Button>
          </div>

          <div className="mt-12 flex items-center gap-8 text-sm text-white/65">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-[#120724] bg-linear-to-br from-violet-300 to-fuchsia-400"
                  />
                ))}
              </div>
              <span>10k+ builders</span>
            </div>
            <div className="hidden h-4 w-px bg-white/20 sm:block" />
            <span className="hidden sm:block">1M+ workflows executed</span>
          </div>
        </div>
      </div>
    </section>
  )
}
