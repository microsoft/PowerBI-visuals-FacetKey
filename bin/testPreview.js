'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { createPreviewServer } = require('./preview');
const { PROJECT_ROOT } = require('./security');

async function findChrome() {
    const candidates = [
        process.env.CHROME_BIN,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium', '/usr/bin/chromium-browser',
    ].filter(Boolean);
    for (const candidate of candidates) {
        try { await fs.access(candidate); return candidate; } catch { /* try next known location */ }
    }
    throw new Error('Chrome/Chromium not found. Set CHROME_BIN to its executable path.');
}

async function main() {
    const server = await createPreviewServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        browser = await chromium.launch({ executablePath: await findChrome(), headless: true, chromiumSandbox: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => globalThis.facetKeyPreview?.ready, null, { timeout: 15000 }).catch(async (error) => {
            console.error('Preview startup errors:', errors);
            console.error('Preview status:', await page.locator('#status').textContent());
            throw error;
        });
        await page.evaluate(() => document.fonts.ready);
        const screenshots = path.join(PROJECT_ROOT, '.tmp', 'preview');
        await fs.mkdir(screenshots, { recursive: true });
        await page.screenshot({ path: path.join(screenshots, 'basic.png'), fullPage: true });

        const facets = page.locator('.facets-container .facets-facet-vertical');
        const initialCount = await facets.count();
        assert.ok(initialCount > 0, 'The packaged visual must render real facet elements.');
        await page.locator('.facets-container .more').first().click();
        await page.waitForFunction((count) => document.querySelectorAll('.facets-container .facets-facet-vertical').length > count, initialCount);
        await facets.first().click();
        await page.waitForSelector('.facets-container.facets-selected');
        await page.locator('#save-bookmark').click();
        await page.locator('#clear').click();
        await page.waitForFunction(() => !document.querySelector('.facets-container.facets-selected'));
        await page.locator('#restore-bookmark').click();
        await page.waitForSelector('.facets-container.facets-selected');

        // Selected facets are intentionally pinned through keyword filtering.
        await page.locator('#clear').click();
        const search = page.locator('.facets-container .search-box');
        await search.fill('zz-preview-no-match');
        await page.waitForFunction(() => document.querySelectorAll('.facets-container .facets-facet-vertical').length === 0, null, { timeout: 3000 }).catch(async (error) => {
            console.error('Search diagnostics:', await page.evaluate(() => ({
                snapshot: globalThis.facetKeyPreview.snapshot(),
                filter: globalThis.facetKeyPreview.visual.filter,
                renderedCount: document.querySelectorAll('.facets-container .facets-facet-vertical').length,
                searchValue: document.querySelector('.search-box').value,
            })), errors);
            throw error;
        });
        await search.fill('');
        await page.waitForFunction(() => document.querySelectorAll('.facets-container .facets-facet-vertical').length > 0);

        const scenarios = await page.locator('#scenario option').evaluateAll((options) => options.map((option) => ({ value: option.value, label: option.textContent })));
        assert.ok(scenarios.length >= 4, 'Expected basic, ranges, segments and sparklines scenarios.');
        for (const scenario of scenarios) {
            await page.locator('#scenario').selectOption(scenario.value);
            await page.waitForFunction(() => globalThis.facetKeyPreview?.ready && document.querySelector('.facets-container'));
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await page.screenshot({ path: path.join(screenshots, `${scenario.value.replace(/[^a-z0-9-]/gi, '_')}.png`), fullPage: true });
        }
        await page.locator('#scenario').selectOption('ranges');
        const handle = await page.locator('.facet-range-filter-left').first().boundingBox();
        assert.ok(handle, 'Range drag handle must be visible.');
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
        await page.mouse.down();
        await page.mouse.move(handle.x + 180, handle.y + handle.height / 2, { steps: 12 });
        await page.mouse.up();
        await page.waitForFunction(() => globalThis.facetKeyPreview.snapshot().jsonFilters.length > 0);
        const rangeState = await page.evaluate(() => globalThis.facetKeyPreview.snapshot());
        assert.ok(rangeState.matchedRowCount < rangeState.rowCount, 'Dragged range should narrow the mock cross-filter result.');
        await page.locator('#save-bookmark').click();
        await page.locator('#clear').click();
        await page.waitForFunction(() => globalThis.facetKeyPreview.snapshot().jsonFilters.length === 0);
        await page.locator('#restore-bookmark').click();
        await page.waitForFunction(() => globalThis.facetKeyPreview.snapshot().jsonFilters.length > 0);
        assert.deepEqual(await page.evaluate(() => globalThis.facetKeyPreview.snapshot().jsonFilters), rangeState.jsonFilters);
        await page.screenshot({ path: path.join(screenshots, 'ranges-filtered.png'), fullPage: true });

        await page.locator('#scenario').selectOption('basic');
        await page.locator('#initial-count').fill('2');
        await page.locator('#initial-count').dispatchEvent('change');
        await page.waitForFunction(() => document.querySelectorAll('.facets-container .facets-facet-vertical').length === 8);
        await page.locator('#selection-count').check();
        await page.locator('#highlight').click();
        await page.waitForFunction(() => globalThis.facetKeyPreview.snapshot().highlightActive);
        await page.screenshot({ path: path.join(screenshots, 'highlight.png'), fullPage: true });
        await page.locator('#clear').click();
        assert.equal(await page.evaluate(() => globalThis.facetKeyPreview.snapshot().highlightActive), false);

        await page.locator('#canvas-width').evaluate((input) => {
            input.value = '480';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.locator('#apply-size').click();
        await page.waitForFunction(() => globalThis.facetKeyPreview.snapshot().canvasSize.width <= 480);
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 650)));
        await page.screenshot({ path: path.join(screenshots, 'resized.png'), fullPage: true });
        assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
        console.log('Preview browser smoke test passed: rendering, more, selection, clear, bookmark replay, search, all scenarios, date-range dragging/restoration, formatting controls, highlights and resize.');
        console.log(`Screenshots: ${screenshots}`);
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
}

module.exports = { findChrome, main };
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
