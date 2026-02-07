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
    contentSecurityPolicy: false, // Disabled for inline styles in PDF template
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// ===================
// Logging
// ===================
if (isProduction) {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

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

// ===================
// Health Check
// ===================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV
    });
});

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================
// Helper Functions
// ===================

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

// Get Chrome path from environment or default
function getChromePath() {
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }
    // Default paths by platform
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

// Generate PDF endpoint
app.post('/api/generate-pdf', async (req, res) => {
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
        const templatePath = path.join(__dirname, 'views', 'quotation-template.ejs');
        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        console.log('HTML rendered, launching browser...');

        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: getChromePath(),
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

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ARVI_Quotation_${quotationData.quoteNumber || 'Q001'}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
        console.log('PDF sent successfully!');

    } catch (error) {
        console.error('PDF Generation Error:', error.message);
        if (!isProduction) {
            console.error('Stack:', error.stack);
        }

        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError.message);
            }
        }

        res.status(500).json({
            error: 'Failed to generate PDF',
            details: isProduction ? 'Internal server error' : error.message
        });
    }
});

// Preview quotation (returns HTML)
app.post('/api/preview', async (req, res) => {
    try {
        const quotationData = req.body;

        if (!quotationData || Object.keys(quotationData).length === 0) {
            return res.status(400).json({ error: 'Request body is required' });
        }

        const assetImages = getAssetImages();

        res.render('quotation-template', {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });
    } catch (error) {
        console.error('Preview Error:', error);
        res.status(500).json({
            error: 'Failed to generate preview',
            details: isProduction ? 'Internal server error' : error.message
        });
    }
});

// ===================
// Error Handling
// ===================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: isProduction ? undefined : err.message
    });
});

// ===================
// Server Startup
// ===================

const server = app.listen(PORT, () => {
    console.log(`🚀 ARVI Quotation Generator running at http://localhost:${PORT}`);
    console.log(`📋 Environment: ${NODE_ENV}`);
    console.log(`🔒 Security: helmet, cors, rate-limiting enabled`);
});

// ===================
// Graceful Shutdown
// ===================

function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
