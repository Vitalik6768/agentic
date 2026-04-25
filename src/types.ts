export enum CredentialType {
  OPENAI = "OPENAI",
  GEMINI = "GEMINI",
  OPENROUTER = "OPENROUTER",
  SET_NODE = "SET_NODE",
  TELEGRAM_BOT = "TELEGRAM_BOT",
  GOOGLE = "GOOGLE",
}

export interface Credential {
  id: string;
  name: string;
  value: string;
  type: CredentialType;
  settings?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}