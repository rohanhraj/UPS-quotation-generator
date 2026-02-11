// ARVI Quotation Generator - App JavaScript
let quillInstances = {};

const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
];

document.addEventListener('DOMContentLoaded', function () {
    initializeStaticEditors();
    initializeForm();
    setupEventListeners();
    addItem(); // Initial item
});

function createEditor(selector, placeholder = '') {
    const quill = new Quill(selector, {
        theme: 'snow',
        placeholder: placeholder,
        modules: { toolbar: toolbarOptions }
    });
    quillInstances[selector] = quill;
    return quill;
}

function initializeStaticEditors() {
    createEditor('#customerNameEditor', 'Customer Name...');
    createEditor('#customerAddressEditor', 'Address...');
    createEditor('#kindAttnEditor', 'Kind Attention...');
    createEditor('#customerRefEditor', 'Customer Reference...');
    createEditor('#referenceTextEditor', 'Main Reference Details...');
    createEditor('#optionTitleEditor', 'Option Title...');
    createEditor('#optionSubtitleEditor', 'Option Subtitle...');
    createEditor('#optionDetailsEditor', 'Technical Details...');
    createEditor('#priceLocationEditor', 'Price Terms...');
    createEditor('#gstTermsEditor', 'GST Terms...');
    createEditor('#deliveryEditor', 'Delivery Terms...');
    createEditor('#paymentEditor', 'Payment Terms...');
    createEditor('#fatEditor', 'FAT Terms...');
    createEditor('#warrantyEditor', 'Warranty Terms...');
    createEditor('#validityEditor', 'Validity Terms...');
    createEditor('#updatesEditor', 'Update Terms...');
    createEditor('#signNameEditor', 'Signatory Name...');
    createEditor('#signDesigEditor', 'Designation...');

    // Set Defaults
    quillInstances['#referenceTextEditor'].clipboard.dangerouslyPasteHTML('<p>Dear Sir/Madam,</p><p><br></p><p>With reference to your enquiry, we are pleased to submit our quotation:</p>');
    quillInstances['#optionTitleEditor'].clipboard.dangerouslyPasteHTML('<p><strong>PFC-XR 303</strong></p>');
    quillInstances['#optionSubtitleEditor'].clipboard.dangerouslyPasteHTML('<p>Online UPS - specially designed for laser cutting machines.</p>');
    quillInstances['#optionDetailsEditor'].clipboard.dangerouslyPasteHTML('<p>VFI power-conditioning topology with galvanic isolation for comprehensive power protection.</p>');
    quillInstances['#priceLocationEditor'].clipboard.dangerouslyPasteHTML('<p>For Bangalore.</p>');
    quillInstances['#gstTermsEditor'].clipboard.dangerouslyPasteHTML('<p>18% extra on UPS, batteries and battery stand.</p>');
    quillInstances['#deliveryEditor'].clipboard.dangerouslyPasteHTML('<p>Ex-works, within 2-3 weeks from receipt of confirmed order.</p>');
    quillInstances['#paymentEditor'].clipboard.dangerouslyPasteHTML('<p>50% advance along with order, balance before dispatch.</p>');
    quillInstances['#fatEditor'].clipboard.dangerouslyPasteHTML('<p>Factory Acceptance Test (FAT) - We can arrange for a in-person / video online factory acceptance test of the UPS before despatch.</p>');
    quillInstances['#warrantyEditor'].clipboard.dangerouslyPasteHTML('<p>2 years comprehensive warranty on UPS from date of installation.</p>');
    quillInstances['#validityEditor'].clipboard.dangerouslyPasteHTML('<p>30 days</p>');
    quillInstances['#updatesEditor'].clipboard.dangerouslyPasteHTML('<p>You will be updated regularly about the status of progress in production.</p>');
    quillInstances['#signNameEditor'].clipboard.dangerouslyPasteHTML('<p><strong>Santosh Risbood</strong></p>');
    quillInstances['#signDesigEditor'].clipboard.dangerouslyPasteHTML('<p>General Manager - OEM Business</p>');
}

function initializeForm() {
    const today = new Date();
    document.getElementById('quoteDate').valueAsDate = today;
    const year = today.getFullYear();
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    document.getElementById('quoteNumber').value = `ARVI/${year}/${randomNum}`;
}

let itemCounter = 0;
function addItem() {
    const tbody = document.getElementById('itemsTableBody');
    const row = document.createElement('tr');
    const descId = `item-desc-${itemCounter}`;
    
    row.innerHTML = `
        <td><input type="text" class="slno-input" value="${itemCounter + 1}" style="width: 40px;"></td>
        <td><div id="${descId}" style="height: 80px; background: white;"></div></td>
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

function syncAllRichText() {
    document.getElementById('customerName').value = quillInstances['#customerNameEditor'].root.innerHTML;
    document.getElementById('customerAddress').value = quillInstances['#customerAddressEditor'].root.innerHTML;
    document.getElementById('kindAttn').value = quillInstances['#kindAttnEditor'].root.innerHTML;
    document.getElementById('customerRef').value = quillInstances['#customerRefEditor'].root.innerHTML;
    document.getElementById('referenceText').value = quillInstances['#referenceTextEditor'].root.innerHTML;
    document.getElementById('optionTitle').value = quillInstances['#optionTitleEditor'].root.innerHTML;
    document.getElementById('optionSubtitle').value = quillInstances['#optionSubtitleEditor'].root.innerHTML;
    document.getElementById('optionDetails').value = quillInstances['#optionDetailsEditor'].root.innerHTML;
    document.getElementById('priceLocation').value = quillInstances['#priceLocationEditor'].root.innerHTML;
    document.getElementById('gstTerms').value = quillInstances['#gstTermsEditor'].root.innerHTML;
    document.getElementById('delivery').value = quillInstances['#deliveryEditor'].root.innerHTML;
    document.getElementById('payment').value = quillInstances['#paymentEditor'].root.innerHTML;
    document.getElementById('fat').value = quillInstances['#fatEditor'].root.innerHTML;
    document.getElementById('warranty').value = quillInstances['#warrantyEditor'].root.innerHTML;
    document.getElementById('validity').value = quillInstances['#validityEditor'].root.innerHTML;
    document.getElementById('updates').value = quillInstances['#updatesEditor'].root.innerHTML;
    document.getElementById('signName').value = quillInstances['#signNameEditor'].root.innerHTML;
    document.getElementById('signDesig').value = quillInstances['#signDesigEditor'].root.innerHTML;
}

function getFormData() {
    syncAllRichText();
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
