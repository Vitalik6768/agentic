-- CreateEnum
CREATE TYPE "InterfaceType" AS ENUM ('TEXT');

-- CreateTable
CREATE TABLE "Interface" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "type" "InterfaceType" NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Interface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextInterface" (
    "interfaceId" TEXT NOT NULL,
    "title" TEXT,
    "contentJson" JSONB,
    "contentHtml" TEXT,
    "clientEmail" TEXT,

    CONSTRAINT "TextInterface_pkey" PRIMARY KEY ("interfaceId")
);

-- CreateTable
CREATE TABLE "InterfaceWorkflow" (
    "id" TEXT NOT NULL,
    "interfaceId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "event" TEXT NOT NULL DEFAULT 'submit',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterfaceWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterfaceEvent" (
    "id" TEXT NOT NULL,
    "interfaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "executionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterfaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interface_userId_type_idx" ON "Interface"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Interface_userId_slug_key" ON "Interface"("userId", "slug");

-- CreateIndex
CREATE INDEX "InterfaceWorkflow_workflowId_enabled_idx" ON "InterfaceWorkflow"("workflowId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "InterfaceWorkflow_interfaceId_workflowId_event_key" ON "InterfaceWorkflow"("interfaceId", "workflowId", "event");

-- CreateIndex
CREATE INDEX "InterfaceEvent_interfaceId_createdAt_idx" ON "InterfaceEvent"("interfaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Interface" ADD CONSTRAINT "Interface_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextInterface" ADD CONSTRAINT "TextInterface_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterfaceWorkflow" ADD CONSTRAINT "InterfaceWorkflow_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterfaceWorkflow" ADD CONSTRAINT "InterfaceWorkflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterfaceEvent" ADD CONSTRAINT "InterfaceEvent_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE CASCADE ON UPDATE CASCADE;
