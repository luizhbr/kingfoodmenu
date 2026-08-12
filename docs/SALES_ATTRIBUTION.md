# Sales Attribution — King Food Foundation

> **Status:** P12 = PASS (2026-08-12)

## Canais suportados

| Canal | Source (enum) |
|-------|---------------|
| Instagram | INSTAGRAM |
| Google Ads | GOOGLE_ADS |
| TikTok | TIKTOK / TIKTOK_ADS |
| WhatsApp | WHATSAPP |
| Email | EMAIL |
| Direct | DIRECT |
| QR Code | QR_CODE |
| Facebook | FACEBOOK / META_ADS |
| Orgânico | ORGANIC |
| Indicação | REFERRAL |
| Influencer | INFLUENCER |
| Custom | CUSTOM |

## First-touch vs Last-touch

- **First touch:** canal que trouxe o cliente pela primeira vez (nunca muda)
- **Last touch:** canal mais recente antes da conversão

## Como chega ao pedido

1. Cliente visita com UTM → `TrackingEvent` + `Attribution` (first/last)
2. Cliente faz pedido → `createOrder` persiste `OrderAttribution`
3. `OrderAttribution` guarda: source, medium, campaign, content, term,
   firstTouchSource, lastTouchSource, landingPage, referrer, conversionPath

## Implementação

- Commit `b43e166` — persist order sales attribution (first/last touch) on createOrder
- Modelo: `OrderAttribution` (orderId único)
- Gap corrigido: frontend capturava UTMs mas backend não persistia

## Evidências

- Pedidos via Instagram/WhatsApp registrados com parâmetros completos
- Verificado em produção (2026-08-12)
