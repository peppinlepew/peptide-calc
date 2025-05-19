document.addEventListener('DOMContentLoaded', () => {
    // Configuration object to centralize all parameters
    const CONFIG = {
        // Dropdown configurations
        dropdowns: {
            vialQuantity: {
                selectId: 'vialQuantitySelect',
                customInputId: 'vialQuantityCustom',
                values: [2, 5, 10, 15, 20, 30, 40, 60],
                defaultValue: 30,
                suffix: "mg",
                customLabel: "Custom"
            },
            dose: {
                selectId: 'doseSelect',
                customInputId: 'doseCustom',
                values: [.25, .5, 1, 2, 2.5, 4, 5, 7.5, 8, 10, 12, 12.5, 15],
                defaultValue: 5,
                suffix: "mg",
                customLabel: "Other"
            },
            units: {
                selectId: 'unitsSelect',
                customInputId: 'unitsCustom',
                values: [20, 30, 40, 50, 75, 100],
                defaultValue: 25,
                suffix: "",
                customLabel: "Other"
            }
        },
        thresholdConcentration: 30, // mg/ml
        constants: {
            unitsPerML: 100, // 100 units = 1 ml
            labelHeight: 10, // mm
            labelMaxWidth: 50, // mm
            scaleFactor: 3, // For higher resolution PNG
            defaultRickrollURL: 'https://rickroll.it/rickroll.mp4'
        }
    };

    // Cache DOM elements
    const elements = {
        selects: {},
        customInputs: {},
        outputs: {
            bacWater: document.getElementById('bacWater'),
            dosesPerVial: document.getElementById('dosesPerVial'),
            concentration: document.getElementById('concentration'),
            warningMessage: document.getElementById('warningMessage')
        },
        labelElements: {
            labelInput: document.getElementById('labelInput'),
            urlInput: document.getElementById('urlInput'),
            labelPreview: document.getElementById('labelPreview'),
            pngPreviewContainer: document.querySelector('#pngPreview .preview-container')
        }
    };

    // Initialize dropdowns and inputs
    function initializeDropdown(config) {
        // Get DOM elements
        const selectElement = document.getElementById(config.selectId);
        const customInput = document.getElementById(config.customInputId);
        
        // Store references
        elements.selects[config.selectId] = selectElement;
        elements.customInputs[config.customInputId] = customInput;
        
        // Create options
        const options = config.values.map(value => ({
            value: value.toString(),
            label: value + (config.suffix ? ` ${config.suffix}` : ''),
            selected: value === config.defaultValue
        }));
        
        // Add custom option
        options.push({
            value: "custom",
            label: config.customLabel,
            selected: false
        });
        
        // Populate dropdown
        populateSelectDropdown(selectElement, options);
        
        // Add event listeners
        selectElement.addEventListener('change', () => {
            handleCustomInputVisibility(selectElement, customInput);
            calculateResults();
        });
        
        customInput.addEventListener('input', calculateResults);
        
        return { selectElement, customInput };
    }

    // Helper function to populate a select dropdown
    function populateSelectDropdown(selectElement, options) {
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            if (option.selected) {
                optionElement.selected = true;
            }
            selectElement.appendChild(optionElement);
        });
    }

    // Helper function to get value from select/custom input pair
    function getValueFromSelectOrCustom(selectElement, customInput) {
        if (selectElement.value === 'custom') {
            return parseFloat(customInput.value);
        } else {
            return parseFloat(selectElement.value);
        }
    }
    
    // Helper function to handle custom input visibility
    function handleCustomInputVisibility(selectElement, customInput) {
        if (selectElement.value === 'custom') {
            customInput.style.display = 'block';
        } else {
            customInput.style.display = 'none';
            customInput.value = '';
        }
    }
    
    // Initialize all dropdowns
    const dropdowns = {};
    Object.entries(CONFIG.dropdowns).forEach(([key, config]) => {
        dropdowns[key] = initializeDropdown(config);
    });

    // Initial calculation
    calculateResults();

    function calculateResults() {
        // Get values from all dropdowns
        const vialQuantity = getValueFromSelectOrCustom(
            dropdowns.vialQuantity.selectElement, 
            dropdowns.vialQuantity.customInput
        );
        
        const dose = getValueFromSelectOrCustom(
            dropdowns.dose.selectElement, 
            dropdowns.dose.customInput
        );
        
        const unitsPerDose = getValueFromSelectOrCustom(
            dropdowns.units.selectElement, 
            dropdowns.units.customInput
        );

        // Validate inputs
        if (
            isNaN(vialQuantity) || isNaN(dose) || isNaN(unitsPerDose) ||
            vialQuantity <= 0 || dose <= 0 || unitsPerDose <= 0
        ) {
            elements.outputs.bacWater.textContent = '-';
            elements.outputs.dosesPerVial.textContent = '-';
            elements.outputs.concentration.textContent = '-';
            elements.outputs.warningMessage.style.display = 'none';
            return;
        }

        // Calculations
        const totalUnits = (vialQuantity / dose) * unitsPerDose;
        const bacWater = totalUnits / CONFIG.constants.unitsPerML;
        const dosesPerVial = vialQuantity / dose;

        // Display results
        elements.outputs.bacWater.textContent = `${bacWater.toFixed(2)} ml`;
        elements.outputs.dosesPerVial.textContent = `${dosesPerVial.toFixed(1)} doses`;

        const concentration = vialQuantity / bacWater;

        // No automatic adjustment of units; we simply report high concentration
        elements.outputs.concentration.textContent = `${concentration.toFixed(2)} mg/ml`;

        const resultItems = document.querySelectorAll('.result-item');
        if (concentration > CONFIG.thresholdConcentration) {
            resultItems.forEach(item => item.classList.add('alert'));
            elements.outputs.warningMessage.style.display = 'block';
            elements.outputs.warningMessage.textContent = `Warning: Calculated concentration exceeds the recommended maximum of ${CONFIG.thresholdConcentration} mg/ml.`;
        } else {
            resultItems.forEach(item => item.classList.remove('alert'));
            elements.outputs.warningMessage.style.display = 'none';
        }

        updateLabelPreview();
    }

    function updateLabelPreview() {
        const label = elements.labelElements.labelInput.value || 'Peptide';
        const url = elements.labelElements.urlInput.value || CONFIG.constants.defaultRickrollURL;

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
        const concentration = parseFloat(elements.outputs.concentration.textContent);
        
        const dose = getValueFromSelectOrCustom(
            dropdowns.dose.selectElement, 
            dropdowns.dose.customInput
        );
        
        const units = getValueFromSelectOrCustom(
            dropdowns.units.selectElement, 
            dropdowns.units.customInput
        );

        elements.labelElements.labelPreview.innerHTML = `
            <img src="${qrCodeUrl}" alt="QR Code">
            <div class="text">
                <p>${label}</p>
                <p>${Math.round(concentration)} mg/ml</p>
                <p>${dose}mg/${units}u</p>
            </div>
        `;
    }

    // Add buttons to download the label as an image
    const downloadButtonsDiv = document.createElement('div');
    downloadButtonsDiv.className = 'download-buttons';

    const downloadSVGButton = document.createElement('button');
    downloadSVGButton.textContent = 'Download SVG';
    downloadSVGButton.addEventListener('click', () => downloadLabel('svg'));
    downloadButtonsDiv.appendChild(downloadSVGButton);

    elements.labelElements.labelPreview.parentNode.appendChild(downloadButtonsDiv);
    
    // Get the PNG preview container
    const pngPreviewContainer = elements.labelElements.pngPreviewContainer;

    function downloadLabel(format) {
        const qrImage = elements.labelElements.labelPreview.querySelector('img');
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
    elements.labelElements.labelInput.addEventListener('input', () => {
        updateLabelPreview();
        updatePNGPreview();
    });
    elements.labelElements.urlInput.addEventListener('input', () => {
        updateLabelPreview();
        updatePNGPreview();
    });
    
    // Initial PNG preview
    function updatePNGPreview() {
        const qrImage = elements.labelElements.labelPreview.querySelector('img');
        if (qrImage && qrImage.complete) {
            renderPNG(false);
        } else if (qrImage) {
            qrImage.onload = () => renderPNG(false);
        }
    }
    
    // Call updatePNGPreview whenever calculator values change
    Object.values(elements.selects).forEach(select => select.addEventListener('change', updatePNGPreview));
    Object.values(elements.customInputs).forEach(input => input.addEventListener('input', updatePNGPreview));
    
    // Initial preview after page load
    setTimeout(updatePNGPreview, 500);

    function generateSVG() {
        const qrImage = elements.labelElements.labelPreview.querySelector('img');
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        
        // Use same dimensions as PNG - 10mm height and max 50mm width
        const targetHeightMm = CONFIG.constants.labelHeight;
        const targetHeightPixels = Math.round((targetHeightMm / 25.4) * 96);
        const qrSizePixels = targetHeightPixels;
        
        // Calculate width based on text measurement
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const fontSize = Math.floor(targetHeightPixels / 4.5);
        ctx.font = `${fontSize}px sans-serif`;
        
        // Get text values
        const label = elements.labelElements.labelInput.value || 'Peptide';
        const concentration = Math.round(parseFloat(elements.outputs.concentration.textContent));
        const doseValue = getValueFromSelectOrCustom(
            dropdowns.dose.selectElement, 
            dropdowns.dose.customInput
        );
        const unitValue = getValueFromSelectOrCustom(
            dropdowns.units.selectElement, 
            dropdowns.units.customInput
        );
        
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
        const maxWidthMm = CONFIG.constants.labelMaxWidth;
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
        const qrImage = elements.labelElements.labelPreview.querySelector('img');
        
        // Create a new image to preload the QR code
        const img = new Image();
        img.crossOrigin = "Anonymous";  // This is important for cross-origin images
        img.onload = function() {
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Scale factor for higher resolution
            const scaleFactor = CONFIG.constants.scaleFactor;
             
            // Get text values
            const label = elements.labelElements.labelInput.value || 'Peptide';
            const concentration = Math.round(parseFloat(elements.outputs.concentration.textContent));
            const doseValue = getValueFromSelectOrCustom(
                dropdowns.dose.selectElement, 
                dropdowns.dose.customInput
            );
            const unitValue = getValueFromSelectOrCustom(
                dropdowns.units.selectElement, 
                dropdowns.units.customInput
            );
            
            // Create the three lines of text
            const text1 = `${label}`;
            const text2 = `${concentration} mg/ml`;
            const text3 = `${doseValue}mg/${unitValue}u`;
            
            // Calculate font size based on fixed height of 10mm
            // 10mm = 0.3937 inches, at 96dpi that's ~38px
            // QR code and text need to fit in 10mm height
            const targetHeightMm = CONFIG.constants.labelHeight;
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
            const maxWidthMm = CONFIG.constants.labelMaxWidth;
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
            elements.labelElements.pngPreviewContainer.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = canvas.toDataURL('image/png', 1.0);
            previewImg.style.cursor = 'pointer';
            previewImg.title = 'Click to open in new tab';
            previewImg.addEventListener('click', function() {
                const tab = window.open();
                tab.document.write(`<html><head><title>Label</title></head><body style="display:flex;justify-content:center;align-items:center;margin:0;background:#f5f5f5;"><img src="${this.src}" style="max-width:100%;"></body></html>`);
                tab.document.close();
            });
            elements.labelElements.pngPreviewContainer.appendChild(previewImg);
            
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
