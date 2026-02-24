/**
 * generate-icons.js
 * Converts icon.svg into icon16.png, icon48.png, icon128.png
 * Run: node generate-icons.js   (from the Extension/extension/icons/ folder)
 *
 * Requires: npm install sharp (one-time, not needed for the extension itself)
 */

const sharp = require('sharp');
const path = require('path');

const sizes = [16, 48, 128];
const svgPath = path.join(__dirname, 'icon.svg');

async function generateIcons() {
    for (const size of sizes) {
        const outPath = path.join(__dirname, `icon${size}.png`);
        await sharp(svgPath)
            .resize(size, size)
            .png()
            .toFile(outPath);
        console.log(`✅ Generated icon${size}.png`);
    }
    console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
