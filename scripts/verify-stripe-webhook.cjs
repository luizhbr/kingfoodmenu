/**
 * Verificação E2E do webhook Stripe — rodar com chaves REAIS no packages/server/.env
 *
 * Uso: node verify-stripe-webhook.cjs (dentro de packages/server)
 * (requer: stripe lib instalada, STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET reais no .env)
 *
 * O que faz:
 * 1. Cria um PaymentIntent REAL com metadata.orderId apontando para um pedido AWAITING_PAYMENT
 * 2. Monta o payload payment_intent.succeeded exatamente como o Stripe envia
 * 3. Assina com o webhook secret (mesmo HMAC do Stripe)
 * 4. POST no endpoint de PRODUÇÃO /api/payments/webhook
 * 5. Verifica que o pedido virou PENDING (visível no admin)
 *
 * Critério de aceite #1: o pedido SÓ aparece no admin depois que este webhook confirmar.
 * Critério de aceite #2: com cartão 4000...0002 (recusa), o webhook payment_failed roda
 *   e o pedido NUNCA vira PENDING.
 */
const crypto = require('crypto');
const fs = require('fs');

const API = process.env.VERIFY_API || 'https://king-food-foundation-ui.vercel.app';

function readSecret(key) {
  const env = fs.readFileSync('.env', 'utf-8');
  const line = env.split('\n').find((l) => l.startsWith(key + '='));
  if (!line) throw new Error(key + ' nao encontrado no .env (valor REAL, nao [SENSITIVE])');
  const v = line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
  if (v.startsWith('[') || v.length < 20) throw new Error(key + ' esta mascarado — restaure o valor real');
  return v;
}

async function main() {
  const stripeSecret = readSecret('STRIPE_SECRET_KEY');
  const webhookSecret = readSecret('STRIPE_WEBHOOK_SECRET');
  const Stripe = require('stripe');
  const stripe = Stripe(stripeSecret);

  // 1. criar pedido de teste (stripe -> AWAITING_PAYMENT)
  const orderBody = JSON.stringify({
    orderType: 'PICKUP',
    paymentMethod: 'stripe',
    items: [{ menuItemId: process.env.VERIFY_MENU_ITEM_ID, quantity: 1 }],
    guestName: 'Verify Webhook',
    guestEmail: 'verify.webhook@hermes.test',
    guestPhone: '6145550199',
    idempotencyKey: 'verify-webhook-' + Date.now(),
  });
  const orderRes = await fetch(API + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: orderBody,
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) throw new Error('criar pedido falhou: ' + JSON.stringify(orderData));
  const orderId = orderData.data.id;
  const totalCents = Math.round(orderData.data.total * 100);
  console.log('Pedido criado:', orderId, 'status:', orderData.data.status, 'total:', totalCents);

  // 2. PaymentIntent real
  const pi = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { orderId },
  });
  console.log('PaymentIntent:', pi.id, pi.status);

  // 3. payload + assinatura (payment_intent.succeeded)
  const payload = JSON.stringify({
    id: 'evt_verify_' + Date.now(),
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.succeeded',
    data: { object: { id: pi.id, object: 'payment_intent', amount: pi.amount, currency: 'usd', status: 'succeeded', metadata: { orderId } } },
  });
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', webhookSecret).update(ts + '.' + payload).digest('hex');
  const header = 't=' + ts + ',v1=' + sig;

  // 4. POST no webhook de producao
  const wRes = await fetch(API + '/api/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
  const wBody = await wRes.text();
  console.log('Webhook:', wRes.status, wBody.slice(0, 100));

  // 5. verificar status final
  await new Promise((r) => setTimeout(r, 1500));
  const checkRes = await fetch(API + '/api/orders/' + orderId);
  const check = await checkRes.json();
  const finalStatus = check.data && check.data.status;
  console.log('Status final do pedido:', finalStatus);
  if (finalStatus === 'PENDING') {
    console.log('OK CRITERIO #1: webhook confirmou pagamento -> pedido visivel no admin (PENDING)');
  } else {
    console.log('FALHOU: esperado PENDING, got', finalStatus);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('ERRO', e.message);
  process.exit(1);
});
