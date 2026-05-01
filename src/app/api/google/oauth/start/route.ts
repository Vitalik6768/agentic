import { NextResponse } from "next/server";
import { requireAuth } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { CredentialType } from "generated/prisma";

const SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"] as const;

export async function GET(req: Request) {
  const session = await requireAuth();
  const url = new URL(req.url);
  const credentialId = url.searchParams.get("credentialId") ?? "";
  if (!credentialId) {
    return NextResponse.json({ error: "credentialId is required" }, { status: 400 });
  }

  const credential = await db.credential.findUnique({
    where: { id: credentialId, userId: session.user.id },
  });
  if (!credential || credential.type !== CredentialType.GOOGLE) {
    return NextResponse.json({ error: "Google credential not found" }, { status: 404 });
  }

  const settings = (credential.settings && typeof credential.settings === "object" ? credential.settings : {}) as Record<
    string,
    unknown
  >;
  const googleAuthType = (settings.googleAuthType as string | undefined) ?? "OAUTH";
  if (googleAuthType !== "OAUTH") {
    return NextResponse.json({ error: "Credential is not configured for OAuth" }, { status: 400 });
  }

  const clientId = typeof settings.clientId === "string" ? settings.clientId : "";
  const clientSecret = decrypt(credential.value);
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Credential must have clientId and client secret" }, { status: 400 });
  }

  // Use a stable origin so Google redirect URIs match (avoid LAN IP / proxy mismatch).
  const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const redirectUri = new URL("/api/google/oauth/callback", origin).toString();

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const state = crypto.randomUUID();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: `google_cred_oauth:${state}`,
      value: encrypt(JSON.stringify({ credentialId, userId: session.user.id })),
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...SHEETS_SCOPES],
    state,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(authUrl);
}

