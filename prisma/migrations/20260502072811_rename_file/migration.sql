/*
  Warnings:

  - The values [GOOGLE_DOCS_Files] on the enum `NodeType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NodeType_new" AS ENUM ('INITIAL', 'MANUAL_TRIGGER', 'TELEGRAM_TRIGGER', 'SCHEDULE_TRIGGER', 'HTTP_REQUEST', 'SET_NODE', 'OPENAI', 'GEMINI', 'OPENROUTER', 'TELEGRAM_MESSAGE', 'WEBHOOK_TRIGGER', 'INTERFACE_TEXT', 'INTERFACE_TABLE', 'CONDITION_NODE', 'AGENT_NODE', 'EXTRACTOR_NODE', 'LOOP_NODE', 'BREAK_NODE', 'DELAY_NODE', 'CHAT_TRIGGER', 'GOOGLE_SHEET', 'GOOGLE_DOCS', 'GOOGLE_DOCS_FILE');
ALTER TABLE "Node" ALTER COLUMN "type" TYPE "NodeType_new" USING ("type"::text::"NodeType_new");
ALTER TYPE "NodeType" RENAME TO "NodeType_old";
ALTER TYPE "NodeType_new" RENAME TO "NodeType";
DROP TYPE "public"."NodeType_old";
COMMIT;
