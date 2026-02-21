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

      if (["POST", "PUT", "PATCH"].includes(method)) {
        if (data.body) {
          const resolvedBody = Handlebars.compile(data.body)(context);
          JSON.parse(resolvedBody);
          options.body = resolvedBody;
          options.headers = {
            "Content-Type": "application/json",
          };
        }
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