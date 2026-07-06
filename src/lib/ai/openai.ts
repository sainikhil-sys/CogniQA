import { logger } from '@/lib/logger';

/**
 * OpenAI client — the platform's active AI provider.
 *
 * Every function here performs a REAL API call. When OPENAI_API_KEY is not
 * configured, callers receive AIConfigurationError and must surface an
 * explicit "not configured" state. There are no simulated fallbacks.
 */

export class AIConfigurationError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not configured. Add a valid OpenAI API key to your environment to enable AI features.');
    this.name = 'AIConfigurationError';
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.startsWith('sk-')) {
    throw new AIConfigurationError();
  }
  return key;
}

export function isAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.startsWith('sk-'));
}

async function openaiFetch(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`https://api.openai.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.error({ status: res.status, path, detail: detail.slice(0, 500) }, 'OpenAI API request failed');
    throw new Error(`OpenAI API error (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res;
}

/** Embed a batch of texts (max ~100 inputs per call). Returns 1536-dim vectors. */
export async function getEmbeddings(texts: string[]): Promise<{ vectors: number[][]; tokensUsed: number }> {
  if (texts.length === 0) return { vectors: [], tokensUsed: 0 };
  const res = await openaiFetch('/embeddings', { input: texts, model: EMBEDDING_MODEL });
  const data = (await res.json()) as {
    data: { index: number; embedding: number[] }[];
    usage: { total_tokens: number };
  };
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return { vectors: sorted.map((d) => d.embedding), tokensUsed: data.usage?.total_tokens ?? 0 };
}

export async function getEmbedding(text: string): Promise<{ vector: number[]; tokensUsed: number }> {
  const { vectors, tokensUsed } = await getEmbeddings([text]);
  return { vector: vectors[0], tokensUsed };
}

/** Non-streaming chat completion. */
export async function chatComplete(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; jsonMode?: boolean } = {}
): Promise<{ content: string; tokensUsed: number }> {
  const res = await openaiFetch('/chat/completions', {
    model: CHAT_MODEL,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 2048,
    ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage: { total_tokens: number };
  };
  return {
    content: data.choices[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}
