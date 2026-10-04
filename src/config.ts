import "dotenv/config";

/**
 * Single place that reads the environment. Everything else imports `config`, so
 * a missing or malformed value fails at startup instead of mid-conversation.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }

  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? fallback : value;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, received "${raw}".`);
  }

  return value;
}

const compactionAfterTokens = positiveInteger("MEMORY_COMPACTION_AFTER_TOKENS", 8000);
const compactionRecentTokens = positiveInteger("MEMORY_COMPACTION_RECENT_TOKENS", 2000);

if (compactionRecentTokens >= compactionAfterTokens) {
  throw new Error(
    "MEMORY_COMPACTION_RECENT_TOKENS must be smaller than MEMORY_COMPACTION_AFTER_TOKENS.",
  );
}

const baseUrl = process.env["OPENAI_BASE_URL"]?.trim();

export const config = {
  provider: {
    apiKey: required("OPENAI_API_KEY"),
    ...(baseUrl === undefined || baseUrl === "" ? {} : { baseUrl }),
  },
  model: {
    id: optional("MODEL_ID", "gpt-5.6-luna"),
  },
  memory: {
    compactionAfterTokens,
    compactionRecentTokens,
  },
  helpdesk: {
    ticketsFile: optional("TICKETS_FILE", "data/tickets.json"),
    requesterId: optional("DEMO_USER_ID", "user_456"),
  },
  studio: {
    port: positiveInteger("STUDIO_PORT", 4021),
  },
} as const;
