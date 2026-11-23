/*
  Employee portal: brand submission review queue (backend issue #88, website #15).
  Contract: BuyCanadianBackend docs/frontend_contracts/brand-submissions.md

  SECURITY: every submission field is untrusted, unauthenticated input, and
  this page holds the admin token. This file builds every node with
  textContent / attributes only and NEVER uses innerHTML. Brand-supplied
  links are shown as plain links (new tab, rel="noopener noreferrer") and
  are never embedded or fetched (no <img> for image_url).
*/
(function () {
    const FIELD_LABELS = {
        product_name: "Product name",
        brand: "Brand",
        parent_company: "Parent company",
        parent_company_country: "Parent company country",
        percentage_canadian: "% Canadian",
        label: "Label",
        where_made: "Where made",
        image_url: "Image link"
    };
    const PROPOSED_FIELDS = Object.keys(FIELD_LABELS);
    const REVIEWER_KEY = "brandReviewerName";

    const $ = (id) => document.getElementById(id);
    const queueList = $("queue-list");
    const queueStatus = $("queue-status");
    const statusFilter = $("status-filter");
    const barcodeFilter = $("barcode-filter");
    const detailEl = $("detail");
    const pageMsg = $("page-msg");

    let selectedId = null;
    let currentDetail = null;   // last GET /brand-submissions/<id> body

    // ------------------------------------------------------------ DOM helpers (textContent only)

    // h("div", {className: "x"}, "text", childNode, ...)
    function h(tag, props, ...children) {
        const node = document.createElement(tag);
        if (props) {
            Object.entries(props).forEach(([k, v]) => {
                if (v === undefined || v === null || v === false) return;
                if (k === "className") node.className = v;
                else if (k === "dataset") Object.assign(node.dataset, v);
                else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
                else if (k in node && typeof v !== "string") node[k] = v;
                else node.setAttribute(k, v === true ? "" : v);
            });
        }
        children.flat().forEach((c) => {
            if (c === undefined || c === null || c === false) return;
            node.append(c instanceof Node ? c : document.createTextNode(String(c)));
        });
        return node;
    }

    function display(value) {
        if (value === undefined || value === null || value === "") return "—";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        return String(value);
    }

    function isWebLink(value) {
        if (typeof value !== "string") return false;
        try {
            const u = new URL(value);
            return u.protocol === "http:" || u.protocol === "https:";
        } catch (e) {
            return false;
        }
    }

    // A brand-supplied link: plain anchor, new tab, no referrer, never embedded.
    // Anything that isn't http(s) is shown as text.
    function extLink(url) {
        if (!isWebLink(url)) return h("span", null, display(url));
        return h("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "ext-link" }, url);
    }

    function formatDate(iso) {
        if (!iso) return "—";
        const d = new Date(iso);
        return isNaN(d) ? String(iso) : d.toLocaleString();
    }

    function setMsg(node, text, kind) {
        node.textContent = text || "";
        node.className = node.className.replace(/\s*\b(ok|err)\b/g, "") + (kind ? " " + kind : "");
    }

    // ------------------------------------------------------------ API

    async function api(path, options) {
        const opts = options || {};
        const headers = { "Authorization": "Bearer " + (localStorage.getItem("authToken") || "") };
        if (opts.body !== undefined) headers["Content-Type"] = "application/json";
        let res;
        try {
            res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
                method: opts.method || "GET",
                headers: headers,
                body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
            });
        } catch (e) {
            return { status: 0, data: { error: "Couldn't reach the server." } };
        }
        let data = {};
        try { data = await res.json(); } catch (e) { /* non-JSON */ }
        if (res.status === 401 || res.status === 403) handleAuthFailure(res.status);
        return { status: res.status, data: data };
    }

    // ------------------------------------------------------------ queue

    async function loadQueue() {
        const params = new URLSearchParams({ status: statusFilter.value, limit: "200" });
        const bc = barcodeFilter.value.replace(/[\s-]/g, "");
        if (bc) params.set("barcode", bc);
        queueStatus.textContent = "Loading...";
        const { status, data } = await api(`/brand-submissions?${params}`);
        if (status !== 200) {
            queueStatus.textContent = data.error || `Couldn't load the queue (${status}).`;
            queueList.replaceChildren();
            return;
        }
        const rows = data.submissions || [];
        queueStatus.textContent = rows.length
            ? `${rows.length} submission${rows.length === 1 ? "" : "s"} (oldest first)`
            : "No submissions.";
        queueList.replaceChildren(...rows.map(queueItem));
    }

    function queueItem(s) {
        const fields = Object.keys(s.proposed || {}).map((f) => FIELD_LABELS[f] || f).join(", ");
        return h("button", {
            type: "button",
            className: "queue-item" + (s.id === selectedId ? " selected" : ""),
            dataset: { id: String(s.id) },
            onclick: () => openSubmission(s.id)
        },
            h("div", { className: "qi-top" },
                h("span", null, `#${s.id} · ${display(s.barcode)}`),
                h("span", null,
                    h("span", { className: "badge " + s.kind }, display(s.kind)), " ",
                    h("span", { className: "badge " + s.status }, display(s.status)))),
            h("div", { className: "qi-sub" }, `${display(s.company_name)} — ${display(s.submitter_name)}`),
            h("div", { className: "qi-sub" }, `${formatDate(s.submitted_at)} · ${fields || "no fields"}`)
        );
    }

    function markSelected() {
        queueList.querySelectorAll(".queue-item").forEach((b) => {
            b.classList.toggle("selected", b.dataset.id === String(selectedId));
        });
    }

    // ------------------------------------------------------------ detail

    async function openSubmission(id, keepMsg) {
        selectedId = id;
        markSelected();
        if (!keepMsg) setMsg(pageMsg, "");
        if (String(location.hash.slice(1)) !== String(id)) history.replaceState(null, "", `#${id}`);
        detailEl.replaceChildren(h("p", { className: "detail-empty" }, "Loading..."));
        const { status, data } = await api(`/brand-submissions/${encodeURIComponent(id)}`);
        if (selectedId !== id) return;  // another one was opened meanwhile
        if (status === 404) {
            currentDetail = null;
            detailEl.replaceChildren(h("p", { className: "detail-empty" }, `Submission #${id} wasn't found.`));
            return;
        }
        if (status !== 200 || !data.submission) {
            detailEl.replaceChildren(h("p", { className: "detail-empty" }, data.error || `Couldn't load submission (${status}).`));
            return;
        }
        currentDetail = data;
        renderDetail(data);
    }

    function renderDetail(d) {
        const s = d.submission;
        const pending = s.status === "pending";
        const nodes = [];

        // Header
        nodes.push(h("div", { className: "detail-section detail-head" },
            h("h2", null, `Submission #${s.id}`,
                h("span", { className: "badge " + s.kind }, display(s.kind)),
                h("span", { className: "badge " + s.status }, display(s.status))),
            h("div", { className: "meta" }, `Barcode ${display(s.barcode)} · submitted ${formatDate(s.submitted_at)}`)
        ));

        // Hidden / new product warnings
        if (d.hidden) {
            nodes.push(h("div", { className: "warning-box" },
                "⚠ This product is currently hidden.",
                h("p", null, "It's a failed generation placeholder or a product staff hid on purpose (bad or duplicate). " +
                    "Approving makes it visible in the app again. The \"Current\" column shows its stored (hidden) values.")));
        } else if (d.current === null || d.current === undefined) {
            nodes.push(h("div", { className: "info-box" },
                "New product: BuyCAN has no row for this barcode. Approving creates it with the values below."));
        }

        // Other pending submissions for the same barcode
        const others = d.other_pending || [];
        if (others.length) {
            nodes.push(h("div", { className: "info-box" },
                "Other pending submissions for this barcode: ",
                ...others.map((oid, i) => [i ? ", " : "",
                    h("a", { href: `#${oid}`, className: "ext-link", onclick: (e) => { e.preventDefault(); openSubmission(oid); } }, `#${oid}`)]),
                h("div", { className: "muted" }, "Approving this one marks the others superseded.")));
        }

        nodes.push(submitterSection(s));
        nodes.push(diffSection(d, pending));
        nodes.push(evidenceSection(s));

        if (pending) {
            nodes.push(checklistSection(s));
            nodes.push(actionSection(d));
        } else {
            nodes.push(reviewedSection(s));
        }
        detailEl.replaceChildren(...nodes);
    }

    function submitterSection(s) {
        let domainHint;
        if (s.domain_match === true) {
            domainHint = h("span", { className: "hint-good" }, "Email domain matches the company website (a hint, not proof).");
        } else if (s.domain_match === false) {
            domainHint = h("span", { className: "hint-bad" }, "Email domain does NOT match the company website. Verify carefully.");
        } else {
            domainHint = h("span", { className: "muted" }, "No domain-match hint.");
        }
        return h("div", { className: "detail-section" },
            h("h2", null, "Submitter"),
            h("dl", { className: "kv" },
                h("dt", null, "Name"), h("dd", null, display(s.submitter_name)),
                h("dt", null, "Email"), h("dd", null, display(s.submitter_email)),
                h("dt", null, "Company"), h("dd", null, display(s.company_name)),
                h("dt", null, "Website"), h("dd", null, extLink(s.company_website)),
                h("dt", null, "Domain match"), h("dd", null, domainHint),
                h("dt", null, "IP hash"), h("dd", { className: "muted" }, display(s.ip_hash))
            ));
    }

    function diffSection(d, pending) {
        const current = d.current || {};
        const rows = d.diff && d.diff.length ? d.diff
            : Object.keys(d.submission.proposed || {}).map((f) => ({
                field: f, current: current[f], proposed: d.submission.proposed[f], changed: true, canadian_increase: false
            }));

        const head = h("tr", null,
            h("th", null, "Field"),
            h("th", null, d.hidden ? "Current (hidden)" : "Current"),
            h("th", null, "Proposed by brand"),
            pending ? h("th", null, "Apply") : null,
            pending ? h("th", null, "Your edit (optional)") : null);

        const body = rows.map((row) => {
            const tr = h("tr", {
                className: [row.canadian_increase ? "increase" : "", row.changed === false ? "unchanged" : ""].join(" ").trim(),
                dataset: { field: row.field }
            });
            const label = h("td", null, h("strong", null, FIELD_LABELS[row.field] || row.field));
            if (row.canadian_increase) label.append(h("div", null, h("span", { className: "badge increase" }, "▲ More Canadian")));
            if (row.changed === false) label.append(h("div", { className: "muted" }, "unchanged"));
            tr.append(label);
            tr.append(h("td", { className: "val" }, row.field === "image_url" ? extLink(row.current) : display(row.current)));
            tr.append(h("td", { className: "val proposed" }, row.field === "image_url" ? extLink(row.proposed) : display(row.proposed)));
            if (pending) {
                const apply = h("input", { type: "checkbox", className: "apply-box", checked: true, "aria-label": `Apply ${FIELD_LABELS[row.field] || row.field}` });
                apply.addEventListener("change", () => tr.classList.toggle("excluded", !apply.checked));
                tr.append(h("td", null, apply));
                const isPct = row.field === "percentage_canadian";
                const edit = h("input", {
                    type: isPct ? "number" : "text",
                    className: "edit-box",
                    placeholder: "keep brand's value",
                    "aria-label": `Edit ${FIELD_LABELS[row.field] || row.field}`
                });
                if (isPct) { edit.min = "0"; edit.max = "100"; edit.step = "1"; }
                tr.append(h("td", null, edit));
            }
            return tr;
        });

        return h("div", { className: "detail-section" },
            h("h2", null, "Changes"),
            h("p", { className: "muted" }, "Orange rows make the product look more Canadian: that's where a brand's incentive shows. Check them against the evidence."),
            h("div", { className: "diff-wrap" }, h("table", { className: "diff" }, h("thead", null, head), h("tbody", null, body))));
    }

    function evidenceSection(s) {
        const links = s.evidence || [];
        return h("div", { className: "detail-section" },
            h("h2", null, "Evidence links"),
            links.length
                ? h("ul", { className: "link-list" }, links.map((l) => h("li", null, extLink(l))))
                : h("p", { className: "muted" }, "No evidence links."),
            h("p", { className: "muted" }, "Links open in a new tab. They're supplied by the brand: don't sign in to anything they open."));
    }

    function checklistSection(s) {
        const gs1 = h("a", { href: "https://www.gs1.org/services/verified-by-gs1", target: "_blank", rel: "noopener noreferrer", className: "ext-link" }, "Verified by GS1 / GEPIR");
        const gs1ca = h("a", { href: "https://gs1ca.org", target: "_blank", rel: "noopener noreferrer", className: "ext-link" }, "GS1 Canada");
        return h("div", { className: "detail-section checklist" },
            h("h2", null, "Reviewer checklist"),
            h("label", null, h("input", { type: "checkbox", className: "check-item" }),
                h("span", null, "Emailed the submitter (", display(s.submitter_email), ") from the team inbox, buycanadianapp@gmail.com, and they confirmed they work for the brand.")),
            h("label", null, h("input", { type: "checkbox", className: "check-item" }),
                h("span", null, "Looked up the barcode's company prefix in ", gs1, " or ", gs1ca, " and it belongs to this company.")),
            h("label", null, h("input", { type: "checkbox", className: "check-item" }),
                h("span", null, "Opened the evidence links and they back up every orange (more Canadian) row.")),
            h("p", { className: "muted" }, "The checklist isn't saved. Note what you checked in the approval note."));
    }

    function actionSection(d) {
        const reviewer = localStorage.getItem(REVIEWER_KEY) || "";
        const approveMsg = h("div", { className: "action-msg" });
        const rejectMsg = h("div", { className: "action-msg" });

        const note = h("textarea", { maxLength: 1000, placeholder: "e.g. Confirmed by email, GS1 prefix matches" });
        const approveReviewer = h("input", { type: "text", maxLength: 200, value: reviewer });
        const updateCompany = h("input", { type: "checkbox" });
        const approveBtn = h("button", { type: "button", className: "btn approve" }, "Approve");

        const reason = h("textarea", { maxLength: 1000, placeholder: "Required, e.g. Couldn't confirm the submitter works for the brand" });
        const rejectReviewer = h("input", { type: "text", maxLength: 200, value: reviewer });
        const rejectBtn = h("button", { type: "button", className: "btn reject" }, "Reject");

        approveBtn.addEventListener("click", () => approve(d, { note, reviewer: approveReviewer, updateCompany, button: approveBtn, msg: approveMsg }));
        rejectBtn.addEventListener("click", () => reject(d, { reason, reviewer: rejectReviewer, button: rejectBtn, msg: rejectMsg }));

        const proposesCountry = "parent_company_country" in (d.submission.proposed || {});
        return h("div", { className: "action-grid" },
            h("div", { className: "detail-section" },
                h("h2", null, "Approve"),
                h("p", { className: "muted" }, "Writes the ticked fields (or your edits) to the live product, makes it visible and marks it \"brand\" so AI never overwrites it. It does not mark the product verified. Evidence links become its manufacturing sources."),
                h("br"),
                h("label", { className: "check-field company" }, updateCompany,
                    h("span", null, h("strong", null, "Also update the shared company record. "),
                        "Writes the parent company's country to the company record, which every product with this parent shares. Leave off unless you've confirmed it." +
                        (proposesCountry ? "" : " (This submission doesn't propose a country.)"))),
                h("label", { className: "field" }, "Note (optional)", note),
                h("label", { className: "field" }, "Your name", approveReviewer),
                approveBtn, approveMsg),
            h("div", { className: "detail-section" },
                h("h2", null, "Reject"),
                h("p", { className: "muted" }, "The product is untouched. Email the submitter from the team inbox if they should know why."),
                h("br"),
                h("label", { className: "field" }, "Reason (required)", reason),
                h("label", { className: "field" }, "Your name", rejectReviewer),
                rejectBtn, rejectMsg));
    }

    function reviewedSection(s) {
        const section = h("div", { className: "detail-section" },
            h("h2", null, "Review"),
            h("dl", { className: "kv" },
                h("dt", null, "Status"), h("dd", null, display(s.status)),
                h("dt", null, "Reviewer"), h("dd", null, display(s.reviewer)),
                h("dt", null, "Reviewed at"), h("dd", null, formatDate(s.reviewed_at)),
                h("dt", null, "Note / reason"), h("dd", null, display(s.review_note))));
        if (s.applied) section.append(h("h2", null, "Applied"), h("pre", { className: "json" }, JSON.stringify(s.applied, null, 2)));
        if (s.before_snapshot) section.append(h("h2", null, "Before"), h("pre", { className: "json" }, JSON.stringify(s.before_snapshot, null, 2)));
        return section;
    }

    // ------------------------------------------------------------ approve / reject

    function collectApproval(d) {
        const fields = {};
        const exclude = [];
        let error = null;
        detailEl.querySelectorAll("table.diff tbody tr").forEach((tr) => {
            const field = tr.dataset.field;
            const apply = tr.querySelector(".apply-box");
            const edit = tr.querySelector(".edit-box");
            if (apply && !apply.checked) {
                exclude.push(field);
                return;
            }
            const raw = edit ? edit.value.trim() : "";
            if (raw === "") return;
            if (field === "percentage_canadian") {
                if (!/^\d{1,3}$/.test(raw) || Number(raw) > 100) error = "% Canadian must be a whole number from 0 to 100.";
                else fields[field] = Number(raw);
            } else {
                fields[field] = raw;
            }
        });
        return { fields, exclude, error };
    }

    async function approve(d, ui) {
        setMsg(ui.msg, "");
        const { fields, exclude, error } = collectApproval(d);
        if (error) return setMsg(ui.msg, error, "err");
        const proposedCount = Object.keys(d.submission.proposed || {}).length;
        if (exclude.length >= proposedCount && !Object.keys(fields).length) {
            return setMsg(ui.msg, "Nothing left to apply: tick at least one field, or reject instead.", "err");
        }
        const unchecked = detailEl.querySelectorAll(".check-item:not(:checked)").length;
        if (unchecked && !window.confirm(`${unchecked} checklist item(s) aren't ticked. Approve anyway?`)) return;

        const reviewer = ui.reviewer.value.trim();
        if (reviewer) localStorage.setItem(REVIEWER_KEY, reviewer);
        const body = { version: d.version, fields, exclude, update_company: ui.updateCompany.checked };
        if (ui.note.value.trim()) body.note = ui.note.value.trim();
        if (reviewer) body.reviewer = reviewer;

        ui.button.disabled = true;
        const { status, data } = await api(`/brand-submissions/${d.submission.id}/approve`, { method: "POST", body });
        ui.button.disabled = false;

        if (status === 200) {
            setMsg(pageMsg, `Approved #${d.submission.id}. ${display(data.barcode)} now shows the brand's data.`, "ok");
            await loadQueue();
            return openSubmission(d.submission.id, true);
        }
        if (status === 409 && data.code === "version_changed") {
            setMsg(pageMsg, "The product changed since you opened this submission. It has been reloaded: review the changes again before approving.", "err");
            return openSubmission(d.submission.id, true);
        }
        if (status === 409 && data.code === "not_pending") {
            setMsg(pageMsg, "Someone already approved or rejected this submission. The queue has been reloaded.", "err");
            await loadQueue();
            return openSubmission(d.submission.id, true);
        }
        if (status === 404) {
            setMsg(pageMsg, "This submission no longer exists. The queue has been reloaded.", "err");
            return loadQueue();
        }
        const where = data.field ? ` (${FIELD_LABELS[data.field] || data.field})` : "";
        setMsg(ui.msg, (data.error || `Approval failed (${status}).`) + where, "err");
    }

    async function reject(d, ui) {
        setMsg(ui.msg, "");
        const reason = ui.reason.value.trim();
        if (!reason) {
            ui.reason.focus();
            return setMsg(ui.msg, "A reason is required.", "err");
        }
        const reviewer = ui.reviewer.value.trim();
        if (reviewer) localStorage.setItem(REVIEWER_KEY, reviewer);
        const body = { reason };
        if (reviewer) body.reviewer = reviewer;

        ui.button.disabled = true;
        const { status, data } = await api(`/brand-submissions/${d.submission.id}/reject`, { method: "POST", body });
        ui.button.disabled = false;

        if (status === 200) {
            setMsg(pageMsg, `Rejected #${d.submission.id}. The product is untouched.`, "ok");
            await loadQueue();
            return openSubmission(d.submission.id, true);
        }
        if (status === 409) {
            setMsg(pageMsg, "Someone already approved or rejected this submission. The queue has been reloaded.", "err");
            await loadQueue();
            return openSubmission(d.submission.id, true);
        }
        if (status === 404) {
            setMsg(pageMsg, "This submission no longer exists. The queue has been reloaded.", "err");
            return loadQueue();
        }
        setMsg(ui.msg, data.error || `Rejection failed (${status}).`, "err");
    }

    // ------------------------------------------------------------ wiring

    $("refresh-button").addEventListener("click", loadQueue);
    statusFilter.addEventListener("change", loadQueue);
    barcodeFilter.addEventListener("keydown", (e) => { if (e.key === "Enter") loadQueue(); });

    function openFromHash() {
        const id = parseInt(location.hash.slice(1), 10);
        if (id > 0 && id !== selectedId) openSubmission(id);
    }
    window.addEventListener("hashchange", openFromHash);

    if (localStorage.getItem("authToken")) {
        loadQueue();
        openFromHash();
    }
})();
