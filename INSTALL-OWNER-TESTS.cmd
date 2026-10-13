@echo off
node scripts\setup-owner-tests.mjs
if errorlevel 1 (
  echo.
  echo ERROR: package.json was not updated.
  exit /b 1
)
echo.
echo Done. Add TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD to .env.test.local, then run:
echo npm run test:browser:all
