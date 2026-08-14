# PRINT-AGENT — DEPENDÊNCIA E LICENCIAMENTO

## Código proprietário / SDK de terceiros?

**NÃO.** O print-agent não incorpora SDK proprietário pago, serviço de impressão em nuvem, nem API comercial de terceiros.

Ele se conecta a impressoras térmicas por três caminhos:
1. **OS_PRINTER** — usa apenas a API nativa do Windows (`winspool.drv` via PowerShell P/Invoke). **Zero dependência npm.**
2. **USB** — usa `escpos/adapter/usb` + `usb@1.9.2` (MIT) para envio direto ESC/POS via USB.
3. **NETWORK** — usa `escpos/adapter/network` (MIT) para envio TCP 9100.

O agente NÃO chama serviços externos de impressão, NÃO tem contador de páginas, NÃO exige chave de licença, NÃO tem trial, NÃO cobra por impressão.

---

## Dependências diretas de produção

| Pacote | Versão | Licença | Uso |
|---|---|---|---|
| dotenv | 16.6.1 | BSD-2-Clause | Carregar variáveis de ambiente |
| escpos | 2.5.2 | MIT | Gerar buffer ESC/POS + adaptadores USB/Network |
| iconv-lite | 0.4.24 / 0.6.3 | MIT | Codificação de caracteres |
| usb | 1.9.2 | MIT | Acesso USB direto (usado apenas no modo USB) |

---

## Dependências transitivas relevantes

| Pacote | Licença | Origem |
|---|---|---|
| mutable-buffer | MIT | escpos |
| tslib | 0BSD | mutable-buffer |
| safer-buffer | MIT | iconv-lite |
| node-addon-api | MIT | usb |
| node-gyp-build | MIT | usb |
| serialport | MIT | escpos (optional — não usado pelo agente OS_PRINTER) |
| get-pixels | MIT | escpos (optional — não usado) |
| qr-image | MIT | escpos (optional — não usado) |

---

## Conclusão sobre comercialização no SaaS

Com base na análise das dependências e do código-fonte:

**Você pode vender o print-agent como parte do seu SaaS sem pagar royalties ou licença por impressão.**

As dependências são de licenças permissivas (MIT / BSD-2-Clause / 0BSD). Não há:
- SDK de impressão pago
- Contador de impressões
- Licença por volume
- API de terceiros cobrando por job
- Código proprietário incorporado

**Obrigações:**
- Preservar os avisos de copyright das licenças MIT/BSD nos créditos/documentação.
- Se distribuir binários, incluir os arquivos de licença das bibliotecas nativas (node-addon-api, node-gyp-build).
- Revisar periodicamente se futuras atualizações de `escpos` ou `usb` mudam a licença.

**Recomendação:** adicionar uma seção "Third-party licenses" no painel admin ou na documentação do agente, listando MIT/BSD.
