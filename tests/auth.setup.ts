import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('autenticar en Discord y guardar sesion', async ({ page }) => {
  // Ir a Discord
  await page.goto('https://discord.com/login');

  // Esperar a que cargue la página de login
  await page.waitForLoadState('networkidle');

  console.log('🔓 Por favor, inicia sesión en Discord manualmente en el navegador...');
  console.log('⏱️  Tienes 5 minutos para completar el login...');

  try {
    // Esperar a que se complete el login detectando que estamos en la página principal
    // Timeout aumentado a 5 minutos (300 segundos)
    await page.waitForURL('https://discord.com/channels/**', { timeout: 300000 });

    // Esperar a que la aplicación haya cargado completamente
    await page.waitForLoadState('networkidle');

    // Guardar el estado de autenticación (cookies, localStorage, etc)
    await page.context().storageState({ path: authFile });

    console.log(`✅ Sesión guardada exitosamente en ${authFile}`);
  } catch (error) {
    console.error('❌ Error durante la autenticación:');
    throw new Error('No se pudo completar el login en Discord. Por favor intenta de nuevo.');
  }
});
