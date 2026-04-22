import { 
    Database, 
    Cloud, 
    MessageSquare, 
    Mail, 
    CreditCard,
    FileText,
    Users,
    BarChart3,
    Webhook,
    Key,
    Server,
    Globe,
    BotIcon
  } from "lucide-react"
  
  const integrations = [
    { icon: Database, name: "PostgreSQL", category: "Database" },
    // { icon: Cloud, name: "AWS", category: "Cloud" },
    { icon: BotIcon, name: "AI", category: "OpenRouter" },
    { icon: Mail, name: "Gmail", category: "Email" },
    // { icon: CreditCard, name: "Stripe", category: "Payments" },
    // { icon: FileText, name: "Notion", category: "Docs" },
    // { icon: Users, name: "Salesforce", category: "CRM" },
    { icon: BarChart3, name: "Analytics", category: "Data" },
    { icon: Webhook, name: "Webhooks", category: "API" },
    // { icon: Key, name: "Auth0", category: "Auth" },
    // { icon: Server, name: "Docker", category: "DevOps" },
    { icon: Globe, name: "REST APIs", category: "Custom" },
  ]
  
  export function IntegrationsSection() {
    return (
    <section id="integrations" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-linear-to-b from-[#080915] via-[#090a18] to-[#090c19]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-cyan-400/5 to-transparent" />
        <div className="mx-auto max-w-7xl px-6">
        <div className="relative text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {/* <span className="bg-linear-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                300+
              </span>{" "} */}
            <span className="text-white">integrations</span>
            </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/65">
              Connect to any service with pre-built nodes or create custom integrations with our SDK.
            </p>
          </div>
  
        <div className="relative mt-16 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {integrations.map((integration) => {
              const Icon = integration.icon
              return (
                <div
                  key={integration.name}
                className="group flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/3 p-4 backdrop-blur-sm transition-all hover:border-violet-400/50 hover:bg-white/6"
                >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-linear-to-br group-hover:from-violet-500/20 group-hover:to-fuchsia-500/20">
                  <Icon className="h-6 w-6 text-white/70 transition-colors group-hover:text-violet-300" />
                  </div>
                  <div className="text-center">
                  <p className="text-sm font-medium text-white">{integration.name}</p>
                  <p className="text-xs text-white/55">{integration.category}</p>
                  </div>
                </div>
              )
            })}
          </div>
  
          <div className="mt-12 text-center">
          <button className="font-medium text-violet-300 transition-colors hover:text-fuchsia-300">
              Browse all integrations →
            </button>
          </div>
        </div>
      </section>
    )
  }
  