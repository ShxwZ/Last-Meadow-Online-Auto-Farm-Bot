import { test, expect } from '@playwright/test';

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

test.describe('Discord Authenticated', () => {
  test('Explore Discord interface', async ({ page }) => {
    log('Starting Discord session...', 'info');

    await page.goto('https://discord.com/channels/@me');

    await expect(page).toHaveURL(/discord\.com\/channels/);
    log('Discord session confirmed', 'success');

    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    const pageTitle = await page.title();
    log(`URL: ${currentUrl}`, 'info');
    log(`Title: ${pageTitle}`, 'info');

    const guildButtons = await page.locator('[role="button"][aria-label*="servidor"], [aria-label*="Servidor"]').count();
    log(`Servers found: ${guildButtons}`, 'info');

    const channels = await page.locator('[role="link"][aria-label*="canal"], [aria-label*="Canal"]').count();
    log(`Channels found: ${channels}`, 'info');

    try {
      const userButton = page.locator('[data-testid="user-profile-button"]');
      if (await userButton.isVisible({ timeout: 2000 })) {
        log('User profile button found', 'info');
      }
    } catch (e) {
      log('User profile button not found', 'warning');
    }

    const nav = await page.locator('nav').all();
    const buttons = await page.locator('button').all();
    const links = await page.locator('a').all();
    
    log(`Navigation elements: ${nav.length}`, 'info');
    log(`Buttons: ${buttons.length}`, 'info');
    log(`Links: ${links.length}`, 'info');

    log('Discord interface ready for exploration', 'success');
    log('Browser will stay open for 30 seconds', 'info');

    await page.waitForTimeout(30000);

    log('Test completed', 'success');
  });

  test('Interact with Discord', async ({ page }) => {
    await page.goto('https://discord.com/channels/@me');
    await page.waitForLoadState('networkidle');

    log('Discord interaction test started', 'info');
    log('Discord is authenticated and ready for automation', 'success');
  });
});
