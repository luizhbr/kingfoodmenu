// ============================================================
// WHATSAPP ADAPTER — ponto de entrada
// ============================================================
// Factory: escolhe o adapter conforme env WHATSAPP_ADAPTER.
//   mock  — desenvolvimento/testes (padrão, NUNCA envia real)
//   meta  — Meta Cloud API oficial (já existente no repo)
//   web   — WhatsApp Web QR (Baileys) — sessão vinculada, não oficial
//
// SEGURANÇA: o adapter web (QR) NÃO é instanciado automaticamente
// em produção. Ele só existe quando WHATSAPP_ADAPTER=web E a
// automação foi autorizada (WHATSAPP_AUTOMATION_ENABLED=true).

import type { MessagingChannel } from './types.js';
import { MockWhatsAppAdapter } from './mock.js';
import { MetaCloudAdapter } from './meta.js';
import { WhatsAppWebAdapter } from './web.js';

export * from './types.js';
export { MockWhatsAppAdapter } from './mock.js';
export { MetaCloudAdapter } from './meta.js';
export { WhatsAppWebAdapter } from './web.js';

export function createChannelAdapter(adapterName?: string): MessagingChannel {
  const name = (adapterName || process.env.WHATSAPP_ADAPTER || 'mock').toLowerCase();
  switch (name) {
    case 'meta':
      return new MetaCloudAdapter();
    case 'web':
      return new WhatsAppWebAdapter();
    case 'mock':
    default:
      return new MockWhatsAppAdapter();
  }
}
