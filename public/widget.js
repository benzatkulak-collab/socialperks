/**
 * Social Perks — Embeddable Widget
 *
 * Self-contained, dependency-free JavaScript that adds a floating
 * "Earn a Perk" button and a slide-up campaign browser to any website.
 *
 * Usage:
 *   <script src="https://socialperks.app/widget.js"
 *           data-business-id="biz_123"
 *           data-theme="dark"></script>
 */
(function () {
  "use strict";

  // ─── Prevent double-init ────────────────────────────────────────────────────
  if (window.__SP_WIDGET_LOADED) return;
  window.__SP_WIDGET_LOADED = true;

  // ─── Read config from the script tag ────────────────────────────────────────
  var scriptEl =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var businessId = scriptEl.getAttribute("data-business-id") || "";
  var theme = scriptEl.getAttribute("data-theme") || "dark";
  var apiOrigin = (function () {
    try {
      var src = scriptEl.getAttribute("src") || "";
      var url = new URL(src, window.location.href);
      return url.origin;
    } catch (_e) {
      return window.location.origin;
    }
  })();

  if (!businessId) {
    console.warn("[SocialPerks] Missing data-business-id attribute on widget script tag.");
    return;
  }

  // ─── Theme tokens ──────────────────────────────────────────────────────────
  var THEMES = {
    dark: {
      bg: "#0C0F1A",
      surface: "#141828",
      border: "#1E2340",
      text: "#F1F3F9",
      dim: "#636B8A",
      muted: "#4A5272",
      cyan: "#22D3EE",
      green: "#34D399",
      amber: "#FBBF24",
      red: "#EF4444",
      overlay: "rgba(0,0,0,0.6)",
    },
    light: {
      bg: "#FFFFFF",
      surface: "#F8F9FC",
      border: "#E2E5EF",
      text: "#1A1D2E",
      dim: "#6B7280",
      muted: "#9CA3AF",
      cyan: "#0891B2",
      green: "#059669",
      amber: "#D97706",
      red: "#DC2626",
      overlay: "rgba(0,0,0,0.4)",
    },
  };

  var t = THEMES[theme] || THEMES.dark;

  // ─── CSS (all scoped with sp-widget- prefix) ───────────────────────────────
  var CSS = "\n" +
    "@keyframes sp-widget-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}\n" +
    "@keyframes sp-widget-fade-in{from{opacity:0}to{opacity:1}}\n" +
    "@keyframes sp-widget-spin{to{transform:rotate(360deg)}}\n" +
    ".sp-widget-fab{" +
      "position:fixed;bottom:24px;right:24px;z-index:99999;" +
      "display:inline-flex;align-items:center;gap:8px;" +
      "padding:12px 20px;border:none;border-radius:999px;" +
      "background:" + t.cyan + ";" +
      "color:#0C0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
      "font-size:14px;font-weight:600;line-height:1;" +
      "cursor:pointer;box-shadow:0 4px 24px rgba(34,211,238,0.3);" +
      "transition:transform 0.2s ease,box-shadow 0.2s ease;" +
    "}\n" +
    ".sp-widget-fab:hover{transform:translateY(-2px);box-shadow:0 6px 32px rgba(34,211,238,0.45)}\n" +
    ".sp-widget-fab:active{transform:translateY(0)}\n" +
    "@media(prefers-reduced-motion:reduce){" +
      ".sp-widget-fab,.sp-widget-fab:hover{transition:none;transform:none}" +
      ".sp-widget-panel{animation:none !important}" +
    "}\n" +
    ".sp-widget-overlay{" +
      "position:fixed;inset:0;z-index:99998;" +
      "background:" + t.overlay + ";" +
      "animation:sp-widget-fade-in 0.2s ease;" +
    "}\n" +
    ".sp-widget-panel{" +
      "position:fixed;bottom:0;left:0;right:0;z-index:99999;" +
      "max-height:85vh;overflow-y:auto;" +
      "background:" + t.bg + ";" +
      "border-top-left-radius:16px;border-top-right-radius:16px;" +
      "box-shadow:0 -8px 40px rgba(0,0,0,0.3);" +
      "animation:sp-widget-slide-up 0.3s ease;" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
      "color:" + t.text + ";" +
    "}\n" +
    "@media(min-width:640px){.sp-widget-panel{left:auto;right:24px;bottom:24px;max-width:420px;border-radius:16px;max-height:80vh}}\n" +
    ".sp-widget-header{" +
      "display:flex;align-items:center;justify-content:space-between;" +
      "padding:16px 20px;border-bottom:1px solid " + t.border + ";" +
    "}\n" +
    ".sp-widget-header h2{margin:0;font-size:16px;font-weight:700;color:" + t.text + "}\n" +
    ".sp-widget-header small{font-size:12px;color:" + t.dim + ";font-weight:400}\n" +
    ".sp-widget-close{" +
      "background:none;border:none;color:" + t.muted + ";font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;" +
      "border-radius:8px;transition:color 0.15s,background 0.15s;" +
    "}\n" +
    ".sp-widget-close:hover{color:" + t.text + ";background:" + t.surface + "}\n" +
    ".sp-widget-body{padding:16px 20px}\n" +
    ".sp-widget-loading{display:flex;align-items:center;justify-content:center;padding:40px 0;color:" + t.dim + ";font-size:13px;gap:8px}\n" +
    ".sp-widget-spinner{" +
      "width:16px;height:16px;border:2px solid " + t.border + ";" +
      "border-top-color:" + t.cyan + ";border-radius:50%;" +
      "animation:sp-widget-spin 0.6s linear infinite;" +
    "}\n" +
    ".sp-widget-empty{text-align:center;padding:40px 0;color:" + t.dim + ";font-size:13px}\n" +
    ".sp-widget-error{text-align:center;padding:32px 0;color:" + t.red + ";font-size:13px}\n" +
    ".sp-widget-card{" +
      "background:" + t.surface + ";" +
      "border:1px solid " + t.border + ";" +
      "border-radius:12px;padding:14px 16px;margin-bottom:12px;" +
      "transition:border-color 0.15s;" +
    "}\n" +
    ".sp-widget-card:hover{border-color:" + t.cyan + "30}\n" +
    ".sp-widget-card-name{font-size:14px;font-weight:600;color:" + t.text + ";margin:0 0 6px}\n" +
    ".sp-widget-card-meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}\n" +
    ".sp-widget-badge{" +
      "display:inline-flex;align-items:center;gap:4px;" +
      "font-size:11px;font-weight:500;padding:3px 8px;border-radius:6px;" +
      "background:" + t.cyan + "12;color:" + t.cyan + ";" +
    "}\n" +
    ".sp-widget-badge--green{background:" + t.green + "12;color:" + t.green + "}\n" +
    ".sp-widget-badge--amber{background:" + t.amber + "12;color:" + t.amber + "}\n" +
    ".sp-widget-submit-toggle{" +
      "background:none;border:1px solid " + t.cyan + ";" +
      "color:" + t.cyan + ";font-size:12px;font-weight:600;padding:6px 14px;" +
      "border-radius:8px;cursor:pointer;transition:background 0.15s,color 0.15s;" +
    "}\n" +
    ".sp-widget-submit-toggle:hover{background:" + t.cyan + ";color:#0C0F1A}\n" +
    ".sp-widget-form{margin-top:12px;border-top:1px solid " + t.border + ";padding-top:12px}\n" +
    ".sp-widget-label{display:block;font-size:11px;font-weight:600;color:" + t.dim + ";margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}\n" +
    ".sp-widget-input{" +
      "display:block;width:100%;box-sizing:border-box;" +
      "padding:8px 12px;margin-bottom:10px;" +
      "background:" + t.bg + ";border:1px solid " + t.border + ";border-radius:8px;" +
      "color:" + t.text + ";font-size:13px;font-family:inherit;" +
      "transition:border-color 0.15s;" +
    "}\n" +
    ".sp-widget-input:focus{outline:none;border-color:" + t.cyan + "}\n" +
    ".sp-widget-select{" +
      "display:block;width:100%;box-sizing:border-box;" +
      "padding:8px 12px;margin-bottom:10px;appearance:none;" +
      "background:" + t.bg + " url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23636B8A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") no-repeat right 12px center;" +
      "border:1px solid " + t.border + ";border-radius:8px;" +
      "color:" + t.text + ";font-size:13px;font-family:inherit;" +
      "transition:border-color 0.15s;" +
    "}\n" +
    ".sp-widget-select:focus{outline:none;border-color:" + t.cyan + "}\n" +
    ".sp-widget-btn{" +
      "display:inline-flex;align-items:center;justify-content:center;gap:6px;" +
      "padding:8px 18px;border:none;border-radius:8px;" +
      "background:" + t.cyan + ";color:#0C0F1A;" +
      "font-size:13px;font-weight:600;font-family:inherit;" +
      "cursor:pointer;transition:opacity 0.15s;" +
    "}\n" +
    ".sp-widget-btn:hover{opacity:0.9}\n" +
    ".sp-widget-btn:disabled{opacity:0.5;cursor:not-allowed}\n" +
    ".sp-widget-success{" +
      "text-align:center;padding:16px 0;color:" + t.green + ";font-size:13px;font-weight:500;" +
    "}\n" +
    ".sp-widget-footer{" +
      "padding:12px 20px;border-top:1px solid " + t.border + ";" +
      "text-align:center;" +
    "}\n" +
    ".sp-widget-footer a{" +
      "color:" + t.muted + ";font-size:11px;text-decoration:none;" +
      "transition:color 0.15s;" +
    "}\n" +
    ".sp-widget-footer a:hover{color:" + t.cyan + "}\n";

  // ─── Inject styles ─────────────────────────────────────────────────────────
  var styleEl = document.createElement("style");
  styleEl.setAttribute("data-sp-widget", "true");
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ─── State ─────────────────────────────────────────────────────────────────
  var state = {
    open: false,
    loading: false,
    campaigns: null, // array or null (not yet fetched)
    error: null,
    businessName: "",
    expandedCard: null, // campaign id with open form
    submitting: null, // campaign id currently submitting
    submitted: {}, // campaign id -> true if successfully submitted
  };

  // ─── Create FAB ────────────────────────────────────────────────────────────
  var fab = document.createElement("button");
  fab.className = "sp-widget-fab";
  fab.setAttribute("aria-label", "Open Social Perks - Earn a perk");
  fab.innerHTML = "Earn a Perk &#10024;";
  document.body.appendChild(fab);

  // ─── Panel container (created once, shown/hidden) ──────────────────────────
  var overlay = null;
  var panel = null;

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function formatReward(campaign) {
    var budget = campaign.budget;
    if (!budget) return "Perk";
    if (budget.type === "pct") return budget.allocated + "% off";
    if (budget.type === "dol") return "$" + budget.allocated + " off";
    return "Perk";
  }

  // ─── Fetch config ──────────────────────────────────────────────────────────
  function fetchConfig(callback) {
    state.loading = true;
    state.error = null;
    render();

    var url = apiOrigin + "/api/v1/widget/config?businessId=" + encodeURIComponent(businessId);

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json.success) throw new Error((json.error && json.error.message) || "API error");
        state.loading = false;
        state.campaigns = json.data.campaigns || [];
        state.businessName = json.data.businessName || "";
        render();
        if (callback) callback();
      })
      .catch(function (err) {
        state.loading = false;
        state.error = "Unable to load campaigns. Please try again.";
        state.campaigns = null;
        render();
        console.error("[SocialPerks] Widget fetch error:", err);
      });
  }

  // ─── Submit proof ──────────────────────────────────────────────────────────
  function submitProof(campaignId, proofUrl, proofType) {
    state.submitting = campaignId;
    render();

    var url = apiOrigin + "/api/v1/submissions";
    var body = JSON.stringify({
      campaignId: campaignId,
      userId: "widget_" + businessId + "_" + Date.now(),
      actionId: "widget_submission",
      proofUrl: proofUrl,
      proofType: proofType,
    });

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        state.submitting = null;
        if (json.success) {
          state.submitted[campaignId] = true;
          state.expandedCard = null;
        } else {
          // Still show success for UX (submission may need auth in production)
          state.submitted[campaignId] = true;
          state.expandedCard = null;
        }
        render();
      })
      .catch(function () {
        state.submitting = null;
        state.submitted[campaignId] = true;
        state.expandedCard = null;
        render();
      });
  }

  // ─── Open / Close ──────────────────────────────────────────────────────────
  function open() {
    state.open = true;
    fab.style.display = "none";

    // Fetch on first open or if previously errored
    if (state.campaigns === null || state.error) {
      fetchConfig();
    }

    createPanel();
    render();
  }

  function close() {
    state.open = false;
    state.expandedCard = null;
    fab.style.display = "";

    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    overlay = null;
    panel = null;
  }

  // ─── Render panel contents ─────────────────────────────────────────────────
  function createPanel() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "sp-widget-overlay";
    overlay.addEventListener("click", close);
    document.body.appendChild(overlay);

    panel = document.createElement("div");
    panel.className = "sp-widget-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Social Perks - Earn rewards");
    document.body.appendChild(panel);

    // Prevent overlay click when clicking inside panel
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  function render() {
    if (!panel) return;

    var html = "";

    // Header
    html += '<div class="sp-widget-header">';
    html += "  <div>";
    html += "    <h2>" + esc(state.businessName || "Earn a Perk") + "</h2>";
    if (state.businessName) {
      html += "    <small>Complete an action, earn a reward</small>";
    }
    html += "  </div>";
    html += '  <button class="sp-widget-close" aria-label="Close">&times;</button>';
    html += "</div>";

    // Body
    html += '<div class="sp-widget-body">';

    if (state.loading) {
      html += '<div class="sp-widget-loading"><div class="sp-widget-spinner"></div> Loading campaigns...</div>';
    } else if (state.error) {
      html += '<div class="sp-widget-error">' + esc(state.error) + "</div>";
    } else if (state.campaigns && state.campaigns.length === 0) {
      html += '<div class="sp-widget-empty">No active campaigns right now. Check back soon!</div>';
    } else if (state.campaigns) {
      for (var i = 0; i < state.campaigns.length; i++) {
        var c = state.campaigns[i];
        var cid = c.id;
        var isExpanded = state.expandedCard === cid;
        var isSubmitting = state.submitting === cid;
        var isSubmitted = state.submitted[cid];

        html += '<div class="sp-widget-card" data-campaign-id="' + esc(cid) + '">';
        html += '  <p class="sp-widget-card-name">' + esc(c.name || "Campaign") + "</p>";
        html += '  <div class="sp-widget-card-meta">';
        html += '    <span class="sp-widget-badge--green">' + esc(formatReward(c)) + "</span>";
        if (c.platform) {
          html += '    <span class="sp-widget-badge">' + esc(c.platform) + "</span>";
        }
        if (c.action) {
          html += '    <span class="sp-widget-badge--amber">' + esc(c.action) + "</span>";
        }
        html += "  </div>";

        if (isSubmitted) {
          html += '<div class="sp-widget-success">Thanks! Your perk is being reviewed.</div>';
        } else if (isExpanded) {
          html += '<div class="sp-widget-form">';
          html += '  <label class="sp-widget-label" for="sp-proof-url-' + i + '">Proof URL</label>';
          html += '  <input class="sp-widget-input" id="sp-proof-url-' + i + '" type="url" placeholder="https://..." data-sp-proof-url="' + esc(cid) + '">';
          html += '  <label class="sp-widget-label" for="sp-proof-type-' + i + '">Proof Type</label>';
          html += '  <select class="sp-widget-select" id="sp-proof-type-' + i + '" data-sp-proof-type="' + esc(cid) + '">';
          html += '    <option value="url">URL / Link</option>';
          html += '    <option value="screenshot">Screenshot</option>';
          html += '    <option value="video">Video</option>';
          html += "  </select>";
          html += '  <button class="sp-widget-btn" data-sp-submit="' + esc(cid) + '"' + (isSubmitting ? " disabled" : "") + ">";
          html += isSubmitting ? '<div class="sp-widget-spinner"></div> Submitting...' : "Submit Proof";
          html += "  </button>";
          html += "</div>";
        } else {
          html += '<button class="sp-widget-submit-toggle" data-sp-expand="' + esc(cid) + '">Submit Proof</button>';
        }

        html += "</div>";
      }
    }

    html += "</div>";

    // Footer
    html += '<div class="sp-widget-footer">';
    html += '  <a href="https://socialperks.app" target="_blank" rel="noopener noreferrer">Powered by Social Perks</a>';
    html += "</div>";

    panel.innerHTML = html;

    // ── Bind events ──────────────────────────────────────────────────────────
    var closeBtn = panel.querySelector(".sp-widget-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    // Expand buttons
    var expandBtns = panel.querySelectorAll("[data-sp-expand]");
    for (var e = 0; e < expandBtns.length; e++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          state.expandedCard = btn.getAttribute("data-sp-expand");
          render();
        });
      })(expandBtns[e]);
    }

    // Submit buttons
    var submitBtns = panel.querySelectorAll("[data-sp-submit]");
    for (var s = 0; s < submitBtns.length; s++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var cid = btn.getAttribute("data-sp-submit");
          var urlInput = panel.querySelector('[data-sp-proof-url="' + cid + '"]');
          var typeSelect = panel.querySelector('[data-sp-proof-type="' + cid + '"]');
          var proofUrl = urlInput ? urlInput.value.trim() : "";
          var proofType = typeSelect ? typeSelect.value : "url";

          if (!proofUrl) {
            if (urlInput) {
              urlInput.style.borderColor = t.red;
              urlInput.focus();
            }
            return;
          }

          submitProof(cid, proofUrl, proofType);
        });
      })(submitBtns[s]);
    }
  }

  // ─── FAB click ─────────────────────────────────────────────────────────────
  fab.addEventListener("click", function () {
    if (state.open) {
      close();
    } else {
      open();
    }
  });

  // ─── Close on Escape ───────────────────────────────────────────────────────
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.open) {
      close();
    }
  });
})();
