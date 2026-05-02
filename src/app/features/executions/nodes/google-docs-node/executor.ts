import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { googleDocsChannel } from "@/inngest/channels/google-docs";
import { db } from "@/server/db";
import { decrypt } from "@/lib/encryption";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
import { google } from "googleapis";
import { env } from "@/env";
import type { docs_v1 } from "googleapis";

registerHandlebarsHelpers();

type GoogleDocsNodeData = {
  variableName?: string;
  varibleName?: string;
  authType?: "OAUTH" | "SERVICE_ACCOUNT";
  credentialId?: string;
  documentId?: string;
  operation?: "GET_DOCUMENT" | "UPDATE_DOCUMENT";
  /** How to apply UPDATE_DOCUMENT */
  updateMode?: "APPEND_TEXT" | "REPLACE_ALL_TEXT";
  appendText?: string;
  findText?: string;
  replaceText?: string;
  replaceMatchCase?: boolean;
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

const DOCS_SCOPES = ["https://www.googleapis.com/auth/documents"] as const;

type StructuralElement = NonNullable<NonNullable<docs_v1.Schema$Body["content"]>[number]>;

const textFromParagraphElements = (elements: docs_v1.Schema$ParagraphElement[] | null | undefined): string => {
  if (!elements?.length) return "";
  let chunk = "";
  for (const el of elements) {
    const c = el.textRun?.content;
    if (typeof c === "string") chunk += c;
  }
  return chunk;
};

const extractPlainTextFromContent = (content: StructuralElement[] | null | undefined): string => {
  if (!content?.length) return "";
  let out = "";
  for (const el of content) {
    if (el.paragraph) {
      out += textFromParagraphElements(el.paragraph.elements);
    } else if (el.table?.tableRows) {
      for (const row of el.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          out += extractPlainTextFromContent((cell.content ?? []));
        }
      }
    }
  }
  return out;
};

const getBodyEndIndex = (body: docs_v1.Schema$Body | null | undefined): number => {
  let maxEnd = 1;
  for (const el of body?.content ?? []) {
    if (typeof el.endIndex === "number") maxEnd = Math.max(maxEnd, el.endIndex);
  }
  return maxEnd;
};

export const googleDocsNodeExecutor: NodeExecutor<GoogleDocsNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    googleDocsChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const variableName = (data.variableName ?? data.varibleName)?.trim();
  if (!variableName) {
    await publish(
      googleDocsChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      }),
    );
    await publish(googleDocsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Variable name is required");
  }

  const authType = data.authType ?? "OAUTH";
  const documentId = data.documentId?.trim();
  if (!documentId) {
    await publish(
      googleDocsChannel().result({
        nodeId,
        status: "error",
        error: "Document ID is required",
      }),
    );
    await publish(googleDocsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Document ID is required");
  }

  const operation = data.operation ?? "GET_DOCUMENT";
  const safeContext = (context && typeof context === "object" ? context : {}) as Record<string, unknown>;

  try {
    const resultContext = await step.run(`google-docs-${nodeId}`, async () => {
      let docsAuth: InstanceType<typeof google.auth.JWT> | InstanceType<typeof google.auth.OAuth2>;

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
        docsAuth = new google.auth.JWT({
          email: sa.client_email,
          key: sa.private_key,
          scopes: [...DOCS_SCOPES],
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
        docsAuth = oauth2;
      }

      const docs = google.docs({ version: "v1", auth: docsAuth });

      if (operation === "GET_DOCUMENT") {
        const resp = await docs.documents.get({ documentId });
        const doc = resp.data;
        const plainText = extractPlainTextFromContent((doc.body?.content ?? []));
        const title = typeof doc.title === "string" ? doc.title : "";

        const payload = {
          googleDoc: {
            documentId,
            title,
            plainText,
          },
        };
        return { ...safeContext, [variableName]: payload };
      }

      const updateMode = data.updateMode ?? "APPEND_TEXT";

      if (updateMode === "APPEND_TEXT") {
        const rendered = renderTemplate(data.appendText ?? "", safeContext);
        const getResp = await docs.documents.get({ documentId });
        const endIndex = getBodyEndIndex(getResp.data.body);
        if (endIndex < 2) {
          throw new NonRetriableError("Document body is empty or unreadable; cannot append.");
        }
        const insertIndex = endIndex - 1;
        const batch = await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{ insertText: { location: { index: insertIndex }, text: rendered } }],
          },
        });
        const payload = {
          googleDoc: {
            operation,
            updateMode,
            documentId,
            insertedLength: rendered.length,
            writeControl: batch.data.writeControl ?? null,
          },
        };
        return { ...safeContext, [variableName]: payload };
      }

      const findRaw = renderTemplate(data.findText ?? "", safeContext);
      const replaceRaw = renderTemplate(data.replaceText ?? "", safeContext);
      if (!findRaw.length) {
        throw new NonRetriableError('Replace-all update requires non-empty "Find text" after templates resolve.');
      }

      const matchCase = data.replaceMatchCase ?? false;
      const batch = await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              replaceAllText: {
                containsText: { text: findRaw, matchCase },
                replaceText: replaceRaw,
              },
            },
          ],
        },
      });

      let occurrencesChanged: number | null = null;
      const replies = batch.data.replies ?? [];
      for (const r of replies) {
        const occ = (r as { replaceAllText?: { occurrencesChanged?: number | null } }).replaceAllText?.occurrencesChanged;
        if (typeof occ === "number") {
          occurrencesChanged = occ;
          break;
        }
      }

      const payload = {
        googleDoc: {
          operation,
          updateMode,
          documentId,
          findText: findRaw,
          replaceText: replaceRaw,
          matchCase,
          occurrencesChanged,
          writeControl: batch.data.writeControl ?? null,
        },
      };
      return { ...safeContext, [variableName]: payload };
    });

    await publish(
      googleDocsChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(resultContext[variableName], null, 2),
      }),
    );
    await publish(googleDocsChannel().status({ nodeId, status: "success" }));
    return resultContext;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Google Docs error";
    await publish(
      googleDocsChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      }),
    );
    await publish(googleDocsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
