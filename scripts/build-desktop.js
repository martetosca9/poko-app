const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const standaloneDir = path.join(rootDir, ".next", "standalone");

console.log("==> 1. Building Next.js with standalone output...");
execSync("npm run build", { stdio: "inherit", cwd: rootDir });

console.log("==> 2. Copying static files to standalone directory...");

// Copy public to .next/standalone/public
const publicSrc = path.join(rootDir, "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
}

// Copy .next/static to .next/standalone/.next/static
const staticSrc = path.join(rootDir, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true });
}

// Copy dev.db as template if it exists
const dbSrc = path.join(rootDir, "dev.db");
const dbDest = path.join(standaloneDir, "dev.db");
if (fs.existsSync(dbSrc)) {
    fs.copyFileSync(dbSrc, dbDest);
}

console.log("==> 3. Standalone bundle prepared successfully!");
