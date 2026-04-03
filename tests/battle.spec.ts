import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/user.json'
});

test.setTimeout(0); // Sin timeout - ejecución infinita

test('Batalla - Bloquear proyectiles con escudo - Bucle Infinito', async ({ page }) => {
  await page.goto('https://discord.com/channels/@me');
  await page.getByRole('button', { name: 'Last Meadow en línea' }).click();
  await page.getByRole('button', { name: 'Continuar partida' }).click();

  let roundNumber = 1;

  while (true) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎮 RONDA ${roundNumber} - Batalla`);
    console.log(`${'='.repeat(60)}`);

    // Esperar a que la página cargue
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

  // Buscar el botón Batalla
  const countdownExists = await page.locator('[class*="countdownText__"]').count();
  if (countdownExists === 0) {
    console.log('✅ No hay countdown, buscando botón Batalla...');
    
    const activityButtons = await page.locator('[class*="activityButton__"]').all();
    console.log(`📍 Encontrados ${activityButtons.length} botones de actividad`);
    
    let batallaButton = null;
    
    for (const button of activityButtons) {
      const hasDisabled = await button.locator('[class*="disabled__"]').count();
      const text = await button.textContent();
      const containsBatalla = text?.includes('Batalla') || false;
      
      console.log(`🔍 Revisando botón: "${text}" - ¿Deshabilitado? ${hasDisabled > 0} - ¿Contiene Batalla? ${containsBatalla}`);
      
      if (hasDisabled === 0 && containsBatalla) {
        batallaButton = button;
        console.log('✅ Encontrado botón Batalla habilitado');
        break;
      }
    }
    
    if (!batallaButton) {
      console.log('⏳ Botón Batalla no disponible aún, esperando cooldown (hasta 3 minutos)...');
      
      // Esperar hasta 3 minutos a que el botón esté disponible
      let found = false;
      for (let i = 0; i < 180; i++) {
        await page.waitForTimeout(1000); // Esperar 1 segundo
        
        const freshButtons = await page.locator('[class*="activityButton__"]').all();
        for (const btn of freshButtons) {
          const disabled = await btn.locator('[class*="disabled__"]').count();
          const btnText = await btn.textContent();
          
          if (disabled === 0 && btnText?.includes('Batalla')) {
            batallaButton = btn;
            found = true;
            console.log(`✅ Botón Batalla disponible después de ${i} segundos`);
            break;
          }
        }
        
        if (found) break;
        
        if (i % 30 === 0 && i > 0) {
          console.log(`⏳ Esperando... ${i}/180 segundos`);
        }
      }
      
      if (!batallaButton) {
        throw new Error('No se encontró botón Batalla habilitado después de 3 minutos');
      }
    }
    
    console.log('📸 Captura guardada: screenshot-antes-batalla.png');
    await page.screenshot({ path: 'screenshot-antes-batalla.png' });
    
    // Hacer hover primero
    await batallaButton.hover();
    console.log('🖱️ Hover realizado');
    await page.waitForTimeout(300);
    
    // Hacer click
    await batallaButton.click();
    console.log('✅ Click realizado en Batalla');
    
    // Esperar un poco
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot-despues-batalla-click.png' });
  } else {
    console.log('⏳ Hay countdown activo, esperando...');
    await page.locator('[class*="countdownText__"]').first().waitFor({ state: 'hidden' });
    
    // Buscar el botón Batalla después del countdown
    const activityButtons = await page.locator('[class*="activityButton__"]').all();
    for (const button of activityButtons) {
      const hasDisabled = await button.locator('[class*="disabled__"]').count();
      const text = await button.textContent();
      
      if (hasDisabled === 0 && text?.includes('Batalla')) {
        await button.hover();
        await page.waitForTimeout(300);
        await button.click();
        console.log('✅ Click en Batalla (después de countdown)');
        break;
      }
    }
  }

  // Esperar a que cargue el juego de batalla
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Esperar a que aparezca el contenedor del juego
  console.log('⏳ Esperando arena de batalla...');
  try {
    await expect(page.locator('[class*="shaker_"]').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Arena de batalla apareció');
  } catch (e) {
    console.log('❌ Arena de batalla NO apareció');
    await page.screenshot({ path: 'screenshot-no-batalla.png' });
    throw e;
  }

  // Obtener el escudo
  const shield = page.locator('[class*="shield_"]').first();
  await expect(shield).toBeVisible();

  console.log('🛡️ Escudo detectado, iniciando defensa...');

  // Loop para detectar y bloquear proyectiles hasta que desaparezca el escudo
  let projectilesBlocked = 0;
  const maxBattleTime = 240000; // 4 minutos máximo de batalla
  const startTime = Date.now();
  let noProjectilesCounter = 0; // Contador para detectar fin de batalla

  while ((Date.now() - startTime) < maxBattleTime) {
    try {
      // Verificar si el escudo aún existe
      const shieldExists = await page.locator('[class*="shield_"]').count().catch(() => 0);
      if (shieldExists === 0) {
        console.log('✅ Escudo desapareció, batalla terminada!');
        break;
      }

      // Obtener todos los proyectiles actuales
      const projectiles = await page.locator('[class*="projectile_"]').all().catch(() => []);
      
      // Si no hay proyectiles, incrementar contador
      if (projectiles.length === 0) {
        noProjectilesCounter++;
        
        // Si llevan más de 20 iteraciones sin proyectiles, probablemente terminó
        if (noProjectilesCounter > 20) {
          console.log('✅ No hay proyectiles durante 20 iteraciones, batalla parece terminada!');
          break;
        }
        
        await page.waitForTimeout(20).catch(() => {});
        continue;
      }

      // Reiniciar contador si hay proyectiles
      noProjectilesCounter = 0;

      // Obtener posición actual del escudo
      const shieldBox = await shield.boundingBox().catch(() => null);
      if (!shieldBox) {
        await page.waitForTimeout(20).catch(() => {});
        continue;
      }

      const shieldCenterX = shieldBox.x + shieldBox.width / 2;
      const shieldCenterY = shieldBox.y + shieldBox.height / 2;

      // Encontrar el proyectil que está MÁS CERCA (más alto top value = más cerca del escudo)
      let closestProjectile = null;
      let maxTop = -Infinity; // Buscar el top más grande (más cercano)

      for (let i = 0; i < projectiles.length; i++) {
        try {
          const projectile = projectiles[i];
          const style = await projectile.getAttribute('style').catch(() => null);
          
          if (!style) continue;

          // Extraer coordenadas left y top
          const leftMatch = style.match(/left:\s*([-\d.]+)px/);
          const topMatch = style.match(/top:\s*([-\d.]+)px/);

          if (leftMatch && topMatch) {
            const left = parseFloat(leftMatch[1]);
            const top = parseFloat(topMatch[1]);

            // Solo considerar proyectiles que estén cayendo (entre 0 y cerca del escudo)
            // y que sean los más cercanos (mayor valor de top)
            if (top >= 0 && top < shieldCenterY + 200 && top > maxTop) {
              maxTop = top;
              closestProjectile = { x: left, y: top };
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Si hay un proyectil cercano, mover el escudo horizontalmente debajo
      if (closestProjectile) {
        try {
          // Mover solo horizontalmente (left/right) para posicionarse bajo el proyectil
          await page.mouse.move(closestProjectile.x, shieldCenterY).catch(() => {});
          
          // Hacer click para asegurar respuesta
          await page.mouse.click(closestProjectile.x, shieldCenterY).catch(() => {});
          
          projectilesBlocked++;
        } catch (e) {
          // Ignorar errores de movimiento
        }
      }

      // Pausa muy pequeña
      await page.waitForTimeout(20).catch(() => {});
    } catch (e) {
      // Si el contexto se cerró, la batalla terminó
      if (e.message?.includes('closed') || e.message?.includes('Target page')) {
        console.log('✅ Página cerrada, batalla terminada!');
        break;
      }
      await page.waitForTimeout(20).catch(() => {});
      continue;
    }
  }

  console.log(`\n🎉 Batalla completada! Proyectiles bloqueados: ${projectilesBlocked}`);
  
  // Esperar a que cargue la pantalla de resultado
  console.log('⏳ Esperando pantalla de resultado...');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  
  // Captura final
  await page.screenshot({ path: 'screenshot-batalla-terminada.png' });

  // Esperar a que aparezca el botón Continuar
  console.log('⏳ Esperando botón Continuar (hasta 30 segundos)...');
  try {
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible({ timeout: 30000 });
    console.log('✅ Botón Continuar encontrado');
    
    // Hacer click en Continuar
    await page.getByRole('button', { name: 'Continuar' }).click();
    console.log('✅ Click en Continuar realizado');
  } catch (e) {
    console.log('⚠️ No se encontró botón Continuar después de 30 segundos');
    // Intentar hacer screenshot para debuggear
    await page.screenshot({ path: 'screenshot-no-continuar.png' }).catch(() => {});
  }

  console.log(`✅ Ronda ${roundNumber} completada!\n`);
  roundNumber++;
  
  // Esperar antes de la siguiente ronda
  await page.waitForTimeout(2000);
  }
});
