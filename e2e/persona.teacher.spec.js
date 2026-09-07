/**
 * Persona E2E — DOCENTE. Requiere una cuenta con rol 'teacher' (metadata + profiles)
 * y al menos un estudiante visible. Credenciales via env PW_TEACHER_EMAIL/PASS.
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PW_TEACHER_EMAIL || '';
const PASSWORD = process.env.PW_TEACHER_PASS || '';

test('docente: panel de docentes con datos', async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!EMAIL || !PASSWORD, 'PW_TEACHER_EMAIL / PW_TEACHER_PASS requeridas');

  // Login: el AuthGuard redirige a los docentes a su panel (/teacher) al entrar.
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByTestId('email-input').fill(EMAIL);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page.getByText('Panel Docente').first()).toBeVisible({ timeout: 45_000 });
  await expect(page).toHaveURL(/\/teacher/);
  await expect(page.getByText(/estudiantes/).first()).toBeVisible();
  await page.screenshot({ path: './e2e/artifacts/t-dashboard.png', fullPage: true });
});
