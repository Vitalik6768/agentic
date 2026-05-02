import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { googleDocsFileChannel } from "@/inngest/channels/google-docs-file";
import { db } from "@/server/db";
import { decrypt } from "@/lib/encryption";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
import { google } from "googleapis";
import { env } from "@/env";

registerHandlebarsHelpers();

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

type GoogleDocsFileNodeData = {
  variableName?: string;
  varibleName?: string;
  authType?: "OAUTH" | "SERVICE_ACCOUNT";
  credentialId?: string;
  operation?: "CREATE_FILE" | "DELETE_FILE";
  fileName?: string;
  parentFolderId?: string;
  fileId?: string;
};

type ServiceAccountCredential = {
  client_email?: string;
  private_key?: string;
};

const parseServiceAccount = (raw: string): ServiceAccountCredential => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const obj = parsed as Record<string, unknown>;
    return {
      client_email: typeof obj.client_email === "string" ? obj.client_email : undefined,
      private_key: typeof obj.private_key === "string" ? obj.private_key : undefined,
    };
  } catch {
    return {};
  }
};

const renderTemplate = (template: string, context: Record<string, unknown>): string => {
  try {
    return Handlebars.compile(template, { noEscape: true })(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown template error";
    throw new NonRetriableError(`Invalid template: ${message}`);
  }
};

type StoredGoogleOAuth = {
  tokenEnc?: string;
};

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"] as const;

const CREATE_FIELDS = "id,name,mimeType,webViewLink,parents";

export const googleDocsFileNodeExecutor: NodeExecutor<GoogleDocsFileNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    googleDocsFileChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const variableName = (data.variableName ?? data.varibleName)?.trim();
  if (!variableName) {
    await publish(
      googleDocsFileChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      }),
    );
    await publish(googleDocsFileChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Variable name is required");
  }

  const authType = data.authType ?? "OAUTH";
  const operation = data.operation ?? "CREATE_FILE";
  const safeContext = (context && typeof context === "object" ? context : {}) as Record<string, unknown>;

  try {
    const resultContext = await step.run(`google-docs-file-${nodeId}`, async () => {
      let driveAuth: InstanceType<typeof google.auth.JWT> | InstanceType<typeof google.auth.OAuth2>;

      if (!data.credentialId?.trim()) {
        throw new NonRetriableError(
          authType === "SERVICE_ACCOUNT"
            ? "Google service account credential is required"
            : "Google OAuth credential is required",
        );
      }

      if (authType === "SERVICE_ACCOUNT") {
        const credential = await db.credential.findUniqueOrThrow({
          where: { id: data.credentialId },
        });
        const decrypted = decrypt(credential.value);
        const sa = parseServiceAccount(decrypted);
        if (!sa.client_email || !sa.private_key) {
          throw new NonRetriableError(
            "Google credential must be a Service Account JSON (client_email + private_key).",
          );
        }
        driveAuth = new google.auth.JWT({
          email: sa.client_email,
          key: sa.private_key,
          scopes: [...DRIVE_SCOPES],
        });
      } else {
        const oauthCredential = await db.credential.findUniqueOrThrow({
          where: { id: data.credentialId },
        });
        const settings =
          oauthCredential.settings && typeof oauthCredential.settings === "object"
            ? (oauthCredential.settings as Record<string, unknown>)
            : {};
        const clientId = typeof settings.clientId === "string" ? settings.clientId : "";
        const clientSecret = decrypt(oauthCredential.value);
        const googleOAuth = (settings.googleOAuth as StoredGoogleOAuth | undefined) ?? undefined;
        const tokenEnc = typeof googleOAuth?.tokenEnc === "string" ? googleOAuth.tokenEnc : "";
        if (!clientId || !clientSecret) {
          throw new NonRetriableError("OAuth credential must have clientId and client secret");
        }
        if (!tokenEnc) {
          throw new NonRetriableError("OAuth credential is not connected. Click Connect in the credential/node dialog.");
        }

        const tokenJson = decrypt(tokenEnc);
        let tokens: { refresh_token?: string; access_token?: string; expiry_date?: number; scope?: string } = {};
        try {
          tokens = JSON.parse(tokenJson) as typeof tokens;
        } catch {
          throw new NonRetriableError("Stored OAuth token is corrupted. Reconnect the credential.");
        }

        const oauth2 = new google.auth.OAuth2(
          clientId,
          clientSecret,
          new URL("/api/google/oauth/callback", env.CALLBACK_URL).toString(),
        );
        oauth2.setCredentials({
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
        });

        const token = await oauth2.getAccessToken();
        const resolved = typeof token === "string" ? token : token?.token;
        if (!resolved) {
          throw new NonRetriableError("Google OAuth token is missing/expired. Reconnect the credential.");
        }
        driveAuth = oauth2;
      }

      const drive = google.drive({ version: "v3", auth: driveAuth });

      if (operation === "DELETE_FILE") {
        const renderedId = renderTemplate(data.fileId ?? "", safeContext).trim();
        if (!renderedId) {
          throw new NonRetriableError("Document ID is required to delete a Google Doc.");
        }
        await drive.files.delete({
          fileId: renderedId,
          supportsAllDrives: true,
        });
        const payload = {
          googleDocsFile: {
            documentId: renderedId,
            deleted: true,
          },
        };
        return { ...safeContext, [variableName]: payload };
      }

      const name = renderTemplate(data.fileName ?? "", safeContext).trim();
      if (!name) {
        throw new NonRetriableError("Document title is required to create a Google Doc.");
      }

      const parentRendered = renderTemplate(data.parentFolderId ?? "", safeContext).trim();
      const parents = parentRendered ? [parentRendered] : undefined;

      const res = await drive.files.create({
        requestBody: {
          name,
          mimeType: GOOGLE_DOC_MIME,
          parents,
        },
        fields: CREATE_FIELDS,
        supportsAllDrives: true,
      });

      const f = res.data;
      const payload = {
        googleDocsFile: {
          documentId: f.id ?? null,
          title: f.name ?? name,
          webViewLink: f.webViewLink ?? null,
          parents: f.parents ?? parents ?? null,
        },
      };
      return { ...safeContext, [variableName]: payload };
    });

    await publish(
      googleDocsFileChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(resultContext[variableName], null, 2),
      }),
    );
    await publish(googleDocsFileChannel().status({ nodeId, status: "success" }));
    return resultContext;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Google Docs error";
    await publish(
      googleDocsFileChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      }),
    );
    await publish(googleDocsFileChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
