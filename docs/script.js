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
            qrLabelContainer: document.querySelector('.label-container.qr-label'),
            datamatrixLabelContainer: document.querySelector('.label-container.datamatrix-label')
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

        // Generate the labels
        generateLabels();
    }

    // Function to generate both labels (QR and DataMatrix)
    function generateLabels() {
        // Get the label content values
        const label = elements.labelElements.labelInput.value || 'Peptide';
        const url = elements.labelElements.urlInput.value || CONFIG.constants.defaultRickrollURL;
        
        // Format date as MMDDYY if provided
        const dateInput = elements.labelElements.dateInput.value;
        let formattedDate = '';
        if (dateInput) {
            const date = new Date(dateInput);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            formattedDate = `${month}${day}${year}`;
        }
        
        const concentration = parseFloat(elements.outputs.concentration.textContent);
        
        const dose = getValueFromSelectOrCustom(
            dropdowns.dose.selectElement, 
            dropdowns.dose.customInput
        );
        
        const units = getValueFromSelectOrCustom(
            dropdowns.units.selectElement, 
            dropdowns.units.customInput
        );

        // Generate QR code label
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
        const qrCodeImg = new Image();
        qrCodeImg.crossOrigin = "Anonymous";
        qrCodeImg.onload = function() {
            createLabelImage(
                qrCodeImg, 
                elements.labelElements.qrLabelContainer, 
                label, 
                concentration, 
                formattedDate, 
                dose, 
                units, 
                'QR'
            );
        };
        qrCodeImg.onerror = function() {
            elements.labelElements.qrLabelContainer.innerHTML = 
                `<div class="error-message">Could not load QR code</div>`;
        };
        qrCodeImg.src = qrCodeUrl;
        
        // Generate Data Matrix code label
        const canvas = document.getElementById('dataMatrixCanvas');
        try {
            // Set canvas dimensions
            canvas.width = 150;
            canvas.height = 150;
            
            // Clear previous content
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Generate Data Matrix code
            bwipjs.toCanvas(canvas, {
                bcid: 'datamatrix',         // Barcode type
                text: url,                  // Text to encode
                scale: 3,                   // 3x scaling factor
                height: 50,                 // Bar height (overridden by scale)
                includetext: false,         // Show human-readable text
                textxalign: 'center',       // Text alignment
                backgroundcolor: 'FFFFFF'   // White background
            });
            
            // Get image from canvas
            const dataMatrixImg = new Image();
            dataMatrixImg.onload = function() {
                createLabelImage(
                    dataMatrixImg, 
                    elements.labelElements.datamatrixLabelContainer, 
                    label, 
                    concentration, 
                    formattedDate, 
                    dose, 
                    units, 
                    'DataMatrix'
                );
            };
            dataMatrixImg.src = canvas.toDataURL('image/png');
        } catch (e) {
            console.error("Error generating Data Matrix code:", e);
            elements.labelElements.datamatrixLabelContainer.innerHTML = 
                `<div class="error-message">Could not generate Data Matrix code</div>`;
        }
    }
    
    // Function to create a label image with barcode and text
    function createLabelImage(barcodeImg, container, label, concentration, formattedDate, dose, units, codeType) {
        // Clear the container
        container.innerHTML = '';
        
        // Get dimensions
        const targetHeightMm = CONFIG.constants.labelHeight;
        const maxWidthMm = CONFIG.constants.labelMaxWidth;
        
        // Convert mm to pixels (at 96 DPI)
        const baseHeightPx = Math.round((targetHeightMm / 25.4) * 96);
        const barcodeSizePx = baseHeightPx;
        
        // Create canvas with 3x scale for better quality
        const scaleFactor = 3;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Font size proportional to label height
        const fontSize = Math.floor((baseHeightPx / 3) * 0.9);
        
        // Set up text for measuring
        ctx.font = `${fontSize * scaleFactor}px sans-serif`;
        
        // Prepare the three lines of text
        const text1 = label;
        const text2 = `${Math.round(concentration)} mg/ml${formattedDate ? '|' + formattedDate : ''}`;
        const text3 = `${dose}mg/${units}u`;
        
        // Measure text widths
        const text1Width = ctx.measureText(text1).width;
        const text2Width = ctx.measureText(text2).width;
        const text3Width = ctx.measureText(text3).width;
        const maxTextWidth = Math.max(text1Width, text2Width, text3Width) / scaleFactor;
        
        // Calculate total width (constrained by maxWidthMm)
        const maxWidthPx = (maxWidthMm / 25.4) * 96;
        const textWidthToUse = Math.min(maxTextWidth, maxWidthPx - barcodeSizePx - 15);
        const baseWidth = barcodeSizePx + 5 + textWidthToUse + 10;
        
        // Set canvas dimensions (scaled up for better quality)
        canvas.width = Math.floor(baseWidth * scaleFactor);
        canvas.height = Math.floor(baseHeightPx * scaleFactor);
        
        // Fill background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Ensure crisp rendering
        ctx.imageSmoothingEnabled = false;
        
        // Draw barcode
        const barcodeSize = Math.floor(barcodeSizePx * scaleFactor);
        ctx.drawImage(barcodeImg, 0, 0, barcodeSize, barcodeSize);
        
        // Draw text
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        
        // Calculate text positions
        const textX = Math.floor((barcodeSizePx + 5) * scaleFactor);
        const centerY = baseHeightPx / 2;
        const lineSpacing = baseHeightPx / 3;
        const verticalAdjustment = Math.floor(lineSpacing / 2);
        
        // Draw line 1
        const y1 = Math.floor((centerY - lineSpacing - verticalAdjustment) * scaleFactor);
        ctx.font = `${Math.floor(fontSize * scaleFactor)}px monospace`;
        ctx.fillText(text1, textX, y1);
        
        // Draw line 2 (smaller font)
        const line2FontSize = Math.floor(fontSize * 0.7);
        ctx.font = `${Math.floor(line2FontSize * scaleFactor)}px monospace`;
        const y2 = Math.floor((centerY - verticalAdjustment) * scaleFactor);
        ctx.fillText(text2, textX, y2);
        
        // Draw line 3
        ctx.font = `${Math.floor(fontSize * scaleFactor)}px monospace`;
        const y3 = Math.floor((centerY + lineSpacing - verticalAdjustment) * scaleFactor);
        ctx.fillText(text3, textX, y3);
        
        // Create the final image
        const labelImg = document.createElement('img');
        labelImg.src = canvas.toDataURL('image/png', 1.0);
        labelImg.title = `Click to download ${codeType} label`;
        labelImg.style.cursor = 'pointer';
        
        // Add click event to download the image
        labelImg.addEventListener('click', function() {
            const link = document.createElement('a');
            link.download = `label-${codeType}.png`;
            link.href = this.src;
            link.click();
        });
        
        // Add to container
        container.appendChild(labelImg);
    }

    // Update labels when input changes
    elements.labelElements.labelInput.addEventListener('input', generateLabels);
    elements.labelElements.dateInput.addEventListener('change', generateLabels);
    elements.labelElements.urlInput.addEventListener('input', generateLabels);
    
    // Set default date to today
    (function setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        elements.labelElements.dateInput.value = `${year}-${month}-${day}`;
    })();
});
