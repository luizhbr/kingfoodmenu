-- Additive migration: WhatsApp bot channel (integration, conversations, messages)
-- Applied idempotently via Prisma Client (statement by statement).
-- Secrets are NEVER stored in these tables.

-- CreateTable whatsapp_integrations
CREATE TABLE IF NOT EXISTS "whatsapp_integrations" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'meta',
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "botEnabled" BOOLEAN NOT NULL DEFAULT false,
  "phoneNumber" TEXT,
  "displayName" TEXT,
  "phoneNumberId" TEXT,
  "businessAccountId" TEXT,
  "webhookConfigured" BOOLEAN NOT NULL DEFAULT false,
  "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
  "lastWebhookAt" TIMESTAMP(3),
  "lastMessageAt" TIMESTAMP(3),
  "lastError" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "lastTestAt" TIMESTAMP(3),
  "lastTestStatus" TEXT,
  "n8nStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "n8nLastExecutionAt" TIMESTAMP(3),
  "n8nLastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable whatsapp_conversations
CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "whatsappNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "state" JSONB,
  "currentIntent" TEXT,
  "currentStep" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'BOT',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable whatsapp_messages
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "text" TEXT,
  "intent" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_messages_messageId_key" ON "whatsapp_messages"("messageId");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_conversations_integrationId_whatsappNumber_key" ON "whatsapp_conversations"("integrationId", "whatsappNumber");
CREATE INDEX IF NOT EXISTS "whatsapp_conversations_customerId_idx" ON "whatsapp_conversations"("customerId");
CREATE INDEX IF NOT EXISTS "whatsapp_conversations_expiresAt_idx" ON "whatsapp_conversations"("expiresAt");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_conversationId_createdAt_idx" ON "whatsapp_messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "whatsapp_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
