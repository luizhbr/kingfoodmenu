import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5173';

async function addProduct(page, nameSubstring) {
  await page.goto(`${BASE}/menu`);
  await page.waitForLoadState('networkidle');
  const card = page.locator('[data-testid="product-card"]').filter({ hasText: nameSubstring }).first();
  await card.locator('[data-testid="quick-add"]').first().click().catch(async () => {
    await card.click();
    await page.locator('[data-testid="modal-add-to-cart"]').click();
  });
  await expect(page.locator('[data-testid="cart-bar"]')).toBeVisible();
}

test('P0-001: OrderConfirmation item price is not NaN', async ({ page }) => {
  await addProduct(page, 'Guaraná');
  await page.goto(`${BASE}/checkout`);
  await page.fill('[data-testid="guest-name"]', 'QA P0-001');
  await page.fill('[data-testid="guest-email"]', 'qa-p0-001@example.com');
  await page.fill('[data-testid="guest-phone"]', '6145550001');
  await page.click('[data-testid="order-type-pickup"]');
  await page.click('[data-testid="payment-cash"]');
  await page.locator('[data-testid="submit-order-desktop"]').first().click();
  await expect(page).toHaveURL(/\/order\//, { timeout: 20000 });
  await page.waitForTimeout(1000);
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/\$NaN|NaN|undefined/);
});

test('P0-002: Delivery without address shows inline per-field errors', async ({ page }) => {
  await addProduct(page, 'Guaraná');
  await page.goto(`${BASE}/checkout`);
  await page.fill('[data-testid="guest-name"]', 'QA P0-002');
  await page.fill('[data-testid="guest-email"]', 'qa-p0-002@example.com');
  await page.fill('[data-testid="guest-phone"]', '6145550002');
  await page.click('[data-testid="order-type-delivery"]');
  await page.click('[data-testid="payment-cash"]');
  await page.fill('[data-testid="address-line1"]', '');
  await page.fill('[data-testid="address-city"]', '');
  await page.fill('[data-testid="address-state"]', '');
  await page.fill('[data-testid="address-zip"]', '');
  await page.locator('[data-testid="submit-order-desktop"]').first().click();
  await expect(page.locator('[data-testid="address-line1-error"]')).toContainText(/endereço/i);
  await expect(page.locator('[data-testid="address-city-error"]')).toContainText(/cidade/i);
  await expect(page.locator('[data-testid="address-state-error"]')).toContainText(/estado/i);
  await expect(page.locator('[data-testid="address-zip-error"]')).toContainText(/CEP/i);
});
