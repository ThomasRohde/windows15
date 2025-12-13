#!/usr/bin/env node

/**
 * Icon Generator Script
 * 
 * This script generates PWA icons from SVG source files.
 * It requires sharp to be installed: npm install -D sharp
 * 
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
    try {
        const sharp = require('sharp');
        
        const publicDir = path.join(__dirname, '..', 'public');
        const iconSvg = path.join(publicDir, 'icon.svg');
        const maskableSvg = path.join(publicDir, 'icon-maskable.svg');
        
        // Generate regular icons
        await sharp(iconSvg)
            .resize(192, 192)
            .png()
            .toFile(path.join(publicDir, 'icon-192.png'));
        console.log('✅ Generated icon-192.png');
        
        await sharp(iconSvg)
            .resize(512, 512)
            .png()
            .toFile(path.join(publicDir, 'icon-512.png'));
        console.log('✅ Generated icon-512.png');
        
        // Generate maskable icons
        await sharp(maskableSvg)
            .resize(192, 192)
            .png()
            .toFile(path.join(publicDir, 'icon-maskable-192.png'));
        console.log('✅ Generated icon-maskable-192.png');
        
        await sharp(maskableSvg)
            .resize(512, 512)
            .png()
            .toFile(path.join(publicDir, 'icon-maskable-512.png'));
        console.log('✅ Generated icon-maskable-512.png');
        
        // Generate favicon
        await sharp(iconSvg)
            .resize(32, 32)
            .png()
            .toFile(path.join(publicDir, 'favicon.png'));
        console.log('✅ Generated favicon.png');
        
        // Generate apple touch icon
        await sharp(iconSvg)
            .resize(180, 180)
            .png()
            .toFile(path.join(publicDir, 'apple-touch-icon.png'));
        console.log('✅ Generated apple-touch-icon.png');
        
        console.log('\n🎉 All icons generated successfully!');
        console.log('📝 Don\'t forget to add <link rel="apple-touch-icon"> to index.html');
        
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('❌ Sharp is not installed. Run: npm install -D sharp');
            console.log('\nAlternatively, use an online SVG to PNG converter:');
            console.log('1. Visit https://svgtopng.com/');
            console.log('2. Convert public/icon.svg to PNG at 192x192 and 512x512');
            console.log('3. Convert public/icon-maskable.svg to PNG at 192x192 and 512x512');
            console.log('4. Save as icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png');
        } else {
            console.error('❌ Error generating icons:', error.message);
        }
        process.exit(1);
    }
}

generateIcons();
