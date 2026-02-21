const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Mock request body
const mockData = {
    quoteNumber: "TEST-001",
    quoteDate: "2026-02-11",
    customerName: "Test Customer",
    customerAddress: "Test Address",
    kindAttn: "Test Attn",
    referenceText: "Test Reference Line 1\nTest Reference Line 2"
};

async function testReferenceDetails() {
    console.log("Running test for US-001: Fix reference details bug...");
    
    const templatePath = path.join(process.cwd(), 'views', 'quotation-template.ejs');
    
    try {
        const html = await ejs.renderFile(templatePath, {
            data: mockData,
            assetsPath: '/assets',
            assetImages: {},
            isBase64: false
        });
        
        // Check if reference details are present in the HTML
        assert(html.includes("Test Reference Line 1"), "Reference text line 1 missing from rendered HTML");
        assert(html.includes("Test Reference Line 2"), "Reference text line 2 missing from rendered HTML");
        assert(html.includes("<br>"), "Line breaks (br tags) missing from rendered HTML");
        
        console.log("✅ Reference details correctly rendered in HTML!");
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }
}

testReferenceDetails();
