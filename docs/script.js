document.addEventListener('DOMContentLoaded', () => {
    // Configuration object to centralize all parameters
    const CONFIG = {
        // Peptide type configurations
        peptideTypes: {
            tirz: {
                name: "Tirz",
                vialQuantities: [10, 15, 20, 30, 40, 50, 60],
                doseValues: [2.5, 5, 7.5, 10, 12.5, 15],
                defaultVialQuantity: 30,
                defaultDose: 5,
                thresholdConcentration: 30 // mg/ml
            },
            sema: {
                name: "Sema",
                vialQuantities: [2, 5, 10, 15, 20],
                doseValues: [.25, .5, 1, 2],
                defaultVialQuantity: 15,
                defaultDose: 1,
                thresholdConcentration: 3 // mg/ml
            },
            other: {
                name: "Other",
                vialQuantities: [2, 5, 10, 15, 20, 25, 30, 40, 50, 60],
                doseValues: [.25, .5, 1, 2, 2.5, 3, 4, 5, 7.5, 10, 12.5, 15, 20],
                defaultVialQuantity: 10,
                defaultDose: .25,
                thresholdConcentration: 0 // mg/ml
            }
        },
        // Current active peptide type (default to tirz)
        activePeptideType: 'tirz',
        // Dropdown configurations
        dropdowns: {
            vialQuantity: {
                selectId: 'vialQuantitySelect',
                customInputId: 'vialQuantityCustom',
                suffix: "mg",
                customLabel: "Custom"
            },
            dose: {
                selectId: 'doseSelect',
                customInputId: 'doseCustom',
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
            useShortUrl: 'peptideCalc_useShortUrl',
            peptideType: 'peptideCalc_peptideType'
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
            datamatrixLabelContainer: document.querySelector('.label-container.datamatrix-label'),
            unreconQrLabelContainer: document.querySelector('.label-container.unrecon-qr-label'),
            unreconDatamatrixLabelContainer: document.querySelector('.label-container.unrecon-datamatrix-label')
        }
    };

    // Global variables
    let shortenedUrl = '';
    let useShortUrl = false;
    let dropdowns = {};
    let isInitialized = false;  // Add initialization state flag
    
    // Initialize elements
    // Remove this line since we'll create the button in initializeApp
    // createUseShortUrlButton();
    
    // Function to create the "Use Short URL" button
    function createUseShortUrlButton() {
        // Check if button already exists
        if (document.getElementById('useShortUrlButton')) {
            return; // Button already exists, don't create another one
        }
        
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
                    
                    // Clear any cached URL data to ensure fresh attempts in the future
                    localStorage.removeItem(CONFIG.storageKeys.shortenedUrl);
                    localStorage.removeItem(CONFIG.storageKeys.useShortUrl);
                    
                    // Reset state
                    shortenedUrl = '';
                    useShortUrl = false;
                    
                    // Show error message below the button
                    const errorSpan = document.createElement('div');
                    errorSpan.textContent = 'Could not shorten URL. Cache cleared for fresh attempt.';
                    errorSpan.className = 'error-message';
                    
                    // Add the error message after the button container
                    const buttonContainer = useShortUrlButton.parentElement;
                    buttonContainer.parentElement.appendChild(errorSpan);
                    
                    // Reset the button
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

    // Create peptide type selector
    function createPeptideTypeSelector() {
        // Create the container
        const typeContainer = document.createElement('div');
        typeContainer.className = 'peptide-type-container';
        typeContainer.style.margin = '1rem 0';
        typeContainer.style.textAlign = 'center';
        
        // Create label
        const label = document.createElement('label');
        label.textContent = 'Peptide Type:';
        label.style.display = 'block';
        label.style.marginBottom = '0.5rem';
        label.style.fontWeight = 'bold';
        typeContainer.appendChild(label);
        
        // Create the button group
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'peptide-type-buttons';
        buttonGroup.style.display = 'flex';
        buttonGroup.style.justifyContent = 'center';
        buttonGroup.style.gap = '0.5rem';
        
        // Create buttons for each peptide type
        Object.entries(CONFIG.peptideTypes).forEach(([typeId, typeConfig]) => {
            const button = document.createElement('button');
            button.id = `peptide-type-${typeId}`;
            button.className = 'peptide-type-button';
            button.textContent = typeConfig.name;
            button.dataset.type = typeId;
            
            // Style the button
            button.style.padding = '0.5rem 1rem';
            button.style.border = '1px solid #ccc';
            button.style.borderRadius = '4px';
            button.style.backgroundColor = typeId === CONFIG.activePeptideType ? '#4a90e2' : '#f0f0f0';
            button.style.color = typeId === CONFIG.activePeptideType ? 'white' : '#333';
            button.style.cursor = 'pointer';
            button.style.fontWeight = 'bold';
            button.style.transition = 'all 0.2s ease';
            
            // Add event listener
            button.addEventListener('click', () => handlePeptideTypeChange(typeId));
            
            buttonGroup.appendChild(button);
        });
        
        typeContainer.appendChild(buttonGroup);
        
        // Create responsibility note
        const responsibilityNote = document.createElement('div');
        responsibilityNote.className = 'responsibility-note';
        responsibilityNote.style.margin = '1rem 0';
        responsibilityNote.style.padding = '1rem';
        responsibilityNote.style.backgroundColor = '#fff3cd';
        responsibilityNote.style.border = '1px solid #ffeeba';
        responsibilityNote.style.borderRadius = '4px';
        responsibilityNote.style.color = '#856404';
        responsibilityNote.innerHTML = '<strong>Important:</strong> You are responsible for verifying all calculations. This tool provides suggestions only and does not guarantee accuracy.';
        
        // Insert after the title
        const motivationNote = document.querySelector('.motivation-note');
        motivationNote.parentNode.insertBefore(responsibilityNote, motivationNote.nextSibling);
        motivationNote.parentNode.insertBefore(typeContainer, responsibilityNote.nextSibling);
    }
    
    // Function to handle peptide type changes
    function handlePeptideTypeChange(newType) {
        // Update active type
        CONFIG.activePeptideType = newType;
        
        // Update button styles
        document.querySelectorAll('.peptide-type-button').forEach(button => {
            const isActive = button.dataset.type === newType;
            button.style.backgroundColor = isActive ? '#4a90e2' : '#f0f0f0';
            button.style.color = isActive ? 'white' : '#333';
        });
        
        // Update dropdowns with new values
        updateDropdownValues();
        
        // Save the selection
        localStorage.setItem(CONFIG.storageKeys.peptideType, newType);
        
        // Recalculate results
        calculateResults();
    }
    
    // Function to update dropdown values based on active peptide type
    function updateDropdownValues() {
        const typeConfig = CONFIG.peptideTypes[CONFIG.activePeptideType];
        
        // Update vial quantity dropdown
        const vialConfig = CONFIG.dropdowns.vialQuantity;
        populateDropdown(vialConfig.selectId, vialConfig.customInputId, typeConfig.vialQuantities, typeConfig.defaultVialQuantity, vialConfig.suffix, vialConfig.customLabel);
        
        // Update dose dropdown
        const doseConfig = CONFIG.dropdowns.dose;
        populateDropdown(doseConfig.selectId, doseConfig.customInputId, typeConfig.doseValues, typeConfig.defaultDose, doseConfig.suffix, doseConfig.customLabel);
        
        // Update units dropdown
        const unitsConfig = CONFIG.dropdowns.units;
        populateDropdown(unitsConfig.selectId, unitsConfig.customInputId, unitsConfig.values, unitsConfig.defaultValue, unitsConfig.suffix, unitsConfig.customLabel);
    }
    
    // Generic function to populate a dropdown
    function populateDropdown(selectId, customInputId, values, defaultValue, suffix, customLabel) {
        const selectElement = document.getElementById(selectId);
        const customInput = document.getElementById(customInputId);
        
        if (!selectElement || !customInput) {
            console.error(`Failed to find elements for dropdown: ${selectId}`);
            return;
        }
        
        // Get current value if it exists
        const currentValue = selectElement.value;
        let shouldSelectCustom = currentValue === 'custom';
        
        // Save custom input value if needed
        const customValue = shouldSelectCustom ? customInput.value : null;
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add new options
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value.toString();
            option.textContent = value + (suffix ? ` ${suffix}` : '');
            
            // Check if this should be selected
            if (!shouldSelectCustom && currentValue === value.toString()) {
                option.selected = true;
            } else if (!currentValue && value === defaultValue) {
                option.selected = true;
            }
            
            selectElement.appendChild(option);
        });
        
        // Add custom option
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = customLabel;
        if (shouldSelectCustom) {
            customOption.selected = true;
        }
        selectElement.appendChild(customOption);
        
        // Restore custom input if needed
        if (shouldSelectCustom) {
            customInput.style.display = 'block';
            customInput.value = customValue;
        } else {
            customInput.style.display = 'none';
            customInput.value = '';
        }
    }
    
    // Initialize dropdowns and inputs
    function initializeDropdown(config) {
        // Get DOM elements
        const selectElement = document.getElementById(config.selectId);
        const customInput = document.getElementById(config.customInputId);
        
        if (!selectElement || !customInput) {
            console.error(`Failed to initialize dropdown: ${config.selectId} - Elements not found in DOM`);
            return null;
        }
        
        // Store references
        elements.selects[config.selectId] = selectElement;
        elements.customInputs[config.customInputId] = customInput;
        
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

    // Set default date to today
    function setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        elements.labelElements.dateInput.value = `${year}-${month}-${day}`;
    }

    // Verify all required DOM elements exist
    function verifyDOMElements() {
        const requiredElements = {
            outputs: ['bacWater', 'dosesPerVial', 'concentration', 'warningMessage'],
            labelElements: ['labelInput', 'dateInput', 'urlInput', 'shortenedUrlDisplay', 
                          'qrLabelContainer', 'datamatrixLabelContainer', 
                          'unreconQrLabelContainer', 'unreconDatamatrixLabelContainer']
        };

        // Check outputs
        for (const elementId of requiredElements.outputs) {
            if (!elements.outputs[elementId]) {
                console.error(`Required output element not found: ${elementId}`);
                return false;
            }
        }

        // Check label elements
        for (const elementId of requiredElements.labelElements) {
            if (!elements.labelElements[elementId]) {
                console.error(`Required label element not found: ${elementId}`);
                return false;
            }
        }

        return true;
    }

    // Initialize the application
    function initializeApp() {
        // Verify all required DOM elements exist
        if (!verifyDOMElements()) {
            console.error('Required DOM elements are missing. Please check the console for details.');
            return;
        }

        // Create peptide type selector
        createPeptideTypeSelector();
        
        // Initialize dropdowns
        dropdowns = {};
        let allDropdownsInitialized = true;
        
        // Initialize each dropdown
        Object.entries(CONFIG.dropdowns).forEach(([key, config]) => {
            const result = initializeDropdown(config);
            if (result && result.selectElement && result.customInput) {
                dropdowns[key] = result;
            } else {
                allDropdownsInitialized = false;
                console.error(`Failed to initialize dropdown: ${key}`);
            }
        });
        
        // Only proceed if all dropdowns were initialized successfully
        if (!allDropdownsInitialized) {
            console.error('Failed to initialize all dropdowns. Please refresh the page.');
            return;
        }
        
        // Update dropdown values based on active peptide type
        updateDropdownValues();
        
        // Verify dropdowns have options after populating them
        Object.entries(dropdowns).forEach(([key, dropdown]) => {
            if (!dropdown.selectElement.options || dropdown.selectElement.options.length === 0) {
                console.error(`Dropdown ${key} has no options after population`);
                allDropdownsInitialized = false;
            }
        });
        
        if (!allDropdownsInitialized) {
            console.error('Failed to populate dropdowns. Please refresh the page.');
            return;
        }
        
        // Set default date to today
        setDefaultDate();
        
        // Create Use Short URL button
        createUseShortUrlButton();
        
        // Mark as initialized before loading settings
        isInitialized = true;
        
        // Load saved settings - moved after all initialization
        loadSettings();
        
        // Make initial calculation - moved after settings are loaded
        calculateResults();
    }
    
    // Function to load saved settings from localStorage
    function loadSettings() {
        try {
            // Check initialization state
            if (!isInitialized) {
                console.error('Application not fully initialized yet');
                return;
            }

            // Load peptide type
            const savedPeptideType = localStorage.getItem(CONFIG.storageKeys.peptideType);
            if (savedPeptideType && CONFIG.peptideTypes[savedPeptideType]) {
                CONFIG.activePeptideType = savedPeptideType;
                // Update button styles for the saved type
                document.querySelectorAll('.peptide-type-button').forEach(button => {
                    const isActive = button.dataset.type === savedPeptideType;
                    button.style.backgroundColor = isActive ? '#4a90e2' : '#f0f0f0';
                    button.style.color = isActive ? 'white' : '#333';
                });
            }
            
            // Ensure dropdowns are initialized before proceeding
            if (!dropdowns || !dropdowns.vialQuantity || !dropdowns.dose || !dropdowns.units) {
                console.error('Dropdowns not initialized yet, skipping loading dropdown values');
                return;
            }

            // Verify each dropdown is properly initialized
            const requiredDropdowns = ['vialQuantity', 'dose', 'units'];
            for (const key of requiredDropdowns) {
                if (!dropdowns[key] || !dropdowns[key].selectElement || !dropdowns[key].customInput) {
                    console.error(`Dropdown ${key} is not properly initialized`);
                    return;
                }
            }
            
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

    function calculateResults() {
        // Check initialization state
        if (!isInitialized) {
            console.error('Application not fully initialized yet');
            return;
        }

        // Ensure dropdowns are initialized before proceeding
        if (!dropdowns || !dropdowns.vialQuantity || !dropdowns.dose || !dropdowns.units) {
            console.error('Dropdowns not initialized yet, cannot calculate results');
            return;
        }

        // Verify each dropdown is properly initialized
        const requiredDropdowns = ['vialQuantity', 'dose', 'units'];
        for (const key of requiredDropdowns) {
            if (!dropdowns[key] || !dropdowns[key].selectElement || !dropdowns[key].customInput) {
                console.error(`Dropdown ${key} is not properly initialized`);
                return;
            }
        }
        
        // Get active peptide type configuration
        const typeConfig = CONFIG.peptideTypes[CONFIG.activePeptideType];
        
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
        elements.outputs.bacWater.textContent = `${bacWater.toFixed(1)} ml`;
        elements.outputs.dosesPerVial.textContent = `${dosesPerVial.toFixed(1)} doses`;

        const concentration = vialQuantity / bacWater;

        // No automatic adjustment of units; we simply report high concentration
        elements.outputs.concentration.textContent = `${concentration.toFixed(1)}mg/ml`;

        // Use peptide-specific threshold
        const resultItems = document.querySelectorAll('.result-item');
        if (typeConfig.thresholdConcentration <= 0) {
            resultItems.forEach(item => item.classList.remove('alert'));
            elements.outputs.warningMessage.style.display = 'block';
            elements.outputs.warningMessage.textContent = `Note: No concentration checks are performed for ${typeConfig.name}. Please verify your calculations.`;
        } else if (concentration > typeConfig.thresholdConcentration) {
            resultItems.forEach(item => item.classList.add('alert'));
            elements.outputs.warningMessage.style.display = 'block';
            elements.outputs.warningMessage.textContent = `Warning: Calculated concentration exceeds the recommended maximum of ${typeConfig.thresholdConcentration} mg/ml for ${typeConfig.name}.`;
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
        let fullFormattedDate = '';
        
        if (dateInput) {
            // The date input value is in YYYY-MM-DD format, parse it manually to avoid timezone issues
            const [year, month, day] = dateInput.split('-');
            const twoDigitYear = year.slice(-2);
            // Use padStart to ensure 2 digits for month and day
            const paddedMonth = month.padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            formattedDate = `${paddedMonth}${paddedDay}${twoDigitYear}`;
            
            // Create full date format for un-reconstituted vials
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            fullFormattedDate = `${monthNames[parseInt(month) - 1]} ${parseInt(paddedDay)}, ${year}`;
        } else {
            // If no date is selected, use today's date
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const year = String(today.getFullYear()).slice(-2);
            const fullYear = today.getFullYear();
            formattedDate = `${month}${day}${year}`;
            
            // Create full date format for un-reconstituted vials
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            fullFormattedDate = `${monthNames[today.getMonth()]} ${today.getDate()}, ${fullYear}`;
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
        
        const vialQuantity = getValueFromSelectOrCustom(
            dropdowns.vialQuantity.selectElement, 
            dropdowns.vialQuantity.customInput
        );

        // Generate Reconstituted Vial Labels (QR and DataMatrix)
        generateReconstitutedLabels(url, label, concentration, formattedDate, dose, units);
        
        // Generate Un-reconstituted Vial Labels (QR and DataMatrix)
        generateUnreconstitutedLabels(url, label, fullFormattedDate, vialQuantity);
        
        // Add code type explanations
        addCodeTypeExplanations();
    }
    
    // Function to generate reconstituted vial labels
    function generateReconstitutedLabels(url, label, concentration, formattedDate, dose, units) {
        // Generate QR code label
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
        const qrCodeImg = new Image();
        qrCodeImg.crossOrigin = "Anonymous";
        qrCodeImg.onload = function() {
            createLabelImage(
                qrCodeImg, 
                elements.labelElements.qrLabelContainer, 
                label, 
                concentration.toFixed(1) + " mg/ml", 
                formattedDate ? '|' + formattedDate : '', 
                `${units}units = ${dose}mg`, 
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
                    concentration.toFixed(1) + " mg/ml", 
                    formattedDate ? '|' + formattedDate : '', 
                    `${units}units = ${dose}mg`, 
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
    
    // Function to generate un-reconstituted vial labels
    function generateUnreconstitutedLabels(url, label, fullFormattedDate, vialQuantity) {
        // Generate QR code label
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
        const qrCodeImg = new Image();
        qrCodeImg.crossOrigin = "Anonymous";
        qrCodeImg.onload = function() {
            createLabelImage(
                qrCodeImg, 
                elements.labelElements.unreconQrLabelContainer, 
                label, 
                fullFormattedDate, 
                '', 
                `Total: ${vialQuantity}mg`, 
                'unrecon-QR'
            );
        };
        qrCodeImg.onerror = function() {
            elements.labelElements.unreconQrLabelContainer.innerHTML = 
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
                    elements.labelElements.unreconDatamatrixLabelContainer, 
                    label, 
                    fullFormattedDate, 
                    '', 
                    `Total: ${vialQuantity}mg`, 
                    'unrecon-DataMatrix'
                );
            };
            dataMatrixImg.src = canvas.toDataURL('image/png');
        } catch (e) {
            console.error("Error generating Data Matrix code:", e);
            elements.labelElements.unreconDatamatrixLabelContainer.innerHTML = 
                `<div class="error-message">Could not generate Data Matrix code</div>`;
        }
    }
    
    // Function to create a label image with barcode and text
    function createLabelImage(barcodeImg, container, line1, line2, line2Suffix, line3, codeType) {
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
        const text1 = line1;
        const text2 = line2 + line2Suffix;
        const text3 = line3;
        
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
        
        // Create container for image (without description)
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        // Add image to the container
        imageContainer.appendChild(labelImg);
        
        // Add to main container
        container.appendChild(imageContainer);
    }
    
    // Function to add code type explanations after all labels
    function addCodeTypeExplanations() {
        // Check if notes already exist
        if (document.getElementById('code-type-notes')) {
            return;
        }
        
        // Create notes container
        const notesContainer = document.createElement('div');
        notesContainer.id = 'code-type-notes';
        notesContainer.className = 'code-type-notes';
        notesContainer.style.margin = '2rem 0';
        notesContainer.style.padding = '1rem';
        notesContainer.style.backgroundColor = '#f9f9f9';
        notesContainer.style.borderRadius = '8px';
        
        // Create heading
        const heading = document.createElement('h4');
        heading.textContent = 'About Code Types';
        heading.style.marginTop = '0';
        notesContainer.appendChild(heading);
        
        // Create QR code description
        const qrDescription = document.createElement('p');
        qrDescription.innerHTML = '<strong>QR Codes:</strong> Universally compatible with all smartphone cameras. Both iPhone and Android can scan directly without special apps.';
        notesContainer.appendChild(qrDescription);
        
        // Create Data Matrix description
        const dataMatrixDescription = document.createElement('p');
        dataMatrixDescription.innerHTML = '<strong>Data Matrix Codes:</strong> More compact, can be printed smaller. Requires specialized apps on iPhone, some Android phones support natively.';
        notesContainer.appendChild(dataMatrixDescription);
        
        // Add the notes after the labels container
        const labelsContainer = document.getElementById('labels-container');
        labelsContainer.parentNode.insertBefore(notesContainer, labelsContainer.nextSibling);
    }

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
            // Save peptide type
            localStorage.setItem(CONFIG.storageKeys.peptideType, CONFIG.activePeptideType);
            
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
    
    // Start the application initialization
    initializeApp();
});
