document.addEventListener('DOMContentLoaded', () => {
    const vialQuantitySelect = document.getElementById('vialQuantitySelect');
    const vialQuantityCustomInput = document.getElementById('vialQuantityCustom');
    const doseSelect = document.getElementById('doseSelect');
    const doseCustomInput = document.getElementById('doseCustom');
    const unitsSelect = document.getElementById('unitsSelect');
    const unitsCustomInput = document.getElementById('unitsCustom');
    const bacWaterOutput = document.getElementById('bacWater');
    const dosesPerVialOutput = document.getElementById('dosesPerVial');
    const concentrationOutput = document.getElementById('concentration');
    const warningMessage = document.getElementById('warningMessage');
    const labelInput = document.getElementById('labelInput');
    const urlInput = document.getElementById('urlInput');
    const labelPreview = document.getElementById('labelPreview');

    // After DOM element declarations, add constants
    const THRESHOLD_CONC = 30; // mg/ml
    const UNIT_OPTIONS = [25, 35, 50, 75, 100];

    function calculateResults() {
        let vialQuantity;
        let dose;
        let unitsPerDose;

        // Determine vial quantity based on selection
        if (vialQuantitySelect.value === 'custom') {
            vialQuantity = parseFloat(vialQuantityCustomInput.value);
        } else {
            vialQuantity = parseFloat(vialQuantitySelect.value);
        }

        // Determine dose based on selection
        if (doseSelect.value === 'custom') {
            dose = parseFloat(doseCustomInput.value);
        } else {
            dose = parseFloat(doseSelect.value);
        }

        // Determine units per dose based on selection
        if (unitsSelect.value === 'custom') {
            unitsPerDose = parseFloat(unitsCustomInput.value);
        } else {
            unitsPerDose = parseFloat(unitsSelect.value);
        }

        // Validate inputs
        if (
            isNaN(vialQuantity) || isNaN(dose) || isNaN(unitsPerDose) ||
            vialQuantity <= 0 || dose <= 0 || unitsPerDose <= 0
        ) {
            bacWaterOutput.textContent = '-';
            dosesPerVialOutput.textContent = '-';
            concentrationOutput.textContent = '-';
            warningMessage.style.display = 'none';
            return;
        }

        // Calculations
        const totalUnits = (vialQuantity / dose) * unitsPerDose;
        const bacWater = totalUnits / 100; // 100 units = 1 ml
        const dosesPerVial = vialQuantity / dose;

        // Display results
        bacWaterOutput.textContent = `${bacWater.toFixed(2)} ml`;
        dosesPerVialOutput.textContent = `${dosesPerVial.toFixed(1)} doses`;

        const concentration = vialQuantity / bacWater;

        // No automatic adjustment of units; we simply report high concentration

        concentrationOutput.textContent = `${concentration.toFixed(2)} mg/ml`;

        const resultItems = document.querySelectorAll('.result-item');
        if (concentration > THRESHOLD_CONC) {
            resultItems.forEach(item => item.classList.add('alert'));
            warningMessage.style.display = 'block';
            warningMessage.textContent = `Warning: Calculated concentration exceeds the recommended maximum of ${THRESHOLD_CONC} mg/ml.`;
        } else {
            resultItems.forEach(item => item.classList.remove('alert'));
            warningMessage.style.display = 'none';
        }

        updateLabelPreview();
    }

    // Handle select change (show/hide custom input)
    function handleVialSelectChange() {
        if (vialQuantitySelect.value === 'custom') {
            vialQuantityCustomInput.style.display = 'block';
        } else {
            vialQuantityCustomInput.style.display = 'none';
            vialQuantityCustomInput.value = '';
        }
        calculateResults();
    }

    function handleDoseSelectChange() {
        if (doseSelect.value === 'custom') {
            doseCustomInput.style.display = 'block';
        } else {
            doseCustomInput.style.display = 'none';
            doseCustomInput.value = '';
        }
        calculateResults();
    }

    function handleUnitsSelectChange() {
        if (unitsSelect.value === 'custom') {
            unitsCustomInput.style.display = 'block';
        } else {
            unitsCustomInput.style.display = 'none';
            unitsCustomInput.value = '';
        }
        calculateResults();
    }

    function updateLabelPreview() {
        const label = labelInput.value || 'Peptide';
        const url = urlInput.value || 'https://rickroll.it/rickroll.mp4';

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
        const concentration = parseFloat(concentrationOutput.textContent);
        let dose;
        if (doseSelect.value === 'custom') {
            dose = parseFloat(doseCustomInput.value);
        } else {
            dose = parseFloat(doseSelect.value);
        }
        const units = parseFloat(unitsSelect.value);

        labelPreview.innerHTML = `
            <img src="${qrCodeUrl}" alt="QR Code">
            <div class="text">
                <p>${label}</p>
                <p>${Math.round(concentration)} mg/ml</p>
                <p>${dose}mg/${units}u</p>
            </div>
        `;
    }

    // Event listeners
    vialQuantitySelect.addEventListener('change', handleVialSelectChange);
    vialQuantityCustomInput.addEventListener('input', calculateResults);
    doseSelect.addEventListener('change', handleDoseSelectChange);
    doseCustomInput.addEventListener('input', calculateResults);
    unitsSelect.addEventListener('change', handleUnitsSelectChange);
    unitsCustomInput.addEventListener('input', calculateResults);
    labelInput.addEventListener('input', updateLabelPreview);
    urlInput.addEventListener('input', updateLabelPreview);

    // Initial calculation
    calculateResults();

    // Add buttons to download the label as an image
    const downloadButtonsDiv = document.createElement('div');
    downloadButtonsDiv.className = 'download-buttons';

    const downloadSVGButton = document.createElement('button');
    downloadSVGButton.textContent = 'Download SVG';
    downloadSVGButton.addEventListener('click', () => downloadLabel('svg'));
    downloadButtonsDiv.appendChild(downloadSVGButton);

    labelPreview.parentNode.appendChild(downloadButtonsDiv);
    
    // Get the PNG preview container
    const pngPreviewContainer = document.querySelector('#pngPreview .preview-container');

    function downloadLabel(format) {
        const qrImage = labelPreview.querySelector('img');
        if (qrImage) {
            if (qrImage.complete) {
                if (format === 'svg') {
                    generateSVG();
                } else {
                    generatePNG();
                }
            } else {
                qrImage.onload = () => {
                    if (format === 'svg') {
                        generateSVG();
                    } else {
                        generatePNG();
                    }
                };
                qrImage.onerror = () => {
                    alert('Failed to load QR code image. Please try again.');
                };
            }
        } else {
            alert('QR code image not found. Please try again.');
        }
    }
    
    // Update label preview when any input changes
    labelInput.addEventListener('input', () => {
        updateLabelPreview();
        updatePNGPreview();
    });
    urlInput.addEventListener('input', () => {
        updateLabelPreview();
        updatePNGPreview();
    });
    
    // Initial PNG preview
    function updatePNGPreview() {
        const qrImage = labelPreview.querySelector('img');
        if (qrImage && qrImage.complete) {
            renderPNG(false);
        } else if (qrImage) {
            qrImage.onload = () => renderPNG(false);
        }
    }
    
    // Call updatePNGPreview whenever calculator values change
    vialQuantitySelect.addEventListener('change', updatePNGPreview);
    vialQuantityCustomInput.addEventListener('input', updatePNGPreview);
    doseSelect.addEventListener('change', updatePNGPreview);
    doseCustomInput.addEventListener('input', updatePNGPreview);
    unitsSelect.addEventListener('change', updatePNGPreview);
    unitsCustomInput.addEventListener('input', updatePNGPreview);
    
    // Initial preview after page load
    setTimeout(updatePNGPreview, 500);

    function generateSVG() {
        const qrImage = labelPreview.querySelector('img');
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        
        // Use same dimensions as PNG - 10mm height and max 50mm width
        const targetHeightMm = 10;
        const targetHeightPixels = Math.round((targetHeightMm / 25.4) * 96);
        const qrSizePixels = targetHeightPixels;
        
        // Calculate width based on text measurement
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const fontSize = Math.floor(targetHeightPixels / 4.5);
        ctx.font = `${fontSize}px sans-serif`;
        
        // Get text values
        const label = labelInput.value || 'Peptide';
        const concentration = Math.round(parseFloat(concentrationOutput.textContent));
        const doseValue = doseSelect.value === 'custom' 
            ? doseCustomInput.value 
            : doseSelect.value;
        const unitValue = unitsSelect.value === 'custom'
            ? unitsCustomInput.value
            : unitsSelect.value;
        
        // Create the three lines of text
        const text1Content = `${label}`;
        const text2Content = `${concentration} mg/ml`;
        const text3Content = `${doseValue}mg/${unitValue}u`;
        
        // Measure text
        const text1Width = ctx.measureText(text1Content).width;
        const text2Width = ctx.measureText(text2Content).width;
        const text3Width = ctx.measureText(text3Content).width;
        const maxTextWidth = Math.max(text1Width, text2Width, text3Width);
        
        // Set max width to 50mm
        const maxWidthMm = 50;
        const maxWidthPixels = (maxWidthMm / 25.4) * 96;
        const textWidthToUse = Math.min(maxTextWidth, maxWidthPixels - qrSizePixels - 15); // Account for QR and padding
        
        const totalWidth = qrSizePixels + 5 + textWidthToUse + 10;
        svg.setAttribute("width", totalWidth);
        svg.setAttribute("height", targetHeightPixels);
        svg.setAttribute("viewBox", `0 0 ${totalWidth} ${targetHeightPixels}`);

        // Embed QR code as an image
        const image = document.createElementNS(svgNS, "image");
        image.setAttribute("href", qrImage.src);
        image.setAttribute("width", qrSizePixels);
        image.setAttribute("height", qrSizePixels);
        svg.appendChild(image);

        // Add text elements - 3 lines with equal spacing
        const text1 = document.createElementNS(svgNS, "text");
        text1.setAttribute("x", qrSizePixels + 5);
        const centerY = targetHeightPixels / 2;
        const lineSpacing = targetHeightPixels / 3;
        text1.setAttribute("y", centerY - lineSpacing + (fontSize * 0.35));
        text1.setAttribute("font-size", fontSize);
        text1.textContent = text1Content;
        svg.appendChild(text1);

        const text2 = document.createElementNS(svgNS, "text");
        text2.setAttribute("x", qrSizePixels + 5);
        text2.setAttribute("y", centerY - 2 + (fontSize * 0.35));
        text2.setAttribute("font-size", fontSize);
        text2.textContent = text2Content;
        svg.appendChild(text2);
        
        const text3 = document.createElementNS(svgNS, "text");
        text3.setAttribute("x", qrSizePixels + 5);
        text3.setAttribute("y", centerY + lineSpacing - 2 + (fontSize * 0.35));
        text3.setAttribute("font-size", fontSize);
        text3.textContent = text3Content;
        svg.appendChild(text3);

        const svgData = new XMLSerializer().serializeToString(svg);
        const link = document.createElement("a");
        link.download = "label.svg";
        link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
        link.click();
    }

    function generatePNG() {
        renderPNG(true);
    }
    
    function renderPNG(shouldDownload) {
        const qrImage = labelPreview.querySelector('img');
        
        // Create a new image to preload the QR code
        const img = new Image();
        img.crossOrigin = "Anonymous";  // This is important for cross-origin images
        img.onload = function() {
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Scale factor for higher resolution
            const scaleFactor = 3;
             
            // Get text values
            const label = labelInput.value || 'Peptide';
            const concentration = Math.round(parseFloat(concentrationOutput.textContent));
            const doseValue = doseSelect.value === 'custom' 
                ? doseCustomInput.value 
                : doseSelect.value;
            const unitValue = unitsSelect.value === 'custom'
                ? unitsCustomInput.value
                : unitsSelect.value;
            
            // Create the three lines of text
            const text1 = `${label}`;
            const text2 = `${concentration} mg/ml`;
            const text3 = `${doseValue}mg/${unitValue}u`;
            
            // Calculate font size based on fixed height of 10mm
            // 10mm = 0.3937 inches, at 96dpi that's ~38px
            // QR code and text need to fit in 10mm height
            const targetHeightMm = 10;
            const targetHeightPixels = (targetHeightMm / 25.4) * 96;
            
            // Font size needs to be proportionally smaller to fit 3 lines in ~2/3 of the height
            const fontSize = Math.floor(targetHeightPixels / 3); // Increased font size
            ctx.font = `${fontSize * scaleFactor}px sans-serif`;
            
            // Measure text width for all lines
            const text1Width = ctx.measureText(text1).width;
            const text2Width = ctx.measureText(text2).width;
            const text3Width = ctx.measureText(text3).width;
            const maxTextWidth = Math.max(text1Width, text2Width, text3Width);
            
            // Set maximum width to 50mm
            const maxWidthMm = 50;
            const maxWidthPixels = (maxWidthMm / 25.4) * 96 / scaleFactor;
            
            // Set canvas dimensions - QR code width + padding + text width + right margin
            // Constrain to cylinder circumference if needed
            const textWidthToUse = Math.min(maxTextWidth/scaleFactor, maxWidthPixels);
            
            // QR code should also be 10mm high
            const qrSizePixels = targetHeightPixels;
            
            const baseWidth = qrSizePixels + 5 + textWidthToUse + 10; // Base dimensions in logical pixels
            const baseHeight = targetHeightPixels;
            
            // Set the resolution
            canvas.width = baseWidth * scaleFactor;
            canvas.height = baseHeight * scaleFactor;
            
            // Fill background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw QR code
            ctx.drawImage(img, 0, 0, qrSizePixels * scaleFactor, qrSizePixels * scaleFactor);
            
            // Set text style again (it resets after canvas resize)
            ctx.fillStyle = 'black';
            ctx.font = `${fontSize * scaleFactor}px sans-serif`;
            
            // Precise positioning to center the middle line with the QR code
            // Center of QR is at targetHeightPixels/2
            // For text, we need to account for baseline being at bottom, so subtract ~1/3 of font height
            const fontHeightOffset = fontSize * 0.35; // Approximate adjustment for baseline
            
            const centerY = targetHeightPixels / 2;
            const lineSpacing = targetHeightPixels / 3;
            
            ctx.fillText(text1, (qrSizePixels + 5) * scaleFactor, (centerY - lineSpacing + fontHeightOffset) * scaleFactor);
            ctx.fillText(text2, (qrSizePixels + 5) * scaleFactor, (centerY - 2 + fontHeightOffset) * scaleFactor);
            ctx.fillText(text3, (qrSizePixels + 5) * scaleFactor, (centerY + lineSpacing - 2 + fontHeightOffset) * scaleFactor);
            
            // Update preview
            pngPreviewContainer.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = canvas.toDataURL('image/png', 1.0);
            previewImg.style.cursor = 'pointer';
            previewImg.title = 'Click to open in new tab';
            previewImg.addEventListener('click', function() {
                const tab = window.open();
                tab.document.write(`<html><head><title>Label</title></head><body style="display:flex;justify-content:center;align-items:center;margin:0;background:#f5f5f5;"><img src="${this.src}" style="max-width:100%;"></body></html>`);
                tab.document.close();
            });
            pngPreviewContainer.appendChild(previewImg);
            
            // Download if requested
            if (shouldDownload) {
                const link = document.createElement('a');
                link.download = 'label.png';
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            }
        };
        
        // Set source of image to QR code URL
        img.src = qrImage.src;
    }
});
