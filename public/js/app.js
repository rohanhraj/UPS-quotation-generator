// ARVI Quotation Generator - App JavaScript
document.addEventListener('DOMContentLoaded', function () {
    initializeForm();
    setupEventListeners();
});

let itemIndex = 3; // Start from 3 since we have 3 initial rows

function initializeForm() {
    // Set default date
    const today = new Date();
    document.getElementById('quoteDate').valueAsDate = today;

    // Generate quote number
    const year = today.getFullYear();
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    document.getElementById('quoteNumber').value = `ARVI/${year}/${randomNum}`;
}

function setupEventListeners() {
    // Preview button
    document.getElementById('previewBtn').addEventListener('click', showPreview);

    // Generate PDF button
    document.getElementById('generateBtn').addEventListener('click', generatePDF);

    // Add item button
    document.getElementById('addItemBtn').addEventListener('click', addItem);

    // Close modal on click outside
    document.getElementById('previewModal').addEventListener('click', function (e) {
        if (e.target === this) closePreview();
    });
}

function addItem() {
    const tbody = document.getElementById('itemsTableBody');
    const row = document.createElement('tr');
    row.className = 'item-row';
    row.dataset.index = itemIndex;

    row.innerHTML = `
        <td><input type="text" name="items[${itemIndex}][slno]" value="${itemIndex + 1}" class="input-small"></td>
        <td><textarea name="items[${itemIndex}][description]" rows="2" placeholder="Description..."></textarea></td>
        <td><input type="number" name="items[${itemIndex}][unitPrice]" class="price-input" placeholder="0" onchange="calculateItemValue(${itemIndex}); calculateTotal();"></td>
        <td><input type="number" name="items[${itemIndex}][qty]" value="1" min="1" class="qty-input" onchange="calculateItemValue(${itemIndex}); calculateTotal();"></td>
        <td><input type="text" name="items[${itemIndex}][value]" readonly class="value-input"></td>
        <td><button type="button" class="btn-remove" onclick="removeItem(${itemIndex}); calculateTotal();">✕</button></td>
    `;

    tbody.appendChild(row);
    itemIndex++;
}

function removeItem(index) {
    const row = document.querySelector(`.item-row[data-index="${index}"]`);
    if (row) {
        row.remove();
        calculateTotal();
    }
}

function calculateItemValue(index) {
    const row = document.querySelector(`.item-row[data-index="${index}"]`);
    if (!row) return;

    const price = parseFloat(row.querySelector('.price-input').value) || 0;
    const qty = parseInt(row.querySelector('.qty-input').value) || 1;
    const value = price * qty;

    row.querySelector('.value-input').value = formatIndianNumber(value);
}

function calculateTotal() {
    let subtotal = 0;

    // Sum all item values
    document.querySelectorAll('#itemsTableBody .item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.price-input')?.value) || 0;
        const qty = parseInt(row.querySelector('.qty-input')?.value) || 1;
        subtotal += price * qty;
    });

    // Calculate GST (18%) and Grand Total
    const gstAmount = subtotal * 0.18;
    const grandTotal = subtotal + gstAmount;

    // Update display
    document.getElementById('subtotalDisplay').textContent = '₹ ' + formatIndianNumber(subtotal);
    document.getElementById('gstDisplay').textContent = '₹ ' + formatIndianNumber(gstAmount);
    document.getElementById('grandTotalDisplay').textContent = '₹ ' + formatIndianNumber(grandTotal);

    // Update hidden fields
    document.getElementById('subtotal').value = subtotal;
    document.getElementById('gstAmount').value = gstAmount;
    document.getElementById('grandTotal').value = grandTotal;
}

function formatIndianNumber(num) {
    if (!num || num === 0) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toggleSection(header) {
    const section = header.closest('.collapsible');
    section.classList.toggle('open');
}

function getFormData() {
    const form = document.getElementById('quotationForm');
    const formData = new FormData(form);
    const data = {};

    // Get simple fields
    for (const [key, value] of formData.entries()) {
        if (!key.startsWith('items[') && !key.startsWith('option2Items[')) {
            data[key] = value;
        }
    }

    // Get items
    data.items = [];
    document.querySelectorAll('#itemsTableBody .item-row').forEach(row => {
        const slno = row.querySelector('input[name*="[slno]"]')?.value || '';
        const description = row.querySelector('textarea[name*="[description]"]')?.value || '';
        const unitPrice = row.querySelector('.price-input')?.value || '';
        const qty = row.querySelector('.qty-input')?.value || '1';
        const value = row.querySelector('.value-input')?.value || '';

        if (slno || description) {
            data.items.push({ slno, description, unitPrice, qty, value });
        }
    });

    // Get option 2 items
    data.option2Items = [];
    document.querySelectorAll('#option2TableBody tr').forEach(row => {
        const slno = row.querySelector('input[name*="[slno]"]')?.value || '';
        const description = row.querySelector('textarea[name*="[description]"]')?.value || '';
        const unitPrice = row.querySelector('.price-input')?.value || '';
        const qty = row.querySelector('.qty-input')?.value || '1';
        const value = row.querySelector('.value-input')?.value || '';

        if (slno || description) {
            data.option2Items.push({ slno, description, unitPrice, qty, value });
        }
    });

    // Get totals
    data.subtotal = parseFloat(document.getElementById('subtotal').value) || 0;
    data.gstAmount = parseFloat(document.getElementById('gstAmount').value) || 0;
    data.grandTotal = parseFloat(document.getElementById('grandTotal').value) || 0;

    return data;
}

async function showPreview() {
    const data = getFormData();

    try {
        const response = await fetch('/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const html = await response.text();
        const frame = document.getElementById('previewFrame');
        frame.srcdoc = html;

        document.getElementById('previewModal').classList.add('active');
    } catch (error) {
        console.error('Preview error:', error);
        alert('Error generating preview');
    }
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

async function generatePDF() {
    const data = getFormData();
    const loading = document.getElementById('loadingOverlay');
    loading.classList.add('active');

    try {
        // Get preview HTML from the API (same endpoint as Preview button uses)
        const response = await fetch('/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to generate preview');
        }

        const html = await response.text();

        // Create hidden iframe for rendering
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px; height: 1123px; border: none;';
        document.body.appendChild(iframe);

        iframe.contentDocument.open();
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        // Wait for iframe content to load
        await new Promise(resolve => {
            iframe.onload = resolve;
            setTimeout(resolve, 2000); // Fallback timeout
        });

        // Wait extra for images
        await new Promise(r => setTimeout(r, 1000));

        // Capture with html2canvas
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(iframe.contentDocument.body, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794
        });

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        let y = margin;
        let remaining = imgHeight;
        const usableHeight = pageHeight - (margin * 2);

        // Add pages
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, contentWidth, imgHeight);
        remaining -= usableHeight;

        while (remaining > 0) {
            pdf.addPage();
            y = margin - (imgHeight - remaining);
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, contentWidth, imgHeight);
            remaining -= usableHeight;
        }

        pdf.save(`ARVI_Quotation_${data.quoteNumber || 'Q001'}.pdf`);
        document.body.removeChild(iframe);

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        loading.classList.remove('active');
    }
}

