export enum CredentialType {
  OPENAI = "OPENAI",
  GEMINI = "GEMINI",
}

export interface Credential {
  id: string;
  name: string;
  value: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
}