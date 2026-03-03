import { channel, topic } from "@inngest/realtime";

export const INTERFACE_TEXT_CHANNEL_NAME = "interface-text-execution";


export const interfaceTextChannel = channel(INTERFACE_TEXT_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>()
    )
    .addTopic(
        topic("result").type<{
            nodeId: string;
            status: "success" | "error";
            output?: string;
            error?: string;
        }>()
    )