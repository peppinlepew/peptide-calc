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
            dateInput: document.getElementById('dateInput'),
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
        elements.outputs.concentration.textContent = `${concentration.toFixed(2)}mg/ml`;

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
        const dateInput = elements.labelElements.dateInput.value;
        let formattedDate = '';
        if (dateInput) {
            // Format as MMDDYY
            const date = new Date(dateInput);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            formattedDate = `${month}${day}${year}`;
        }
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
                <p>${Math.round(concentration)} mg/ml${formattedDate ? '|' + formattedDate : ''}</p>
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
    elements.labelElements.dateInput.addEventListener('change', () => {
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
        // Reduce font size by 10%
        const fontSize = Math.floor((targetHeightPixels / 4.5) * 0.9);
        ctx.font = `${fontSize}px sans-serif`;
        
        // Get text values
        const label = elements.labelElements.labelInput.value || 'Peptide';
        const concentration = Math.round(parseFloat(elements.outputs.concentration.textContent));
        
        // Format date
        const dateInput = elements.labelElements.dateInput.value;
        let formattedDate = '';
        if (dateInput) {
            // Format as MMDDYY
            const date = new Date(dateInput);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            formattedDate = `${month}${day}${year}`;
        }
        
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
        const text2Content = `${concentration} mg/ml${formattedDate ? '|' + formattedDate : ''}`;
        const text3Content = `${doseValue}mg/${unitValue}u`;
        
        // Measure text
        const text1Width = ctx.measureText(text1Content).width;
        const text2Width = ctx.measureText(text2Content).width;
        const text3Width = ctx.measureText(text3Content).width;
        const maxTextWidth = Math.max(text1Width, text2Width, text3Width);
        
        // Set max width to 50mm
        const maxWidthMm = CONFIG.constants.labelMaxWidth;
        // Convert 50mm to pixels (at 96 DPI)
        const maxWidthPixels = (maxWidthMm / 25.4) * 96;
        
        // Set canvas dimensions to accommodate all text
        // If text is wider than max width, constrain to max width
        // Otherwise, allow it to expand to fit text (but not beyond max width)
        const neededTextWidth = maxTextWidth;
        const textWidthToUse = Math.min(neededTextWidth, maxWidthPixels - qrSizePixels - 15);
        
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
        
        // Adjust positions upward to better center the middle line
        const verticalAdjustment = Math.floor(lineSpacing / 2);
        text1.setAttribute("y", centerY - lineSpacing - verticalAdjustment);
        text1.setAttribute("font-size", fontSize);
        text1.textContent = text1Content;
        svg.appendChild(text1);

        const text2 = document.createElementNS(svgNS, "text");
        text2.setAttribute("x", qrSizePixels + 5);
        text2.setAttribute("y", centerY - verticalAdjustment);
        // Make line 2 30% smaller
        const line2FontSize = Math.floor(fontSize * 0.7);
        text2.setAttribute("font-size", line2FontSize);
        text2.textContent = text2Content;
        svg.appendChild(text2);
        
        const text3 = document.createElementNS(svgNS, "text");
        text3.setAttribute("x", qrSizePixels + 5);
        text3.setAttribute("y", centerY + lineSpacing - verticalAdjustment);
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
            // Get all dimension constants and parameters from CONFIG
            const targetHeightMm = CONFIG.constants.labelHeight; // 10mm height
            const maxWidthMm = CONFIG.constants.labelMaxWidth;   // 50mm max width
            
            // Target output dimensions
            const targetHeightPx = 300; // We want 300px height output
            
            // Calculate base dimensions at standard 96 DPI
            const baseHeightPx = Math.round((targetHeightMm / 25.4) * 96); // ~38px at 96 DPI
            const qrSizePixels = baseHeightPx; // QR code is also 10mm high
            
            // Calculate scale factor needed to reach 300px height
            const scaleFactor = targetHeightPx / baseHeightPx; // Should be around 7.9
            
            // Get values for the label
            const label = elements.labelElements.labelInput.value || 'Peptide';
            const concentration = Math.round(parseFloat(elements.outputs.concentration.textContent));
            
            // Format date as MMDDYY
            const dateInput = elements.labelElements.dateInput.value;
            let formattedDate = '';
            if (dateInput) {
                const date = new Date(dateInput);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                formattedDate = `${month}${day}${year}`;
            }
            
            // Get dose and units
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
            const text2 = `${concentration} mg/ml${formattedDate ? '|' + formattedDate : ''}`;
            const text3 = `${doseValue}mg/${unitValue}u`;
            
            // Font size proportional to the label height
            const fontSize = Math.floor((baseHeightPx / 3) * 0.9);
            
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Disable antialiasing for crisp rendering
            ctx.imageSmoothingEnabled = false;
            
            // Set up canvas for measuring text
            ctx.font = `${fontSize * scaleFactor}px sans-serif`;
            
            // Measure text width for all lines
            const text1Width = ctx.measureText(text1).width;
            const text2Width = ctx.measureText(text2).width;
            const text3Width = ctx.measureText(text3).width;
            const maxTextWidth = Math.max(text1Width, text2Width, text3Width);
            
            // Calculate text width with scaling factored out
            const scaledTextWidth = maxTextWidth / scaleFactor;
            
            // Convert max width to pixels
            const maxWidthPixels = (maxWidthMm / 25.4) * 96;
            
            // Calculate the width needed for text (constrained by max width)
            const textWidthToUse = Math.min(scaledTextWidth, maxWidthPixels - qrSizePixels - 15);
            
            // Calculate total width of the label
            const baseWidth = qrSizePixels + 5 + textWidthToUse + 10;
            
            // Ensure integer dimensions to avoid subpixel rendering
            const finalWidth = Math.floor(baseWidth * scaleFactor);
            const finalHeight = Math.floor(targetHeightPx);
            
            // Set canvas dimensions with scaling
            canvas.width = finalWidth;
            canvas.height = finalHeight;
            
            // Fill with white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Disable antialiasing again (sometimes it resets after canvas resize)
            ctx.imageSmoothingEnabled = false;
            
            // Draw QR code
            // Floor values to ensure pixel-perfect alignment
            const qrWidth = Math.floor(qrSizePixels * scaleFactor);
            const qrHeight = Math.floor(qrSizePixels * scaleFactor);
            ctx.drawImage(img, 0, 0, qrWidth, qrHeight);
            
            // Set up for drawing text
            ctx.fillStyle = 'black';
            
            // Calculate vertical positions
            const centerY = baseHeightPx / 2;
            const lineSpacing = baseHeightPx / 3;
            const fontHeightOffset = fontSize * 0.35; // Approximate adjustment for baseline
            
            // Use crisp text rendering
            ctx.textRendering = 'geometricPrecision';
            // Force crisp edges on text
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
            
            // Draw each line of text
            // Floor positions to align with pixel boundaries
            const x1 = Math.floor((qrSizePixels + 5) * scaleFactor);
            // Adjust all positions upward to better center line 2
            // The vertical adjustment to move everything up
            const verticalAdjustment = Math.floor(lineSpacing / 2); 
            
            // Set positions with the upward adjustment
            const y1 = Math.floor((centerY - lineSpacing - verticalAdjustment) * scaleFactor);
            ctx.font = `${Math.floor(fontSize * scaleFactor)}px monospace`;
            ctx.fillText(text1, x1, y1);
            
            // Line 2 with 30% smaller font
            const line2FontSize = Math.floor(fontSize * 0.7); // 30% smaller
            ctx.font = `${Math.floor(line2FontSize * scaleFactor)}px monospace`;
            const y2 = Math.floor((centerY - verticalAdjustment) * scaleFactor);
            ctx.fillText(text2, x1, y2);
            
            // Reset to original font size for line 3
            ctx.font = `${Math.floor(fontSize * scaleFactor)}px monospace`;
            const y3 = Math.floor((centerY + lineSpacing - verticalAdjustment) * scaleFactor);
            ctx.fillText(text3, x1, y3);
            
            // Update preview
            elements.labelElements.pngPreviewContainer.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = canvas.toDataURL('image/png', 1.0);
            previewImg.style.imageRendering = 'pixelated'; // No smoothing when scaled in browser
            previewImg.style.cursor = 'pointer';
            previewImg.title = 'Click to open in new tab';
            previewImg.addEventListener('click', function() {
                const tab = window.open();
                tab.document.write(`<html><head><title>Label</title></head><body style="display:flex;justify-content:center;align-items:center;margin:0;background:#f5f5f5;"><img src="${this.src}" style="max-width:100%;image-rendering:pixelated;"></body></html>`);
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

    // Set default date to today
    (function setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        elements.labelElements.dateInput.value = `${year}-${month}-${day}`;
    })();
});
