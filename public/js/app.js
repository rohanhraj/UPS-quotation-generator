// ARVI Quotation Generator - App JavaScript
let quillRef, quillDetails;

document.addEventListener('DOMContentLoaded', function () {
    initializeEditors();
    initializeForm();
    setupEventListeners();
    calculateTotal(); // Initial calculation
});

let itemIndex = 3; 

function initializeEditors() {
    const toolbarOptions = [
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['clean']
    ];

    quillRef = new Quill('#referenceTextEditor', {
        theme: 'snow',
        placeholder: 'Dear Sir/Madam,\n\nWith reference to your enquiry...',
        modules: {
            toolbar: toolbarOptions
        }
    });

    quillDetails = new Quill('#optionDetailsEditor', {
        theme: 'snow',
        placeholder: 'Enter technical details...',
        modules: {
            toolbar: toolbarOptions
        }
    });

    // Set initial values for Quill
    const initialRefText = `<p>Dear Sir/Madam,</p><p><br></p><p>With reference to your enquiry and our site visit dated ________, we are pleased to submit our quotation for the following:</p><p><br></p><p>[Add any other reference details here]</p>`;
    
    const initialDetailsText = `<p>VFI power-conditioning topology with galvanic isolation for comprehensive power protection.</p><p>The downtime in a process is not only due to failure of power but also due to breakdown of any machines in the production line - mainly the failure of electrical or electronic parts in the machine.</p><p>Power experts attribute this failure to the poor quality of power.</p><ul><li>Galvanic isolation at the output for comprehensive power protection</li><li>Generator compatible with all KVA and Power Factor</li><li>Long life, designed for maintenance and environment</li><li>Fully DSP Controlled</li><li>HF/VHF IGBT based inverter (Operated in Zero current switching, Interleaved)</li></ul>`;

    quillRef.clipboard.dangerouslyPasteHTML(initialRefText);
    quillDetails.clipboard.dangerouslyPasteHTML(initialDetailsText);
}

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

    // Listen for changes in Option 2 table
    document.getElementById('option2TableBody').addEventListener('input', function(e) {
        if (e.target.classList.contains('price-input') || e.target.classList.contains('qty-input')) {
            const row = e.target.closest('tr');
            calculateRowValue(row);
        }
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
    calculateRowValue(row);
}

function calculateRowValue(row) {
    const price = parseFloat(row.querySelector('.price-input').value) || 0;
    const qty = parseInt(row.querySelector('.qty-input').value) || 1;
    const value = price * qty;
    row.querySelector('.value-input').value = formatIndianNumber(value);
}

function calculateTotal() {
    let subtotal = 0;

    // Sum all item values from Option 1
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
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
    // Sync Quill editors to hidden fields
    document.getElementById('referenceText').value = quillRef.root.innerHTML;
    document.getElementById('optionDetails').value = quillDetails.root.innerHTML;

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
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const slno = row.querySelector('input[name*="[slno]"]')?.value || '';
        const description = row.querySelector('textarea[name*="[description]"]')?.value || row.querySelector('input[name*="[description]"]')?.value || '';
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
        const description = row.querySelector('textarea[name*="[description]"]')?.value || row.querySelector('input[name*="[description]"]')?.value || '';
        const unitPrice = row.querySelector('.price-input')?.value || '';
        const qty = row.querySelector('.qty-input')?.value || '1';
        const value = row.querySelector('.value-input')?.value || '';

        if (slno || description) {
            data.option2Items.push({ slno, description, unitPrice, qty, value });
        }
    });

    // Capture rich text explicitly
    data.referenceText = document.getElementById('referenceText').value;
    data.optionDetails = document.getElementById('optionDetails').value;

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
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to generate PDF');
        }

        // Handle PDF download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `ARVI_Quotation_${data.quoteNumber || 'Q001'}.pdf`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('PDF generation error:', error);
        alert(`Error generating PDF: ${error.message}`);
    } finally {
        loading.classList.remove('active');
    }
}
