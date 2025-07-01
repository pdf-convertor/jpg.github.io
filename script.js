// script.js

const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const convertBtn = document.getElementById('convertBtn');
const borderStyleInput = document.getElementById('borderStyle');
const borderColorInput = document.getElementById('borderColor');
const borderWidthInput = document.getElementById('borderWidth');
const loadingOverlay = document.getElementById('loadingOverlay');

let images = [];

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  images = [];
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      images.push(reader.result);
      updateUI();
    };
    reader.readAsDataURL(file);
  });
});

function updateUI() {
  previewContainer.innerHTML = '';
  if (!images.length) {
    previewContainer.innerHTML = '<p class="empty-message">No images selected...</p>';
    convertBtn.disabled = true;
    return;
  }
  convertBtn.disabled = false;

  const style = borderStyleInput.value;
  const color = borderColorInput.value;
  const width = borderWidthInput.value;

  images.forEach((src, i) => {
    const div = document.createElement('div');
    div.className = 'image-preview';

    // Border logic
    if (style === 'none') {
      div.style.border = 'none';
    } else {
      div.style.border = `${width}px ${style} ${color}`;
    }

    const img = document.createElement('img');
    img.src = src;

    const btn = document.createElement('div');
    btn.className = 'remove-btn';
    btn.textContent = '×';
    btn.addEventListener('click', () => {
      images.splice(i, 1);
      updateUI();
    });

    div.appendChild(img);
    div.appendChild(btn);
    previewContainer.appendChild(div);
  });
}

convertBtn.addEventListener('click', async () => {
  if (!images.length) return;

  loadingOverlay.classList.add('active');
  const pdf = new jspdf.jsPDF();

  const style = borderStyleInput.value;
  const color = borderColorInput.value;
  const width = parseInt(borderWidthInput.value);

  for (let i = 0; i < images.length; i++) {
    const img = new Image();
    img.src = images[i];
    await new Promise(resolve => img.onload = resolve);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const aspectRatio = img.width / img.height;
    let imgWidth = pageWidth - 20;
    let imgHeight = imgWidth / aspectRatio;

    if (imgHeight > pageHeight - 20) {
      imgHeight = pageHeight - 20;
      imgWidth = imgHeight * aspectRatio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    // Add image
    pdf.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);

    // Add border if not none
    if (style !== 'none') {
      pdf.setDrawColor(color);
      pdf.setLineWidth(width);
      pdf.setLineDash(style === 'dashed' ? [3.0, 3.0] : []);
      pdf.rect(x, y, imgWidth, imgHeight);
    }

    if (i < images.length - 1) pdf.addPage();
  }

  pdf.save('converted.pdf');
  loadingOverlay.classList.remove('active');
});

// Initial state
updateUI();
