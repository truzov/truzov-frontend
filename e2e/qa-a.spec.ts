/* eslint-disable no-console -- a QA evidence script: every API call is logged on purpose */
import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const PSQL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';

function db(sql: string): string {
  return execFileSync(
    PSQL,
    ['-h', 'localhost', '-p', '5434', '-U', 'truzov', '-d', 'truzov', '-t', '-A', '-c', sql],
    { env: { ...process.env, PGPASSWORD: 'truzov_local_password' }, encoding: 'utf8' }
  ).trim();
}

let seq = 0;
function newPhone(): string {
  // 10 digits starting with 9, unique per call
  const tail = String(Date.now()).slice(-8) + String(seq++);
  return ('9' + tail).slice(0, 10);
}

/** Records every backend API response so evidence is real HTTP status codes. */
function trackApi(page: Page, label: string) {
  const calls: string[] = [];
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('/api/v1/')) {
      const line = `${res.status()} ${res.request().method()} ${u.replace('http://localhost:8080', '')}`;
      calls.push(line);
      console.log(`[${label}] API ${line}`);
    }
  });
  return calls;
}

async function fillSignup(
  page: Page,
  o: { name: string; phone: string; password: string; confirm?: string }
) {
  await page.getByLabel('Full Name').fill(o.name);
  await page.getByLabel('Phone Number').fill(o.phone);
  await page.getByLabel('Password', { exact: true }).fill(o.password);
  await page.getByLabel('Confirm Password').fill(o.confirm ?? o.password);
}

test('A1 signup new buyer', async ({ page }) => {
  trackApi(page, 'A1');
  const phone = newPhone();
  console.log('[A1] phone=' + phone);

  await page.goto('/signup');
  await fillSignup(page, { name: 'QA Agent A One', phone, password: 'secret123' });
  await page.getByRole('button', { name: /Create Account/i }).click();

  await page.waitForURL(/\/verify-otp/, { timeout: 15000 });
  console.log('[A1] url after submit=' + page.url());

  const row = db(
    `select phone||'|'||role||'|'||is_verified from users where phone='${phone}'`
  );
  console.log('[A1] DB users row=' + JSON.stringify(row));
  const otp = db(
    `select id||'|'||purpose||'|'||coalesce(used_at::text,'null') from otp_codes where target='${phone}'`
  );
  console.log('[A1] DB otp_codes=' + JSON.stringify(otp));
  console.log('[A1] visible identifier=' + (await page.getByText(phone).first().isVisible()));
});

test('A3 signup invalid input', async ({ page }) => {
  trackApi(page, 'A3');
  await page.goto('/signup');

  // weak password (too short, no digit)
  await fillSignup(page, { name: 'QA Weak', phone: newPhone(), password: 'abc' });
  await page.getByRole('button', { name: /Create Account/i }).click();
  await page.waitForTimeout(1200);
  console.log('[A3-weak] url=' + page.url());
  console.log('[A3-weak] body errors=' + JSON.stringify(
    (await page.locator('form').innerText()).split('\n').filter((l) => /must|least|invalid|required|digit|letter/i.test(l))
  ));

  // bad phone format
  await page.goto('/signup');
  await fillSignup(page, { name: 'QA BadPhone', phone: '12345', password: 'secret123' });
  await page.getByRole('button', { name: /Create Account/i }).click();
  await page.waitForTimeout(1200);
  console.log('[A3-phone] url=' + page.url());
  console.log('[A3-phone] body errors=' + JSON.stringify(
    (await page.locator('form').innerText()).split('\n').filter((l) => /must|least|invalid|required|digit|start|10/i.test(l))
  ));
  expect(page.url()).toContain('/signup');
});
