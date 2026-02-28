import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import Handlebars from "handlebars";
import { httpRequestChannel } from "@/inngest/channels/http-request";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
  // return JSON.stringify(context, null, 2);
});

type HttpRequestData = {
  varibleName: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
  body?: string;
  authType?: "NONE" | "BEARER" | "BASIC" | "API_KEY";
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyHeaderName?: string;
  apiKeyValue?: string;
};
export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    httpRequestChannel().status({
      nodeId,
      status: "loading",
    })
  );
  if (!data.endpoint) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Endpoint is required");
  }
  if (!data.varibleName) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }
  if (!data.method) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Method is required");
  }
  //   const result = await step.run(
  //     `execute http request ${nodeId}`,
  //     async () => context
  //   );
  try {
    const result = await step.run(`http-request-${nodeId}`, async () => {
      const endpoint = Handlebars.compile(data.endpoint)(context);
      const method = data.method;
      const options: KyOptions = { method };
      const headers: Record<string, string> = {};

      if (["POST", "PUT", "PATCH"].includes(method)) {
        if (data.body) {
          const resolvedBody = Handlebars.compile(data.body)(context);
          JSON.parse(resolvedBody);
          options.body = resolvedBody;
          headers["Content-Type"] = "application/json";
        }
      }

      const authType = data.authType ?? "NONE";
      if (authType === "BEARER" && data.bearerToken) {
        const token = Handlebars.compile(data.bearerToken)(context);
        headers.Authorization = `Bearer ${token}`;
      }
      if (authType === "BASIC" && data.basicUsername && data.basicPassword) {
        const username = Handlebars.compile(data.basicUsername)(context);
        const password = Handlebars.compile(data.basicPassword)(context);
        const encoded = Buffer.from(`${username}:${password}`).toString("base64");
        headers.Authorization = `Basic ${encoded}`;
      }
      if (authType === "API_KEY" && data.apiKeyHeaderName && data.apiKeyValue) {
        const headerName = Handlebars.compile(data.apiKeyHeaderName)(context);
        const apiKey = Handlebars.compile(data.apiKeyValue)(context);
        if (headerName) {
          headers[headerName] = apiKey;
        }
      }

      if (Object.keys(headers).length > 0) {
        options.headers = headers;
      }
      const response = await ky(endpoint, options);
      const contentType = response.headers.get("content-type") ?? "";
      const responseData = contentType.includes("application/json")
        ? await response.json().catch(() => response.text())
        : response.text();
      const responsePayload = {
        httpResponse: {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        },
      };
      if (data.varibleName) {
        return { ...context, [data.varibleName]: responsePayload };
      }
      return {
        ...context,
        ...responsePayload,
      };
    });
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};