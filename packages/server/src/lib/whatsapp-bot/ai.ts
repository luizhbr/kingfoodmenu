// ============================================================
// WHATSAPP BOT — cliente de IA desacoplado
// ============================================================
// Provider: qualquer endpoint OpenAI-compatível (Ollama Cloud,
// OpenAI, Gemini via proxy, etc). Configurado por env vars.
// A IA interpreta linguagem; nunca decide fatos.

import type { BotContext } from './types.js';
import { buildSystemPrompt } from './prompt.js';

export interface AiResult {
  reply: string;
  model: string;
  latencyMs?: number;
  raw?: unknown;
}

function baseUrl(): string {
  return (process.env.AI_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.com').replace(/\/$/, '');
}

function apiKey(): string {
  return process.env.AI_API_KEY || process.env.OLLAMA_API_KEY || '';
}

export function defaultModel(): string {
  return process.env.AI_MODEL || process.env.OLLAMA_MODEL || 'qwen3.5';
}

/** Remove blocos de thinking se o modelo vazar raciocínio. */
function cleanReply(text: string): string {
  let t = String(text || '').trim();
  if (t.includes(' response')) {
    t = t.split(' response').pop()?.trim() || t;
  }
  t = t.replace(/<thinking>[\s\S]*?<\/think>/gi, '').trim();
  t = t.replace(/^thinking:[\s\S]*?\n\n/i, '').trim();
  return t || 'Oi! Já já te respondo 😊';
}

export async function chatWithAi(
  ctx: BotContext,
  userText: string,
  opts?: { timeoutMs?: number; model?: string }
): Promise<AiResult> {
  const key = apiKey();
  const model = opts?.model || defaultModel();
  const url = `${baseUrl()}/api/chat`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 30_000);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt(ctx) },
          { role: 'user', content: userText },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`AI HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const reply = cleanReply(data?.message?.content ?? data?.choices?.[0]?.message?.content ?? '');
    return { reply, model, latencyMs: Date.now() - started, raw: data };
  } catch (err) {
    throw new Error(`AI request failed: ${String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
}
