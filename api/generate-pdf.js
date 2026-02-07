const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Chromium executable URL for Vercel
const CHROMIUM_URL = 'https://github.com/nicephil/chromium-bin/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';

// Helper function to convert image to base64
function imageToBase64(imagePath) {
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const ext = path.extname(imagePath).toLowerCase().slice(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.error('Error reading image:', imagePath, error.message);
        return '';
    }
}

// Get all asset images as base64
function getAssetImages() {
    const assetsDir = path.join(process.cwd(), 'public', 'assets');
    const assetImages = {};
    try {
        if (fs.existsSync(assetsDir)) {
            const assetFiles = fs.readdirSync(assetsDir);
            assetFiles.forEach(file => {
                if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
                    assetImages[file] = imageToBase64(path.join(assetsDir, file));
                }
            });
        }
    } catch (error) {
        console.error('Error reading assets directory:', error.message);
    }
    return assetImages;
}

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let browser = null;

    try {
        const quotationData = req.body;

        // Basic validation
        if (!quotationData || Object.keys(quotationData).length === 0) {
            return res.status(400).json({ error: 'Request body is required' });
        }

        console.log('Starting PDF generation...');

        // Convert assets to base64 for PDF
        const assetImages = getAssetImages();

        // Render the EJS template to HTML
        const templatePath = path.join(process.cwd(), 'views', 'quotation-template.ejs');
        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        console.log('HTML rendered, launching browser...');

        // Launch Puppeteer with chromium-min
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(CHROMIUM_URL),
            headless: chromium.headless
        });

        console.log('Browser launched, creating page...');
        const page = await browser.newPage();

        await page.setViewport({ width: 1200, height: 800 });

        console.log('Setting page content...');
        await page.setContent(html, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for images to render
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            printBackground: true,
            preferCSSPageSize: true
        });

        console.log('PDF generated, closing browser...');
        await browser.close();
        browser = null;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ARVI_Quotation_${quotationData.quoteNumber || 'Q001'}.pdf"`);
        res.send(pdfBuffer);
        console.log('PDF sent successfully!');

    } catch (error) {
        console.error('PDF Generation Error:', error.message);
        console.error('Stack:', error.stack);

        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError.message);
            }
        }

        res.status(500).json({
            error: 'Failed to generate PDF',
            details: error.message
        });
    }
};
