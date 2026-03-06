const stats = [
    { value: "10M+", label: "Workflows executed monthly" },
    { value: "99.99%", label: "Uptime SLA" },
    { value: "50ms", label: "Average latency" },
    { value: "10,000+", label: "Active teams" },
  ]
  
  export function StatsSection() {
    return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-[#080814]" />
        <div className="mx-auto max-w-7xl px-6">
        <div className="relative rounded-2xl border border-white/10 bg-linear-to-br from-violet-500/10 via-[#141124] to-fuchsia-500/10 p-12 shadow-[0_20px_60px_rgba(10,8,25,0.6)]">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                <p className="bg-linear-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-4xl font-bold text-transparent">
                    {stat.value}
                  </p>
                <p className="mt-2 text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
  