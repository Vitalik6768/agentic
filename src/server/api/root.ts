import { credentialsRouter } from "@/app/features/credentials/server/routers";
import { executionsRouter } from "@/app/features/executions/server/routers";
import { interfacesRouter } from "@/app/features/interfaces/server/routers";
import { chatInterfaceRouter } from "@/app/features/interfaces/chat-interface/server/routers";
import { tableInterfaceRouter } from "@/app/features/interfaces/table-interface/server/routers";
import { textInterfaceRouter } from "@/app/features/interfaces/text-interface/server/routers";
import { workflowsRouter } from "@/app/features/workflows/server/routers";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  interfaces: interfacesRouter,
  textInterface: textInterfaceRouter,
  tableInterface: tableInterfaceRouter,
  chatInterface: chatInterfaceRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
