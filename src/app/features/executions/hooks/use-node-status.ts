import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import type { Realtime } from "@inngest/realtime";
import { useEffect, useState } from "react";
import { useInngestSubscription } from "@inngest/realtime/hooks";


interface UseNodeStatusOptions {
    nodeId: string;
    channel: string;
    topic: string;
    refreshToken: () => Promise<Realtime.Subscribe.Token>;

}

export function useNodeStatus({ nodeId, channel, topic, refreshToken }: UseNodeStatusOptions) {
    const [status, setStatus] = useState<NodeStatus>("initial");
    const {data} = useInngestSubscription({refreshToken, enabled: true});
    useEffect(() => {
        if(!data.length){
            return;
        }
        const latestMessage = data.filter((msg) => msg.kind === "data" &&
        msg.channel === channel &&
        msg.topic === topic &&
        (msg.data as { nodeId: string }).nodeId === nodeId
        ).sort((a, b) => {
            if(a.kind === "data" && b.kind === "data"){
                return(
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
            }
            return 0;
        })[0];
        if(latestMessage?.kind === "data"){
            const { status: nodeStatus } = latestMessage.data as { status: NodeStatus };
            setStatus(nodeStatus);
        }
     
    }, [data, nodeId, channel, topic]);
    return status;
}