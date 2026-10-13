BATTLEBOOKING OWNER + ORGANIZER AUTOTEST PATCH
==============================================

WHAT THIS PATCH DOES
- Keeps the normal organizer/admin Playwright suite.
- Stops treating the EXPECTED 403 from owner-only APIs as a site failure.
- Explicitly verifies that organizer gets 403 from:
    /api/admin/events
    /api/admin/shops
- Adds a separate OWNER login/storage state.
- Adds owner tests for /admin/events and /admin/shops and verifies both owner-only APIs return 200.
- Raises the admin-menu crawler timeout to 60 seconds and reduces its fixed settle wait.
- Keeps full-flow.spec.ts unchanged.

INSTALL
1) Copy the contents of this ZIP into the root of battlebooking and overwrite when asked.
2) Run:
     INSTALL-OWNER-TESTS.cmd
   (or: node scripts\setup-owner-tests.mjs)
3) Open .env.test.local and add your OWNER account credentials locally:

     TEST_OWNER_EMAIL=YOUR_OWNER_EMAIL
     TEST_OWNER_PASSWORD=YOUR_OWNER_PASSWORD

   Do NOT send these credentials to ChatGPT and do NOT commit .env.test.local to Git.

COMMANDS
- Organizer/public/full-flow desktop suite:
     npm run test:browser

- Owner-only suite:
     npm run test:browser:owner

- Everything in one command:
     npm run test:browser:all

- Existing full-flow only:
     npm run test:browser:full

EXPECTED DESIGN
- Organizer: /api/admin/events and /api/admin/shops => 403 PASS (security check)
- Owner:     /api/admin/events and /api/admin/shops => 200 PASS

NOTES
- Next.js allowedDevOrigins message is only a development warning and is not treated as a test failure.
- This patch changes only Playwright/test configuration and package.json scripts via the installer. It does not change production app/API logic.
