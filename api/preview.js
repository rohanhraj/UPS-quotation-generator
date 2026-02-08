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
        return '';
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

    try {
        const quotationData = req.body;

        if (!quotationData || Object.keys(quotationData).length === 0) {
            return res.status(400).json({ error: 'Request body is required' });
        }

        const assetImages = getAssetImages();

        const templatePath = path.join(process.cwd(), 'views', 'quotation-template.ejs');
        const html = await ejs.renderFile(templatePath, {
            data: quotationData,
            assetsPath: '/assets',
            assetImages: assetImages,
            isBase64: true
        });

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Preview Error:', error);
        console.error('Current working directory:', process.cwd());
        console.error('Template path:', path.join(process.cwd(), 'views', 'quotation-template.ejs'));

        res.status(500).json({
            error: 'Failed to generate preview',
            details: error.message,
            pathHelper: {
                cwd: process.cwd(),
                templateExists: fs.existsSync(path.join(process.cwd(), 'views', 'quotation-template.ejs')),
                assetsDirExists: fs.existsSync(path.join(process.cwd(), 'public', 'assets'))
            }
        });
    }
};
