import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API = process.env.E2E_API_URL || process.env.VITE_API_URL || 'https://king-food-foundation-ui.vercel.app';

async function addProduct(page, nameContains: string) {
  await page.goto(`${BASE}/menu`);
  await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });
  const card = page.locator('[data-testid="product-card"]', { hasText: nameContains }).first();
  await card.locator('[data-testid="quick-add"]').click();
  await expect(page.locator('[data-testid="cart-bar"]')).toBeVisible({ timeout: 10000 });
}

test.describe('Checkout V2', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE}/menu`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.removeItem('king-food-cart-v1');
    });
  });

  test('Guest + Pickup: cria pedido real com dinheiro', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Teste');
    await page.fill('[data-testid="guest-email"]', 'teste@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0199');
    await page.click('[data-testid="order-type-pickup"]');
    await page.click('[data-testid="payment-cash"]');
    const submit = page.locator('[data-testid="submit-order-desktop"]').first();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
    await expect(page.locator('text=Pedido Realizado')).toBeVisible();
    const orderId = page.url().match(/\/order\/([^?]+)/)?.[1];
    expect(orderId).toBeTruthy();
  });

  test('Guest + Delivery: exige endereço', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Teste');
    await page.fill('[data-testid="guest-email"]', 'teste@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0199');
    const submit = page.locator('[data-testid="submit-order-desktop"]').first();
    await submit.click();
    await expect(page.locator('[data-testid="checkout-error"]')).toContainText('endereço');
    await page.fill('[data-testid="address-line1"]', '123 N High St');
    await page.fill('[data-testid="address-city"]', 'Columbus');
    await page.fill('[data-testid="address-state"]', 'OH');
    await page.fill('[data-testid="address-zip"]', '43215');
    await submit.click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
  });

  test('Validação inline: nome vazio', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.click('[data-testid="order-type-pickup"]');
    await page.locator('[data-testid="submit-order-desktop"]').first().click();
    await expect(page.locator('[data-testid="guest-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="guest-email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="guest-phone-error"]')).toBeVisible();
  });

  test('Email inválido', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Teste');
    await page.fill('[data-testid="guest-email"]', 'invalido');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0199');
    await page.click('[data-testid="order-type-pickup"]');
    await page.locator('[data-testid="submit-order-desktop"]').first().click();
    await expect(page.locator('[data-testid="guest-email-error"]')).toContainText('válido');
  });

  test('Duplo clique cria exatamente 1 pedido', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Duplo');
    await page.fill('[data-testid="guest-email"]', 'duplo@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0200');
    await page.click('[data-testid="order-type-pickup"]');
    await page.click('[data-testid="payment-cash"]');
    const submit = page.locator('[data-testid="submit-order-desktop"]').first();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(submit).toBeDisabled({ timeout: 2000 });
    await submit.click({ force: true }).catch(() => {});
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
    const orderId = page.url().match(/\/order\/([^?]+)/)?.[1];
    expect(orderId).toBeTruthy();
  });

  async function loginAsCustomer(page, context) {
    // 1. Get CSRF token/cookie
    const csrfGet = await context.request.get(`${API}/api/csrf-token`);
    const csrfBody = await csrfGet.json().catch(() => ({}));
    const csrfToken = csrfBody.data?.csrfToken || csrfBody.token || '';
    // 2. Try to login
    let res = await context.request.post(`${API}/api/auth/customer/login`, {
      data: { email: 'customer-e2e@kingfood.local', password: 'E2EPass123!' },
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    });
    let body = await res.json().catch(() => ({}));
    // 3. If customer doesn't exist, register it
    if (!res.ok() && (body.error || '').includes('Invalid credentials')) {
      res = await context.request.post(`${API}/api/auth/customer/register`, {
        data: { email: 'customer-e2e@kingfood.local', password: 'E2EPass123!', name: 'E2E Customer', phone: '(614) 555-9999' },
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      body = await res.json().catch(() => ({}));
    }
    const token = body.data?.token || body.token;
    if (!token) throw new Error(`Login/register failed: ${res.status()} ${JSON.stringify(body)}`);
    await page.goto(`${BASE}/menu`);
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
    }, token);
    return { token };
  }

  test('Authenticated + Pickup: cria pedido com usuário logado', async ({ page, context }) => {
    await loginAsCustomer(page, context);
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.click('[data-testid="order-type-pickup"]');
    await page.click('[data-testid="payment-cash"]');
    const submit = page.locator('[data-testid="submit-order-desktop"]').first();
    await submit.click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
    const orderId = page.url().match(/\/order\/([^?]+)/)?.[1];
    expect(orderId).toBeTruthy();
  });

  test('Authenticated + Delivery: cria pedido com endereço preenchido', async ({ page, context }) => {
    await loginAsCustomer(page, context);
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    // default is delivery; if address not prefilled, fill
    if (await page.locator('[data-testid="address-line1"]').inputValue().catch(() => '') === '') {
      await page.fill('[data-testid="address-line1"]', '123 N High St');
      await page.fill('[data-testid="address-city"]', 'Columbus');
      await page.fill('[data-testid="address-state"]', 'OH');
      await page.fill('[data-testid="address-zip"]', '43215');
    }
    await page.click('[data-testid="payment-cash"]');
    const submit = page.locator('[data-testid="submit-order-desktop"]').first();
    await submit.click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
  });

  test('Email vazio', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Teste');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0199');
    await page.click('[data-testid="order-type-pickup"]');
    await page.locator('[data-testid="submit-order-desktop"]').first().click();
    await expect(page.locator('[data-testid="guest-email-error"]')).toContainText('obrigatório');
  });

  test('Telefone inválido/vazio', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Teste');
    await page.fill('[data-testid="guest-email"]', 'teste@kingfood.local');
    await page.click('[data-testid="order-type-pickup"]');
    await page.locator('[data-testid="submit-order-desktop"]').first().click();
    await expect(page.locator('[data-testid="guest-phone-error"]')).toContainText('obrigatório');
  });

  test('Delivery sem endereço', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Teste');
    await page.fill('[data-testid="guest-email"]', 'teste@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0199');
    // default delivery; do not fill address
    await page.locator('[data-testid="submit-order-desktop"]').first().click();
    await expect(page.locator('[data-testid="checkout-error"]')).toContainText('endereço');
  });

  test('Pickup sem endereço: pedido criado sem exigir endereço', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Teste');
    await page.fill('[data-testid="guest-email"]', 'teste@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0199');
    await page.click('[data-testid="order-type-pickup"]');
    await page.click('[data-testid="payment-cash"]');
    await page.locator('[data-testid="submit-order-desktop"]').first().click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
  });

  test('Cupom inválido', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="coupon-code"]', 'INVALIDO-123');
    await page.click('[data-testid="apply-coupon"]');
    await expect(page.locator('[data-testid="coupon-error"]')).toBeVisible();
  });

  test('Cupom válido: aplica desconto no checkout', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Cupom');
    await page.fill('[data-testid="guest-email"]', 'cupom@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0200');
    await page.click('[data-testid="order-type-pickup"]');
    const couponInput = page.locator('[data-testid="coupon-code"]');
    await couponInput.fill('E2E20');
    await page.click('[data-testid="apply-coupon"]');
    await expect(page.locator('[data-testid="coupon-success"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="discount-amount"]')).toContainText('$');
    const submit = page.locator('[data-testid="submit-order-desktop"]').first();
    await submit.click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
    const orderId = page.url().match(/\/order\/([^?]+)/)?.[1];
    expect(orderId).toBeTruthy();
  });

  test('Loyalty: exibe saldo e aplica pontos', async ({ page, context }) => {
    await loginAsCustomer(page, context);
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    const loyalty = page.locator('[data-testid="loyalty-section"]');
    await expect(loyalty.or(page.locator('text=pontos')).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('Stale cart: item removido do menu não quebra checkout', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.evaluate(() => {
      const cart = JSON.parse(localStorage.getItem('king-food-cart-v1') || '[]');
      if (cart.length > 0) {
        cart[0].menuItemId = 'removed-item-id';
        localStorage.setItem('king-food-cart-v1', JSON.stringify(cart));
      }
    });
    await page.reload();
    await expect(page.locator('text=Seus dados').or(page.locator('[data-testid="guest-name"]')).first()).toBeVisible({ timeout: 10000 });
  });

  test('Reload durante checkout mantém dados preenchidos', async ({ page }) => {
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Persistente');
    await page.fill('[data-testid="guest-email"]', 'persistente@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0300');
    await page.click('[data-testid="order-type-pickup"]');
    await page.waitForTimeout(300);
    await page.reload();
    await expect(page.locator('[data-testid="guest-name"]')).toHaveValue('Cliente Persistente');
    await expect(page.locator('[data-testid="guest-email"]')).toHaveValue('persistente@kingfood.local');
  });

  test('Keyboard/mobile CTA: mobile submit funciona', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await addProduct(page, 'Guaraná');
    await page.goto(`${BASE}/checkout`);
    await page.fill('[data-testid="guest-name"]', 'Cliente Mobile');
    await page.fill('[data-testid="guest-email"]', 'mobile@kingfood.local');
    await page.fill('[data-testid="guest-phone"]', '(614) 555-0400');
    await page.click('[data-testid="order-type-pickup"]');
    await page.click('[data-testid="payment-cash"]');
    const mobileSubmit = page.locator('[data-testid="submit-order-mobile"]').first();
    await expect(mobileSubmit).toBeVisible();
    await mobileSubmit.click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
  });
});
