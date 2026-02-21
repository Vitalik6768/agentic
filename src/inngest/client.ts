import { EventSchemas, Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

type Events = {
  "workflow/execute.workflow": {
    data: {
      id: string;
      userId: string;
      initialData?: Record<string, unknown>;
    };
  };
};

export const inngest = new Inngest({
  id: "agentic",
  schemas: new EventSchemas().fromRecord<Events>(),
  middleware: [realtimeMiddleware()],
});