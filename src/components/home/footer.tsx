import Link from "next/link"
import { Zap, Github, Twitter } from "lucide-react"

const footerLinks = {
  // Product: [
  //   { name: "Features", href: "#features" },
  //   { name: "Integrations", href: "#integrations" },
  //   // { name: "Pricing", href: "#pricing" },
  //   { name: "Changelog", href: "/changelog" },
  // ],
  Resources: [
    // { name: "Documentation", href: "/docs" },
    // { name: "API Reference", href: "/docs/api" },
    { name: "Templates", href: "/templates" },
    // { name: "Blog", href: "/blog" },
  ],
  Website: [
    { name: "About", href: "/about" },
    // { name: "Careers", href: "/careers" },
    { name: "Contact", href: "/contact" },
    // { name: "Partners", href: "/partners" },
  ],
  Legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    // { name: "Security", href: "/security" },
    // { name: "DPA", href: "/dpa" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#070811]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 shadow-[0_10px_24px_rgba(168,85,247,0.35)]">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Agentic Core</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/60">
              The modern automation platform for building intelligent workflows at scale.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="https://github.com" className="text-white/55 transition-colors hover:text-white">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>
              <a href="https://twitter.com" className="text-white/55 transition-colors hover:text-white">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-white">{category}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-white/55 transition-colors hover:text-violet-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-white/55">
            © {new Date().getFullYear()} Agentic Core. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-white/55">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}