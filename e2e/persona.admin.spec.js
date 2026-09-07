/**
 * Persona E2E — ADMIN / RECTOR (control de acceso negativo).
 * Hoy no existe UI de administración: el rol 'admin' vive en la BD (políticas de
 * manuales y private.promote_to_teacher). Un estudiante NO debe poder abrir el
 * panel docente (/teacher): el AuthGuard debe redirigirlo a (tabs).
 * TODO: cuando exista superficie admin/rector, añadir aquí sus flujos.
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PW_STUDENT_EMAIL || '';
const PASSWORD = process.env.PW_STUDENT_PASS || '';

test('estudiante NO accede al panel docente', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!EMAIL || !PASSWORD, 'PW_STUDENT_EMAIL / PW_STUDENT_PASS requeridas');

  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByTestId('email-input').fill(EMAIL);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('metric-streak')).toBeVisible();

  // El guard de /teacher redirige a un estudiante fuera del panel.
  await page.goto('/teacher');
  await expect(page).not.toHaveURL(/\/teacher/, { timeout: 20_000 });
  await expect(page.getByText('Panel Docente')).toHaveCount(0);
});
