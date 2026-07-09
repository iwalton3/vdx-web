/**
 * New Components E2E Tests (batch 2)
 * DropZone, Avatar, Skeleton, Empty, Popover, Divider, Segmented, Inplace,
 * Rating, Timeline, OTP, Copy, Meter.
 */

const TestHelper = require('./test-helper');

// Simulate an HTML5 drag-drop of synthetic File objects onto a target selector.
async function dropFiles(page, selector, files) {
    await page.evaluate((sel, fileSpecs) => {
        const el = document.querySelector(sel);
        const dt = new DataTransfer();
        for (const f of fileSpecs) {
            dt.items.add(new File([new Uint8Array(f.size)], f.name, { type: f.type }));
        }
        const fire = (type) => {
            const ev = new DragEvent(type, { bubbles: true, cancelable: true });
            Object.defineProperty(ev, 'dataTransfer', { value: dt });
            el.dispatchEvent(ev);
        };
        fire('dragenter');
        fire('dragover');
        fire('drop');
    }, selector, files);
}

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing New Components (batch 2)...\n');

    // ============ DropZone ============
    await test.test('DropZone component renders', async () => {
        await test.selectComponent('DropZone');
        await test.assertExists('example-dropzone');
        await test.assertExists('cl-dropzone .cl-dropzone');
    });

    await test.test('DropZone accepts dropped files and emits select', async () => {
        await test.selectComponent('DropZone');
        await dropFiles(test.page, 'example-dropzone cl-dropzone .cl-dropzone', [
            { name: 'a.txt', type: 'text/plain', size: 10 },
            { name: 'b.txt', type: 'text/plain', size: 20 }
        ]);
        await test.page.waitForTimeout(200);
        const readout = await test.page.$eval('example-dropzone div[style*="background"]', el => el.textContent);
        await test.assert(/a\.txt/.test(readout) && /b\.txt/.test(readout),
            `Dropped files should be accepted, got: ${readout}`);
    });

    await test.test('DropZone rejects oversized files with reason "size"', async () => {
        await test.selectComponent('DropZone');
        await dropFiles(test.page, 'example-dropzone cl-dropzone:nth-of-type(2) .cl-dropzone', [
            { name: 'huge.png', type: 'image/png', size: 3 * 1024 * 1024 }
        ]);
        await test.page.waitForTimeout(200);
        const readout = await test.page.$eval('example-dropzone div[style*="background"]', el => el.textContent);
        await test.assert(/huge\.png \(size\)/.test(readout),
            `Oversized file should be rejected with reason size, got: ${readout}`);
    });

    await test.test('DropZone rejects wrong file types with reason "type"', async () => {
        await test.selectComponent('DropZone');
        await dropFiles(test.page, 'example-dropzone cl-dropzone:nth-of-type(2) .cl-dropzone', [
            { name: 'notes.txt', type: 'text/plain', size: 100 }
        ]);
        await test.page.waitForTimeout(200);
        const readout = await test.page.$eval('example-dropzone div[style*="background"]', el => el.textContent);
        await test.assert(/notes\.txt \(type\)/.test(readout),
            `Wrong-type file should be rejected with reason type, got: ${readout}`);
    });

    await test.test('DropZone highlights on dragenter', async () => {
        await test.selectComponent('DropZone');
        await test.page.evaluate(() => {
            const el = document.querySelector('example-dropzone .cl-dropzone');
            const ev = new DragEvent('dragenter', { bubbles: true, cancelable: true });
            Object.defineProperty(ev, 'dataTransfer', { value: new DataTransfer() });
            el.dispatchEvent(ev);
        });
        await test.page.waitForTimeout(100);
        await test.assertExists('example-dropzone .cl-dropzone.dragging');
    });

    await test.test('FileUpload dropzone mode composes cl-dropzone and lists dropped files', async () => {
        await test.selectComponent('FileUpload');
        await test.assertExists('example-fileupload cl-fileupload cl-dropzone');
        await dropFiles(test.page, 'example-fileupload cl-fileupload cl-dropzone .cl-dropzone', [
            { name: 'report.pdf', type: 'application/pdf', size: 500 }
        ]);
        await test.page.waitForTimeout(200);
        const name = await test.page.$eval('example-fileupload cl-fileupload .file-name', el => el.textContent);
        await test.assertEqual(name, 'report.pdf', 'FileUpload should list the dropped file');
    });

    // ============ Divider ============
    await test.test('Divider renders horizontal, labelled, and vertical variants', async () => {
        await test.selectComponent('Divider');
        await test.assertExists('example-divider .cl-divider.horizontal');
        await test.assertExists('example-divider .cl-divider.has-label');
        await test.assertExists('example-divider .cl-divider.vertical');
    });

    // ============ Avatar ============
    await test.test('Avatar shows initials fallback and status dot', async () => {
        await test.selectComponent('Avatar');
        const initials = await test.page.$eval('example-avatar cl-avatar .avatar-initials', el => el.textContent);
        await test.assertEqual(initials, 'AL', 'First avatar should show initials "AL" for Ada Lovelace');
        await test.assertExists('example-avatar cl-avatar .avatar-status');
    });

    await test.test('Avatar group caps at max and shows +N overflow', async () => {
        await test.selectComponent('Avatar');
        const shown = await test.page.$$eval('example-avatar cl-avatar-group cl-avatar', els => els.length);
        await test.assertEqual(shown, 3, 'Group with max=3 should render 3 avatars');
        const overflow = await test.page.$eval('example-avatar .ag-overflow', el => el.textContent.trim());
        await test.assertEqual(overflow, '+2', 'Group of 5 with max=3 should show +2');
    });

    // ============ Skeleton ============
    await test.test('Skeleton renders placeholders and clears when content loads', async () => {
        await test.selectComponent('Skeleton');
        const before = await test.page.$$eval('example-skeleton cl-skeleton', els => els.length);
        await test.assert(before > 0, 'Skeleton placeholders should render while loading');
        await test.page.click('example-skeleton cl-button');
        await test.page.waitForTimeout(300);
        const after = await test.page.$$eval('example-skeleton cl-skeleton', els => els.length);
        await test.assertEqual(after, 0, 'Skeletons should disappear once content is shown');
    });

    // ============ Empty ============
    await test.test('Empty state shows title, description, and action slot', async () => {
        await test.selectComponent('Empty');
        const title = await test.page.$eval('example-empty .empty-title', el => el.textContent);
        await test.assertEqual(title, 'No results found', 'Empty should render its title');
        const actions = await test.page.$$eval('example-empty .empty-actions cl-button', els => els.length);
        await test.assertEqual(actions, 2, 'Empty should render slotted action buttons');
    });

    // ============ Popover ============
    await test.test('Popover opens on click and closes on outside click', async () => {
        await test.selectComponent('Popover');
        await test.page.mouse.move(1200, 800); // park cursor away from hover trigger
        await test.page.waitForTimeout(150);

        const panelSel = 'example-popover cl-popover:first-of-type .popover-panel';
        let panel = await test.page.$(panelSel);
        await test.assert(!panel, 'Popover panel should be closed initially');

        await test.page.click('example-popover cl-popover:first-of-type .popover-trigger');
        await test.page.waitForTimeout(200);
        panel = await test.page.$(panelSel);
        await test.assert(!!panel, 'Popover should open on trigger click');

        await test.page.mouse.click(1200, 800);
        await test.page.waitForTimeout(200);
        panel = await test.page.$(panelSel);
        await test.assert(!panel, 'Popover should close on outside click');
    });

    // ============ Segmented ============
    await test.test('Segmented selects an option and updates the model', async () => {
        await test.selectComponent('Segmented');
        await test.page.evaluate(() => {
            const opts = document.querySelectorAll('example-segmented cl-segmented:first-of-type .seg-option');
            opts[1].click(); // Grid
        });
        await test.page.waitForTimeout(200);
        const active = await test.page.$eval('example-segmented cl-segmented .seg-option.active', el => el.textContent.trim());
        await test.assert(/Grid/.test(active), `Clicked option should become active, got: ${active}`);
        const readout = await test.page.$eval('example-segmented div[style*="background"]', el => el.textContent);
        await test.assert(/View: grid/.test(readout), `Model should update to grid, got: ${readout}`);
    });

    // ============ Inplace ============
    await test.test('Inplace edits on click and commits on Enter', async () => {
        await test.selectComponent('Inplace');
        await test.page.click('example-inplace cl-inplace:first-of-type .cl-inplace.display');
        await test.page.waitForTimeout(200);
        await test.assertExists('example-inplace cl-inplace .inplace-input');
        await test.page.keyboard.type('Ada Lovelace', { delay: 20 });
        await test.page.keyboard.press('Enter');
        await test.page.waitForTimeout(200);
        const readout = await test.page.$eval('example-inplace div[style*="background"]', el => el.textContent);
        await test.assert(/Stored name: Ada Lovelace/.test(readout), `Inplace should commit typed value, got: ${readout}`);
    });

    await test.test('Inplace cancels on Escape', async () => {
        await test.selectComponent('Inplace');
        const original = await test.page.$eval('example-inplace cl-inplace:first-of-type .cl-inplace.display', el => el.textContent.trim());
        await test.page.click('example-inplace cl-inplace:first-of-type .cl-inplace.display');
        await test.page.waitForTimeout(200);
        await test.page.keyboard.type('Discarded');
        await test.page.keyboard.press('Escape');
        await test.page.waitForTimeout(200);
        const after = await test.page.$eval('example-inplace cl-inplace:first-of-type .cl-inplace.display', el => el.textContent.trim());
        await test.assertEqual(after, original, 'Escape should discard the edit');
    });

    // ============ Rating ============
    await test.test('Rating sets value on star click', async () => {
        await test.selectComponent('Rating');
        await test.page.mouse.move(1200, 850); // keep cursor off the stars
        await test.page.evaluate(() => {
            const rating = document.querySelectorAll('example-rating cl-rating')[0];
            rating.querySelectorAll('.star .hit')[3].click(); // 4th star
        });
        await test.page.waitForTimeout(200);
        const full = await test.page.evaluate(() => {
            const rating = document.querySelectorAll('example-rating cl-rating')[0];
            return rating.querySelectorAll('.star.full').length;
        });
        await test.assertEqual(full, 4, 'Clicking the 4th star should fill 4 stars');
    });

    await test.test('Rating renders half stars for fractional values', async () => {
        await test.selectComponent('Rating');
        const half = await test.page.evaluate(() => {
            // 2nd rating has value 2.5 (precision 0.5)
            const rating = document.querySelectorAll('example-rating cl-rating')[1];
            return rating.querySelectorAll('.star.half').length;
        });
        await test.assertEqual(half, 1, 'A 2.5 rating should render one half star');
    });

    // ============ OTP ============
    await test.test('OTP fills all boxes and emits complete', async () => {
        await test.selectComponent('OTP');
        await test.page.evaluate(() => {
            document.querySelectorAll('example-otp cl-otp')[0].querySelectorAll('.otp-box')[0].focus();
        });
        await test.page.keyboard.type('123456', { delay: 40 });
        await test.page.waitForTimeout(300);
        const filled = await test.page.evaluate(() =>
            Array.from(document.querySelectorAll('example-otp cl-otp')[0].querySelectorAll('.otp-box')).filter(b => b.value).length);
        await test.assertEqual(filled, 6, 'All 6 OTP boxes should be filled');
        const status = await test.page.$eval('example-otp div[style*="background"]', el => el.textContent);
        await test.assert(/Complete: 123456/.test(status), `OTP should emit complete, got: ${status}`);
    });

    await test.test('OTP backspace clears the last box', async () => {
        await test.selectComponent('OTP');
        await test.page.evaluate(() => {
            const otp = document.querySelectorAll('example-otp cl-otp')[0];
            const boxes = otp.querySelectorAll('.otp-box');
            boxes.forEach((b, i) => { b.value = String(i + 1); });
            boxes[5].focus();
        });
        await test.page.keyboard.press('Backspace');
        await test.page.waitForTimeout(150);
        const last = await test.page.evaluate(() =>
            document.querySelectorAll('example-otp cl-otp')[0].querySelectorAll('.otp-box')[5].value);
        await test.assertEqual(last, '', 'Backspace should clear the focused box');
    });

    // ============ Copy ============
    await test.test('Copy shows copied state after click', async () => {
        await test.selectComponent('Copy');
        await test.page.evaluate(() => {
            // Guarantee the success path in headless (clipboard may be blocked).
            navigator.clipboard = { writeText: () => Promise.resolve() };
        });
        await test.page.click('example-copy cl-copy:first-of-type .cl-copy');
        await test.page.waitForTimeout(200);
        await test.assertExists('example-copy .cl-copy.copied');
    });

    await test.test('Copy renders inline and icon variants', async () => {
        await test.selectComponent('Copy');
        await test.assertExists('example-copy .cl-copy.inline');
        await test.assertExists('example-copy .cl-copy.icon-only');
    });

    // ============ Timeline ============
    await test.test('Timeline renders items with status markers', async () => {
        await test.selectComponent('Timeline');
        const items = await test.page.$$eval('example-timeline .tl-item', els => els.length);
        await test.assertEqual(items, 4, 'Timeline should render all 4 events');
        await test.assertExists('example-timeline .tl-item.status-success');
        await test.assertExists('example-timeline .tl-item .tl-title');
    });

    // ============ Meter ============
    await test.test('Meter renders linear and radial variants', async () => {
        await test.selectComponent('Meter');
        const linear = await test.page.$$eval('example-meter .cl-meter.linear', els => els.length);
        const radial = await test.page.$$eval('example-meter .cl-meter.radial', els => els.length);
        await test.assertEqual(linear, 2, 'Should render 2 linear meters');
        await test.assertEqual(radial, 2, 'Should render 2 radial meters');
        await test.assertExists('example-meter .cl-meter.radial .meter-ring-fg');
    });

    await test.test('Meter fill reflects the value', async () => {
        await test.selectComponent('Meter');
        const width = await test.page.$eval('example-meter .cl-meter.linear .meter-fill', el => el.style.width);
        await test.assert(width && width !== '0%', `Meter fill should have a non-zero width, got: ${width}`);
    });

    await test.test('Meter recolours by threshold as value rises', async () => {
        await test.selectComponent('Meter');
        await test.page.evaluate(() => {
            const slider = document.querySelector('example-meter input[type=range]');
            slider.value = '95';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await test.page.waitForTimeout(300);
        const info = await test.page.evaluate(() => {
            const fill = document.querySelectorAll('example-meter .cl-meter.linear')[1].querySelector('.meter-fill');
            const center = document.querySelector('example-meter .cl-meter.radial .meter-center .meter-value');
            return { color: fill.style.background, width: fill.style.width, center: center.textContent.trim() };
        });
        await test.assertEqual(info.width, '95%', 'Fill should track the value to 95%');
        await test.assert(/220, 53, 69|#dc3545/.test(info.color), `Meter should turn danger-red past the 90 threshold, got: ${info.color}`);
        await test.assertEqual(info.center, '95%', 'Radial center should update reactively');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
