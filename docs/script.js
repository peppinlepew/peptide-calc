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
                defaultValue: 40,
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
            // defaultRickrollURL: 'https://rickroll.it/rickroll.mp4',
            defaultRickrollURL: 'https://is.gd/vXpyxu(base)'
        },
        // Storage keys for localStorage
        storageKeys: {
            vialQuantity: 'peptideCalc_vialQuantity',
            vialQuantityCustom: 'peptideCalc_vialQuantityCustom',
            dose: 'peptideCalc_dose',
            doseCustom: 'peptideCalc_doseCustom',
            units: 'peptideCalc_units',
            unitsCustom: 'peptideCalc_unitsCustom',
            label: 'peptideCalc_label',
            url: 'peptideCalc_url',
            shortenedUrl: 'peptideCalc_shortenedUrl',
            useShortUrl: 'peptideCalc_useShortUrl'
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
            shortenedUrlDisplay: document.getElementById('shortenedUrlDisplay'),
            qrLabelContainer: document.querySelector('.label-container.qr-label'),
            datamatrixLabelContainer: document.querySelector('.label-container.datamatrix-label')
        }
    };

    // Store the shortened URL and flag to determine which URL to use
    let shortenedUrl = '';
    let useShortUrl = false;
    
    // Initialize elements
    createUseShortUrlButton();
    
    // Function to create the "Use Short URL" button
    function createUseShortUrlButton() {
        // Create the button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'shortened-url-display';
        
        // Create the "Use Short URL" button
        const useShortUrlButton = document.createElement('button');
        useShortUrlButton.id = 'useShortUrlButton';
        useShortUrlButton.className = 'toggle-button';
        useShortUrlButton.textContent = 'Use Short URL (easier to print)';
        
        // Add the button to the container
        buttonContainer.appendChild(useShortUrlButton);
        
        // Add the container to the page
        elements.labelElements.shortenedUrlDisplay.appendChild(buttonContainer);
        
        // Add event listener to the button
        useShortUrlButton.addEventListener('click', handleUseShortUrlClick);
    }
    
    // Function to handle "Use Short URL" button click
    function handleUseShortUrlClick() {
        const useShortUrlButton = document.getElementById('useShortUrlButton');
        
        // If we already have a shortened URL, just toggle between short and original
        if (shortenedUrl) {
            useShortUrl = !useShortUrl;
            updateUseShortUrlButton();
            generateLabels();
            saveSettings(); // Save the useShortUrl state
            return;
        }
        
        // Otherwise, we need to shorten the URL first
        const url = elements.labelElements.urlInput.value.trim();
        
        // Only attempt to shorten if there's a valid URL
        if (url && url.length > 0 && isValidUrl(url)) {
            // Show loading state
            useShortUrlButton.disabled = true;
            useShortUrlButton.textContent = 'Shortening...';
            
            // Remove any existing URL display or error message
            removeExistingDisplayElements();
            
            // Check if we have a cached shortened URL for this exact URL
            const cachedShortenedUrl = localStorage.getItem(CONFIG.storageKeys.shortenedUrl);
            const cachedForUrl = localStorage.getItem(CONFIG.storageKeys.url);
            
            if (cachedShortenedUrl && cachedForUrl === url) {
                // Use cached shortened URL
                shortenedUrl = cachedShortenedUrl;
                useShortUrl = true;
                
                // Display the shortened URL
                displayShortenedUrl(shortenedUrl);
                
                // Update button state
                updateUseShortUrlButton();
                
                // Generate labels with the short URL
                generateLabels();
                return;
            }
            
            // Call is.gd API (via a cors proxy to avoid CORS issues)
            fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.contents && data.contents.startsWith('https://is.gd/')) {
                        // Store the shortened URL
                        shortenedUrl = data.contents;
                        
                        // Display the shortened URL
                        displayShortenedUrl(shortenedUrl);
                        
                        // Enable short URL
                        useShortUrl = true;
                        
                        // Update the button
                        updateUseShortUrlButton();
                        
                        // Save the shortened URL and preference to localStorage
                        saveSettings();
                        
                        // Generate labels with the short URL
                        generateLabels();
                    } else {
                        throw new Error('Invalid response from shortener service');
                    }
                })
                .catch(error => {
                    console.error('Error shortening URL:', error);
                    
                    // Show error message below the button
                    const errorSpan = document.createElement('div');
                    errorSpan.textContent = 'Could not shorten URL';
                    errorSpan.className = 'error-message';
                    
                    // Add the error message after the button container
                    const buttonContainer = useShortUrlButton.parentElement;
                    buttonContainer.parentElement.appendChild(errorSpan);
                    
                    // Reset the button
                    useShortUrl = false;
                    shortenedUrl = '';
                    updateUseShortUrlButton();
                });
        } else {
            // Show error for invalid URL below the button
            const errorSpan = document.createElement('div');
            errorSpan.textContent = 'Please enter a valid URL first';
            errorSpan.className = 'error-message';
            
            // Remove any existing URL display or error message
            removeExistingDisplayElements();
            
            // Add the error message after the button container
            const buttonContainer = useShortUrlButton.parentElement;
            buttonContainer.parentElement.appendChild(errorSpan);
        }
    }
    
    // Function to remove existing URL display or error messages
    function removeExistingDisplayElements() {
        const shortenedUrlDisplay = elements.labelElements.shortenedUrlDisplay;
        const existingInfo = shortenedUrlDisplay.querySelector('.shortened-url-info');
        const existingError = shortenedUrlDisplay.querySelector('.error-message');
        
        if (existingInfo) {
            shortenedUrlDisplay.removeChild(existingInfo);
        }
        
        if (existingError) {
            shortenedUrlDisplay.removeChild(existingError);
        }
    }
    
    // Function to update the "Use Short URL" button state
    function updateUseShortUrlButton() {
        const button = document.getElementById('useShortUrlButton');
        if (!button) return;
        
        if (useShortUrl) {
            button.classList.add('active');
            button.textContent = 'Using Short URL';
        } else {
            button.classList.remove('active');
            button.textContent = 'Use Short URL';
        }
        
        button.disabled = false;
    }

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
            saveSettings(); // Save settings when changed
        });
        
        customInput.addEventListener('input', () => {
            calculateResults();
            saveSettings(); // Save settings when changed
        });
        
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

    // Load saved settings or use defaults
    loadSettings();

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
        
        // Determine which URL to use
        let url = elements.labelElements.urlInput.value || CONFIG.constants.defaultRickrollURL;
        if (useShortUrl && shortenedUrl) {
            url = shortenedUrl;
        }
        
        // Format date as MMDDYY - use today's date by default
        const dateInput = elements.labelElements.dateInput.value;
        let formattedDate = '';
        
        if (dateInput) {
            // The date input value is in YYYY-MM-DD format, parse it manually to avoid timezone issues
            const [year, month, day] = dateInput.split('-');
            const twoDigitYear = year.slice(-2);
            // Use padStart to ensure 2 digits for month and day
            const paddedMonth = month.padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            formattedDate = `${paddedMonth}${paddedDay}${twoDigitYear}`;
        } else {
            // If no date is selected, use today's date
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const year = String(today.getFullYear()).slice(-2);
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
        // Clear the container but preserve the heading
        const heading = container.querySelector('h4');
        container.innerHTML = '';
        if (heading) {
            container.appendChild(heading);
        }
        
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
        
        // Prepare the three lines of text
        const text1 = label;
        const text2 = `${Math.round(concentration)} mg/ml${formattedDate ? '|' + formattedDate : ''}`;
        const text3 = `${units}units = ${dose}mg`;
        
        // Set up text for measuring - now all lines use the same font size
        ctx.font = `${fontSize * scaleFactor}px monospace`;
        
        // Measure text widths - all with the same font size
        const text1Width = ctx.measureText(text1).width;
        const text3Width = ctx.measureText(text3).width;
        
        // Also measure text2 with the same font size
        const text2Width = ctx.measureText(text2).width;
        
        // Calculate the maximum text width properly accounting for all three lines
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
        
        // Set font for all text (same size for all lines)
        ctx.font = `${Math.floor(fontSize * scaleFactor)}px monospace`;
        
        // Draw line 1
        const y1 = Math.floor((centerY - lineSpacing - verticalAdjustment) * scaleFactor);
        ctx.fillText(text1, textX, y1);
        
        // Draw line 2 (now same font size as others)
        const y2 = Math.floor((centerY - verticalAdjustment) * scaleFactor);
        ctx.fillText(text2, textX, y2);
        
        // Draw line 3
        const y3 = Math.floor((centerY + lineSpacing - verticalAdjustment) * scaleFactor);
        ctx.fillText(text3, textX, y3);
        
        // Create the final image
        const labelImg = document.createElement('img');
        labelImg.src = canvas.toDataURL('image/png', 1.0);
        labelImg.style.cursor = 'pointer';
        
        // Add click event to properly open the image in a new tab/window
        labelImg.addEventListener('click', function() {
            // Create a blob from the data URL
            const byteString = atob(this.src.split(',')[1]);
            const mimeString = this.src.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([ab], {type: mimeString});
            const blobUrl = URL.createObjectURL(blob);
            
            // Open in a new window and release the object URL when done
            const newWindow = window.open(blobUrl, '_blank');
            if (newWindow) {
                newWindow.onload = function() {
                    // Clean up the blob URL after the window loads
                    URL.revokeObjectURL(blobUrl);
                };
            }
        });
        
        // Create container for image and description
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        // Create description paragraph
        const description = document.createElement('p');
        description.className = 'code-description';
        description.textContent = getDescriptionForCodeType(codeType);
        
        // Add image and description to the container
        imageContainer.appendChild(labelImg);
        imageContainer.appendChild(description);
        
        // Add to main container
        container.appendChild(imageContainer);
    }
    
    // Function to get the description text for each code type
    function getDescriptionForCodeType(codeType) {
        if (codeType === 'QR') {
            return 'Universally compatible with all smartphone cameras. Both iPhone and Android can scan directly.';
        } else {
            return 'More compact, can be printed smaller. Requires specialized apps on iPhone, some Android phones support natively.';
        }
    }

    // Set default date to today
    (function setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        elements.labelElements.dateInput.value = `${year}-${month}-${day}`;
    })();

    // Add event listeners
    elements.labelElements.labelInput.addEventListener('input', () => {
        generateLabels();
        saveSettings(); // Save settings when label changes
    });
    elements.labelElements.dateInput.addEventListener('change', generateLabels);
    elements.labelElements.urlInput.addEventListener('input', () => {
        handleUrlChange();
        saveSettings(); // Save settings when URL changes
    });
    
    // Function to handle URL input changes
    function handleUrlChange() {
        // Reset short URL state if the URL input changes
        if (shortenedUrl) {
            shortenedUrl = '';
            useShortUrl = false;
            updateUseShortUrlButton();
            removeExistingDisplayElements();
        }
        
        // Generate new labels with the original URL
        generateLabels();
        
        // Save the new URL
        saveSettings();
    }

    // Function to validate URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Function to display shortened URL
    function displayShortenedUrl(url) {
        // Display the shortened URL below the button
        const urlDisplaySpan = document.createElement('div');
        urlDisplaySpan.className = 'shortened-url-info';
        urlDisplaySpan.innerHTML = `Shortened URL: <a href="${url}" target="_blank">${url}</a>`;
        
        // Add the URL display after the button container
        const buttonContainer = document.getElementById('useShortUrlButton').parentElement;
        buttonContainer.parentElement.appendChild(urlDisplaySpan);
    }

    // Function to save user settings to localStorage
    function saveSettings() {
        try {
            // Save dropdown values
            localStorage.setItem(CONFIG.storageKeys.vialQuantity, dropdowns.vialQuantity.selectElement.value);
            localStorage.setItem(CONFIG.storageKeys.dose, dropdowns.dose.selectElement.value);
            localStorage.setItem(CONFIG.storageKeys.units, dropdowns.units.selectElement.value);
            
            // Save custom input values if in custom mode
            if (dropdowns.vialQuantity.selectElement.value === 'custom') {
                localStorage.setItem(CONFIG.storageKeys.vialQuantityCustom, dropdowns.vialQuantity.customInput.value);
            }
            
            if (dropdowns.dose.selectElement.value === 'custom') {
                localStorage.setItem(CONFIG.storageKeys.doseCustom, dropdowns.dose.customInput.value);
            }
            
            if (dropdowns.units.selectElement.value === 'custom') {
                localStorage.setItem(CONFIG.storageKeys.unitsCustom, dropdowns.units.customInput.value);
            }
            
            // Save label and URL inputs
            localStorage.setItem(CONFIG.storageKeys.label, elements.labelElements.labelInput.value);
            localStorage.setItem(CONFIG.storageKeys.url, elements.labelElements.urlInput.value);
            
            // Save shortened URL and useShortUrl preference
            if (shortenedUrl) {
                localStorage.setItem(CONFIG.storageKeys.shortenedUrl, shortenedUrl);
                localStorage.setItem(CONFIG.storageKeys.useShortUrl, useShortUrl.toString());
            }
            
            console.log('Settings saved to localStorage');
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }
    
    // Function to load saved settings from localStorage
    function loadSettings() {
        try {
            // Load vial quantity
            const savedVialQuantity = localStorage.getItem(CONFIG.storageKeys.vialQuantity);
            if (savedVialQuantity) {
                dropdowns.vialQuantity.selectElement.value = savedVialQuantity;
                if (savedVialQuantity === 'custom') {
                    const customValue = localStorage.getItem(CONFIG.storageKeys.vialQuantityCustom);
                    if (customValue) {
                        dropdowns.vialQuantity.customInput.value = customValue;
                        dropdowns.vialQuantity.customInput.style.display = 'block';
                    }
                }
            }
            
            // Load dose
            const savedDose = localStorage.getItem(CONFIG.storageKeys.dose);
            if (savedDose) {
                dropdowns.dose.selectElement.value = savedDose;
                if (savedDose === 'custom') {
                    const customValue = localStorage.getItem(CONFIG.storageKeys.doseCustom);
                    if (customValue) {
                        dropdowns.dose.customInput.value = customValue;
                        dropdowns.dose.customInput.style.display = 'block';
                    }
                }
            }
            
            // Load units
            const savedUnits = localStorage.getItem(CONFIG.storageKeys.units);
            if (savedUnits) {
                dropdowns.units.selectElement.value = savedUnits;
                if (savedUnits === 'custom') {
                    const customValue = localStorage.getItem(CONFIG.storageKeys.unitsCustom);
                    if (customValue) {
                        dropdowns.units.customInput.value = customValue;
                        dropdowns.units.customInput.style.display = 'block';
                    }
                }
            }
            
            // Load label and URL
            const savedLabel = localStorage.getItem(CONFIG.storageKeys.label);
            if (savedLabel) {
                elements.labelElements.labelInput.value = savedLabel;
            }
            
            const savedUrl = localStorage.getItem(CONFIG.storageKeys.url);
            if (savedUrl) {
                elements.labelElements.urlInput.value = savedUrl;
                
                // Check if we have a saved shortened URL for this URL
                const savedShortenedUrl = localStorage.getItem(CONFIG.storageKeys.shortenedUrl);
                if (savedShortenedUrl) {
                    shortenedUrl = savedShortenedUrl;
                    
                    // Restore useShortUrl preference
                    const savedUseShortUrl = localStorage.getItem(CONFIG.storageKeys.useShortUrl);
                    if (savedUseShortUrl === 'true') {
                        useShortUrl = true;
                    }
                    
                    // Display the shortened URL
                    displayShortenedUrl(shortenedUrl);
                    
                    // Update button state
                    updateUseShortUrlButton();
                }
            }
            
            console.log('Settings loaded from localStorage');
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
});
