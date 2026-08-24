// ============================================================
// WHATSAPP SESSION — persistência segura da sessão do adapter web
// ============================================================
// A sessão do WhatsApp (creds + chaves signal) NUNCA pode:
//   - ir para o frontend
//   - ser retornada pela API
//   - ir para o Git
//   - ir para logs
//   - ser impressa no console
//
// Persistência: arquivo único criptografado AES-256-GCM no disco,
// com chave derivada de WHATSAPP_SESSION_ENCRYPTION_KEY (ENV).
// Se a ENV mudar, a sessão fica ilegível -> novo QR (comportamento
// intencional: troca de chave invalida a sessão local).
//
// Uso: esta camada é usada pelo WhatsAppWebAdapter; também expõe
// helpers para o admin consultar status da sessão SEM expor dados.

import crypto from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';

function getSessionDir(): string {
  return process.env.WHATSAPP_SESSION_DIR || join(process.cwd(), '.whatsapp-session');
}
function getAuthFile(): string {
  return join(getSessionDir(), 'auth.enc.json');
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret || 'king-food-session-dev-only').digest();
}

export interface SessionStatus {
  exists: boolean;
  sizeBytes: number;
  /** hash curto do conteúdo (para detectar mudanças) — nunca o conteúdo */
  sha256: string;
  lastModifiedAt: string | null;
}

export function sessionStatus(): SessionStatus {
  try {
    if (!existsSync(getAuthFile())) {
      return { exists: false, sizeBytes: 0, sha256: '', lastModifiedAt: null };
    }
    const buf = readFileSync(getAuthFile());
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    return {
      exists: true,
      sizeBytes: buf.length,
      sha256: hash,
      lastModifiedAt: new Date((statSafe()?.mtimeMs || 0)).toISOString(),
    };
  } catch (err) {
    return { exists: false, sizeBytes: 0, sha256: '', lastModifiedAt: null };
  }
}

function statSafe() {
  try { return statSync(getAuthFile()); } catch { return null; }
}

/** Remove a sessão do disco (logout). */
export function clearSession(): void {
  try { rmSync(getSessionDir(), { recursive: true, force: true }); } catch { /* noop */ }
}

export { getSessionDir, getAuthFile };
