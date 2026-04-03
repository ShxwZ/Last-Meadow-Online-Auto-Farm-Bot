import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/user.json',
  headless: false
});

test.setTimeout(0); // Sin timeout - ejecución infinita

// Función para generar delays aleatorios más humanos
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Función para simular movimiento más natural del ratón
async function humanLikeMouseMove(page: any, fromX: number, fromY: number, toX: number, toY: number) {
  const steps = randomDelay(5, 15);
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const x = fromX + (toX - fromX) * progress;
    const y = fromY + (toY - fromY) * progress;
    await page.mouse.move(x, y);
    await page.waitForTimeout(randomDelay(10, 30));
  }
}

test('Minijuegos Infinitos - Fabricar o Batalla', async ({ page }) => {
  // Establecer tamaño del navegador
  await page.setViewportSize({ width: 870, height: 626 });

  await page.goto('https://discord.com/channels/@me');
  await page.getByRole('button', { name: 'Last Meadow en línea' }).click();
  await page.getByRole('button', { name: 'Continuar partida' }).click();

  let roundNumber = 1;

  while (true) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎮 RONDA ${roundNumber}`);
    console.log(`${'='.repeat(60)}`);

    // Esperar a que la página cargue
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Detectar qué botón está disponible
    let gameType = null;
    let gameButton = null;

    // Esperar a que no haya countdown
    let countdownVisible = await page.locator('[class*="countdownText__"]').isVisible().catch(() => false);
    if (countdownVisible) {
      console.log('⏳ Hay contador visible, esperando...');
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(randomDelay(800, 1200)); // Delay aleatorio esperando contador
        const stillVisible = await page.locator('[class*="countdownText__"]').isVisible().catch(() => false);
        if (!stillVisible) {
          console.log(`✅ Contador desapareció después de ${i}s`);
          break;
        }
      }
    }

    // Buscar botones disponibles
    const activityButtons = await page.locator('[class*="activityButton__"]').all();
    console.log(`🔍 Se encontraron ${activityButtons.length} botones de actividad`);
    
    // Buscar Fabricar primero
    for (const button of activityButtons) {
      const hasDisabled = await button.locator('[class*="disabled__"]').count();
      const text = await button.textContent();
      
      console.log(`   - Botón: "${text?.substring(0, 30)}" - Deshabilitado: ${hasDisabled > 0}`);
      
      if (hasDisabled === 0 && text?.includes('Fabricar')) {
        gameType = 'Fabricar';
        gameButton = button;
        console.log('🎯 Encontrado: Fabricar disponible');
        break;
      }
    }

    // Si no hay Fabricar, buscar Batalla
    if (!gameType) {
      for (const button of activityButtons) {
        const hasDisabled = await button.locator('[class*="disabled__"]').count();
        const text = await button.textContent();
        
        if (hasDisabled === 0 && text?.includes('Batalla')) {
          gameType = 'Batalla';
          gameButton = button;
          console.log('🎯 Encontrado: Batalla disponible');
          break;
        }
      }
    }

    // Si ninguno está disponible, esperar
    if (!gameType) {
      console.log('⏳ Esperando a que se habilite un minijuego...');
      for (let i = 0; i < 180; i++) {
        await page.waitForTimeout(1000);
        
        const freshButtons = await page.locator('[class*="activityButton__"]').all();
        
        // Buscar Fabricar
        for (const btn of freshButtons) {
          const disabled = await btn.locator('[class*="disabled__"]').count();
          const btnText = await btn.textContent();
          
          if (disabled === 0 && btnText?.includes('Fabricar')) {
            gameType = 'Fabricar';
            gameButton = btn;
            console.log(`✅ Fabricar disponible después de ${i}s`);
            break;
          }
        }

        // Si encontramos Fabricar, salir
        if (gameType) break;

        // Buscar Batalla
        for (const btn of freshButtons) {
          const disabled = await btn.locator('[class*="disabled__"]').count();
          const btnText = await btn.textContent();
          
          if (disabled === 0 && btnText?.includes('Batalla')) {
            gameType = 'Batalla';
            gameButton = btn;
            console.log(`✅ Batalla disponible después de ${i}s`);
            break;
          }
        }

        if (gameType) break;
        
        if (i % 30 === 0 && i > 0) {
          console.log(`⏳ Esperando... ${i}/180 segundos`);
        }
      }

      if (!gameType) {
        throw new Error('No se encontró ningún minijuego disponible');
      }
    }

    // Esperar un poco antes de ejecutar - simular que el jugador está leyendo/pensando
    console.log('🤔 Preparándose para jugar...');
    await page.waitForTimeout(randomDelay(1500, 4000));

    // Click en el botón
    if (gameButton) {
      await gameButton.hover();
      await page.waitForTimeout(randomDelay(200, 600)); // Delay aleatorio al hover
      await gameButton.click();
      console.log(`✅ Click en ${gameType}`);
    }

    // Esperar a que cargue
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(randomDelay(1500, 3500)); // Delay aleatorio entre juegos

    // FABRICAR - Secuencias de flechas
    if (gameType === 'Fabricar') {
      let sequenceNumber = 1;
      let hasMoreSequences = true;

      while (hasMoreSequences) {
        try {
          await expect(page.locator('div').filter({ hasText: /^Use your arrow keys!$/ }).first()).toBeVisible({ timeout: 10000 });
          
          const characters = await page.locator('[class*="sequences__"] [class*="character__"]').all();
          console.log(`🎯 Secuencia ${sequenceNumber}: ${characters.length} pasos`);

          const keySequence: string[] = [];
          
          for (let i = 0; i < characters.length; i++) {
            const img = characters[i].locator('img').first();
            const altText = await img.getAttribute('alt');
            keySequence.push(altText || '');
          }

          await page.locator('body').click();
          
          for (const key of keySequence) {
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
            await page.locator('body').press(pressKey);
            await page.waitForTimeout(randomDelay(150, 350)); // Delay aleatorio entre teclas
          }

          await page.waitForTimeout(randomDelay(800, 1500)); // Delay antes de siguiente secuencia
          const nextSequenceExists = await page.locator('div').filter({ hasText: /^Use your arrow keys!$/ }).count();
          
          if (nextSequenceExists === 0) {
            hasMoreSequences = false;
          } else {
            sequenceNumber++;
          }
        } catch (e) {
          hasMoreSequences = false;
        }
      }
    }

    // BATALLA - Bloquear proyectiles
    if (gameType === 'Batalla') {
      const maxBattleTime = 240000;
      const battleStartTime = Date.now();
      let projectilesBlocked = 0;

      while ((Date.now() - battleStartTime) < maxBattleTime) {
        // Revisar si el botón continuar ya apareció
        const continueButtonExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
        if (continueButtonExists > 0) {
          console.log(`✅ Batalla completada! Proyectiles bloqueados: ${projectilesBlocked}`);
          break;
        }

        // Mover ratón de izquierda a derecha para coger proyectiles
        const viewport = page.viewportSize();
        if (viewport) {
          // Barrer de izquierda a derecha
          for (let x = 100; x < viewport.width - 100; x += randomDelay(30, 70)) { // Pasos aleatorios
            await page.mouse.move(x, viewport.height - 150).catch(() => {});
            await page.mouse.click(x, viewport.height - 150).catch(() => {});
            await page.waitForTimeout(randomDelay(15, 50)).catch(() => {}); // Delay aleatorio

            // Verificar si continuar apareció durante el barrido
            const btnExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
            if (btnExists > 0) {
              projectilesBlocked++;
              console.log(`✅ Batalla completada! Proyectiles bloqueados: ${projectilesBlocked}`);
              break;
            }
          }

          // Si continuar apareció, salir del loop exterior
          const btnExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
          if (btnExists > 0) break;

          // Pequeño delay aleatorio entre direcciones
          await page.waitForTimeout(randomDelay(100, 300)).catch(() => {});

          // Barrer de derecha a izquierda
          for (let x = viewport.width - 100; x > 100; x -= randomDelay(30, 70)) { // Pasos aleatorios
            await page.mouse.move(x, viewport.height - 150).catch(() => {});
            await page.mouse.click(x, viewport.height - 150).catch(() => {});
            await page.waitForTimeout(randomDelay(15, 50)).catch(() => {}); // Delay aleatorio

            // Verificar si continuar apareció durante el barrido
            const btnExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
            if (btnExists > 0) {
              projectilesBlocked++;
              console.log(`✅ Batalla completada! Proyectiles bloqueados: ${projectilesBlocked}`);
              break;
            }
          }

          // Si continuar apareció, salir del loop exterior
          const btnExists2 = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
          if (btnExists2 > 0) break;
        }
      }
    }

    // Esperar y hacer click en Continuar
    console.log('⏳ Esperando botón Continuar...');
    try {
      const continueButton = page.locator('[class*="continueButtonWrapper__"]');
      
      // Esperar a que exista en el DOM (no necesariamente visible)
      await continueButton.first().waitFor({ timeout: 30000 });
      
      // Scroll al elemento para asegurar que es clickeable
      await continueButton.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(randomDelay(300, 800)); // Delay aleatorio antes de click
      
      console.log('✅ Haciendo click en Continuar');
      await continueButton.first().hover();
      await page.waitForTimeout(randomDelay(150, 500)); // Delay aleatorio al hover
      await continueButton.first().click();
    } catch (e) {
      console.log('⚠️ No se encontró botón Continuar:', e.message);
    }

    console.log(`✅ Ronda ${roundNumber} - ${gameType} completada!\n`);
    roundNumber++;
    
    // Esperar antes de la siguiente ronda - DELAY BIEN VARIABLE
    await page.waitForTimeout(randomDelay(2000, 5000));
  }
});
