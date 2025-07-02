document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFiles');
    const dropArea = document.getElementById('dropArea');
    const previewContainer = document.getElementById('previewContainer');
    const convertBtn = document.getElementById('convertBtn');
    const clearAllBtn = document.getElementById('clearAll');
    const loadingOverlay = document.getElementById('loadingOverlay');

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
        const selected = Array.from(e.target.files);
        processFiles(selected);
    }

    function handleDragOver(e) {
        e.preventDefault();
        dropArea.style.borderColor = '#4a6bff';
        dropArea.style.backgroundColor = 'rgba(74, 107, 255, 0.1)';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        dropArea.style.borderColor = '#ddd';
        dropArea.style.backgroundColor = 'white';
    }

    function handleDrop(e) {
        e.preventDefault();
        handleDragLeave(e);
        const dropped = Array.from(e.dataTransfer.files);
        processFiles(dropped);
    }

    function processFiles(newFiles) {
        const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return alert("Only image files are allowed.");
        files.push(...imageFiles);
        updatePreview();
        convertBtn.disabled = false;
    }

    function updatePreview() {
        previewContainer.innerHTML = '';
        if (files.length === 0) {
            previewContainer.innerHTML = '<p class="empty-message">No images selected.</p>';
            return;
        }
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = e => {
                const preview = document.createElement('div');
                preview.className = 'image-preview';

                const img = document.createElement('img');
                img.src = e.target.result;

                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', () => {
                    files.splice(index, 1);
                    updatePreview();
                });

                preview.appendChild(img);
                preview.appendChild(removeBtn);
                previewContainer.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });
    }

    function clearAll() {
        files = [];
        fileInput.value = '';
        updatePreview();
        convertBtn.disabled = true;
    }

    async function convertToPDF() {
        if (files.length === 0) return;

        loadingOverlay.classList.add('active');

        try {
            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            const margin = parseFloat(marginSizeInput.value) || 0;
            const borderW = parseFloat(borderWidthInput.value) || 0;
            const borderRGB = hexToRgb(borderColorInput.value);
            const marginPt = margin * 2.83465;

            for (let i = 0; i < files.length; i++) {
                const imageBytes = await readFileAsArrayBuffer(files[i]);
                const image = await embedImage(pdfDoc, files[i], imageBytes);
                const [pageWidth, pageHeight] = getPageSize(image);
                const contentWidth = pageWidth - 2 * marginPt;
                const contentHeight = pageHeight - 2 * marginPt;

                const page = pdfDoc.addPage([pageWidth, pageHeight]);

                if (borderStyleSelect.value !== 'none' && borderW > 0) {
                    page.drawRectangle({
                        x: marginPt,
                        y: marginPt,
                        width: contentWidth,
                        height: contentHeight,
                        borderWidth: borderW,
                        color: rgb(borderRGB.r / 255, borderRGB.g / 255, borderRGB.b / 255),
                    });
                }

                const fit = imageFitSelect.value;
                const dims = image.scaleToFit(contentWidth, contentHeight);

                let x = marginPt + (contentWidth - dims.width) / 2;
                let y = marginPt + (contentHeight - dims.height) / 2;

                if (fit === 'fill' || fit === 'stretch') {
                    page.drawImage(image, {
                        x: marginPt,
                        y: marginPt,
                        width: contentWidth,
                        height: contentHeight,
                    });
                } else {
                    page.drawImage(image, { x, y, width: dims.width, height: dims.height });
                }

                if (pageSpreadSelect.value === 'double' && i + 1 < files.length) {
                    const nextFile = files[++i];
                    const nextBytes = await readFileAsArrayBuffer(nextFile);
                    const nextImage = await embedImage(pdfDoc, nextFile, nextBytes);
                    const nextDims = nextImage.scaleToFit(contentWidth / 2, contentHeight);
                    const x2 = marginPt + contentWidth / 2 + (contentWidth / 2 - nextDims.width) / 2;
                    page.drawImage(nextImage, {
                        x: x2,
                        y,
                        width: nextDims.width,
                        height: nextDims.height,
                    });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const filename = getOutputFilename();
            saveAs(blob, filename);
        } catch (err) {
            console.error(err);
            alert("Failed to create PDF.");
        } finally {
            loadingOverlay.classList.remove('active');
        }
    }

    function getOutputFilename() {
        const name = outputNameInput.value.trim();
        if (!name) {
            const date = new Date().toISOString().split('T')[0];
            return `converted_images_${date}.pdf`;
        }
        return name.endsWith('.pdf') ? name : `${name}.pdf`;
    }

    async function embedImage(pdfDoc, file, bytes) {
        if (file.type.includes('png')) return await pdfDoc.embedPng(bytes);
        return await pdfDoc.embedJpg(bytes);
    }

    function getPageSize(image) {
        const preset = pageSizeSelect.value;
        const orientation = pageOrientationSelect.value;

        let width = 595.28, height = 841.89; // A4 default

        if (preset === 'letter') {
            width = 612;
            height = 792;
        } else if (preset === 'legal') {
            width = 612;
            height = 1008;
        } else if (preset === 'auto') {
            width = image.width;
            height = image.height;
        }

        const swap = orientation === 'landscape' || (orientation === 'auto' && width < height);
        return swap ? [height, width] : [width, height];
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject('File read error');
            reader.readAsArrayBuffer(file);
        });
    }

    function hexToRgb(hex) {
        const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return res ? {
            r: parseInt(res[1], 16),
            g: parseInt(res[2], 16),
            b: parseInt(res[3], 16),
        } : { r: 0, g: 0, b: 0 };
    }
});
