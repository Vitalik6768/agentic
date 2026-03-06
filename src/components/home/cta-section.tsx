import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Rocket } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-card/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Ready to automate your workflows?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started for free. No credit card required. Start building in minutes.
          </p>
          
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 px-8 text-white hover:from-purple-600 hover:to-pink-600">
              <Rocket className="h-4 w-4" />
              Start Building Free
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-border/60 bg-secondary/30 text-foreground hover:bg-secondary/50">
              <BookOpen className="h-4 w-4" />
              Read Documentation
            </Button>
          </div>
        </div>

        {/* Quick start cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <QuickStartCard
            title="First Steps"
            description="Everything you need to set up your database and authentication."
            href="/docs/getting-started"
          />
          <QuickStartCard
            title="Documentation"
            description="Learn about the platform, libraries, and how to deploy workflows."
            href="/docs"
          />
          <QuickStartCard
            title="Templates"
            description="Browse pre-built workflow templates to get started quickly."
            href="/templates"
          />
        </div>
      </div>
    </section>
  )
}

function QuickStartCard({ 
  title, 
  description, 
  href 
}: { 
  title: string
  description: string
  href: string 
}) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-border/60 bg-card/50 p-6 transition-all hover:border-purple-500/50 hover:bg-card/80"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-purple-400" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </a>
  )
}
