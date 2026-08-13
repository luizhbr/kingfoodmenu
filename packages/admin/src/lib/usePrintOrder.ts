import { useCallback, useState } from 'react';

// ── Hook compartilhado de impressão (PRINT-V1) ──────────────────────────────
// Usa a arquitetura EXISTENTE: POST /api/print/jobs → print-agent → impressora.
// Reutilizado em OrderCard, OrderDetail e KitchenDisplay (COSMIC modularity).

export type PrintState =
  | { status: 'idle' }
  | { status: 'sending'; message: string }
  | { status: 'queued'; message: string }
  | { status: 'printed'; message: string }
  | { status: 'failed'; message: string };

export function usePrintOrder() {
  const token = localStorage.getItem('token') || '';
  const [state, setState] = useState<PrintState>({ status: 'idle' });

  /** Imprime um pedido. type: 'AUTO' (primeira) | 'REPRINT' (reimpressão). */
  const printOrder = useCallback(
    async (orderId: string, type: 'AUTO' | 'REPRINT' = 'AUTO') => {
      setState({ status: 'sending', message: 'Enviando para impressão...' });
      try {
        // 1. Buscar impressoras ativas
        const pres = await fetch('/api/print', { headers: { Authorization: `Bearer ${token}` } });
        if (!pres.ok) throw new Error('Falha ao carregar impressoras');
        const pdata = await pres.json();
        const printers = (pdata.data || []).filter((p: any) => p.enabled);
        if (printers.length === 0) {
          setState({ status: 'failed', message: 'Nenhuma impressora ativa configurada.' });
          return;
        }

        // 2. Criar job na primeira impressora ativa
        const printer = printers[0];
        const res = await fetch('/api/print/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orderId, printerId: printer.id, type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao criar job de impressão');
        const job = data.data;
        setState({ status: 'queued', message: `Impressão enviada (${printer.name}).` });

        // 3. Poll até PRINTED/FAILED (máx 20s)
        const deadline = Date.now() + 20000;
        const poll = async () => {
          try {
            const jres = await fetch(`/api/print/jobs/${job.id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (jres.ok) {
              const jd = await jres.json();
              const j = jd.data;
              if (j.status === 'PRINTED') {
                setState({ status: 'printed', message: 'Impresso ✓' });
                return;
              }
              if (j.status === 'FAILED') {
                setState({ status: 'failed', message: `Falha na impressão: ${j.errorMessage || 'erro desconhecido'}` });
                return;
              }
            }
            if (Date.now() < deadline) {
              setTimeout(poll, 2000);
            } else {
              setState({ status: 'queued', message: 'Impressão enviada — verifique a impressora.' });
            }
          } catch {
            if (Date.now() < deadline) setTimeout(poll, 2000);
          }
        };
        setTimeout(poll, 2000);
      } catch (e: any) {
        setState({ status: 'failed', message: e.message || 'Falha ao imprimir.' });
      }
    },
    [token]
  );

  return { printState: state, printOrder };
}
