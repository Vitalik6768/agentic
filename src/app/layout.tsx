import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Agentic Flow",
  description: "Build and run intelligent workflows",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
      <TRPCReactProvider>
          <NuqsAdapter>
              {children}
              <Toaster />

          </NuqsAdapter>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
