/**
 * Persona E2E — ESTUDIANTE (full journey) + console audit.
 * Run against the dev server on :8081. Credentials via env (never in repo).
 * The denty-agent call is route-mocked so chat is fast and deterministic.
 * Note: markdown renders as plain <Text> on web (RNW/Markdown compat).
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PW_STUDENT_EMAIL || '';
const PASSWORD = process.env.PW_STUDENT_PASS || '';

test('estudiante: ruta completa sin errores JS', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.route('**/functions/v1/denty-agent', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: 'Respuesta simulada para QA.', sources: [] }) }));

  test.skip(!EMAIL || !PASSWORD, 'PW_STUDENT_EMAIL / PW_STUDENT_PASS requeridas');

  // Redirect sin sesión
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login/);

  // Login → dashboard
  await page.getByTestId('email-input').fill(EMAIL);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('metric-streak')).toBeVisible();
  await page.screenshot({ path: './e2e/artifacts/p1-dashboard.png', fullPage: true });

  // Perfil
  await page.goto('/profile');
  await expect(page.getByText('Editar perfil').first()).toBeVisible();

  // Ajustes
  await page.goto('/settings');
  await expect(page.getByText(/Recordatorios de estudio/)).toBeVisible();

  // Simulador 3D: carga, cambia de diente, zoom/reset sin error
  await page.goto('/simulator');
  await expect(page.getByTestId('model-viewer')).toBeVisible();
  await expect(page.getByTestId('model-error')).toHaveCount(0);
  await page.getByTestId('tooth-12').click();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('model-error')).toHaveCount(0);
  await page.getByTestId('reset-view').click();
  await page.getByTestId('zoom-in').click();
  await page.screenshot({ path: './e2e/artifacts/p2-simulator.png' });

  // Chat: crear + borrar conversación (modal de confirmación) y persistencia
  await page.goto('/chat');
  await expect(page.getByTestId('chat-input')).toBeVisible();
  const created = `QA ${Date.now()}`;
  await page.getByTestId('chat-input').fill(created);
  await page.getByTestId('send-button').click();
  await expect(page.getByText(created).first()).toBeVisible({ timeout: 30_000 });

  await page.getByTestId('conversations-button').click();
  const rows = page.locator('[data-testid^="delete-conversation-"]');
  const before = await rows.count();
  expect(before).toBeGreaterThan(0);
  await rows.first().click();
  await expect(page.getByTestId('confirm-delete')).toBeVisible();
  await page.getByTestId('confirm-delete').click();
  await expect(rows).toHaveCount(before - 1);
  await page.reload();
  await page.getByTestId('conversations-button').click();
  await expect(page.getByText(created)).toHaveCount(0);
  await page.screenshot({ path: './e2e/artifacts/p3-chat-deleted.png' });

  // Quiz
  await page.goto('/quiz/Operatoria%20Dental-1');
  await page.waitForTimeout(1500);

  // Consola: 0 errores JS
  const serious = errors.filter((e) => !/favicon|sourcemap/i.test(e));
  console.log(`CONSOLE errors: ${serious.length}`);
  serious.slice(0, 5).forEach((e) => console.log('ERR>', e));
  expect(serious, `JS errors:\n${serious.join('\n')}`).toEqual([]);
});
