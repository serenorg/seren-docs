#!/usr/bin/env node
// ABOUTME: Main build orchestrator for seren-docs
// ABOUTME: Coordinates all documentation generation steps

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function run(cmd, description) {
  console.log(`\n=== ${description} ===`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error(`Failed: ${description}`);
    return false;
  }
}

function ensureDirectories() {
  const dirs = [
    DIST,
    path.join(DIST, 'install-seren'),
    path.join(DIST, 'guides')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function copyStaticFiles() {
  // Copy any static assets if they exist
  const staticDir = path.join(ROOT, 'static');
  if (fs.existsSync(staticDir)) {
    const files = fs.readdirSync(staticDir);
    for (const file of files) {
      fs.copyFileSync(
        path.join(staticDir, file),
        path.join(DIST, file)
      );
    }
    console.log(`Copied ${files.length} static files`);
  }
}

function createRedirects() {
  // Create _redirects file for Cloudflare Pages
  // Note: No SPA fallback - all pages are static HTML
  const redirects = `
# Redirect /api/* to main docs
/api/*  /:splat  301

# Redirect old /mcp/ URLs to /install-seren/
/mcp/*  /install-seren/:splat  301
/mcp    /install-seren/  301
`.trim();

  fs.writeFileSync(path.join(DIST, '_redirects'), redirects);
  console.log('Created _redirects');
}

function createHeaders() {
  // Create _headers file for Cloudflare Pages
  const headers = `
# CORS headers for llms.txt files
/llms.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

/llms-full.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

/install-seren/llms.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

/install-seren/tools.json
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8

# OpenAPI spec for AI agents
/openapi.json
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8

# Install scripts
/install.sh
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

/install.ps1
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

# Skills documentation
/skills.md
  Access-Control-Allow-Origin: *
  Content-Type: text/markdown; charset=utf-8

# Cache control
/*
  Cache-Control: public, max-age=3600
`.trim();

  fs.writeFileSync(path.join(DIST, '_headers'), headers);
  console.log('Created _headers');
}

async function fetchInstallScripts() {
  const scripts = [
    { name: 'install.sh', url: 'https://raw.githubusercontent.com/serenorg/seren-local/main/scripts/install.sh' },
    { name: 'install.ps1', url: 'https://raw.githubusercontent.com/serenorg/seren-local/main/scripts/install.ps1' },
    { name: 'skills.md', url: 'https://api.serendb.com/skill.md' },
  ];

  for (const { name, url } of scripts) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      fs.writeFileSync(path.join(DIST, name), text);
      console.log(`Fetched ${name} from seren-local repo`);
    } catch (err) {
      console.error(`Failed to fetch ${name}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('SerenAI Documentation Build');
  console.log('===========================');

  const startTime = Date.now();

  // Ensure output directories exist
  ensureDirectories();

  // Check if OpenAPI spec exists, fetch if not
  const openapiPath = path.join(ROOT, 'openapi.json');
  if (!fs.existsSync(openapiPath)) {
    console.log('\nOpenAPI spec not found, fetching...');
    run('npm run fetch:openapi', 'Fetching OpenAPI spec');
  }

  // Run all build steps
  const steps = [
    ['node scripts/build-html-docs.js', 'Generating static HTML API documentation'],
    ['npm run build:llms', 'Generating llms.txt files'],
    ['npm run build:mcp', 'Generating MCP documentation'],
    ['node scripts/build-guides.js', 'Building manual guides']
  ];

  let success = true;
  for (const [cmd, desc] of steps) {
    if (!run(cmd, desc)) {
      success = false;
      // Continue with other steps even if one fails
    }
  }

  // Fetch install scripts from seren-local repo
  await fetchInstallScripts();

  // Copy static files and create config files
  copyStaticFiles();
  createRedirects();
  createHeaders();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n===========================`);
  console.log(`Build ${success ? 'completed' : 'completed with errors'} in ${elapsed}s`);

  // List output files
  console.log('\nGenerated files:');
  function listDir(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        console.log(`  ${prefix}${file}/`);
        listDir(fullPath, prefix + '  ');
      } else {
        const size = (stat.size / 1024).toFixed(1);
        console.log(`  ${prefix}${file} (${size}KB)`);
      }
    }
  }
  listDir(DIST);

  process.exit(success ? 0 : 1);
}

main();
