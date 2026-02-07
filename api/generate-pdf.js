const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

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
    const possiblePaths = [
        path.join(process.cwd(), 'public', 'assets'),
        path.join(process.cwd(), 'assets'),
        path.join(__dirname, '..', 'public', 'assets'),
        path.join(__dirname, '..', 'assets')
    ];

    const assetImages = {};

    for (const assetsDir of possiblePaths) {
        try {
            if (fs.existsSync(assetsDir)) {
                console.log('Found assets at:', assetsDir);
                const assetFiles = fs.readdirSync(assetsDir);
                assetFiles.forEach(file => {
                    if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        assetImages[file] = imageToBase64(path.join(assetsDir, file));
                    }
                });
                if (Object.keys(assetImages).length > 0) break;
            }
        } catch (error) {
            console.error('Error reading assets from:', assetsDir, error.message);
        }
    }

    console.log('Loaded assets:', Object.keys(assetImages).length);
    return assetImages;
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let browser = null;

    try {
        const quotationData = req.body;

        if (!quotationData || Object.keys(quotationData).length === 0) {
            return res.status(400).json({ error: 'Request body is required' });
        }

        console.log('Starting PDF generation...');

        const assetImages = getAssetImages();

        // Find template
        const templatePaths = [
            path.join(process.cwd(), 'views', 'quotation-template.ejs'),
            path.join(__dirname, '..', 'views', 'quotation-template.ejs')
        ];

        let templatePath = templatePaths.find(p => fs.existsSync(p));
        if (!templatePath) {
            throw new Error('Template not found');
        }

        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        console.log('Launching browser...');

        // Use bundled chromium
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });

        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 25000
        });

        await new Promise(r => setTimeout(r, 500));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
            printBackground: true
        });

        await browser.close();
        browser = null;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ARVI_Quotation_${quotationData.quoteNumber || 'Q001'}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Error:', error);
        if (browser) {
            try { await browser.close(); } catch (e) { }
        }
        res.status(500).json({ error: 'PDF generation failed', details: error.message });
    }
};
