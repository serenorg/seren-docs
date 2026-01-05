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
    path.join(DIST, 'mcp'),
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
  const redirects = `
# Redirect /api/* to main docs
/api/*  /:splat  301

# SPA fallback
/*  /index.html  200
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

/mcp/llms.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

/mcp/tools.json
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8

# Cache control
/*
  Cache-Control: public, max-age=3600
`.trim();

  fs.writeFileSync(path.join(DIST, '_headers'), headers);
  console.log('Created _headers');
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
    ['npm run build:api', 'Generating Scalar API documentation'],
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
