import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/user.json',
});

test.setTimeout(0);

// Utility functions
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const levels = {
    info: '[INFO]',
    success: '[SUCCESS]',
    warning: '[WARN]',
    error: '[ERROR]'
  };
  console.log(`${timestamp} ${levels[level]} ${message}`);
}

async function findGameButton(page: any, gameIndex: number): Promise<any> {
  // Find activity buttons that are direct children of gameActions__ (not inside .game__)
  // Index 0 = Craft, Index 1 = Battle
  // Always check by position, regardless of disabled state
  const allButtons = await page.locator('div[class*="gameActions__"] > div[class*="activityButton__"]').all();
  
  if (gameIndex < allButtons.length) {
    const targetBtn = allButtons[gameIndex];
    const isDisabled = await targetBtn.locator('[class*="disabled__"]').count();
    
    if (isDisabled === 0) {
      return targetBtn;
    }
  }
  
  return null;
}

async function findaventureButton(page: any): Promise<any> {
  const gameContainer = page.locator('[class*="game__"]');
  const aventure = gameContainer.locator('[class*="activityButton__"]').filter({ has: page.locator('text=aventure') });
  const count = await aventure.count();
  return count > 0 ? aventure.first() : null;
}

async function clickButtonRapidly(button: any, times: number = 100): Promise<void> {
  for (let i = 0; i < times; i++) {
    await button.click().catch(() => {});
  }
}

test('Auto Farm - Last Meadow', async ({ page }) => {
  // Browser setup
  await page.setViewportSize({ width: 870, height: 626 });

  await page.goto('https://discord.com/channels/@me');
  await page.getByRole('button', { name: /Last Meadow/ }).click();
  await page.locator('[class*="startText__"]').click();

  let roundNumber = 1;

  while (true) {
    log(`=== ROUND ${roundNumber} STARTED ===`, 'info');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    let gameType = null;
    let gameButton = null;

    // Check for countdown timer
    let countdownVisible = await page.locator('[class*="countdownText__"]').isVisible().catch(() => false);
    if (countdownVisible) {
      log('Countdown detected, waiting while clicking Adventure...', 'warning');
      
      const aventureButton = await findaventureButton(page);
      
      for (let i = 0; i < 30; i++) {
        if (aventureButton) {
          await clickButtonRapidly(aventureButton, 100);
        }
        
        const craftBtn = await findGameButton(page, 0);
        if (craftBtn) {
          gameType = 'Craft';
          gameButton = craftBtn;
          log('Craft game available during countdown', 'success');
          countdownVisible = false;
          break;
        }
        
        const battleBtn = await findGameButton(page, 1);
        if (battleBtn) {
          gameType = 'Battle';
          gameButton = battleBtn;
          log('Battle game available during countdown', 'success');
          countdownVisible = false;
          break;
        }
        
        const stillVisible = await page.locator('[class*="countdownText__"]').isVisible().catch(() => false);
        if (!stillVisible) {
          log(`Countdown disappeared after ${i}s`, 'success');
          break;
        }
      }
    }

    // Search for available games
    const buttons = await page.locator('[class*="activityButton__"]').all();
    
    if (!gameType) {
      const craftBtn = await findGameButton(page, 0);
      if (craftBtn) {
        gameType = 'Craft';
        gameButton = craftBtn;
        log('Found: Craft game available', 'success');
      }
    }

    if (!gameType) {
      const battleBtn = await findGameButton(page, 1);
      if (battleBtn) {
        gameType = 'Battle';
        gameButton = battleBtn;
        log('Found: Battle game available', 'success');
      }
    }

    // Wait for a game to become available
    if (!gameType) {
      log('Waiting for a game to become available...', 'warning');
      
      const aventureButton = await findaventureButton(page);
      let clickingAdventure = false;
      if (aventureButton) {
        clickingAdventure = true;
        log('Clicking Adventure while waiting...', 'info');
      }
      
      for (let i = 0; i < 180; i++) {
        if (clickingAdventure && aventureButton) {
          await clickButtonRapidly(aventureButton, 100);
        }
        
        const fabricarBtn = await findGameButton(page, 0);
        if (fabricarBtn) {
          gameType = 'Craft';
          gameButton = fabricarBtn;
          clickingAdventure = false;
          log(`Craft game available after ${i}s`, 'success');
          break;
        }

        const battleBtn = await findGameButton(page, 1);
        if (battleBtn) {
          gameType = 'Battle';
          gameButton = battleBtn;
          clickingAdventure = false;
          log(`Battle game available after ${i}s`, 'success');
          break;
        }
        
        if (i % 30 === 0 && i > 0) {
          log(`Still waiting... ${i}/180 seconds elapsed`, 'warning');
        }
        
        await page.waitForTimeout(1000);
      }

      if (!gameType) {
        throw new Error('No game became available within 180 seconds');
      }
    }

    // Execute the selected game
    log(`Preparing to play ${gameType}...`, 'info');
    await page.waitForTimeout(randomDelay(1500, 4000));

    if (gameButton) {
      await gameButton.hover();
      await page.waitForTimeout(randomDelay(200, 600));
      await gameButton.click();
      log(`Playing: ${gameType}`, 'info');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(randomDelay(1500, 3500));

    // Craft game - Arrow key sequences
    if (gameType === 'Craft') {
      let sequenceNumber = 1;
      let hasMoreSequences = true;

      while (hasMoreSequences) {
        try {
          await expect(page.locator('div').filter({ hasText: /^Use your arrow keys!$/ }).first()).toBeVisible({ timeout: 10000 });
          
          const characters = await page.locator('[class*="sequences__"] [class*="character__"]').all();
          log(`Sequence ${sequenceNumber}: ${characters.length} steps`, 'info');

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
            await page.waitForTimeout(randomDelay(150, 350));
          }

          await page.waitForTimeout(randomDelay(800, 1500));
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

    // Battle game - Block projectiles
    if (gameType === 'Battle') {
      const maxBattleTime = 240000;
      const battleStartTime = Date.now();
      let projectilesBlocked = 0;

      while ((Date.now() - battleStartTime) < maxBattleTime) {
        const continueButtonExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
        if (continueButtonExists > 0) {
          log(`Battle completed! Projectiles blocked: ${projectilesBlocked}`, 'success');
          break;
        }

        const viewport = page.viewportSize();
        if (viewport) {
          // Sweep left to right
          for (let x = 100; x < viewport.width - 100; x += randomDelay(30, 70)) {
            await page.mouse.move(x, viewport.height - 150).catch(() => {});
            await page.mouse.click(x, viewport.height - 150).catch(() => {});
            await page.waitForTimeout(randomDelay(15, 50)).catch(() => {});

            const btnExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
            if (btnExists > 0) {
              projectilesBlocked++;
              log(`Battle completed! Projectiles blocked: ${projectilesBlocked}`, 'success');
              break;
            }
          }

          const btnExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
          if (btnExists > 0) break;

          await page.waitForTimeout(randomDelay(100, 300)).catch(() => {});

          // Sweep right to left
          for (let x = viewport.width - 100; x > 100; x -= randomDelay(30, 70)) {
            await page.mouse.move(x, viewport.height - 150).catch(() => {});
            await page.mouse.click(x, viewport.height - 150).catch(() => {});
            await page.waitForTimeout(randomDelay(15, 50)).catch(() => {});

            const btnExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
            if (btnExists > 0) {
              projectilesBlocked++;
              log(`Battle completed! Projectiles blocked: ${projectilesBlocked}`, 'success');
              break;
            }
          }

          const btnExists2 = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
          if (btnExists2 > 0) break;
        }
      }
    }

    // Wait and click Continue button
    log('Waiting for Continue button...', 'info');
    try {
      const continueButton = page.locator('[class*="continueButtonWrapper__"]');
      
      await continueButton.first().waitFor({ timeout: 30000 });
      
      await continueButton.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(randomDelay(300, 800));
      
      log('Clicking Continue button', 'info');
      await continueButton.first().hover();
      await page.waitForTimeout(randomDelay(150, 500));
      await continueButton.first().click();
    } catch (e) {
      log('Continue button not found', 'warning');
    }

    log(`Round ${roundNumber} - ${gameType} completed`, 'success');
    roundNumber++;
    
    await page.waitForTimeout(randomDelay(2000, 5000));
  }
});
