import fs from "node:fs";

const packagePath = "package.json";
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts ||= {};

const runner = "node --env-file=.env.test.local ./node_modules/@playwright/test/cli.js test";

pkg.scripts["test:browser"] = `${runner} --project=chromium`;
pkg.scripts["test:browser:headed"] = `${runner} --project=chromium --headed`;
pkg.scripts["test:browser:mobile"] = `${runner} --project=mobile`;
pkg.scripts["test:browser:full"] = `${runner} tests/full-flow.spec.ts --project=chromium`;
pkg.scripts["test:browser:owner"] = `${runner} --project=owner`;
pkg.scripts["test:browser:all"] = `${runner} --project=chromium --project=owner`;
pkg.scripts["test:browser:report"] = "playwright show-report";

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("BattleBooking browser test scripts updated successfully.");
console.log("Run: npm run test:browser:all");
