const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Use the official sparticuz chromium releases
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
    // Try multiple paths for assets
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
                if (Object.keys(assetImages).length > 0) {
                    break;
                }
            }
        } catch (error) {
            console.error('Error reading assets from:', assetsDir, error.message);
        }
    }

    console.log('Loaded assets:', Object.keys(assetImages).length);
    return assetImages;
}

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        console.log('Starting PDF generation on Vercel...');
        console.log('Current working directory:', process.cwd());

        // Convert assets to base64 for PDF
        const assetImages = getAssetImages();

        // Find template path
        const possibleTemplatePaths = [
            path.join(process.cwd(), 'views', 'quotation-template.ejs'),
            path.join(__dirname, '..', 'views', 'quotation-template.ejs')
        ];

        let templatePath = null;
        for (const p of possibleTemplatePaths) {
            if (fs.existsSync(p)) {
                templatePath = p;
                console.log('Found template at:', p);
                break;
            }
        }

        if (!templatePath) {
            throw new Error('Template not found. Tried: ' + possibleTemplatePaths.join(', '));
        }

        // Render the EJS template to HTML
        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        console.log('HTML rendered successfully, length:', html.length);
        console.log('Launching browser...');

        // Configure chromium for serverless
        chromium.setHeadlessMode = true;
        chromium.setGraphicsMode = false;

        // Launch Puppeteer with chromium-min
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--hide-scrollbars',
                '--disable-web-security',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(CHROMIUM_URL),
            headless: chromium.headless
        });

        console.log('Browser launched successfully');
        const page = await browser.newPage();

        await page.setViewport({ width: 1200, height: 800 });

        console.log('Setting page content...');
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for images to render
        await new Promise(resolve => setTimeout(resolve, 500));

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

        console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
        await browser.close();
        browser = null;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ARVI_Quotation_${quotationData.quoteNumber || 'Q001'}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
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
            details: error.message,
            stack: error.stack
        });
    }
};
