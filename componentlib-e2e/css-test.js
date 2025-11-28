const puppeteer = require('puppeteer');

async function testCSS() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:9000/componentlib/#spinner', { waitUntil: 'networkidle0' });
    await page.waitForSelector('cl-spinner');
    await new Promise(r => setTimeout(r, 500));

    const keyframes = await page.evaluate(() => {
        const sheets = document.styleSheets;
        const keyframes = [];

        for (let sheet of sheets) {
            try {
                for (let rule of sheet.cssRules) {
                    if (rule.type === CSSRule.KEYFRAMES_RULE) {
                        keyframes.push(rule.name);
                    }
                }
            } catch (e) {}
        }

        return keyframes.sort();
    });

    console.log('Keyframes found:');
    keyframes.forEach(k => console.log('  ' + k));

    // Check spinner animation
    const spinnerAnim = await page.evaluate(() => {
        const spinner = document.querySelector('cl-spinner .spinner.border');
        if (spinner) {
            const style = window.getComputedStyle(spinner);
            return {
                animationName: style.animationName,
                animationPlayState: style.animationPlayState
            };
        }
        return null;
    });

    console.log('\nSpinner animation:', spinnerAnim);

    await browser.close();
}

testCSS().catch(console.error);
