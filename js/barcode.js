/**
 * BuyCan Website - Barcode Lookup Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // ======================================================
  // ELEMENT SELECTION FOR BARCODE FUNCTIONALITY
  // ======================================================
  const barcodeForm = document.getElementById('barcode-form');
  const loadingIndicator = document.getElementById('loading');
  const resultContainer = document.getElementById('result-container');
  const errorMessage = document.getElementById('error-message');
  const exampleBarcodes = document.querySelectorAll('.example-barcode');

  // Hard-coded auth token & log type
  const AUTH_TOKEN = 'PEEPEEPOOPOODOODOOKAKA';
  const LOG_TYPE = 'view';

  // ======================================================
  // EVENT LISTENERS FOR BARCODE FUNCTIONALITY
  // ======================================================

  // Handle form submission
  if (barcodeForm) {
    barcodeForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const barcodeInput = document.getElementById('barcode').value.trim();
      if (!barcodeInput) return;

      showLoading(true);
      clearUI();
      fetchBarcodeData(barcodeInput);
    });
  }

  // Handle example barcode clicks
  if (exampleBarcodes.length > 0) {
    exampleBarcodes.forEach(function(example) {
      example.addEventListener('click', function() {
        const barcode = this.getAttribute('data-barcode');
        document.getElementById('barcode').value = barcode;

        showLoading(true);
        clearUI();
        fetchBarcodeData(barcode);
      });
    });
  }

  // ======================================================
  // CORE FUNCTIONS FOR BARCODE LOOKUP
  // ======================================================

  async function fetchBarcodeData(barcode) {
    try {
      // Correct API endpoint for barcode lookup
      const url = `https://buycanadian.onrender.com/get-by-barcode/${barcode}?log_type=${LOG_TYPE}`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        if (response.status === 401) {
          throw new Error('Authentication required');
        } else if (response.status === 403) {
          throw new Error('Invalid authentication token');
        }
        throw new Error(`Network response was not ok: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // Log the entire response and the image URL specifically for debugging
      console.log("API Data Received:", data);
      console.log("Image URL:", data?.metadata?.imageURL);

      showLoading(false);

      if (!data?.metadata?.exists) {
        displayError('Product Not Found');
        return;
      }

      displayProductData(data);

    } catch (err) {
      console.error("Fetch Error:", err);
      showLoading(false);
      displayError('Network Error');

      // Only for demo barcodes, use hard-coded data
      if (barcode === "5449000133328" || barcode === "0066676375996") {
        console.log("Using demo data for barcode:", barcode);
        useDemoData(barcode);
      }
    }
  }

  function useDemoData(barcode) {
    let demoData;

    if (barcode === "5449000133328") {
      // Coca Cola
      demoData = {
        barcode: "5449000133328",
        name: "Coca-Cola Classic",
        brand: "Coca-Cola",
        tags: ["Beverage", "Soda", "Non-Alcoholic"],
        alternativeBrands: [
          {
            brand: "Canada Dry",
            description: "Canadian ginger ale brand founded in 1904"
          },
          {
            brand: "Clearly Canadian",
            description: "Canadian sparkling water beverage"
          }
        ],
        parentCompany: {
          name: "The Coca-Cola Company",
          description: "Multinational beverage corporation",
          countryOfRegistration: "United States",
          resultConfidence: "High",
          sources: [
            {
              name: "Coca-Cola Company Website",
              url: "https://www.coca-colacompany.com/"
            }
          ]
        },
        manufacturingInfo: {
          label: "Made in United States",
          labelExplanation: "While Coca-Cola has bottling facilities in Canada, the concentrate is produced in the US",
          percentageCanadian: 30,
          resultConfidence: "Medium",
          sources: [
            {
              name: "Coca-Cola Canada",
              url: "https://www.coca-cola.ca/"
            }
          ]
        },
        metadata: {
          exists: true,
          imageURL: "https://www.coca-cola.com/content/dam/journey/us/en/private/sprite-2016/Coca-Cola-Classic.jpg"
        }
      };
    } else if (barcode === "0066676375996") {
      // Maple Syrup
      demoData = {
        barcode: "0066676375996",
        name: "Pure Maple Syrup",
        brand: "Canadian Finest",
        tags: ["Grocery", "Sweetener", "Natural", "Canadian-Made"],
        alternativeBrands: [
          {
            brand: "Quebec Gold",
            description: "Authentic Quebec maple syrup"
          },
          {
            brand: "Northern Harvest",
            description: "Sustainably harvested Canadian maple syrup"
          }
        ],
        parentCompany: {
          name: "Canadian Maple Products Inc.",
          description: "Canadian-owned producer of maple products",
          countryOfRegistration: "Canada",
          resultConfidence: "High",
          sources: [
            {
              name: "Canadian Maple Products Website",
              url: "https://example.com/canadian-maple/"
            }
          ]
        },
        manufacturingInfo: {
          label: "Made in Canada",
          labelExplanation: "Harvested and produced in Quebec maple forests",
          percentageCanadian: 100,
          resultConfidence: "High",
          sources: [
            {
              name: "Maple Industry Association",
              url: "https://example.com/maple-association/"
            }
          ]
        },
        metadata: {
          exists: true,
          imageURL: "https://upload.wikimedia.org/wikipedia/commons/1/18/Sugarhouse-bottles.jpg"
        }
      };
    }

    if (demoData) {
      displayProductData(demoData);
    }
  }

  function displayProductData(data) {
    if (!resultContainer) return;

    resultContainer.innerHTML = generateProductHTML(data);
    resultContainer.style.display = 'block';
    setupToggleListeners();
  }

  // ======================================================
  // UTILITY FUNCTIONS
  // ======================================================
  function showLoading(isLoading) {
    if (loadingIndicator) {
      loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
  }

  function clearUI() {
    if (resultContainer) {
      resultContainer.innerHTML = '';
      resultContainer.style.display = 'none';
    }
    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.style.display = 'none';
    }
  }

  function displayError(msg) {
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    }
  }

  /**
   * Build HTML from the API data structure
   */
  function generateProductHTML(data) {
    const {
      barcode,
      name,
      brand,
      tags,
      alternativeBrands,
      parentCompany,
      manufacturingInfo,
      metadata
    } = data;

    // Basic info
    const madeIn = manufacturingInfo?.label || 'Unknown origin';
    const explanation = manufacturingInfo?.labelExplanation || '';
    const percent = manufacturingInfo?.percentageCanadian ?? 0;
    const confidence = manufacturingInfo?.resultConfidence ?? 'Low';

    // Lists of sources
    const manufacturingSources = manufacturingInfo?.sources || [];
    const parentSources = parentCompany?.sources || [];

    // Simply use the image URL directly - no modifications
    const imageUrl = metadata?.imageURL || '';
    console.log("Using image URL:", imageUrl);

    // Create image HTML with referrerpolicy attribute
    const imageHtml = imageUrl
      ? `<div class="product-image-frame">
           <img src="${imageUrl}" alt="${name || 'Product'}" referrerpolicy="no-referrer">
         </div>`
      : '';

    return `
      <div class="product-data">
          <!-- PRODUCT HEADER -->
          <div class="product-header">
            <!-- 1. Name at the top -->
            <h3 class="product-name">${name || 'Untitled Product'}</h3>

            <!-- 2. Brand & Barcode below name, stacked -->
            <div class="product-details">
              <div class="product-brand">${brand || ''}</div>
              <div class="barcode-display">Barcode: ${barcode}</div>
            </div>

            <!-- 3. Product image below brand and barcode -->
            ${imageHtml}
          </div>

        <!-- MANUFACTURING INFO -->
        <div class="manufacturing-info">
          <h4>${madeIn}</h4>
          <p><strong>Confidence:</strong> ${confidence}</p>
          <div class="percentage-bar-container">
            <div class="percentage-bar" style="width:${percent}%">
              <span class="percentage-label">${percent}% Canadian</span>
            </div>
          </div>
          <p class="explanation">${explanation}</p>

          ${
            manufacturingSources.length
              ? `
                <button class="toggle-btn sources-toggle">View Sources</button>
                <div class="sources-list" style="display:none;">
                  ${manufacturingSources.map(s => `
                    <div class="source-item">
                      <a href="${s.url}" target="_blank">${s.name}</a>
                    </div>
                  `).join('')}
                </div>
              `
              : ''
          }
        </div>

        <!-- PARENT COMPANY -->
        <div class="parent-company">
          <h4>Parent Company: ${parentCompany?.name || 'Unknown'}</h4>
          <p>${parentCompany?.description || ''}</p>
          <p>
            <strong>Based in:</strong> ${parentCompany?.countryOfRegistration || 'N/A'}
            (Confidence: ${parentCompany?.resultConfidence || 'N/A'})
          </p>

          ${
            parentSources.length
              ? `
                <button class="toggle-btn parent-sources-toggle">View Sources</button>
                <div class="parent-sources-list" style="display:none;">
                  ${parentSources.map(src => `
                    <div class="source-item">
                      <a href="${src.url}" target="_blank">${src.name}</a>
                    </div>
                  `).join('')}
                </div>
              `
              : ''
          }
        </div>

        <!-- PRODUCT TAGS -->
        <div class="product-tags">
          <h4>Tags:</h4>
          ${
            tags?.length
              ? tags.map(t => `<span class="tag">${t}</span>`).join('')
              : '<p>No tags available.</p>'
          }
        </div>

        <!-- ALTERNATIVE BRANDS -->
        <div class="alternative-brands">
          <h4>Alternative Canadian Brands</h4>
          ${
            alternativeBrands?.length
              ? alternativeBrands.map(alt => `
                <div class="alt-item">
                  <h5>${alt.brand}</h5>
                  <p>${alt.description || ''}</p>
                </div>
              `).join('')
              : '<p>No alternatives found.</p>'
          }
        </div>
      </div>
    `;
  }

  function setupToggleListeners() {
    // For manufacturing info
    const sourcesToggle = document.querySelector('.sources-toggle');
    const sourcesList = document.querySelector('.sources-list');
    if (sourcesToggle && sourcesList) {
      sourcesToggle.addEventListener('click', () => {
        if (sourcesList.style.display === 'none') {
          sourcesList.style.display = 'block';
          sourcesToggle.textContent = 'Hide Sources';
        } else {
          sourcesList.style.display = 'none';
          sourcesToggle.textContent = 'View Sources';
        }
      });
    }

    // For parent company
    const parentSourcesToggle = document.querySelector('.parent-sources-toggle');
    const parentSourcesList = document.querySelector('.parent-sources-list');
    if (parentSourcesToggle && parentSourcesList) {
      parentSourcesToggle.addEventListener('click', () => {
        if (parentSourcesList.style.display === 'none') {
          parentSourcesList.style.display = 'block';
          parentSourcesToggle.textContent = 'Hide Sources';
        } else {
          parentSourcesList.style.display = 'none';
          parentSourcesToggle.textContent = 'View Sources';
        }
      });
    }
  }
});