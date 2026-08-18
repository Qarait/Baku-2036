const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const port = 8124;
const baseUrl = `http://127.0.0.1:${port}`;
const recordingDir = path.join(root, 'assets', '.recording');
const outputPath = path.join(root, 'assets', 'how-to-use.webm');

function pause(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {}
    await pause(100);
  }
  throw new Error('The local recording server did not start.');
}

async function record() {
  fs.rmSync(recordingDir, { recursive: true, force: true });
  fs.mkdirSync(recordingDir, { recursive: true });
  fs.rmSync(outputPath, { force: true });

  const server = spawn(process.execPath, [path.join(root, 'scripts', 'serve-static.js'), '--port', String(port)], {
    cwd: root,
    stdio: 'ignore'
  });
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1024, height: 640 },
      recordVideo: { dir: recordingDir, size: { width: 1024, height: 640 } }
    });
    const page = await context.newPage();
    const recording = page.video();

    await page.goto(`${baseUrl}/?record=how-to&lang=en`, { waitUntil: 'networkidle' });
    await page.locator('#mapStatus').waitFor({ state: 'visible', timeout: 30000 });
    await pause(900);

    await page.locator('#placeSearch').focus();
    await page.locator('#placeSearch').fill('White City');
    await pause(900);
    await page.locator('.search-result').first().focus();
    await page.locator('.search-result').first().click();
    await pause(1500);

    await page.locator('#collapseDetails').focus();
    await page.locator('#collapseDetails').click();
    await pause(1000);
    await page.locator('#showDetails').focus();
    await page.locator('#showDetails').click();
    await pause(1000);

    await page.locator('#accordion-sources').scrollIntoViewIfNeeded();
    await pause(700);
    await page.locator('#accordion-sources .accordion-summary').focus();
    await page.locator('#accordion-sources .accordion-summary').click();
    await pause(1300);

    await page.close();
    const generatedPath = await recording.path();
    await context.close();
    fs.copyFileSync(generatedPath, outputPath);
    const size = fs.statSync(outputPath).size;
    if (!size) throw new Error('The recorded video is empty.');
    fs.rmSync(recordingDir, { recursive: true, force: true });
    process.stdout.write(`Recorded ${outputPath} (${size} bytes)\n`);
  } finally {
    await browser?.close();
    if (!server.killed) server.kill();
  }
}

record().catch(error => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
