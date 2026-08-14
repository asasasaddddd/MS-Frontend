import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173';
const errors = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
page.on('response', async resp => {
  if (resp.url().includes('/api/system/org-scopes/units') || resp.url().includes('/api/dict/item/listByType')) {
    const ok = resp.ok();
    const status = resp.status();
    console.log(`API ${resp.url()} status=${status} ok=${ok}`);
  }
});

await page.goto(`${BASE}/login`);
await page.getByLabel('工号').fill('U00000000');
await page.getByLabel('密码').fill('Metrology@2024');
await page.getByRole('button', { name: '登 录' }).click();
await page.waitForURL(/system\/permissions|todo/);

if (!page.url().includes('/system/permissions')) {
  await page.goto(`${BASE}/system/permissions`);
}
await page.waitForTimeout(2000);
await page.screenshot({ path: 'F:/MetrologySystem/MS-Frontend/.browser-check-permission-list.png', fullPage: false });

await page.getByRole('button', { name: '配置权限' }).first().click();
await page.waitForTimeout(3000);
await page.screenshot({ path: 'F:/MetrologySystem/MS-Frontend/.browser-check-dialog.png', fullPage: false });

const html = await page.content();
console.log(JSON.stringify({
  url: page.url(),
  hasDialog: html.includes('人员角色配置') || html.includes('作业范围'),
  errors
}, null, 2));

await browser.close();