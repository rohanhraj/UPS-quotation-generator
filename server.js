const express = require('express');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
    const assetsDir = path.join(__dirname, 'assets');
    const assetImages = {};
    try {
        const assetFiles = fs.readdirSync(assetsDir);
        assetFiles.forEach(file => {
            if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
                assetImages[file] = imageToBase64(path.join(assetsDir, file));
            }
        });
    } catch (error) {
        console.error('Error reading assets directory:', error.message);
    }
    return assetImages;
}

// Generate PDF endpoint
app.post('/api/generate-pdf', async (req, res) => {
    let browser = null;

    try {
        const quotationData = req.body;
        console.log('Starting PDF generation...');

        // Convert assets to base64 for PDF
        const assetImages = getAssetImages();

        // Render the EJS template to HTML
        const templatePath = path.join(__dirname, 'views', 'quotation-template.ejs');
        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        console.log('HTML rendered, launching browser...');

        // Launch Puppeteer with system Chrome
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions'
            ],
            timeout: 60000
        });

        console.log('Browser launched, creating page...');
        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({ width: 1200, height: 800 });

        console.log('Setting page content...');
        // Set content with base URL for assets
        await page.setContent(html, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait a bit for images to render
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Generating PDF...');
        // Generate PDF
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

        // Send PDF as response
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ARVI_Quotation_${quotationData.quoteNumber || 'Q001'}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
        console.log('PDF sent successfully!');

    } catch (error) {
        console.error('PDF Generation Error:', error.message);
        console.error('Stack:', error.stack);

        // Ensure browser is closed on error
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
});

// Preview quotation (returns HTML)
app.post('/api/preview', async (req, res) => {
    try {
        const quotationData = req.body;
        const assetImages = getAssetImages();

        res.render('quotation-template', {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });
    } catch (error) {
        console.error('Preview Error:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ARVI Quotation Generator running at http://localhost:${PORT}`);
});
