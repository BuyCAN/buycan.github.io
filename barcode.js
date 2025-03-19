document.addEventListener('DOMContentLoaded', function() {
  // ======================================================
  // ELEMENT SELECTION
  // ======================================================
  const barcodeForm      = document.getElementById('barcode-form');
  const loadingIndicator = document.getElementById('loading');
  const resultContainer  = document.getElementById('result-container');
  const errorMessage     = document.getElementById('error-message');
  const exampleBarcodes  = document.querySelectorAll('.example-barcode');

  // Hard-coded auth token & log type
  const AUTH_TOKEN = 'PEEPEEPOOPOODOODOOKAKA';
  const LOG_TYPE   = 'view';

  // ======================================================
  // EVENT LISTENERS
  // ======================================================

  // Handle form submission
  barcodeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const barcodeInput = document.getElementById('barcode').value.trim();
    if (!barcodeInput) return;

    showLoading(true);
    clearUI();
    fetchBarcodeData(barcodeInput);
  });

  // Handle example barcode clicks
  exampleBarcodes.forEach(function(example) {
    example.addEventListener('click', function() {
      const barcode = this.getAttribute('data-barcode');
      document.getElementById('barcode').value = barcode;

      showLoading(true);
      clearUI();
      fetchBarcodeData(barcode);
    });
  });

  // ======================================================
  // CORE FUNCTIONS
  // ======================================================

  async function fetchBarcodeData(barcode) {
    try {
      const url = `http://127.0.0.1:5000/get-by-barcode/${barcode}?log_type=${LOG_TYPE}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Accept': 'application/json'
        }
      });
  
      if (!response.ok) {
        const errorText = await response.text();        
        if (response.status === 401) {
          throw new Error('Authentication required');
        } else if (response.status === 403) {
          throw new Error('Invalid authentication token');
        }
        throw new Error(`Network response was not ok: ${response.status} ${errorText}`);
      }
  
      const data = await response.json();
      showLoading(false);
      
      if (!data?.metadata?.exists) {
        displayError('Product Not Found');
        return;
      }

      displayProductData(data);

    } catch (err) {
      showLoading(false);
      displayError('Network Error');
      console.error(err);
    }
  }

  function displayProductData(data) {
    resultContainer.innerHTML = generateProductHTML(data);
    resultContainer.style.display = 'block';
    setupToggleListeners();
  }

  // ======================================================
  // UTILITY FUNCTIONS
  // ======================================================
  function showLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
  }

  function clearUI() {
    resultContainer.innerHTML = '';
    resultContainer.style.display = 'none';
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
  }

  function displayError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
  }

  /**
   * Build HTML from the real API data structure
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
  const madeIn       = manufacturingInfo?.label || 'Unknown origin';
  const explanation  = manufacturingInfo?.labelExplanation || '';
  const percent      = manufacturingInfo?.percentageCanadian ?? 0;
  const confidence   = manufacturingInfo?.resultConfidence ?? 'Low';

  // Lists of sources
  const manufacturingSources = manufacturingInfo?.sources || [];
  const parentSources        = parentCompany?.sources || [];

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
          ${
            metadata?.imageURL
              ? `
                <div class="product-image-frame">
                  <img src="${metadata.imageURL}" alt="Product Image">
                </div>
              `
              : ''
          }
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
    const sourcesList   = document.querySelector('.sources-list');
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
    const parentSourcesList   = document.querySelector('.parent-sources-list');
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

  // ======================================================
  // DROPDOWN NAVIGATION FUNCTIONALITY
  // ======================================================
  const dropdownBtn = document.querySelector('.dropdown-btn');
  const dropdownContent = document.querySelector('.dropdown-content');

  // Add dropdown functionality if elements exist
  if (dropdownBtn && dropdownContent) {
    // For mobile: toggle dropdown manually for better touch experience
    if (window.innerWidth <= 768) {
      // Prevent default hover behavior on mobile
      dropdownBtn.addEventListener('click', function(e) {
        e.preventDefault();

        // Toggle display of dropdown content
        if (dropdownContent.style.display === 'block') {
          dropdownContent.style.display = 'none';
          document.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
        } else {
          dropdownContent.style.display = 'block';
          document.querySelector('.dropdown-arrow').style.transform = 'rotate(180deg)';
        }
      });

      // Close dropdown when clicking elsewhere on the page
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown-nav')) {
          dropdownContent.style.display = 'none';
          document.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
        }
      });
    }

    // Close dropdown when a link is clicked
    const dropdownLinks = document.querySelectorAll('.dropdown-content a');
    dropdownLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
          dropdownContent.style.display = 'none';
          document.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
        }
      });
    });
  }
});