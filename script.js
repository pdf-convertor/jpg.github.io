const { PDFDocument, rgb } = PDFLib;

const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const selectFiles = document.getElementById('selectFiles');
const previewContainer = document.getElementById('previewContainer');
const convertBtn = document.getElementById('convertBtn');
const clearAll = document.getElementById('clearAll');
const loadingOverlay = document.getElementById('loadingOverlay');

let images = [];

;[
  'dragenter','dragover','dragleave','drop'
].forEach(evt =>
  dropArea.addEventListener(evt, e => {
    e.preventDefault();
    e.stopPropagation();
  })
);

dropArea.addEventListener('drop', e => {
  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
});

selectFiles.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));
clearAll.addEventListener('click', () => { images = []; updateUI(); });

convertBtn.addEventListener('click', () => createPDF());

function handleFiles(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      images.push(reader.result);
      updateUI();
    };
    reader.readAsDataURL(file);
  });
}

function updateUI() {
  previewContainer.innerHTML = '';
  if (!images.length) {
    previewContainer.innerHTML = '<p class="empty-message">No images selected. Your preview will appear here.</p>';
    convertBtn.disabled = true;
    return;
  }
  convertBtn.disabled = false;
  images.forEach((src, i) => {
    const div = document.createElement('div');
    div.className = 'image-preview';
    const img = document.createElement('img');
    img.src = src;

    const btn = document.createElement('div');
    btn.className = 'remove-btn';
    btn.innerHTML = '×';
    btn.addEventListener('click', () => {
      images.splice(i, 1);
      updateUI();
    });

    div.append(img, btn);
    previewContainer.appendChild(div);
  });
}

async function createPDF() {
  loadingOverlay.classList.add('active');

  const borderStyle = document.getElementById('borderStyle').value;
  const borderColor = document.getElementById('borderColor').value;
  const borderWidth = parseInt(document.getElementById('borderWidth').value) || 0;
  const pageSize = document.getElementById('pageSize').value;
  const orientation = document.getElementById('pageOrientation').value;

  const pdfDoc = await PDFDocument.create();

  for (const src of images) {
    const imgBytes = await fetch(src).then(r => r.arrayBuffer());
    const img = src.startsWith('data:image/png') ?
      await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);

    const page = pdfDoc.addPage();
    const { width: imgW, height: imgH } = img.scale(1);
    const { width: pw, height: ph } = page.getSize();

    const x = (pw - imgW) / 2;
    const y = (ph - imgH) / 2;
    page.drawImage(img, { x, y, width: imgW, height: imgH });

    // Only draw border if style isn't 'none' and width > 0
    if (borderStyle !== 'none' && borderWidth > 0) {
      const color = rgb(
        parseInt(borderColor.substr(1,2),16)/255,
        parseInt(borderColor.substr(3,2),16)/255,
        parseInt(borderColor.substr(5,2),16)/255
      );
      page.drawRectangle({
        x, y,
        width: imgW, height: imgH,
        borderColor: color,
        borderWidth,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  saveAs(blob, document.getElementById('outputName').value || 'output.pdf');

  loadingOverlay.classList.remove('active');
}
