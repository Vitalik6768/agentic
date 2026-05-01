import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { googleSheetChannel } from "@/inngest/channels/google-sheet";
import { db } from "@/server/db";
import { decrypt } from "@/lib/encryption";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
import { google } from "googleapis";
import { env } from "@/env";


registerHandlebarsHelpers();

type GoogleSheetNodeData = {
  variableName?: string;
  varibleName?: string;
  authType?: "OAUTH" | "SERVICE_ACCOUNT";
  credentialId?: string;
  spreadsheetId?: string;
  range?: string;
  sheetName?: string;
  operation?: "GET_ROWS" | "APPEND_ROWS" | "UPDATE_RANGE";
  valuesJson?: string;
  valueInputOption?: "RAW" | "USER_ENTERED";
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

const safeJsonStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, v: unknown) => {
    if (typeof v === "bigint") return v.toString();
    if (!v || typeof v !== "object") return v;
    if (seen.has(v)) return "[Circular]";
    seen.add(v);
    return v;
  });
};

const toSheetCellString = (cell: unknown): string => {
  if (cell == null) return "";
  if (typeof cell === "string") return cell;
  if (typeof cell === "number" || typeof cell === "boolean" || typeof cell === "bigint") return String(cell);
  if (cell instanceof Date) return cell.toISOString();
  try {
    return safeJsonStringify(cell);
  } catch {
    // Fall back to a stable explicit tag rather than base Object stringification.
    return "[Unserializable]";
  }
};

const parseValuesJson = (rendered: string): unknown[][] => {
  try {
    const parsed = JSON.parse(rendered) as unknown;
    if (Array.isArray(parsed) && parsed.every((row) => Array.isArray(row))) {
      return (parsed as unknown[][]).map((row) => row.map((cell) => toSheetCellString(cell)));
    }
    if (Array.isArray(parsed)) {
      // Allow a single row: ["a","b"] -> [["a","b"]]
      return [(parsed as unknown[]).map((cell) => toSheetCellString(cell))];
    }
  } catch {
    // fall through
  }
  throw new NonRetriableError(
    'Values JSON must be an array (row) like ["a","b"] or a 2D array like [["a","b"],["c","d"]].',
  );
};

type StoredGoogleOAuth = {
  tokenEnc?: string;
};

const SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"] as const;

export const googleSheetNodeExecutor: NodeExecutor<GoogleSheetNodeData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(
    googleSheetChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const variableName = (data.variableName ?? data.varibleName)?.trim();
  if (!variableName) {
    await publish(
      googleSheetChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      }),
    );
    await publish(googleSheetChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Variable name is required");
  }

  const authType = data.authType ?? "OAUTH";

  const spreadsheetId = data.spreadsheetId?.trim();
  if (!spreadsheetId) {
    await publish(
      googleSheetChannel().result({
        nodeId,
        status: "error",
        error: "Spreadsheet ID is required",
      }),
    );
    await publish(googleSheetChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Spreadsheet ID is required");
  }

  const sheetName = data.sheetName?.trim();
  if (!sheetName) {
    await publish(
      googleSheetChannel().result({
        nodeId,
        status: "error",
        error: "Sheet name is required (e.g. Sheet1)",
      }),
    );
    await publish(googleSheetChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Sheet name is required");
  }

  const operation = data.operation ?? "GET_ROWS";
  const safeContext = (context && typeof context === "object" ? context : {}) as Record<string, unknown>;

  try {
    const resultContext = await step.run(`google-sheet-${nodeId}`, async () => {
      let sheetsAuth:
        | InstanceType<typeof google.auth.JWT>
        | InstanceType<typeof google.auth.OAuth2>;

      if (!data.credentialId?.trim()) {
        throw new NonRetriableError(
          authType === "SERVICE_ACCOUNT"
            ? "Google service account credential is required"
            : "Google OAuth credential is required",
        );
      }

      if (authType === "SERVICE_ACCOUNT") {
        if (!data.credentialId?.trim()) {
          throw new NonRetriableError("Google credential is required for Service Account auth");
        }
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
        sheetsAuth = new google.auth.JWT({
          email: sa.client_email,
          key: sa.private_key,
          scopes: [...SHEETS_SCOPES],
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

        const oauth2 = new google.auth.OAuth2(clientId, clientSecret, new URL("/api/google/oauth/callback", env.CALLBACK_URL).toString());
        oauth2.setCredentials({
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
        });

        // Ensure we have a usable access token.
        const token = await oauth2.getAccessToken();
        const resolved = typeof token === "string" ? token : token?.token;
        if (!resolved) {
          throw new NonRetriableError("Google OAuth token is missing/expired. Reconnect the credential.");
        }
        sheetsAuth = oauth2;
      }

      const sheets = google.sheets({ version: "v4", auth: sheetsAuth });

      if (operation === "GET_ROWS") {
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetName,
        });

        const values = resp.data.values ?? [];
        const headerRow = (values[0] ?? []).map((h) => String(h ?? "").trim());
        const dataRows = values.slice(1);
        const rows = dataRows.map((row) => {
          const obj: Record<string, string> = {};
          for (let i = 0; i < headerRow.length; i += 1) {
            const key = headerRow[i] ?? `Column ${i + 1}`;
            obj[key] = row?.[i] == null ? "" : String(row[i]);
          }
          return obj;
        });

        const payload = {
          googleSheet: {
            operation,
            spreadsheetId,
            sheetName,
            majorDimension: resp.data.majorDimension ?? "ROWS",
            headers: headerRow,
            rows,
            totalRows: rows.length,
          },
        };
        return { ...safeContext, [variableName]: payload };
      }

      const valueInputOption = data.valueInputOption ?? "USER_ENTERED";
      const renderedValuesJson = renderTemplate(data.valuesJson ?? "[]", safeContext);
      const values = parseValuesJson(renderedValuesJson);

      if (operation === "APPEND_ROWS") {
        const resp = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: sheetName,
          valueInputOption,
          requestBody: {
            values,
          },
        });

        const payload = {
          googleSheet: {
            operation,
            spreadsheetId,
            sheetName,
            valueInputOption,
            updates: resp.data.updates ?? null,
            tableRange: resp.data.tableRange ?? null,
            updatedRange: resp.data.updates?.updatedRange ?? null,
          },
        };
        return { ...safeContext, [variableName]: payload };
      }

      const range = data.range?.trim();
      if (!range) {
        throw new NonRetriableError('Range is required for Update Range (e.g. "Sheet1!A1:C10")');
      }
      const resp = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption,
        requestBody: {
          values,
        },
      });

      const payload = {
        googleSheet: {
          operation,
          spreadsheetId,
          range,
          valueInputOption,
          updatedRange: resp.data.updatedRange ?? null,
          updatedRows: resp.data.updatedRows ?? null,
          updatedColumns: resp.data.updatedColumns ?? null,
          updatedCells: resp.data.updatedCells ?? null,
        },
      };
      return { ...safeContext, [variableName]: payload };
    });

    await publish(
      googleSheetChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(resultContext[variableName], null, 2),
      }),
    );
    await publish(googleSheetChannel().status({ nodeId, status: "success" }));
    return resultContext;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Google Sheets error";
    await publish(
      googleSheetChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      }),
    );
    await publish(googleSheetChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

