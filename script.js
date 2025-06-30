document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFiles');
    const dropArea = document.getElementById('dropArea');
    const previewContainer = document.getElementById('previewContainer');
    const convertBtn = document.getElementById('convertBtn');
    const clearAllBtn = document.getElementById('clearAll');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Settings elements
    const pageSizeSelect = document.getElementById('pageSize');
    const pageOrientationSelect = document.getElementById('pageOrientation');
    const marginSizeInput = document.getElementById('marginSize');
    const borderStyleSelect = document.getElementById('borderStyle');
    const borderColorInput = document.getElementById('borderColor');
    const borderWidthInput = document.getElementById('borderWidth');
    const imageFitSelect = document.getElementById('imageFit');
    const pageSpreadSelect = document.getElementById('pageSpread');
    const compressionSelect = document.getElementById('compression');
    const outputNameInput = document.getElementById('outputName');

    let files = [];

    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    convertBtn.addEventListener('click', convertToPDF);
    clearAllBtn.addEventListener('click', clearAll);

    function handleFileSelect(e) {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            processFiles(selectedFiles);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.style.borderColor = '#4a6bff';
        dropArea.style.backgroundColor = 'rgba(74, 107, 255, 0.1)';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.style.borderColor = '#ddd';
        dropArea.style.backgroundColor = 'white';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        handleDragLeave(e);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            processFiles(droppedFiles);
        }
    }

    function processFiles(newFiles) {
        const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('Please select only image files (JPEG, PNG, etc.)');
            return;
        }

        files = [...files, ...imageFiles];
        updatePreview();
        updateConvertButton();
    }

    function updatePreview() {
        previewContainer.innerHTML = '';

        if (files.length === 0) {
            previewContainer.innerHTML = '<p class="empty-message">No images selected. Your preview will appear here.</p>';
            return;
        }

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = document.createElement('div');
                preview.className = 'image-preview';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;

                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFile(index);
                });

                preview.appendChild(img);
                preview.appendChild(removeBtn);
                previewContainer.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });
    }

    function removeFile(index) {
        files.splice(index, 1);
        updatePreview();
        updateConvertButton();
    }

    function clearAll() {
        files = [];
        fileInput.value = '';
        updatePreview();
        updateConvertButton();
    }

    function updateConvertButton() {
        convertBtn.disabled = files.length === 0;
    }

    async function convertToPDF() {
        if (files.length === 0) return;

        loadingOverlay.classList.add('active');

        try {
            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            pdfDoc.setTitle(outputNameInput.value || 'converted_images.pdf');
            pdfDoc.setAuthor('Image to PDF Converter');

            const margin = parseFloat(marginSizeInput.value) || 0;
            const borderWidth = parseFloat(borderWidthInput.value) || 0;
            const borderColor = borderColorInput.value;
            const marginPt = margin * 2.83465;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imageBytes = await readFileAsArrayBuffer(file);

                let image;
                if (file.type.includes('png')) {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }

                const { width, height } = image.scale(1);
                const page = pdfDoc.addPage([width + marginPt * 2, height + marginPt * 2]);

                if (borderStyleSelect.value !== 'none' && borderWidth > 0) {
                    page.drawRectangle({
                        x: marginPt / 2,
                        y: marginPt / 2,
                        width: width + marginPt,
                        height: height + marginPt,
                        borderColor: rgbColor(borderColor),
                        borderWidth,
                        color: undefined
                    });
                }

                page.drawImage(image, {
                    x: marginPt,
                    y: marginPt,
                    width,
                    height
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            let filename = outputNameInput.value.trim();
            if (!filename) {
                const now = new Date();
                filename = `converted_images_${now.toISOString().split('T')[0]}.pdf`;
            }
            if (!filename.toLowerCase().endsWith('.pdf')) {
                filename += '.pdf';
            }

            saveAs(blob, filename);

        } catch (error) {
            console.error('Error creating PDF:', error);
            alert('An error occurred while creating the PDF. Please try again.');
        } finally {
            loadingOverlay.classList.remove('active');
        }
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function rgbColor(hex) {
        const bigint = parseInt(hex.replace(/^#/, ''), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return PDFLib.rgb(r / 255, g / 255, b / 255);
    }
});
