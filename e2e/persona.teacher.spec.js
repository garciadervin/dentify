/**
 * Persona E2E — DOCENTE. Prerequisito: provisionar el rol con
 * scripts/dev/provision-demo-roles.sql (rol teacher en auth.user_metadata y
 * profiles.role) para la cuenta usada. Credenciales via env PW_TEACHER_EMAIL/PASS.
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PW_TEACHER_EMAIL || '';
const PASSWORD = process.env.PW_TEACHER_PASS || '';

test('docente: panel de docentes con datos', async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!EMAIL || !PASSWORD, 'PW_TEACHER_EMAIL / PW_TEACHER_PASS requeridas');

  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByTestId('email-input').fill(EMAIL);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('metric-streak')).toBeVisible();

  // TODO(verificar ruta): grupo (teacher) index — el direct-goto puede ser '/teacher'
  await page.goto('/teacher');
  await expect(page.getByText('Panel Docente').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/estudiantes/).first()).toBeVisible();
  await page.screenshot({ path: './e2e/artifacts/t-dashboard.png', fullPage: true });
});
