import { NextResponse } from "next/server";
import { requireAuth } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { CredentialType, type Prisma } from "generated/prisma";
import { GOOGLE_OAUTH_SCOPES } from "@/lib/google-oauth-scopes";

type StoredState = {
  credentialId: string;
  userId: string;
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export async function GET(req: Request) {
  const session = await requireAuth();
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error") ?? "";

  if (error) {
    return NextResponse.redirect(new URL(`/credentials?googleOauthError=${encodeURIComponent(error)}`, url.origin));
  }
  if (!code || !state) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }

  const verification = await db.verification.findFirst({
    where: {
      identifier: `google_cred_oauth:${state}`,
    },
  });
  if (!verification) {
    return NextResponse.json({ error: "Invalid/expired state" }, { status: 400 });
  }
  if (verification.expiresAt.getTime() < Date.now()) {
    await db.verification.delete({ where: { id: verification.id } }).catch(() => undefined);
    return NextResponse.json({ error: "State expired" }, { status: 400 });
  }

  const decryptedState = decrypt(verification.value);
  const parsed = safeJsonParse(decryptedState);
  const stored = (parsed && typeof parsed === "object" ? (parsed as StoredState) : null);
  if (!stored?.credentialId || !stored.userId) {
    return NextResponse.json({ error: "Corrupted state" }, { status: 400 });
  }
  if (stored.userId !== session.user.id) {
    return NextResponse.json({ error: "State does not match current user" }, { status: 403 });
  }

  const credential = await db.credential.findUnique({
    where: { id: stored.credentialId, userId: session.user.id },
  });
  if (credential?.type !== CredentialType.GOOGLE) {
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

  // Must match the redirect URI used in /start exactly.
  const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const redirectUri = new URL("/api/google/oauth/callback", origin).toString();

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2.getToken(code);

  // Must include refresh_token for background usage.
  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      new URL(`/credentials/${credential.id}?googleOauthError=${encodeURIComponent("missing_refresh_token")}`, origin),
    );
  }

  oauth2.setCredentials(tokens);

  // Fetch connected email (best-effort)
  let email: string | null = null;
  try {
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const me = await oauth2Api.userinfo.get();
    email = typeof me.data.email === "string" ? me.data.email : null;
  } catch {
    // ignore
  }

  const tokenEnc = encrypt(JSON.stringify(tokens));
  const previousScopes = (() => {
    const candidate = settings.googleOAuth;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
    const scopes = (candidate as { scopes?: unknown }).scopes;
    return typeof scopes === "string" ? scopes : undefined;
  })();
  const nextSettings: Record<string, unknown> = {
    ...settings,
    googleAuthType: "OAUTH",
    clientId,
    googleOAuth: {
      connectedAt: new Date().toISOString(),
      email,
      scopes: tokens.scope ?? previousScopes ?? [...GOOGLE_OAUTH_SCOPES].join(" "),
      tokenEnc,
    },
  };

  await db.$transaction(async (tx) => {
    await tx.credential.update({
      where: { id: credential.id, userId: session.user.id },
      data: {
        settings: nextSettings as Prisma.InputJsonValue,
      },
    });
    await tx.verification.delete({
      where: { id: verification.id },
    });
  });

  return NextResponse.redirect(new URL(`/credentials/${credential.id}?connected=1`, origin));
}

