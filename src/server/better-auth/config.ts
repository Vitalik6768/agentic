import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  // socialProviders: {
  //   github: {
  //     clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
  //     clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
  //     redirectURI: "http://localhost:3000/api/auth/callback/github",
  //   },
  // },
});

export type Session = typeof auth.$Infer.Session;
