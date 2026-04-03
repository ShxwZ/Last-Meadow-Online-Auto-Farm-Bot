import { test, expect } from '@playwright/test';

test.describe('Discord Autenticado', () => {
  test('abrir interfaz de Discord y explorar', async ({ page }) => {
    console.log('🚀 Iniciando sesión en Discord...');

    // Ir a Discord (ya estarás autenticado por la sesión guardada)
    await page.goto('https://discord.com/channels/@me');

    // Verificar que estamos en la página autenticada
    await expect(page).toHaveURL(/discord\.com\/channels/);

    console.log('✅ Sesión activa en Discord confirmada');

    // Esperar a que cargue completamente
    await page.waitForLoadState('networkidle');

    console.log('\n📊 Información de la página:');
    console.log(`URL: ${page.url()}`);
    console.log(`Título: ${await page.title()}`);

    // Obtener información de los servidores/guilds
    const guildButtons = await page.locator('[role="button"][aria-label*="servidor"], [aria-label*="Servidor"]').count();
    console.log(`\n📡 Servidores encontrados: ${guildButtons}`);

    // Verificar si hay canales visibles
    const channels = await page.locator('[role="link"][aria-label*="canal"], [aria-label*="Canal"]').count();
    console.log(`📢 Canales encontrados: ${channels}`);

    // Obtener el nombre de usuario (si está disponible)
    try {
      const userButton = page.locator('[data-testid="user-profile-button"]');
      if (await userButton.isVisible({ timeout: 2000 })) {
        console.log('👤 Botón de perfil de usuario encontrado');
      }
    } catch (e) {
      // Ignorar si no existe
    }

    // Listar elementos principales de la interfaz
    console.log('\n🔍 Elementos principales encontrados:');
    
    const nav = await page.locator('nav').all();
    console.log(`- Navegación: ${nav.length} elementos`);

    const buttons = await page.locator('button').all();
    console.log(`- Botones: ${buttons.length} elementos`);

    const links = await page.locator('a').all();
    console.log(`- Links: ${links.length} elementos`);

    console.log('\n✨ La interfaz de Discord está lista para explorar!');
    console.log('💡 Tienes 30 segundos para interactuar con el navegador...\n');

    // Mantener el navegador abierto 30 segundos para que puedas explorar
    await page.waitForTimeout(30000);

    console.log('\n✅ Test completado. El navegador se cerrará ahora.');
  });

  test('interactuar con Discord - ejemplo', async ({ page }) => {
    // Ir a Discord
    await page.goto('https://discord.com/channels/@me');
    await page.waitForLoadState('networkidle');

    console.log('📌 Test de interacción con Discord');

    // Aquí puedes hacer más acciones autenticado
    // Ejemplos descomentar y usar:

    // 1. Buscar un servidor específico
    // await page.click('button[aria-label*="Buscar"]');
    // await page.fill('input[placeholder*="Buscar"]', 'nombre-del-servidor');

    // 2. Hacer click en un canal
    // await page.click('a[aria-label*="canal-name"]');

    // 3. Enviar un mensaje
    // await page.fill('div[role="textbox"]', 'Hola desde Playwright!');
    // await page.press('div[role="textbox"]', 'Enter');

    // 4. Ver información del usuario
    // await page.click('[data-testid="user-profile-button"]');

    console.log('✅ Discord está autenticado y listo para automatizar');
  });
});
