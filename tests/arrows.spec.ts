import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/user.json'
});

test.setTimeout(0); // Sin timeout - ejecución infinita

test('Fabricar y seguir secuencia de flechas - Bucle Infinito', async ({ page }) => {
  await page.goto('https://discord.com/channels/@me');
  await page.getByRole('button', { name: 'Last Meadow en línea' }).click();
  await page.getByRole('button', { name: 'Continuar partida' }).click();

  let roundNumber = 1;

  while (true) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎮 RONDA ${roundNumber} - Fabricar`);
    console.log(`${'='.repeat(60)}`);

    // Esperar a que la página cargue
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

  // Click en Fabricar solo si no existe ningún elemento con class que empiece con .countdownText__
  const countdownExists = await page.locator('[class*="countdownText__"]').count();
  if (countdownExists === 0) {
    console.log('✅ No hay countdown, buscando botón Fabricar...');
    
    // Buscar el primer div con .activityButton__ que NO tenga .disabled__ adentro y que contenga "Fabricar"
    const activityButtons = await page.locator('[class*="activityButton__"]').all();
    console.log(`📍 Encontrados ${activityButtons.length} botones de actividad`);
    
    let fabricarButton = null;
    
    for (const button of activityButtons) {
      const hasDisabled = await button.locator('[class*="disabled__"]').count();
      const text = await button.textContent();
      const containsFabricar = text?.includes('Fabricar') || false;
      
      console.log(`🔍 Revisando botón: "${text}" - ¿Deshabilitado? ${hasDisabled > 0} - ¿Contiene Fabricar? ${containsFabricar}`);
      
      if (hasDisabled === 0 && containsFabricar) {
        fabricarButton = button;
        console.log('✅ Encontrado botón Fabricar habilitado');
        break;
      }
    }
    
    if (!fabricarButton) {
      console.log('⏳ Botón Fabricar no disponible aún, esperando cooldown (hasta 2 minutos)...');
      
      // Esperar hasta 2 minutos a que el botón esté disponible
      let found = false;
      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(1000); // Esperar 1 segundo
        
        const freshButtons = await page.locator('[class*="activityButton__"]').all();
        for (const btn of freshButtons) {
          const disabled = await btn.locator('[class*="disabled__"]').count();
          const btnText = await btn.textContent();
          
          if (disabled === 0 && btnText?.includes('Fabricar')) {
            fabricarButton = btn;
            found = true;
            console.log(`✅ Botón Fabricar disponible después de ${i} segundos`);
            break;
          }
        }
        
        if (found) break;
        
        if (i % 10 === 0 && i > 0) {
          console.log(`⏳ Esperando... ${i}/120 segundos`);
        }
      }
      
      if (!fabricarButton) {
        throw new Error('No se encontró botón Fabricar habilitado después de 2 minutos');
      }
    }
    
    // Captura antes de hacer click
    await page.screenshot({ path: 'screenshot-antes-click.png' });
    console.log('📸 Captura guardada: screenshot-antes-click.png');
    
    // Hacer hover primero
    await fabricarButton.hover();
    console.log('🖱️ Hover realizado');
    await page.waitForTimeout(300);
    
    // Hacer click
    await fabricarButton.click();
    console.log('✅ Click realizado en Fabricar');
    
    // Captura después
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot-despues-click.png' });
    console.log('📸 Captura guardada: screenshot-despues-click.png');
  } else {
    console.log('⏳ Hay countdown activo, esperando...');
    await page.locator('[class*="countdownText__"]').first().waitFor({ state: 'hidden' });
    
    // Buscar el botón Fabricar después del countdown
    const activityButtons = await page.locator('[class*="activityButton__"]').all();
    for (const button of activityButtons) {
      const hasDisabled = await button.locator('[class*="disabled__"]').count();
      const text = await button.textContent();
      
      if (hasDisabled === 0 && text?.includes('Fabricar')) {
        await button.hover();
        await page.waitForTimeout(300);
        await button.click();
        console.log('✅ Click en Fabricar (después de countdown)');
        break;
      }
    }
  }

  // Esperar a que cargue la secuencia
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Loop para completar múltiples secuencias
  let sequenceNumber = 1;
  let hasMoreSequences = true;

  while (hasMoreSequences) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎮 Secuencia ${sequenceNumber}`);
    console.log(`${'='.repeat(50)}`);

    // Esperar a que aparezca el div "Use your arrow keys!"
    console.log('⏳ Esperando secuencia de flechas...');
    try {
      await expect(page.locator('div').filter({ hasText: /^Use your arrow keys!$/ }).first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Secuencia de flechas apareció');
    } catch (e) {
      console.log('❌ No hay más secuencias, finalizando test');
      hasMoreSequences = false;
      break;
    }

    // Obtener todos los caracteres de la secuencia (usando [class*] para ignora los números aleatorios)
    const characters = await page.locator('[class*="sequences__"] [class*="character__"]').all();
    console.log(`🎯 Secuencia encontrada con ${characters.length} pasos`);

    // Obtener la secuencia de teclas desde las imágenes
    const keySequence: string[] = [];
    
    for (let i = 0; i < characters.length; i++) {
      const img = characters[i].locator('img').first();
      const altText = await img.getAttribute('alt');
      console.log(`Paso ${i + 1}: ${altText}`);
      keySequence.push(altText || '');
    }

    // Hacer focus en la página y ejecutar la secuencia de teclas
    await page.locator('body').click();
    
    for (const key of keySequence) {
      // Mapear el texto de las flechas a las teclas
      const keyMap: { [key: string]: string } = {
        'ArrowUp': 'ArrowUp',
        'ArrowDown': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft',
        'ArrowRight': 'ArrowRight',
        'arrowup': 'ArrowUp',
        'arrowdown': 'ArrowDown',
        'arrowleft': 'ArrowLeft',
        'arrowright': 'ArrowRight',
      };

      const pressKey = keyMap[key.toLowerCase()] || key;
      console.log(`⌨️  Presionando: ${pressKey}`);
      await page.locator('body').press(pressKey);
      await page.waitForTimeout(200); // Pequeña pausa entre teclas
    }

    // Esperar a que desaparezca la secuencia actual
    console.log('⏳ Esperando a que desaparezca la secuencia actual...');
    await page.waitForTimeout(1000);

    // Verificar si hay más secuencias SIN hacer click en Continuar
    const nextSequenceExists = await page.locator('div').filter({ hasText: /^Use your arrow keys!$/ }).count();
    
    if (nextSequenceExists === 0) {
      console.log('✅ No hay más secuencias, finalizando secuencias');
      hasMoreSequences = false;
    } else {
      console.log('🔄 Hay más secuencias, continuando...');
      sequenceNumber++;
    }
  }

  // Hacer click en Continuar SOLO CUANDO TERMINE TODO
  console.log('\n⏳ Esperando botón Continuar final...');
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible({ timeout: 10000 });

  console.log('✅ Todas las secuencias completadas, haciendo click en Continuar');
  await page.getByRole('button', { name: 'Continuar' }).click();

  console.log(`✅ Ronda ${roundNumber} completada!\n`);
  roundNumber++;
  
  // Esperar antes de la siguiente ronda
  await page.waitForTimeout(2000);
  }
});