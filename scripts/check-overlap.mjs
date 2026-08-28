// Script de verificacao de sobreposicao da navbar (admin + storefront)
// Uso: node scripts/check-overlap.mjs
import { chromium } from 'playwright';

const ADMIN = 'http://localhost:5173';
const STORE = 'http://localhost:5174';
// Credenciais via ambiente — nunca versionar segredos em código-fonte.
// Uso: KF_ADMIN_EMAIL=... KF_ADMIN_PASSWORD=... node scripts/check-overlap.mjs
const EMAIL = process.env.KF_ADMIN_EMAIL;
const PASS = process.env.KF_ADMIN_PASSWORD;
if (!EMAIL || !PASS) {
  console.error('check-overlap: defina KF_ADMIN_EMAIL e KF_ADMIN_PASSWORD no ambiente.');
  process.exit(1);
}

const viewports = [
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'tablet-768', w: 768, h: 1024 },
  { name: 'mobile-390', w: 390, h: 844 },
];

async function measureOverlap(page, label) {
  return page.evaluate((label) => {
    const nav = document.querySelector('nav.fixed.bottom-0, nav.kf-bottom-dock');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const result = {
      label,
      viewport: { w: innerWidth, h: innerHeight },
      nav: nav ? {
        top: Math.round(nav.getBoundingClientRect().top),
        bottom: Math.round(nav.getBoundingClientRect().bottom),
        height: Math.round(nav.getBoundingClientRect().height),
        display: getComputedStyle(nav).display,
      } : null,
      main: main ? {
        paddingBottom: getComputedStyle(main).paddingBottom,
        bottom: Math.round(main.getBoundingClientRect().bottom),
      } : null,
      header: header ? {
        height: Math.round(header.getBoundingClientRect().height),
        position: getComputedStyle(header).position,
      } : null,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
    };
    // Ultimo elemento interativo antes do fim do main
    if (main) {
      const els = Array.from(main.querySelectorAll('button, a, [role="button"], input, select, textarea'));
      if (els.length) {
        const last = els[els.length - 1];
        const r = last.getBoundingClientRect();
        result.lastInteractive = {
          tag: last.tagName,
          text: (last.textContent || '').trim().slice(0, 40),
          bottom: Math.round(r.bottom),
        };
      }
    }
    return result;
  }, label);
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  // ============ ADMIN ============
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    try {
      await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle', timeout: 20000 });
      // Login
      const inputs = page.locator('input');
      const count = await inputs.count();
      if (count >= 2) {
        await inputs.nth(0).fill(EMAIL);
        await inputs.nth(1).fill(PASS);
        const btn = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
        await btn.click();
        await page.waitForTimeout(2500);
      }
      // Ir para /pedidos (area com conteudo longo)
      await page.goto(`${ADMIN}/pedidos`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1500);
      // Rolar ate o fim
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const m = await measureOverlap(page, `admin ${vp.name}`);
      results.push(m);
    } catch (e) {
      results.push({ label: `admin ${vp.name}`, error: String(e).slice(0, 200) });
    }
    await ctx.close();
  }

  // ============ STOREFRONT ============
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    try {
      await page.goto(`${STORE}/menu`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const m = await measureOverlap(page, `storefront ${vp.name}`);
      results.push(m);
    } catch (e) {
      results.push({ label: `storefront ${vp.name}`, error: String(e).slice(0, 200) });
    }
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
