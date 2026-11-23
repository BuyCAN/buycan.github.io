/*
  Brand submission page (brands.html), backend issue #88 / website issue #15.

  - Public: no app token and no admin token. The backend protects these routes
    with Cloudflare Turnstile, a honeypot (company_fax) and a daily cap.
  - Prefill uses GET /brand-submit/lookup/<barcode>, which never generates a
    product. Never call /get-by-barcode from this page: for an unknown barcode
    that starts a paid AI generation.
  - POST /brand-submit stores a pending submission that staff review in the
    employee portal. Contract: BuyCanadianBackend docs/frontend_contracts/brand-submissions.md
*/

// Turnstile calls this when its script has loaded (see brands.html).
let turnstileApiReady = false;
let turnstileWantsRender = false;
function onTurnstileLoad() {
    turnstileApiReady = true;
    if (turnstileWantsRender) BrandForm.renderTurnstile();
}

const BrandForm = (function () {
    const MAX_EVIDENCE = 5;
    const MAX_SHORT = 200;
    const MAX_LONG = 1000;
    const MAX_URL = 2000;
    const TEXT_FIELDS = ["product_name", "brand", "parent_company", "parent_company_country", "where_made"];
    const NEW_REQUIRED = ["product_name", "brand", "parent_company", "percentage_canadian", "label"];
    const FIELD_LABELS = {
        product_name: "Product name", brand: "Brand", parent_company: "Parent company",
        parent_company_country: "Parent company's country", percentage_canadian: "% Canadian",
        label: "Label", where_made: "Where it's made", image_url: "Product image link",
        submitter_name: "Your name", submitter_email: "Work email", company_name: "Company name",
        company_website: "Company website", evidence: "Evidence", barcode: "Barcode"
    };

    // Messages from the API contract, by error code.
    const CODE_MESSAGES = {
        evidence_required: "Add at least one evidence link (label photo or product page) for a Canadian claim.",
        captcha_failed: "Captcha check failed. Please try the captcha again.",
        too_large: "That's too long. Shorten the text fields.",
        rate_limited: "We've received a lot of submissions today. Please try again tomorrow.",
        captcha_unavailable: "Couldn't verify the captcha. Try again in a minute."
    };
    const INVALID_BARCODE = "That isn't a valid UPC/EAN. Check the digits.";
    const NETWORK_ERROR = "Couldn't reach BuyCAN. Check your connection and try again.";

    const $ = (id) => document.getElementById(id);
    const barcodeForm = $("brand-barcode-form");
    const barcodeInput = $("barcode");
    const lookupLoading = $("lookup-loading");
    const submitForm = $("submit-form");
    const statusBox = $("product-status");
    const productHelp = $("product-help");
    const labelSelect = $("label");
    const evidenceList = $("evidence-list");
    const addEvidenceBtn = $("add-evidence");
    const evidenceNote = $("evidence-required-note");
    const formError = $("form-error");
    const submitButton = $("submit-button");

    let lookup = null;          // last successful lookup response
    let lookupSeq = 0;          // ignore stale lookup responses
    let debounceTimer = null;
    let turnstileWidgetId = null;
    let turnstileToken = "";

    const siteKeyConfigured = () => {
        const key = (typeof CONFIG !== "undefined" && CONFIG.TURNSTILE_SITE_KEY) || "";
        return key && !/^REPLACE_/.test(key);
    };

    // ---------------------------------------------------------------- helpers

    function el(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined && text !== null) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function digitsOnly(value) {
        return value.replace(/[\s-]/g, "");
    }

    function isLink(value, httpsOnly) {
        if (/[\s\x00-\x1f\x7f]/.test(value)) return false;
        try {
            const url = new URL(value);
            const ok = httpsOnly ? url.protocol === "https:" : (url.protocol === "http:" || url.protocol === "https:");
            return ok && !!url.hostname;
        } catch (e) {
            return false;
        }
    }

    function setFieldError(field, message) {
        const box = document.querySelector(`[data-error-for="${field}"]`);
        if (box) {
            box.textContent = message;
            const group = box.closest(".form-group") || box.closest("fieldset");
            if (group) group.classList.add("has-error");
            return true;
        }
        return false;
    }

    function clearErrors() {
        document.querySelectorAll(".field-error").forEach((box) => { box.textContent = ""; });
        document.querySelectorAll(".has-error").forEach((g) => g.classList.remove("has-error"));
        formError.textContent = "";
    }

    function focusFirstError() {
        const first = document.querySelector(".has-error input, .has-error select, .has-error textarea");
        if (first) first.focus();
        else if (formError.textContent) formError.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function readJson(res) {
        try { return await res.json(); } catch (e) { return {}; }
    }

    function showClosed() {
        $("closed-panel").hidden = false;
        $("intro-panel").hidden = true;
        barcodeForm.hidden = true;
        submitForm.hidden = true;
        $("thanks-panel").hidden = true;
    }

    // ---------------------------------------------------------------- lookup

    async function runLookup() {
        clearTimeout(debounceTimer);
        const raw = barcodeInput.value.trim();
        clearErrors();
        if (!raw) {
            setFieldError("barcode", "Enter the barcode printed under the bars.");
            return;
        }
        if (!/^[0-9\s-]+$/.test(raw)) {
            setFieldError("barcode", INVALID_BARCODE);
            return;
        }
        const seq = ++lookupSeq;
        lookupLoading.style.display = "block";
        let res, data;
        try {
            res = await fetch(`${CONFIG.API_BASE_URL}/brand-submit/lookup/${encodeURIComponent(digitsOnly(raw))}`,
                { headers: { "Accept": "application/json" } });
            data = await readJson(res);
        } catch (e) {
            if (seq !== lookupSeq) return;
            lookupLoading.style.display = "none";
            setFieldError("barcode", NETWORK_ERROR);
            return;
        }
        if (seq !== lookupSeq) return;
        lookupLoading.style.display = "none";

        if (res.status === 503 && data.code === "disabled") return showClosed();
        if (res.status === 400) {
            setFieldError("barcode", INVALID_BARCODE);
            return;
        }
        if (!res.ok || !Array.isArray(data.labels)) {
            setFieldError("barcode", data.error || "Something went wrong looking up that barcode. Please try again.");
            return;
        }
        lookup = data;
        barcodeInput.value = data.barcode;  // normalized form: we send this back
        fillForm(data);
    }

    function fillForm(data) {
        const product = data.exists ? (data.product || {}) : {};
        const isNew = !data.exists;
        submitForm.classList.toggle("is-new", isNew);

        // What we show today
        statusBox.replaceChildren();
        if (isNew) {
            statusBox.append(el("h4", "New product"));
            statusBox.append(el("p", `BuyCAN doesn't show a product for barcode ${data.barcode} yet. Fill in the details below to add it.`));
            productHelp.textContent = "Fields marked * are required for a new product. A % Canadian above 0 or a label needs an evidence link.";
        } else {
            statusBox.append(el("h4", "What BuyCAN shows today"));
            const dl = el("dl");
            const rows = [
                ["Product", product.product_name], ["Brand", product.brand],
                ["Parent company", [product.parent_company, product.parent_company_country].filter(Boolean).join(", ")],
                ["% Canadian", product.percentage_canadian == null ? null : `${product.percentage_canadian}%`],
                ["Label", product.label], ["Where it's made", product.where_made]
            ];
            rows.forEach(([k, v]) => {
                dl.append(el("dt", k), el("dd", v || "Not shown"));
            });
            statusBox.append(dl);
            if (product.data_source === "brand" || product.data_source === "staff") {
                statusBox.append(el("p", "This product already shows information provided by the brand.", "field-hint"));
            }
            productHelp.textContent = "Change only what's wrong. Fields you leave as they are won't be sent.";
        }

        // Prefill inputs
        TEXT_FIELDS.forEach((f) => { $(f).value = product[f] || ""; });
        $("percentage_canadian").value = product.percentage_canadian == null ? "" : product.percentage_canadian;
        $("image_url").value = product.image_url || "";

        // Label dropdown: only the labels from the lookup are allowed
        labelSelect.replaceChildren();
        const currentLabel = product.label || "";
        const currentInList = data.labels.includes(currentLabel);
        let placeholder;
        if (isNew) placeholder = "Choose a label...";
        else if (currentLabel && !currentInList) placeholder = `Keep current (${currentLabel})`;
        else placeholder = currentLabel ? "Keep current" : "No label shown today";
        const first = el("option", placeholder);
        first.value = "";
        labelSelect.append(first);
        data.labels.forEach((label) => {
            const opt = el("option", label);
            opt.value = label;
            labelSelect.append(opt);
        });
        labelSelect.value = currentInList ? currentLabel : "";

        if (!evidenceList.children.length) addEvidenceRow("");
        submitForm.hidden = false;
        $("intro-panel").hidden = true;
        updateEvidenceNote();
        renderTurnstile();
    }

    // ---------------------------------------------------------------- evidence

    function addEvidenceRow(value) {
        if (evidenceList.children.length >= MAX_EVIDENCE) return;
        const row = el("div", null, "evidence-row");
        const input = document.createElement("input");
        input.type = "url";
        input.maxLength = MAX_URL;
        input.placeholder = "https://www.yourbrand.ca/product-page";
        input.setAttribute("aria-label", `Evidence link ${evidenceList.children.length + 1}`);
        input.value = value;
        const remove = el("button", "Remove");
        remove.type = "button";
        remove.addEventListener("click", () => {
            row.remove();
            if (!evidenceList.children.length) addEvidenceRow("");
            updateEvidenceButton();
        });
        row.append(input, remove);
        evidenceList.append(row);
        updateEvidenceButton();
    }

    function updateEvidenceButton() {
        addEvidenceBtn.disabled = evidenceList.children.length >= MAX_EVIDENCE;
        addEvidenceBtn.textContent = addEvidenceBtn.disabled ? "Up to 5 links" : "+ Add another link";
    }

    function evidenceLinks() {
        return Array.from(evidenceList.querySelectorAll("input"))
            .map((i) => i.value.trim()).filter(Boolean);
    }

    // ---------------------------------------------------------------- building the body

    // Only the fields the brand set or changed.
    function proposedFields() {
        const current = (lookup && lookup.exists && lookup.product) || {};
        const proposed = {};
        TEXT_FIELDS.forEach((f) => {
            const v = $(f).value.trim();
            if (v && v !== String(current[f] || "").trim()) proposed[f] = v;
        });
        const pctRaw = $("percentage_canadian").value.trim();
        if (pctRaw !== "") {
            const pct = Number(pctRaw);
            if (pct !== current.percentage_canadian) proposed.percentage_canadian = pct;
        }
        const label = labelSelect.value;
        if (label && label !== (current.label || "")) proposed.label = label;
        const img = $("image_url").value.trim();
        if (img && img !== (current.image_url || "")) proposed.image_url = img;
        return proposed;
    }

    function needsEvidence(proposed) {
        const current = (lookup && lookup.exists && lookup.product) || {};
        const raisesPct = proposed.percentage_canadian !== undefined
            && proposed.percentage_canadian > (current.percentage_canadian || 0);
        return raisesPct || proposed.label !== undefined;
    }

    function updateEvidenceNote() {
        evidenceNote.hidden = !needsEvidence(proposedFields());
    }

    // Mirrors the server's rules; the server enforces them all again.
    function validate(proposed) {
        let ok = true;
        const fail = (field, msg) => { setFieldError(field, msg); ok = false; };

        ["submitter_name", "company_name"].forEach((f) => {
            const v = $(f).value.trim();
            if (!v) fail(f, `${FIELD_LABELS[f]} is required.`);
            else if (v.length > MAX_SHORT) fail(f, `${FIELD_LABELS[f]} must be at most ${MAX_SHORT} characters.`);
        });
        const email = $("submitter_email").value.trim();
        if (!email) fail("submitter_email", "Work email is required.");
        else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) fail("submitter_email", "Enter a valid email address.");
        const site = $("company_website").value.trim();
        if (!site) fail("company_website", "Company website is required.");
        else if (!isLink(site, false)) fail("company_website", "Enter a full link starting with https:// (no spaces).");

        TEXT_FIELDS.forEach((f) => {
            const max = f === "where_made" ? MAX_LONG : MAX_SHORT;
            if ($(f).value.trim().length > max) fail(f, `${FIELD_LABELS[f]} must be at most ${max} characters.`);
        });
        const pctRaw = $("percentage_canadian").value.trim();
        const pctBad = $("percentage_canadian").validity.badInput
            || (pctRaw !== "" && (!/^\d{1,3}$/.test(pctRaw) || Number(pctRaw) > 100));
        if (pctBad) fail("percentage_canadian", "Enter a whole number from 0 to 100.");
        const img = $("image_url").value.trim();
        if (img && !isLink(img, true)) fail("image_url", "The image link must start with https:// and contain no spaces.");

        if (lookup && !lookup.exists) {
            NEW_REQUIRED.forEach((f) => {
                const v = f === "label" ? labelSelect.value : $(f).value.trim();
                if (v === "") fail(f, `${FIELD_LABELS[f]} is required for a new product.`);
            });
        }

        const links = evidenceLinks();
        if (links.length > MAX_EVIDENCE) fail("evidence", "Add at most 5 evidence links.");
        else if (links.some((l) => !isLink(l, false))) fail("evidence", "Each evidence link must start with http:// or https:// and contain no spaces.");
        else if (!links.length && needsEvidence(proposed)) fail("evidence", CODE_MESSAGES.evidence_required);

        if (ok && !Object.keys(proposed).length) {
            formError.textContent = "Change at least one product field before submitting.";
            ok = false;
        }
        if (ok && !turnstileToken) {
            setFieldError("turnstile", siteKeyConfigured()
                ? "Please complete the captcha."
                : "The captcha isn't set up yet, so submissions can't be sent.");
            ok = false;
        }
        return ok;
    }

    // ---------------------------------------------------------------- submit

    async function submit(event) {
        event.preventDefault();
        clearErrors();
        if (!lookup) return;
        const proposed = proposedFields();
        if (!validate(proposed)) {
            focusFirstError();
            return;
        }

        const body = {
            barcode: lookup.barcode,
            submitter_name: $("submitter_name").value.trim(),
            submitter_email: $("submitter_email").value.trim(),
            company_name: $("company_name").value.trim(),
            company_website: $("company_website").value.trim(),
            proposed: proposed,
            evidence: evidenceLinks(),
            turnstile_token: turnstileToken,
            company_fax: $("company_fax").value  // honeypot: empty for people
        };

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
        let res, data;
        try {
            res = await fetch(`${CONFIG.API_BASE_URL}/brand-submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(body)
            });
            data = await readJson(res);
        } catch (e) {
            res = null;
        }
        submitButton.disabled = false;
        submitButton.textContent = "Submit for review";

        if (res && res.status === 202) return showThanks();

        // Any failure: a Turnstile token works once, so get a fresh one.
        resetTurnstile();
        if (!res) {
            formError.textContent = NETWORK_ERROR;
            return focusFirstError();
        }
        if (res.status === 503 && data.code === "disabled") return showClosed();
        showServerError(data);
        focusFirstError();
    }

    function showServerError(data) {
        const code = data.code;
        if (code === "captcha_failed") {
            setFieldError("turnstile", CODE_MESSAGES.captcha_failed);
        } else if (code === "evidence_required") {
            setFieldError("evidence", CODE_MESSAGES.evidence_required);
        } else if (CODE_MESSAGES[code]) {
            formError.textContent = CODE_MESSAGES[code];
        } else if (code === "invalid" && data.field === "barcode") {
            setFieldError("barcode", INVALID_BARCODE);
        } else if (code === "invalid" && data.field && setFieldError(data.field, data.error || "Check this field.")) {
            // shown next to the input
        } else {
            formError.textContent = data.error || "Something went wrong. Please try again.";
        }
    }

    function showThanks() {
        submitForm.hidden = true;
        barcodeForm.hidden = true;
        const panel = $("thanks-panel");
        panel.hidden = false;
        panel.focus();
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function startOver() {
        // Keep the contact details: brands often submit several products.
        lookup = null;
        barcodeInput.value = "";
        TEXT_FIELDS.concat(["percentage_canadian", "image_url"]).forEach((f) => { $(f).value = ""; });
        evidenceList.replaceChildren();
        clearErrors();
        resetTurnstile();
        $("thanks-panel").hidden = true;
        barcodeForm.hidden = false;
        $("intro-panel").hidden = false;
        barcodeInput.focus();
    }

    // ---------------------------------------------------------------- Turnstile

    function renderTurnstile() {
        if (!siteKeyConfigured()) {
            setFieldError("turnstile", "The captcha isn't set up yet, so submissions can't be sent.");
            return;
        }
        if (turnstileWidgetId !== null) return;
        if (!turnstileApiReady || !window.turnstile) {
            turnstileWantsRender = true;
            return;
        }
        turnstileWidgetId = window.turnstile.render("#turnstile-widget", {
            sitekey: CONFIG.TURNSTILE_SITE_KEY,
            action: "brand_submit",
            callback: (token) => {
                turnstileToken = token;
                const box = document.querySelector('[data-error-for="turnstile"]');
                if (box) box.textContent = "";
            },
            "expired-callback": () => { turnstileToken = ""; },
            "error-callback": () => { turnstileToken = ""; }
        });
    }

    function resetTurnstile() {
        turnstileToken = "";
        if (turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId);
    }

    // ---------------------------------------------------------------- wiring

    barcodeForm.addEventListener("submit", (e) => { e.preventDefault(); runLookup(); });
    barcodeInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const digits = digitsOnly(barcodeInput.value);
        // Look up as they type once it's a plausible UPC/EAN length (debounced).
        if (/^\d+$/.test(digits) && [8, 12, 13, 14].includes(digits.length)
            && !(lookup && lookup.barcode === digits)) {
            debounceTimer = setTimeout(runLookup, 600);
        }
    });
    submitForm.addEventListener("submit", submit);
    submitForm.addEventListener("input", updateEvidenceNote);
    submitForm.addEventListener("change", updateEvidenceNote);
    addEvidenceBtn.addEventListener("click", () => {
        addEvidenceRow("");
        const inputs = evidenceList.querySelectorAll("input");
        inputs[inputs.length - 1].focus();
    });
    $("another-button").addEventListener("click", startOver);

    return { renderTurnstile };
})();
