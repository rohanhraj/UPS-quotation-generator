const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Mock request body with HTML content from rich text editors
const mockData = {
    quoteNumber: "US-002-TEST",
    quoteDate: "2026-02-11",
    customerName: "Rich Text Customer",
    referenceText: "<p>Dear Sir,</p><p>With <strong>bold reference</strong> and <span style=\"color: rgb(230, 0, 0);\">red text</span>.</p><ul><li>Bullet point</li></ul>",
    optionTitle: "Rich Text Model",
    optionDetails: "<p>Features include:</p><ul><li><strong>Galvanic Isolation</strong></li><li><span style=\"color: rgb(0, 102, 204);\">DSP Control</span></li></ul>"
};

async function testRichTextRendering() {
    console.log("Running test for US-002: Implement rich text formatting in UI...");
    
    const templatePath = path.join(process.cwd(), 'views', 'quotation-template.ejs');
    
    try {
        const html = await ejs.renderFile(templatePath, {
            data: mockData,
            assetsPath: '/assets',
            assetImages: {},
            isBase64: false
        });
        
        // Check if HTML tags are preserved (not escaped)
        assert(html.includes("<strong>bold reference</strong>"), "Bold tags missing or escaped in reference text");
        assert(html.includes("color: rgb(230, 0, 0);"), "Color style missing or escaped in reference text");
        assert(html.includes("<ul><li>Bullet point</li></ul>"), "List tags missing or escaped in reference text");
        
        // Check technical details rich text
        assert(html.includes("<strong>Galvanic Isolation</strong>"), "Bold tags missing or escaped in technical details");
        assert(html.includes("color: rgb(0, 102, 204);"), "Color style missing or escaped in technical details");
        
        console.log("✅ Rich text correctly rendered in HTML!");
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }
}

testRichTextRendering();
