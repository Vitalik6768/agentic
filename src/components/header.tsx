import Link from "next/link";

type HeaderProps = {
  isLoggedIn: boolean;
};

export const Header = ({ isLoggedIn }: HeaderProps) => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/35 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.9)]" />
          Agentic
        </Link>

        {isLoggedIn && (
          <Link
            href="/workflows"
            className="rounded-full border border-violet-300/30 bg-violet-500/90 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:-translate-y-0.5 hover:bg-violet-400"
          >
            Go to Dashboard
          </Link>
        )}
      </div>
    </header>
  );
};