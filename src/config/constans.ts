export const PAGINATIONS = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 5,
    MAX_PAGE_SIZE: 100,
    MIN_PAGE_SIZE: 1,
  
  };

export const OPEN_ROUTER_MODELS = [
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "openai/gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini" },
  { value: "google/gemini-3-flash-preview", label: "Google Gemini 3 Flash Preview" },
  { value: "openai/gpt-4o-mini-search-preview", label: "OpenAI GPT-4o Mini Search Preview" }

] as const;

export type OpenRouterModel = (typeof OPEN_ROUTER_MODELS)[number]["value"];

export const DEFAULT_OPEN_ROUTER_MODEL: OpenRouterModel = "openai/gpt-4o-mini";

export const isOpenRouterModel = (value: string): value is OpenRouterModel =>
  OPEN_ROUTER_MODELS.some((model) => model.value === value);