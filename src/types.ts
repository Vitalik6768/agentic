export enum CredentialType {
  OPENAI = "OPENAI",
  GEMINI = "GEMINI",
  OPENROUTER = "OPENROUTER",
  SET_NODE = "SET_NODE",
  TELEGRAM_BOT = "TELEGRAM_BOT",
  SERP_API_NODE = "SERP_API_NODE"
}

export interface Credential {
  id: string;
  name: string;
  value: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
}