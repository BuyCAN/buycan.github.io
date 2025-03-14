//barcode.js
/**
 * BuyCan Barcode Lookup Tool
 * JavaScript for handling barcode lookups and displaying product information
 *
 * This file contains functionality specific to the barcode lookup page:
 * - Form submission handling
 * - Barcode example click handling
 * - API response simulation
 * - Product information display
 */

document.addEventListener('DOMContentLoaded', function() {
    // ======================================================
    // ELEMENT SELECTION
    // ======================================================
    // Get reference to UI elements
    const barcodeForm = document.getElementById('barcode-form');
    const loadingIndicator = document.getElementById('loading');
    const resultContainer = document.getElementById('result-container');
    const errorMessage = document.getElementById('error-message');
    const exampleBarcodes = document.querySelectorAll('.example-barcode');

    // ======================================================
    // EVENT LISTENERS
    // ======================================================

    /**
     * Form submission handler
     * Processes barcode lookup when the form is submitted
     */
    barcodeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const barcodeInput = document.getElementById('barcode').value.trim();

        if (barcodeInput) {
            // Show loading indicator and hide other UI elements
            loadingIndicator.style.display = 'block';
            resultContainer.style.display = 'none';
            errorMessage.style.display = 'none';

            // Simulate API call with setTimeout (1.5 second delay)
            setTimeout(function() {
                lookupBarcode(barcodeInput);
            }, 1500);
        }
    });

    /**
     * Example barcode click handler
     * Allows users to select from predefined example barcodes
     */
    exampleBarcodes.forEach(function(example) {
        example.addEventListener('click', function() {
            // Get barcode from data attribute
            const barcode = this.getAttribute('data-barcode');

            // Set the barcode in the input field
            document.getElementById('barcode').value = barcode;

            // Show loading indicator and hide other UI elements
            loadingIndicator.style.display = 'block';
            resultContainer.style.display = 'none';
            errorMessage.style.display = 'none';

            // Simulate API call with setTimeout (1.5 second delay)
            setTimeout(function() {
                lookupBarcode(barcode);
            }, 1500);
        });
    });

    // ======================================================
    // CORE FUNCTIONS
    // ======================================================

    /**
     * Barcode lookup function
     * Handles the lookup request and displays the result
     *
     * @param {string} barcode - The barcode number to look up
     */
    function lookupBarcode(barcode) {
        // Sample data for demonstration
        // In a production environment, this would be replaced with an API call
        const sampleData = {
            '0064200116695': {
                name: 'Catelli Pasta - Spaghettini',
                brand: 'Catelli',
                manufacturingCountry: 'Canada',
                canadianPercent: 92,
                confidence: 'high',
                parentCompany: 'Barilla Group',
                parentCompanyCountry: 'Italy',
                tags: ['Food', 'Pasta', 'Dry Goods'],
                alternatives: [
                    { name: 'Primo Pasta', parentCompany: 'Primo Foods (Canadian Owned)' },
                    { name: 'Italpasta', parentCompany: 'Italpasta Limited (Canadian Owned)' }
                ],
                sources: [
                    'https://www.catelli.ca/en/about-us/',
                    'https://www.barilla.com/en-us/brands'
                ]
            },
            '0620213063019': {
                name: 'Pure Maple Syrup - Medium Grade',
                brand: 'Canadian Heritage',
                manufacturingCountry: 'Canada',
                canadianPercent: 100,
                confidence: 'high',
                parentCompany: 'Maple Lodge Farms',
                parentCompanyCountry: 'Canada',
                tags: ['Food', 'Sweetener', 'Breakfast'],
                alternatives: [
                    { name: 'President\'s Choice Maple Syrup', parentCompany: 'Loblaw Companies (Canadian Owned)' },
                    { name: 'Kirkland Signature Maple Syrup', parentCompany: 'Costco (American Owned)' }
                ],
                sources: [
                    'https://maplefarms.ca/about-us/',
                    'https://www.maplesyrupworld.com/producers'
                ]
            },
            '0628915540036': {
                name: 'Country Harvest Bread - Whole Grain',
                brand: 'Country Harvest',
                manufacturingCountry: 'Canada',
                canadianPercent: 85,
                confidence: 'medium',
                parentCompany: 'Grupo Bimbo',
                parentCompanyCountry: 'Mexico',
                tags: ['Food', 'Bread', 'Bakery'],
                alternatives: [
                    { name: 'Silver Hills Bread', parentCompany: 'Silver Hills Bakery (Canadian Owned)' },
                    { name: 'Rudolph\'s Bread', parentCompany: 'Rudolph\'s Bakeries (Canadian Owned)' }
                ],
                sources: [
                    'https://www.grupobimbo.com/en/brands',
                    'https://www.country-harvest.ca/about-us'
                ]
            }
        };

        // Hide loading indicator
        loadingIndicator.style.display = 'none';

        // Check if we have data for this barcode
        if (sampleData[barcode]) {
            const product = sampleData[barcode];

            // Display the product information
            resultContainer.innerHTML = generateProductHTML(barcode, product);
            resultContainer.style.display = 'block';

            // Set up interactive elements in the results
            setupToggleListeners();
        } else {
            // Show error message for unknown barcodes
            errorMessage.textContent = 'No information found for this barcode. Please try another one.';
            errorMessage.style.display = 'block';
        }
    }

    /**
     * Generate HTML for product display
     * Creates the HTML structure for displaying product information
     *
     * @param {string} barcode - The barcode number
     * @param {Object} product - The product data object
     * @returns {string} HTML string representing the product information
     */
    function generateProductHTML(barcode, product) {
        // Determine confidence class based on product confidence level
        let confidenceClass = '';
        if (product.confidence === 'high') {
            confidenceClass = 'confidence-high';
        } else if (product.confidence === 'medium') {
            confidenceClass = 'confidence-medium';
        } else {
            confidenceClass = 'confidence-low';
        }

        // Build and return HTML for the product information display
        return `
            <!-- Product Header Section -->
            <div class="product-header">
                <div class="product-title">
                    <h3>${product.name}</h3>
                    <div class="product-brand">${product.brand}</div>
                    <div class="barcode-display">Barcode: ${barcode}</div>
                </div>
            </div>

            <!-- Manufacturing Information Section -->
            <div class="manufacturing-info">
                <div class="manufacturing-header">
                    <div class="manufacturing-label">Made in ${product.manufacturingCountry}</div>
                    <div class="confidence-indicator">
                        Data Confidence:
                        <span class="confidence-badge ${confidenceClass}">${product.confidence.toUpperCase()}</span>
                    </div>
                </div>

                <div>Canadian-made content:</div>
                <div class="percentage-bar-container">
                    <div class="percentage-bar" style="width: ${product.canadianPercent}%">
                        <span class="percentage-label">${product.canadianPercent}%</span>
                    </div>
                </div>
            </div>

            <!-- Parent Company Information -->
            <div class="parent-company">
                <div class="parent-company-header">
                    <h4>Parent Company: ${product.parentCompany}</h4>
                    <span class="country-badge">Based in ${product.parentCompanyCountry}</span>
                </div>
            </div>

            <!-- Product Categories/Tags -->
            <div class="tags-container">
                <div>Categories:</div>
                ${product.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>

            <!-- Canadian Alternatives Section -->
            <div class="alternatives-section">
                <div class="alternatives-header">
                    <h4>Canadian-owned Alternatives</h4>
                </div>
                <div class="alternatives-grid">
                    ${product.alternatives.map(alt => `
                        <div class="alternative-item">
                            <h5 class="alternative-title">${alt.name}</h5>
                            <div class="alternative-parent">${alt.parentCompany}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Data Sources Section (Collapsible) -->
            <div class="sources-section">
                <button class="sources-toggle">View Data Sources</button>
                <div class="sources-list">
                    ${product.sources.map(source => `
                        <div class="source-item">
                            <a href="${source}" target="_blank" rel="noopener noreferrer">${source}</a>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Raw Data Section (Collapsible) -->
            <div>
                <span class="raw-json-toggle">View Raw Data</span>
                <div class="raw-json-section">
                    <pre class="json-result">${JSON.stringify(product, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    /**
     * Set up toggle listeners for collapsible sections
     * Adds event listeners to toggle buttons to show/hide content
     */
    function setupToggleListeners() {
        // Sources toggle functionality
        const sourcesToggle = document.querySelector('.sources-toggle');
        const sourcesList = document.querySelector('.sources-list');

        if (sourcesToggle) {
            sourcesToggle.addEventListener('click', function() {
                if (sourcesList.style.display === 'block') {
                    // Hide sources list
                    sourcesList.style.display = 'none';
                    sourcesToggle.textContent = 'View Data Sources';
                } else {
                    // Show sources list
                    sourcesList.style.display = 'block';
                    sourcesToggle.textContent = 'Hide Data Sources';
                }
            });
        }

        // Raw JSON toggle functionality
        const rawJsonToggle = document.querySelector('.raw-json-toggle');
        const rawJsonSection = document.querySelector('.raw-json-section');

        if (rawJsonToggle) {
            rawJsonToggle.addEventListener('click', function() {
                if (rawJsonSection.style.display === 'block') {
                    // Hide raw JSON data
                    rawJsonSection.style.display = 'none';
                    rawJsonToggle.textContent = 'View Raw Data';
                } else {
                    // Show raw JSON data
                    rawJsonSection.style.display = 'block';
                    rawJsonToggle.textContent = 'Hide Raw Data';
                }
            });
        }
    }
});