export enum CredentialType {
  OPENAI = "OPENAI",
  GEMINI = "GEMINI",
  OPENROUTER = "OPENROUTER",
}

export interface Credential {
  id: string;
  name: string;
  value: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
}