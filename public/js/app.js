// ARVI Quotation Generator - App JavaScript
let quillRef, quillDetails;

document.addEventListener('DOMContentLoaded', function () {
    initializeEditors();
    initializeForm();
    setupEventListeners();
});

let itemIndex = 3; 

function initializeEditors() {
    // Advanced toolbar for color, bold, etc.
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'header': [1, 2, 3, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['clean']
    ];

    quillRef = new Quill('#referenceTextEditor', {
        theme: 'snow',
        placeholder: 'Enter reference details...',
        modules: { toolbar: toolbarOptions }
    });

    quillDetails = new Quill('#optionDetailsEditor', {
        theme: 'snow',
        placeholder: 'Enter technical details...',
        modules: { toolbar: toolbarOptions }
    });

    // Default content
    const initialRefText = `<p>Dear Sir/Madam,</p><p><br></p><p>With reference to your enquiry and our site visit, we are pleased to submit our quotation:</p>`;
    const initialDetailsText = `<p><strong>VFI power-conditioning topology</strong> with galvanic isolation for comprehensive power protection.</p><ul><li>Galvanic isolation at the output</li><li>Generator compatible</li><li>Fully DSP Controlled</li></ul>`;

    quillRef.clipboard.dangerouslyPasteHTML(initialRefText);
    quillDetails.clipboard.dangerouslyPasteHTML(initialDetailsText);
}

function initializeForm() {
    const today = new Date();
    document.getElementById('quoteDate').valueAsDate = today;
    const year = today.getFullYear();
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    document.getElementById('quoteNumber').value = `ARVI/${year}/${randomNum}`;
}

function setupEventListeners() {
    document.getElementById('previewBtn').addEventListener('click', showPreview);
    document.getElementById('generateBtn').addEventListener('click', generatePDF);
    document.getElementById('addItemBtn').addEventListener('click', addItem);
    
    // Auto-calculate on input
    document.getElementById('quotationForm').addEventListener('input', function(e) {
        if (e.target.classList.contains('price-input') || e.target.classList.contains('qty-input')) {
            const row = e.target.closest('tr');
            if (row) calculateRowValue(row);
            calculateTotal();
        }
    });
}

function addItem() {
    const tbody = document.getElementById('itemsTableBody');
    const row = document.createElement('tr');
    row.className = 'item-row';
    row.innerHTML = `
        <td><input type="text" name="items[${itemIndex}][slno]" value="${itemIndex + 1}" class="input-small"></td>
        <td><textarea name="items[${itemIndex}][description]" rows="2"></textarea></td>
        <td><input type="number" name="items[${itemIndex}][unitPrice]" class="price-input" value="0"></td>
        <td><input type="number" name="items[${itemIndex}][qty]" value="1" class="qty-input"></td>
        <td><input type="text" name="items[${itemIndex}][value]" readonly class="value-input" value="0.00"></td>
        <td><button type="button" class="btn-remove" onclick="this.closest('tr').remove(); calculateTotal();">✕</button></td>
    `;
    tbody.appendChild(row);
    itemIndex++;
}

function calculateRowValue(row) {
    const price = parseFloat(row.querySelector('.price-input').value) || 0;
    const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
    const value = price * qty;
    row.querySelector('.value-input').value = value.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function calculateTotal() {
    let subtotal = 0;
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const price = parseFloat(row.querySelector('.price-input')?.value) || 0;
        const qty = parseFloat(row.querySelector('.qty-input')?.value) || 0;
        subtotal += (price * qty);
    });

    const gst = subtotal * 0.18;
    const grand = subtotal + gst;

    document.getElementById('subtotalDisplay').textContent = '₹ ' + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('gstDisplay').textContent = '₹ ' + gst.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('grandTotalDisplay').textContent = '₹ ' + grand.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    document.getElementById('subtotal').value = subtotal;
    document.getElementById('gstAmount').value = gst;
    document.getElementById('grandTotal').value = grand;
}

function getFormData() {
    // SYNC RICH TEXT
    document.getElementById('referenceText').value = quillRef.root.innerHTML;
    document.getElementById('optionDetails').value = quillDetails.root.innerHTML;

    const form = document.getElementById('quotationForm');
    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        if (!key.includes('[')) data[key] = value;
    }

    data.items = [];
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        data.items.push({
            slno: row.querySelector('input[name*="[slno]"]').value,
            description: row.querySelector('textarea[name*="[description]"]').value,
            unitPrice: parseFloat(row.querySelector('.price-input').value) || 0,
            qty: parseFloat(row.querySelector('.qty-input').value) || 0,
            value: (parseFloat(row.querySelector('.price-input').value) || 0) * (parseFloat(row.querySelector('.qty-input').value) || 0)
        });
    });

    data.subtotal = parseFloat(document.getElementById('subtotal').value);
    data.gstAmount = parseFloat(document.getElementById('gstAmount').value);
    data.grandTotal = parseFloat(document.getElementById('grandTotal').value);

    return data;
}

async function showPreview() {
    const data = getFormData();
    const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const html = await response.text();
    document.getElementById('previewFrame').srcdoc = html;
    document.getElementById('previewModal').classList.add('active');
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
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ARVI_Quotation_${data.quoteNumber}.pdf`;
        a.click();
    } finally {
        loading.classList.remove('active');
    }
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}
