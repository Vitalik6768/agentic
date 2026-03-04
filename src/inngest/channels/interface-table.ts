import type { TableDataJson } from "@/app/features/interfaces/table-interface/hooks/use-table-interface";
import { channel, topic } from "@inngest/realtime";

export const INTERFACE_TABLE_CHANNEL_NAME = "interface-table-execution";


export const interfaceTableChannel = channel(INTERFACE_TABLE_CHANNEL_NAME)
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
            output?: TableDataJson;
            error?: string;
        }>()
    )