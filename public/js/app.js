// ARVI Quotation Generator - App JavaScript
let quillInstances = {};

const toolbarOptions = [
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['clean']
];

document.addEventListener('DOMContentLoaded', function () {
    initializeStaticEditors();
    initializeForm();
    setupEventListeners();
    addItem(); // Start with one row
});

function createEditor(selector, placeholder = '') {
    const quill = new Quill(selector, {
        theme: 'snow',
        placeholder: placeholder,
        modules: {
            toolbar: toolbarOptions
        }
    });
    quillInstances[selector] = quill;
    return quill;
}

function initializeStaticEditors() {
    createEditor('#customerNameEditor', 'Customer Name...');
    createEditor('#customerAddressEditor', 'Address...');
    createEditor('#kindAttnEditor', 'Kind Attention...');
    createEditor('#referenceTextEditor', 'Main reference details...');
    createEditor('#optionTitleEditor', 'Option Title...');
    createEditor('#optionDetailsEditor', 'Technical details...');
    createEditor('#signNameEditor', 'Signatory name...');
    createEditor('#signDesigEditor', 'Designation...');

    // Set initial values
    quillInstances['#referenceTextEditor'].clipboard.dangerouslyPasteHTML('<p>Dear Sir/Madam,</p><p><br></p><p>With reference to your enquiry, we are pleased to submit our quotation:</p>');
    quillInstances['#optionTitleEditor'].clipboard.dangerouslyPasteHTML('<p><strong>PFC-XR 303</strong></p>');
    quillInstances['#signNameEditor'].clipboard.dangerouslyPasteHTML('<p><strong>Santosh Risbood</strong></p>');
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
    
    document.getElementById('quotationForm').addEventListener('input', function(e) {
        if (e.target.classList.contains('price-input') || e.target.classList.contains('qty-input')) {
            calculateTotal();
        }
    });
}

let itemCounter = 0;
function addItem() {
    const tbody = document.getElementById('itemsTableBody');
    const row = document.createElement('tr');
    const descId = `item-desc-${itemCounter}`;
    
    row.innerHTML = `
        <td><input type="text" class="slno-input" value="${itemCounter + 1}" style="width: 40px;"></td>
        <td><div id="${descId}" style="height: 60px; background: white;"></div></td>
        <td><input type="number" class="price-input" value="0"></td>
        <td><input type="number" class="qty-input" value="1"></td>
        <td><input type="text" class="value-input" readonly value="0.00"></td>
        <td><button type="button" class="btn-remove" onclick="this.closest('tr').remove(); calculateTotal();">✕</button></td>
    `;
    
    tbody.appendChild(row);
    
    const quill = new Quill(`#${descId}`, {
        theme: 'snow',
        modules: { toolbar: [['bold', 'italic', { 'color': [] }, 'clean']] }
    });
    quillInstances[`#${descId}`] = quill;
    
    itemCounter++;
}

function calculateTotal() {
    let subtotal = 0;
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
        const value = price * qty;
        row.querySelector('.value-input').value = value.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        subtotal += value;
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

function syncRichText() {
    document.getElementById('customerName').value = quillInstances['#customerNameEditor'].root.innerHTML;
    document.getElementById('customerAddress').value = quillInstances['#customerAddressEditor'].root.innerHTML;
    document.getElementById('kindAttn').value = quillInstances['#kindAttnEditor'].root.innerHTML;
    document.getElementById('referenceText').value = quillInstances['#referenceTextEditor'].root.innerHTML;
    document.getElementById('optionTitle').value = quillInstances['#optionTitleEditor'].root.innerHTML;
    document.getElementById('optionDetails').value = quillInstances['#optionDetailsEditor'].root.innerHTML;
    document.getElementById('signName').value = quillInstances['#signNameEditor'].root.innerHTML;
    document.getElementById('signDesig').value = quillInstances['#signDesigEditor'].root.innerHTML;
}

function getFormData() {
    syncRichText();
    const form = document.getElementById('quotationForm');
    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }

    data.items = [];
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const descId = row.querySelector('div[id^="item-desc"]').id;
        data.items.push({
            slno: row.querySelector('.slno-input').value,
            description: quillInstances[`#${descId}`].root.innerHTML,
            unitPrice: parseFloat(row.querySelector('.price-input').value) || 0,
            qty: parseFloat(row.querySelector('.qty-input').value) || 0,
            value: (parseFloat(row.querySelector('.price-input').value) || 0) * (parseFloat(row.querySelector('.qty-input').value) || 0)
        });
    });

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
