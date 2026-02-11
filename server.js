require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// ===================
// Security Middleware
// ===================

// Helmet for HTTP security headers
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// ===================
// Logging
// ===================
app.use(morgan('dev'));

// ===================
// Body Parsing
// ===================
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

// ===================
// Helper Functions
// ===================

function imageToBase64(imagePath) {
    try {
        if (!fs.existsSync(imagePath)) return '';
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
    const assetsDir = path.join(__dirname, 'public', 'assets');
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

// Get Chrome path from environment or default
function getChromePath() {
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }
    switch (process.platform) {
        case 'darwin':
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        case 'win32':
            return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        default:
            return '/usr/bin/google-chrome';
    }
}

// ===================
// API Routes
// ===================

// Generate PDF endpoint (updated to /api/generate)
app.post('/api/generate', async (req, res) => {
    let browser = null;

    try {
        const quotationData = req.body;

        if (!quotationData || Object.keys(quotationData).length === 0) {
            return res.status(400).json({ error: 'Request body is required' });
        }

        console.log('Generating PDF for:', quotationData.quoteNumber);

        const assetImages = getAssetImages();

        const templatePath = path.join(__dirname, 'views', 'quotation-template.ejs');
        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: getChromePath(),
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

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

        await browser.close();
        browser = null;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ARVI_Quotation_${quotationData.quoteNumber || 'Q001'}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Generation Error:', error.message);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
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
        res.status(500).json({ error: 'Failed to generate preview', details: error.message });
    }
});

const server = app.listen(PORT, () => {
    console.log(`🚀 ARVI Quotation Generator running at http://localhost:${PORT}`);
});
