/*
      Key points:
      - We load 30 results at a time (LIMIT=30).
      - Positive/negative ratings are always set exactly to what the user typed.
      - Verified/Sponsored checkboxes each directly map to booleans.
      - The big search button is at the bottom left, and we show a "loading" text each time it's clicked.
      - The product list items display verified, ratings, scans, and % Canadian.
      - Alternative images appear at the top of the form.
    */

const AUTH_TOKEN = "Bearer PEEPEEPOOPOODOODOOKAKA";
const LIMIT = 30;
let offset = 0;
let originalValues = {};
let isAddingNewProduct = false;  // flag to indicate add mode

// DOM references
const productList = document.getElementById('product-list');
const loadMoreBtn = document.getElementById('load-more');
const messageEl = document.getElementById('message');
const searchLoadingEl = document.getElementById('search-loading');

// Search fields
const productInput = document.getElementById('search-product');
const brandInput = document.getElementById('search-brand');
const parentInput = document.getElementById('search-parent');
const verifiedSelect = document.getElementById('search-verified');
const sponsoredSelect = document.getElementById('search-sponsored');
const labelSelect = document.getElementById('search-label');
const labelOtherContainer = document.getElementById('label-other-container');
const labelOtherInput = document.getElementById('search-label-other');
const resultConfidenceSelect = document.getElementById('search-result-confidence');
const countryInput = document.getElementById('search-country');
const sortBySelect = document.getElementById('sort-by');
const sortOrderSelect = document.getElementById('sort-order');
const searchButton = document.getElementById('search-button');
const addProductButton = document.getElementById('add-product-button');

// Form fields
const altImagesContainer = document.getElementById('alt-images-container');
const productBarcode = document.getElementById('product-barcode');
const productName = document.getElementById('product-name');
const productBrand = document.getElementById('product-brand');
const productTags = document.getElementById('product-tags');

const parentCompanyName = document.getElementById('parent-company-name');
const parentCompanyDescription = document.getElementById('parent-company-description');
const parentCompanyCountry = document.getElementById('parent-company-country');
const parentCompanyCode = document.getElementById('parent-company-code');
const parentCompanyConfidence = document.getElementById('parent-company-confidence');
const parentCompanyExplanation = document.getElementById('parent-company-explanation');
const companyTags = document.getElementById('company-tags');

const percentageCanadian = document.getElementById('percentage-canadian');
const labelField = document.getElementById('label');
const labelDescription = document.getElementById('label-description');
const manufacturingConfidence = document.getElementById('manufacturing-confidence');
const labelExplanation = document.getElementById('label-explanation');

const imageURL = document.getElementById('image-url');
const verifiedCheckbox = document.getElementById('verified');
const sponsoredCheckbox = document.getElementById('sponsored');
const positiveRatings = document.getElementById('positive-ratings');
const negativeRatings = document.getElementById('negative-ratings');

const numScans = document.getElementById('num-scans');
const productExists = document.getElementById('product-exists');
const dateGenerated = document.getElementById('date-generated');
const costToGenerate = document.getElementById('cost-to-generate');
const timeToGenerate = document.getElementById('time-to-generate');
const feedback = document.getElementById('feedback');

// Toggle custom label input visibility
labelSelect.addEventListener('change', () => {
    if (labelSelect.value === 'other') {
        labelOtherContainer.style.display = 'block';
    } else {
        labelOtherContainer.style.display = 'none';
        labelOtherInput.value = '';
    }
});

// MAIN: fetch product previews
function fetchProducts(append = false) {
    // Show "Loading..." text
    searchLoadingEl.textContent = "Loading results...";

    // Apply all filters -------------------------------------------
    const filters = {};

    if (brandInput.value.trim()) {
        filters.brand = brandInput.value.trim();
    }
    if (parentInput.value.trim()) {
        filters.parent_company_name = parentInput.value.trim();
    }
    if (verifiedSelect.checked) {
        filters.verified = true;
    }
    if (sponsoredSelect.checked) {
        filters.sponsored = true;
    }

    let selectedLabel = labelSelect.value;
    if (selectedLabel === 'other' && labelOtherInput.value.trim()) {
        selectedLabel = labelOtherInput.value.trim();
    }
    if (selectedLabel) {
        filters.label = selectedLabel;
    }

    if (resultConfidenceSelect.value) {
        filters.result_confidence = resultConfidenceSelect.value;
    }
    if (countryInput.value.trim()) {
        filters.country_of_registration = countryInput.value.trim();
    }

    // Create request body -------------------------------------------
    const body = {
        preview_type: "web",
        query: productInput.value.trim(),
        filters: filters,
        limit: LIMIT,
        offset: offset,
        sort_by: sortBySelect.value || null,
        sort_order: sortOrderSelect.value || null
    };

    // Send request -------------------------------------------
    fetch(`${CONFIG.API_BASE_URL}/search-product-database`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": AUTH_TOKEN
        },
        body: JSON.stringify(body)
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`Search error: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            // Clear the "Loading..." text
            searchLoadingEl.textContent = "";

            if (!append) {
                productList.innerHTML = "";
                offset = 0; // reset offset if new search
            }

            // Receive information and generate HTML for items -------------------------------------------
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'product-item';
                div.dataset.barcode = item.barcode;

                const imgSrc = item.metadata?.imageURL || 'https://via.placeholder.com/80';

                // Verified check (only show if verified == true)
                const verifiedIcon = item.metadata?.verified ? "✔️" : "";

                // Sponsored icon (💲 if sponsored)
                const sponsoredIcon = item.metadata?.sponsored ? "💲" : "";

                // Thumbs up / down
                const pos = item.metadata?.positiveRatings ?? 0;
                const neg = item.metadata?.negativeRatings ?? 0;
                const thumbs = `<span style="color:green;">👍 ${pos}</span> <span style="color:red;">👎 ${neg}</span>`;

                // Confidence & label
                const conf = item.manufacturingInfo?.result_confidence || "N/A";
                const lbl = item.manufacturingInfo?.label || "No Label";

                // % Canadian
                const pct = item.manufacturingInfo?.percentageCanadian ?? "?";

                // numScans
                const scans = item.metadata?.numScans ?? 0;

                // Build product details
                div.innerHTML = `
            <img src="${imgSrc}" alt="image not found">
            <div class="product-details">
              <div class="top-row">
                <strong>${item.name}</strong>
              </div>
              <div class="row-info">
                ${thumbs}
                <span>🔍 ${scans}</span>
                <span>${verifiedIcon}</span>
                <span>${sponsoredIcon}</span>
              </div>
              <div class="row-info">
                <span>Confidence: ${conf}</span>
                <span>Label: ${lbl}</span>
              </div>
            </div>
            <div class="product-percentage">${pct}%</div>
          `;

                div.addEventListener('click', () => {
                    document.querySelectorAll('.product-item').forEach(el => el.classList.remove('selected'));
                    div.classList.add('selected');
                    loadProductDetails(item.barcode);
                });

                productList.appendChild(div);
            });

            loadMoreBtn.style.display = (data.length === LIMIT) ? "block" : "none";
        })
        .catch(err => {
            console.error("Search error:", err);
            searchLoadingEl.textContent = "Error during search.";
        });
}

// GET product details (modify mode)
function loadProductDetails(barcode) {
    // Cancel add mode if active, remove banner and restore read-only fields
    isAddingNewProduct = false;
    const addBanner = document.getElementById('add-banner');
    if (addBanner) addBanner.remove();
    productBarcode.setAttribute("readonly", "readonly");
    numScans.setAttribute("readonly", "readonly");
    productExists.setAttribute("readonly", "readonly");
    dateGenerated.setAttribute("readonly", "readonly");
    costToGenerate.setAttribute("readonly", "readonly");
    timeToGenerate.setAttribute("readonly", "readonly");
    feedback.setAttribute("readonly", "readonly");

    fetch(`${CONFIG.API_BASE_URL}/get-by-barcode/${barcode}?test=true`, {
        method: "GET",
        headers: {
            "Authorization": AUTH_TOKEN
        }
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`Details API error: ${res.status}`);
            }
            return res.json();
        })
        .then(product => {
            // fill the form
            productBarcode.value = product.barcode || "";
            productName.value = product.name || "";
            productBrand.value = product.brand || "";
            productTags.value = product.tags?.join(", ") || "";

            parentCompanyName.value = product.parentCompany?.name || "";
            parentCompanyDescription.value = product.parentCompany?.description || "";
            parentCompanyCountry.value = product.parentCompany?.countryOfRegistration || "";
            parentCompanyCode.value = product.parentCompany?.countryCode || "";
            parentCompanyConfidence.value = product.parentCompany?.resultConfidence || "";
            parentCompanyExplanation.value = product.parentCompany?.explanation || "";
            companyTags.value = product.parentCompany?.tags?.join(", ") || "";

            percentageCanadian.value = product.manufacturingInfo?.percentageCanadian || "";
            labelField.value = product.manufacturingInfo?.label || "";
            labelDescription.value = product.manufacturingInfo?.labelDescription || "";
            manufacturingConfidence.value = product.manufacturingInfo?.result_confidence || "";
            labelExplanation.value = product.manufacturingInfo?.labelExplanation || "";

            // metadata
            imageURL.value = product.metadata?.imageURL || "";
            verifiedCheckbox.checked = !!product.metadata?.verified;
            sponsoredCheckbox.checked = !!product.metadata?.sponsored;
            positiveRatings.value = product.metadata?.positiveRatings || "";
            negativeRatings.value = product.metadata?.negativeRatings || "";

            // read-only
            numScans.value = product.metadata?.numScans || "";
            productExists.value = product.metadata?.exists ? "Yes" : "No";
            dateGenerated.value = product.metadata?.dateGenerated || "";
            costToGenerate.value = product.metadata?.costToGenerate || "";
            timeToGenerate.value = product.metadata?.timeToGenerate || "";
            feedback.value = product.metadata?.feedback || "";

            // handle alternative images
            displayAlternativeImages(product);

            messageEl.textContent = "";
            storeOriginalValues(product);
            document.querySelectorAll('#product-form input, #product-form textarea')
                .forEach(el => el.classList.remove('field-changed'));
        })
        .catch(err => {
            console.error("Details error:", err);
            messageEl.textContent = "Error loading product details.";
            messageEl.style.color = "red";
        });
}

// Display alternative images and handle primary image change
function displayAlternativeImages(product) {
    altImagesContainer.innerHTML = "";

    const primaryURL = product.metadata?.imageURL || "";
    const altList = product.metadata?.alternativeImages || [];

    let imagesToShow = [];
    if (primaryURL) {
        imagesToShow.push({url: primaryURL, isPrimary: true});
    }
    altList.forEach(alt => {
        if (alt && alt !== primaryURL) {
            imagesToShow.push({url: alt, isPrimary: false});
        }
    });
    if (imagesToShow.length === 0) return;
    imagesToShow.forEach(item => {
        const img = document.createElement('img');
        img.src = item.url;
        img.className = item.isPrimary ? "primary" : "";
        altImagesContainer.appendChild(img);

        // On click, set primary image
        img.addEventListener('click', () => {
            imageURL.value = item.url;
            highlightIfChanged(imageURL, imageURL.value);
            document.querySelectorAll('.alt-images img').forEach(i => i.classList.remove('primary'));
            img.classList.add('primary');
        });
    });
}

// Store original values for partial update
function storeOriginalValues(product) {
    originalValues = {
        "product-barcode": product.barcode || "",
        "product-name": product.name || "",
        "product-brand": product.brand || "",
        "product-tags": product.tags?.join(", ") || "",

        "parent-company-name": product.parentCompany?.name || "",
        "parent-company-description": product.parentCompany?.description || "",
        "parent-company-country": product.parentCompany?.countryOfRegistration || "",
        "parent-company-code": product.parentCompany?.countryCode || "",
        "parent-company-confidence": product.parentCompany?.resultConfidence || "",
        "parent-company-explanation": product.parentCompany?.explanation || "",
        "company-tags": product.parentCompany?.tags?.join(", ") || "",

        "percentage-canadian": product.manufacturingInfo?.percentageCanadian || "",
        "label": product.manufacturingInfo?.label || "",
        "label-description": product.manufacturingInfo?.labelDescription || "",
        "manufacturing-confidence": product.manufacturingInfo?.result_confidence || "",
        "label-explanation": product.manufacturingInfo?.labelExplanation || "",

        "image-url": product.metadata?.imageURL || "",
        "verified": !!product.metadata?.verified,
        "sponsored": !!product.metadata?.sponsored,
        "positive-ratings": product.metadata?.positiveRatings || "",
        "negative-ratings": product.metadata?.negativeRatings || "",

        // read-only
        "num-scans": product.metadata?.numScans || "",
        "product-exists": product.metadata?.exists ? "Yes" : "No",
        "date-generated": product.metadata?.dateGenerated || "",
        "cost-to-generate": product.metadata?.costToGenerate || "",
        "time-to-generate": product.metadata?.timeToGenerate || "",
        "feedback": product.metadata?.feedback || ""
    };
}

// Highlight changed fields
function highlightIfChanged(el, newVal) {
    const oldVal = originalValues[el.id];
    if (el.type === 'checkbox') {
        el.classList.toggle('field-changed', newVal !== oldVal);
    } else {
        el.classList.toggle('field-changed', String(newVal) !== String(oldVal));
    }
}

// Setup change listeners for form fields
function setupFieldChangeListeners() {
    const fields = document.querySelectorAll('#product-form input, #product-form textarea');
    fields.forEach(el => {
        if (el.type === 'checkbox') {
            el.addEventListener('change', () => highlightIfChanged(el, el.checked));
        } else {
            el.addEventListener('input', () => highlightIfChanged(el, el.value));
        }
    });
}

// Build partial update for modifying an existing product
function buildPartialUpdate() {
    const partialData = {};

    // Our "mapping" array: for each form field, specify the key & optional parse logic
    const mapping = [
        {id: "product-name", key: "product_name"},
        {id: "product-brand", key: "brand"},

        // Tag fields with a parse function that returns an array:
        {
            id: "product-tags",
            key: "product_tags",
            parse: (v) => v.trim() ? v.split(",").map(x => x.trim()).filter(Boolean) : []
        },

        {id: "parent-company-name", key: "new_parent_company_name"},
        {id: "parent-company-description", key: "parent_company_description"},
        {id: "parent-company-country", key: "parent_company_country_of_registration"},
        {id: "parent-company-code", key: "parent_company_country_code"},
        {id: "parent-company-confidence", key: "parent_company_result_confidence"},
        {id: "parent-company-explanation", key: "parent_company_explanation"},

        {
            id: "company-tags",
            key: "company_tags",
            parse: (v) => v.trim() ? v.split(",").map(x => x.trim()).filter(Boolean) : []
        },

        {id: "percentage-canadian", key: "percentage_canadian", parse: parseFloat},
        {id: "label", key: "label"},
        {id: "label-description", key: "label_description"},
        {id: "manufacturing-confidence", key: "manufacturing_result_confidence"},
        {id: "label-explanation", key: "label_explanation"},

        {id: "image-url", key: "image_url"},
        {id: "verified", key: "verified"},
        {id: "sponsored", key: "sponsored"},
        {id: "positive-ratings", key: "positive_ratings", parse: parseInt},
        {id: "negative-ratings", key: "negative_ratings", parse: parseInt}
    ];

    mapping.forEach(({id, key, parse}) => {
        const el = document.getElementById(id);
        if (!el) return;
        let newVal = el.type === "checkbox" ? el.checked : el.value;
        if (parse) {
            const parsed = parse(newVal);
            if (parsed !== undefined && parsed !== null) {
                newVal = parsed;
            }
        }
        const oldVal = originalValues[id];
        partialData[key] = (el.type === "checkbox" ? newVal !== oldVal : String(newVal) !== String(oldVal)) ? newVal : null;
    });

    return partialData;
}

// Clear form for add mode
function clearForm() {
    document.querySelectorAll('#product-form input, #product-form textarea').forEach(el => {
        if (el.type === 'checkbox') {
            el.checked = false;
        } else {
            el.value = "";
        }
        el.classList.remove('field-changed');
    });
    altImagesContainer.innerHTML = "";
    originalValues = {};
}

// Submit changes / add new product
document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();

    if (isAddingNewProduct) {
        if (!productBarcode.value) {
            messageEl.textContent = "Please enter a barcode for the new product.";
            messageEl.style.color = "red";
            return;
        }
        // For "new product," do the exact same PUT call as "modify" but with the user-provided barcode.
        const barcode = productBarcode.value.trim();
        const partialData = buildPartialUpdate();
        // Optionally ensure the barcode is in the body if your backend requires it
        partialData["barcode"] = barcode;

        fetch(`${CONFIG.API_BASE_URL}/modify-product/${barcode}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": AUTH_TOKEN
            },
            body: JSON.stringify(partialData)
        })
        .then(res => {
            if (!res.ok) {
                throw new Error(`Add/Update (PUT) error: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
          messageEl.textContent = "Product added successfully!";
          messageEl.style.color = "green";

          isAddingNewProduct = false;

          productBarcode.setAttribute("readonly", "readonly");
          numScans.setAttribute("readonly", "readonly");
          productExists.setAttribute("readonly", "readonly");
          dateGenerated.setAttribute("readonly", "readonly");
          costToGenerate.setAttribute("readonly", "readonly");
          timeToGenerate.setAttribute("readonly", "readonly");
          feedback.setAttribute("readonly", "readonly");

          const addBanner = document.getElementById('add-banner');
          if (addBanner) addBanner.remove();

          fetchProducts(false);
        })
        .catch(err => {
            console.error("Add product error:", err);
            messageEl.textContent = "Error adding product.";
            messageEl.style.color = "red";
        });

    } else {
        if (!productBarcode.value) {
            messageEl.textContent = "No barcode loaded. Please select a product first.";
            messageEl.style.color = "red";
            return;
        }
        const barcode = productBarcode.value.trim();
        const partialData = buildPartialUpdate();
        console.log("Final partialData ->", partialData);
        console.log("JSON stringified ->", JSON.stringify(partialData, null, 2));

        fetch(`${CONFIG.API_BASE_URL}/modify-product/${barcode}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": AUTH_TOKEN
            },
            body: JSON.stringify(partialData)
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Update error: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                messageEl.textContent = "Product updated successfully!";
                messageEl.style.color = "green";
            })
            .catch(err => {
                console.error("Update error:", err);
                messageEl.textContent = "Error updating product.";
                messageEl.style.color = "red";
            });
    }
});

// Add New Product button event listener
addProductButton.addEventListener('click', () => {
    isAddingNewProduct = true;
    clearForm();
    // Remove readonly from barcode and system metadata fields so all fields are editable
    productBarcode.removeAttribute("readonly");
    numScans.removeAttribute("readonly");
    productExists.removeAttribute("readonly");
    dateGenerated.removeAttribute("readonly");
    costToGenerate.removeAttribute("readonly");
    timeToGenerate.removeAttribute("readonly");
    feedback.removeAttribute("readonly");
    // Display the add mode banner if not already present
    if (!document.getElementById('add-banner')) {
        document.querySelector('.right-col').insertAdjacentHTML('afterbegin', '<div id="add-banner" style="background: #e6f4ff; padding: 0.5em; margin-bottom: 1em; border: 1px solid #b30000; text-align: center; font-weight: bold;">You are creating a new product</div>');
    }
});

// On load
window.addEventListener('DOMContentLoaded', () => {
    setupFieldChangeListeners();
    fetchProducts(false); // initial search
});

// Search button
searchButton.addEventListener('click', () => {
    offset = 0;
    fetchProducts(false);
});

// Load more
loadMoreBtn.addEventListener('click', () => {
    offset += LIMIT;
    fetchProducts(true);
});