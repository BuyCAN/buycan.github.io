const CONFIG = {
    API_BASE_URL: "https://buycanadian.onrender.com",
    // API_BASE_URL: "https://buycanadianbackend.onrender.com",
   // API_BASE_URL: "http://127.0.0.1:5001",

    // Cloudflare Turnstile SITE key for the brand submission page (brands.html).
    // The site key is public by design; the matching SECRET key lives only on
    // the backend (Render env var TURNSTILE_SECRET_KEY) and must never be put here.
    // Owner: create a Turnstile widget for buycan.github.io and paste its site key.
    TURNSTILE_SITE_KEY: "REPLACE_WITH_TURNSTILE_SITE_KEY",
  // you could even add more environment-specific flags later
};
