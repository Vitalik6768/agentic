import { 
    Workflow, 
    Zap, 
    Shield, 
    Clock, 
    GitBranch, 
    Code2,
    Database,
    Repeat
  } from "lucide-react"
  
  const features = [
    {
      icon: Workflow,
      title: "Visual Workflow Builder",
      description: "Design complex automations with our intuitive drag-and-drop interface. No coding required.",
      color: "from-purple-400 to-violet-500",
    },
    {
      icon: Zap,
      title: "Instant Triggers",
      description: "React to events in real-time with webhooks, schedules, or app-specific triggers.",
      color: "from-amber-400 to-orange-500",
    },
    // {
    //   icon: Shield,
    //   title: "Enterprise Security",
    //   description: "SOC 2 compliant with encrypted credentials, audit logs, and role-based access control.",
    //   color: "from-green-400 to-emerald-500",
    // },
    {
      icon: Clock,
      title: "Scheduled Jobs",
      description: "Run workflows on any schedule - from every minute to custom cron expressions.",
      color: "from-blue-400 to-cyan-500",
    },
    // {
    //   icon: GitBranch,
    //   title: "Version Control",
    //   description: "Track changes, rollback deployments, and collaborate with your team seamlessly.",
    //   color: "from-pink-400 to-rose-500",
    // },
    // {
    //   icon: Code2,
    //   title: "Custom Code Nodes",
    //   description: "Write JavaScript or Python when you need custom logic in your workflows.",
    //   color: "from-indigo-400 to-purple-500",
    // },
    {
      icon: Database,
      title: "Data Transformation",
      description: "Transform, filter, and aggregate data with powerful built-in functions.",
      color: "from-teal-400 to-cyan-500",
    },
    {
      icon: Repeat,
      title: "Error Handling",
      description: "Automatic retries, dead letter queues, and custom error workflows built-in.",
      color: "from-red-400 to-pink-500",
    },
  ]
  
  export function FeaturesSection() {
    return (
    <section id="features" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-linear-to-b from-[#0a0a16] via-[#0c0b1b] to-[#080915]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-linear-to-b from-violet-500/10 to-transparent" />
        <div className="mx-auto max-w-7xl px-6">
        <div className="relative text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-white">Everything you need to</span>{" "}
            <span className="bg-linear-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                automate at scale
              </span>
            </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/65">
              Powerful features designed for developers and teams who want to build, deploy, and manage automations with confidence.
            </p>
          </div>
  
        <div className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                className="group relative rounded-2xl border border-white/10 bg-white/3 p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-white/6"
                >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${feature.color} shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }
  