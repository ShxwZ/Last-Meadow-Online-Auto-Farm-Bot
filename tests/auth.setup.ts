import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate in Discord and save session', async ({ page }) => {
  // Go to Discord
  await page.goto('https://discord.com/login');

  // Wait for login page to load
  await page.waitForLoadState('networkidle');

  console.log('🔓 Please, manually sign in to Discord in the browser...');
  console.log('⏱️  You have 5 minutes to complete the login...');

  try {
    // Wait for login to complete by detecting we're on the main page
    // Timeout set to 5 minutes (300 seconds)
    await page.waitForURL('https://discord.com/channels/**', { timeout: 300000 });

    // Wait for the application to fully load
    await page.waitForLoadState('networkidle');

    // Save the authentication state (cookies, localStorage, etc)
    await page.context().storageState({ path: authFile });

    console.log(`✅ Session successfully saved to ${authFile}`);
  } catch (error) {
    console.error('❌ Error during authentication:');
    throw new Error('Could not complete login in Discord. Please try again.');
  }
});
