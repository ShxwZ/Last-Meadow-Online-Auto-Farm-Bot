import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.use({
  storageState: 'playwright/.auth/user.json',
});

test.setTimeout(0);

// Load battle configuration
function loadBattleConfig(): string {
  // Try to read from battle-config.json (relative path)
  try {
    const configPath = path.resolve(__dirname, '../battle-config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    return config.battleType || 'PALADIN';
  } catch (e) {
    // Fallback: use environment variable or default
    return process.env.BATTLE_TYPE || 'PALADIN';
  }
}

// Battle type configurations
const BATTLE_TYPES: { [key: string]: { enemySelector?: string; description: string; type?: string } } = {
  PALADIN: {
    enemySelector: '[class*="container__"] [class*="targetContainer__"] [class*="clickable__"]',
    description: 'PALADIN - Sweeps',
    type: 'targeted'
  },
  RANGER: {
    enemySelector: '[class*="clickable__5c90e"], [class*="clickable_"]',
    description: 'Archer - Click targets rapidly',
    type: 'targeted'
  },
  PRIEST: {
    description: 'PRIEST - Match 3 cards battle',
    type: 'grid'
  }
  // Add more battle types as needed
};

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
  const aventureButtons = await page.locator('[class*="activityButton__"]').all();
  
  for (const btn of aventureButtons) {
    const text = await btn.locator('[class*="activityButtonText__"]').first().textContent();
    if (text && text.toLowerCase().includes('aventura')) {
      return btn;
    }
  }
  
  return null;
}

async function getSVGSignature(item: any): Promise<string> {
  // Get a signature of the SVG to identify matching cards
  try {
    const svg = item.locator('svg').first();
    const svgCount = await svg.count();
    if (svgCount > 0) {
      // Get the viewBox attribute which uniquely identifies the SVG
      const viewBox = await svg.getAttribute('viewBox');
      // Also get the path count and first path data as additional identifier
      const paths = await svg.locator('path').count();
      return `${viewBox}:${paths}`;
    }
  } catch (e) {}
  return '';
}

async function handlePRIESTMiniGame(page: any): Promise<void> {
  const maxRounds = 10;
  let roundCount = 0;

  while (roundCount < maxRounds) {
    // Check if minigame is completed FIRST
    const continueButtonExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
    if (continueButtonExists > 0) {
      log('PRIEST minigame completed!', 'success');
      break;
    }

    // Get all grid items - fresh each round
    const gridItems = await page.locator('[class*="gridItem__"]').all();
    
    if (gridItems.length === 0) {
      log('No grid items found, minigame might be completed', 'success');
      break;
    }

    log(`PRIEST Round ${roundCount + 1}: Scanning ${gridItems.length} items`, 'info');

    // Get signatures for all items
    const itemSignatures: { index: number; signature: string }[] = [];
    
    for (let i = 0; i < gridItems.length; i++) {
      const signature = await getSVGSignature(gridItems[i]);
      itemSignatures.push({ index: i, signature });
    }

    // Group items by signature
    const signatureMap: { [key: string]: number[] } = {};
    for (const { index, signature } of itemSignatures) {
      if (signature) {
        if (!signatureMap[signature]) {
          signatureMap[signature] = [];
        }
        signatureMap[signature].push(index);
      }
    }

    // Get all groups with exactly 3 items
    const groupsToClick: { signature: string; indices: number[] }[] = [];
    for (const [signature, indices] of Object.entries(signatureMap)) {
      if (indices.length >= 3) {
        groupsToClick.push({
          signature,
          indices: indices.slice(0, 3) // Take first 3 if there are more
        });
      }
    }

    if (groupsToClick.length === 0) {
      log('No complete groups of 3 found', 'warning');
      roundCount++;
      continue;
    }

    log(`Found ${groupsToClick.length} groups to click`, 'info');

    // Click each group sequentially
    for (const group of groupsToClick) {
      log(`Clicking group with signature ${group.signature.split(':')[0]}...`, 'info');
      
      // Refresh gridItems for each group to ensure we have current references
      const currentGridItems = await page.locator('[class*="gridItem__"]').all();
      
      for (let i = 0; i < group.indices.length; i++) {
        const itemIndex = group.indices[i];
        
        if (itemIndex >= currentGridItems.length) {
          log(`Item index ${itemIndex} out of bounds, skipping`, 'warning');
          continue;
        }
        
        const item = currentGridItems[itemIndex];
        const box = await item.boundingBox().catch(() => null);
        
        if (box) {
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          
          await page.mouse.move(centerX, centerY).catch(() => {});
          await page.waitForTimeout(randomDelay(100, 200));
          await page.mouse.click(centerX, centerY).catch(() => {});
          
          log(`Clicked item ${i + 1}/3 at (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`, 'info');
          
          if (i < 2) {
            await page.waitForTimeout(randomDelay(150, 300));
          }
        }
      }
      
      // Wait after each group for items to disappear
      await page.waitForTimeout(randomDelay(1000, 1500));
    }

    roundCount++;
  }
}

async function handleBattle(page: any, battleType: string): Promise<number> {
  const config = BATTLE_TYPES[battleType.toUpperCase()];
  
  if (!config) {
    log(`Unknown battle type: ${battleType}. Using default sweep strategy.`, 'warning');
    return await handleBattleDefaultSweep(page);
  }
  
  log(`Battle strategy: ${config.description}`, 'info');
  
  // Handle grid-based battles (like PRIEST)
  if (config.type === 'grid') {
    await handlePRIESTMiniGame(page);
    return 0;
  }

  if (config.type === 'sweep') {
    await handleBattleDefaultSweep(page);
    return 0;
  }

  // Handle targeted battles
  return await handleBattleTargeted(page, config.enemySelector || '');
}

async function handleBattleTargeted(page: any, enemySelector: string): Promise<number> {
  const maxBattleTime = 240000;
  const battleStartTime = Date.now();
  let enemiesClicked = 0;

  while ((Date.now() - battleStartTime) < maxBattleTime) {
    // Check if battle ended
    const continueButtonExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
    if (continueButtonExists > 0) {
      log(`Battle completed! Enemies clicked: ${enemiesClicked}`, 'success');
      break;
    }

    try {
      // Find all target containers with random IDs (e.g., targetContainer_b6b008)
      const targets = await page.locator('[class*="targetContainer_"]').all();
      
      if (targets.length > 0) {
        log(`Found ${targets.length} targets`, 'info');

        // Click each target as fast as possible
        for (const target of targets) {
          try {
            const isVisible = await target.isVisible().catch(() => false);
            if (isVisible) {
              // Find clickable element inside the target container
              const clickable = target.locator('[class*="clickable_"]').first();
              const clickableExists = await clickable.count().catch(() => 0);
              
              if (clickableExists > 0) {
                // Get the bounding box of the clickable element to find its center
                const box = await clickable.boundingBox().catch(() => null);
                
                if (box) {
                  // Calculate the center of the element
                  const centerX = box.x + box.width / 2;
                  const centerY = box.y + box.height / 2;
                  
                  // Move mouse to center and click multiple times rapidly
                  await page.mouse.move(centerX, centerY).catch(() => {});
                  
                  // Multiple rapid clicks to ensure registration
                  for (let i = 0; i < 5; i++) {
                    await page.mouse.click(centerX, centerY).catch(() => {});
                    await page.waitForTimeout(randomDelay(8, 15));
                  }
                  
                  enemiesClicked++;
                  log(`Clicked target at (${centerX.toFixed(0)}, ${centerY.toFixed(0)}) - Count: ${enemiesClicked}`, 'info');
                } else {
                  // Fallback to regular click if bounding box fails
                  await clickable.click().catch(() => {});
                  enemiesClicked++;
                  log(`Clicked target (${enemiesClicked})`, 'info');
                }
                
                // Minimal delay between clicks
                await page.waitForTimeout(randomDelay(10, 25));
              }
            }
          } catch (e) {
            // Continue to next target if click fails
          }
        }
      }

      // Check again if battle ended
      const btnExists = await page.locator('[class*="continueButtonWrapper__"]').count().catch(() => 0);
      if (btnExists > 0) {
        log(`Battle completed! Enemies clicked: ${enemiesClicked}`, 'success');
        break;
      }

      // Very short wait before next search cycle
      await page.waitForTimeout(randomDelay(30, 60));
    } catch (e) {
      log(`Battle targeting error: ${e}`, 'warning');
      // Fall back to sweep
      return await handleBattleDefaultSweep(page);
    }
  }

  return enemiesClicked;
}

async function handleBattleDefaultSweep(page: any): Promise<number> {
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

  return projectilesBlocked;
}

async function clickButtonRapidly(button: any, page: any, times: number = 100): Promise<void> {
  try {
    await button.hover();
    await page.waitForTimeout(100);
  } catch (e) {}
  
  for (let i = 0; i < times; i++) {
    await button.click().catch(() => {});
    await page.waitForTimeout(randomDelay(2, 8));
  }
}

test('Auto Farm - Last Meadow', async ({ page }) => {
  // Load battle type from battle-config.json
  const battleType = loadBattleConfig();
  log(`Starting with battle type: ${battleType}`, 'info');
  
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
          await clickButtonRapidly(aventureButton, page, 200);
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
      log('Clicking Adventure while waiting...', 'info');
      
      for (let i = 0; i < 180; i++) {
        const aventureButton = await findaventureButton(page);
        if (aventureButton) {
          await clickButtonRapidly(aventureButton, page, 200);
        }
        
        const fabricarBtn = await findGameButton(page, 0);
        if (fabricarBtn) {
          gameType = 'Craft';
          gameButton = fabricarBtn;
          log(`Craft game available after ${i}s`, 'success');
          break;
        }

        const battleBtn = await findGameButton(page, 1);
        if (battleBtn) {
          gameType = 'Battle';
          gameButton = battleBtn;
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

    // Detect actual game type by checking for game elements
    const hasCraftSequences = await page.locator('[class*="sequences__"]').count().catch(() => 0);
    const hasBattleTargets = await page.locator('[class*="targetContainer_"]').count().catch(() => 0);
    const hasGridItems = await page.locator('[class*="gridItem__"]').count().catch(() => 0);

    if (hasGridItems > 0) {
      // Grid-based battle detected, determine battle type or default to PRIEST
      const detectedBattleType = battleType.toLowerCase() === 'Curarero';
      log(`Detected: Grid-based battle (${detectedBattleType})`, 'success');
      // Keep gameType as Battle since this is a battle variant
      gameType = 'Battle';
    } else if (hasCraftSequences > 0) {
      gameType = 'Craft';
      log('Detected: Craft game (arrow sequences)', 'success');
    } else if (hasBattleTargets > 0) {
      gameType = 'Battle';
      log('Detected: Battle game (enemies)', 'success');
    }

    // Craft game - Arrow key sequences
    if (gameType === 'Craft') {
      let sequenceNumber = 1;
      let hasMoreSequences = true;

      while (hasMoreSequences) {
        try {
          const sequencesContainer = page.locator('[class*="sequences__"]').first();
          await sequencesContainer.waitFor({ timeout: 10000 });
          
          const characters = await page.locator('[class*="sequences__"] [class*="character__"]').all();
          log(`Sequence ${sequenceNumber}: ${characters.length} steps`, 'info');

          const keySequence: string[] = [];
          
          for (let i = 0; i < characters.length; i++) {
            const img = characters[i].locator('img').first();
            const altText = await img.getAttribute('alt');
            keySequence.push(altText || '');
          }

          log(`Key sequence: ${keySequence.join(', ')}`, 'info');
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
          const sequencesExist = await page.locator('[class*="sequences__"]').count();
          
          if (sequencesExist === 0) {
            log('No more sequences found', 'success');
            hasMoreSequences = false;
          } else {
            sequenceNumber++;
          }
        } catch (e) {
          log(`Craft game error: ${e}`, 'warning');
          hasMoreSequences = false;
        }
      }
    }

    // Battle game - Click enemies based on battle type
    if (gameType === 'Battle') {
      await handleBattle(page, battleType);
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
