-- CreateTable
CREATE TABLE "RemoteCronJob" (
    "id" TEXT NOT NULL,
    "cronJobId" TEXT,
    "workflowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemoteCronJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RemoteCronJob_cronJobId_key" ON "RemoteCronJob"("cronJobId");
