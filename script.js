document.addEventListener('DOMContentLoaded', function() {
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
    
    // Event Listeners
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    convertBtn.addEventListener('click', convertToPDF);
    clearAllBtn.addEventListener('click', clearAll);
    
    // Functions
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
        // Filter only image files
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
            reader.onload = function(e) {
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
            
            // Set document metadata
            pdfDoc.setTitle(outputNameInput.value || 'converted_images.pdf');
            pdfDoc.setAuthor('Image to PDF Converter');
            
            // Get settings
            const margin = parseFloat(marginSizeInput.value) || 0;
            const borderWidth = parseFloat(borderWidthInput.value) || 0;
            const borderColor = borderColorInput.value;
            
            // Convert margin from mm to points (1 mm = 2.83465 points)
            const marginPt = margin * 2.83465;
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imageBytes = await readFileAsArrayBuffer(file);
                
                let image;
                try {
                    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                        image = await pdfDoc.embedJpg(imageBytes);
                    } else if (file.type === 'image/png') {
                        image = await pdfDoc.embedPng(imageBytes);
                    } else {
                        image = await pdfDoc.embedJpg(imageBytes);
                    }
                } catch (e) {
                    console.error(`Error embedding image ${file.name}:`, e);
                    continue;
                }
                
                const [pageWidth, pageHeight] = getPageSize(image);
                const page = pdfDoc.addPage([pageWidth, pageHeight]);
                
                const contentWidth = pageWidth - (2 * marginPt);
                const contentHeight = pageHeight - (2 * marginPt);
                
                // Draw border if enabled
                if (borderStyleSelect.value !== 'none' && borderWidth > 0) {
                    drawBorder(page, marginPt, pageWidth, pageHeight, contentWidth, contentHeight, borderWidth, borderColor);
                }
                
                drawImage(page, image, marginPt, contentWidth, contentHeight);
                
                // Page spread logic
                if (pageSpreadSelect.value === 'double' && i < files.length - 1) {
                    i++;
                    const nextFile = files[i];
                    const nextImageBytes = await readFileAsArrayBuffer(nextFile);
                    let nextImage;
                    
                    try {
                        if (nextFile.type === 'image/jpeg' || nextFile.type === 'image/jpg') {
                            nextImage = await pdfDoc.embedJpg(nextImageBytes);
                        } else if (nextFile.type === 'image/png') {
                            nextImage = await pdfDoc.embedPng(nextImageBytes);
                        } else {
                            nextImage = await pdfDoc.embedJpg(nextImageBytes);
                        }
                        
                        const nextImageDims = nextImage.scaleToFit(
                            contentWidth / 2,
                            contentHeight
                        );
                        
                        page.drawImage(nextImage, {
                            x: marginPt + contentWidth / 2 + (contentWidth / 2 - nextImageDims.width) / 2,
                            y: marginPt + (contentHeight - nextImageDims.height) / 2,
                            width: nextImageDims.width,
                            height: nextImageDims.height,
                        });
                    } catch (e) {
                        console.error(`Error embedding second image for spread ${nextFile.name}:`, e);
                    }
                }
            }
            
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            let filename = outputNameInput.value.trim();
            if (!filename) {
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                filename = `converted_images_${dateStr}.pdf`;
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
            reader.onload = () => resol
