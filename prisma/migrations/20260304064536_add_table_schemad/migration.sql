-- CreateTable
CREATE TABLE "TableInterface" (
    "interfaceId" TEXT NOT NULL,
    "dataJson" JSONB,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableInterface_pkey" PRIMARY KEY ("interfaceId")
);

-- AddForeignKey
ALTER TABLE "TableInterface" ADD CONSTRAINT "TableInterface_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE CASCADE ON UPDATE CASCADE;
