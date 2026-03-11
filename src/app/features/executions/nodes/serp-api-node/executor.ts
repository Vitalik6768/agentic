import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import Handlebars from "handlebars";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
import { serpApiNodeChannel } from "@/inngest/channels/serp-api-node";

registerHandlebarsHelpers();

type SerpApiNodeData = {
  varibleName?: string;
  endpoint: string;
  method: "GET";
  body?: string;
  engine?: string;
  q?: string;
  location?: string;
  google_domain?: string;
  hl?: string;
  gl?: string;
  api_key?: string;
};
export const serpApiNodeExecutor: NodeExecutor<SerpApiNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const fallbackVariableName = `serpApiNode${Math.floor(Math.random() * 9) + 1}`;
  const variableName = data.varibleName?.trim() ?? fallbackVariableName;

  await publish(
    serpApiNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );
  if (!data.endpoint) {
    await publish(
      serpApiNodeChannel().result({
        nodeId,
        status: "error",
        error: "Endpoint is required",
      })
    );
    await publish(
      serpApiNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Endpoint is required");
  }
  if (!data.method) {
    await publish(
      serpApiNodeChannel().result({
        nodeId,
        status: "error",
        error: "Method is required",
      })
    );
    await publish(
      serpApiNodeChannel().status({
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
    const result = await step.run(`serp-api-node-${nodeId}`, async () => {
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

      const endpointUrl = new URL(endpoint);
      const queryFields = {
        engine: data.engine ?? "google",
        q: data.q ?? "",
        location: data.location ?? "",
        google_domain: data.google_domain ?? "",
        hl: data.hl ?? "",
        gl: data.gl ?? "",
        api_key: data.api_key ?? "",
      };

      for (const [key, rawValue] of Object.entries(queryFields)) {
        const resolvedValue = Handlebars.compile(rawValue)(context).trim();
        if (!resolvedValue) continue;
        endpointUrl.searchParams.set(key, resolvedValue);
      }

      if (Object.keys(headers).length > 0) {
        options.headers = headers;
      }
      const response = await ky(endpointUrl.toString(), options);
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
      return { ...context, [variableName]: responsePayload };
    });
    await publish(
      serpApiNodeChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(
          {
            variable: variableName,
            value: result[variableName],
          },
          null,
          2
        ),
      })
    );
    await publish(
      serpApiNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown SERP API node error";
    await publish(
      serpApiNodeChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      serpApiNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};