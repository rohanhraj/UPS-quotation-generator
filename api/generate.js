// Set AWS Lambda runtime as Node 20 so Sparticuz knows to unpack AL2023 shared libraries (libnss3.so)
if (process.env.VERCEL) {
    process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs20.x';
}

const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Improve font loading for Linux/Vercel
// await chromium.font('https://raw.githack.com/googlefonts/noto-emoji/main/fonts/NotoColorEmoji.ttf');

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

        if (!quotationData || Object.keys(quotationData).length === 0) {
            return res.status(400).json({ error: 'Request body is required' });
        }

        const assetImages = getAssetImages();

        // Render HTML
        const templatePath = path.join(process.cwd(), 'views', 'quotation-template.ejs');
        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        // Configuring Chromium
        // Using local chrome if standard puppeteer is available (dev mode)
        // or sparticuz/chromium-min downloading from github on Vercel
        const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;

        let executablePath = null;
        if (!isLocal) {
            executablePath = await chromium.executablePath(
                'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
            );
        } else {
            try {
                executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
            } catch (e) {
                console.warn('Local chrome not found');
            }
        }

        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath || '/usr/bin/google-chrome',
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            preferCSSPageSize: true
        });

        await browser.close();
        browser = null;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ARVI_Quotation_${quotationData.quoteNumber || 'Q001'}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Generation Error:', error);

        if (browser) {
            try {
                await browser.close();
            } catch (e) { console.error('Error closing browser:', e); }
        }

        res.status(500).json({
            error: 'Failed to generate PDF',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
