-- CreateEnum
CREATE TYPE "AgentMemoryRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "agent_memory_message" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "memoryKey" TEXT,
    "role" "AgentMemoryRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_memory_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_memory_message_workflowId_nodeId_memoryKey_createdAt_idx" ON "agent_memory_message"("workflowId", "nodeId", "memoryKey", "createdAt");

-- CreateIndex
CREATE INDEX "agent_memory_message_workflowId_createdAt_idx" ON "agent_memory_message"("workflowId", "createdAt");

-- AddForeignKey
ALTER TABLE "agent_memory_message" ADD CONSTRAINT "agent_memory_message_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_memory_message" ADD CONSTRAINT "agent_memory_message_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
