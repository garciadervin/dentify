/**
 * Persona E2E — ADMIN / RECTOR.
 * Hoy no existe UI de administración: el rol 'admin' vive en la BD (políticas de
 * manuales y private.promote_to_teacher). Esta spec verifica el control de acceso
 * negativo: un estudiante NO debe poder abrir el panel docente (se redirige a tabs).
 * TODO: cuando exista superficie admin/rector, añadir aquí sus flujos.
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PW_STUDENT_EMAIL || '';
const PASSWORD = process.env.PW_STUDENT_PASS || '';

test('estudiante NO accede al panel docente', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!EMAIL || !PASSWORD, 'PW_STUDENT_EMAIL / PW_STUDENT_PASS requeridas');

  await page.goto('/');
  await page.getByTestId('email-input').fill(EMAIL);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('metric-streak')).toBeVisible();

  await page.goto('/teacher');
  await page.waitForTimeout(2500);
  // No debe verse el panel docente; el guard redirige a (tabs).
  await expect(page.getByText('Panel Docente')).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/teacher/);
});
