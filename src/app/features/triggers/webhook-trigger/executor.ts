import type { NodeExecutor } from "../../executions/types";
import { webhookTriggerChannel } from "@/inngest/channels/webhook_trigger";
import { NonRetriableError } from "inngest";

type WebhookTriggerData = Record<string, unknown>;

export const webhookTriggerExecutor: NodeExecutor<WebhookTriggerData> = async ({ nodeId, context, step, publish }) => {
    await publish(webhookTriggerChannel().status({
        nodeId,
        status: "loading",
    }));

    try {
        const result = await step.run(`execute webhook trigger ${nodeId}`, async () => context);

        await publish(
            webhookTriggerChannel().result({
                nodeId,
                status: "success",
                output: JSON.stringify(result, null, 2),
            })
        );
        await publish(webhookTriggerChannel().status({
            nodeId,
            status: "success",
        }));

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown webhook trigger error";
        await publish(
            webhookTriggerChannel().result({
                nodeId,
                status: "error",
                error: errorMessage,
            })
        );
        await publish(webhookTriggerChannel().status({
            nodeId,
            status: "error",
        }));

        throw new NonRetriableError(errorMessage);
    }
}