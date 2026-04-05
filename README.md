# Last Meadow Auto Farm Bot

Playwright automation bot that auto-farms mini-games in the Last Meadow Discord game.

## Prerequisites

- Node.js (v16+)
- pnpm package manager
- A Discord account

## Setup

1. Install dependencies:
```bash
pnpm install
```

## Authentication

Before running the auto-farm test, you must first authenticate with Discord:

```bash
npx playwright test auth.setup.ts
```

This test will:
- Open a browser window
- Authenticate with your Discord account
- Save the authentication state to `playwright/.auth/user.json`
- The bot will use this session for all subsequent tests

**Run this command first every time you need to re-authenticate.**

## Running the Auto-Farm Bot

Once authenticated, run the auto-farm test:

```bash
npx playwright test infinity.spec.ts --project=chromium
```

### What It Does

The auto-farm bot automatically plays mini-games in Last Meadow and runs indefinitely. It performs the following:

1. **Game Detection**: Monitors for available mini-games (Craft or Battle)
2. **Craft Game**: 
   - Automatically solves arrow key sequences
   - Detects each sequence step and presses the correct arrow keys
   - Continues until all sequences are completed

3. **Battle Game**: 
   - Continuously sweeps the mouse left-to-right and right-to-left
   - Clicks to block incoming projectiles
   - Completes when the continue button appears

4. **Adventure Button**: Continuously clicks the Adventure button while waiting for games to become available

5. **Loop**: Automatically repeats rounds indefinitely until manually stopped

### Logs

The bot outputs detailed logs with timestamps and status levels:
- `[INFO]` - General information
- `[SUCCESS]` - Successful actions
- `[WARN]` - Warnings or waiting states
- `[ERROR]` - Errors

## Stopping the Bot

Press `Ctrl+C` in the terminal to stop the test execution.

## Troubleshooting

- **Authentication fails**: Delete `playwright/.auth/user.json` and run the auth setup again
- **Bot gets stuck on a game**: The test has timeouts built in - it will continue after 4 minutes max per game
- **Selectors not found**: Discord UI changes may require updating the CSS selectors in the test file

## Configuration

- **Viewport size**: 870x626 (configured for optimal Discord game compatibility)
- **Game timeout**: 4 minutes per game (240 seconds)
- **Wait timeout**: 3 minutes for game availability (180 seconds)
