/**
 * UI utilities for the NuGet Package Manager
 * Contains utility functions for DOM manipulation, formatting, icons, and UI elements
 */

// Initialize global variables early to prevent undefined errors in other modules
if (typeof window !== "undefined") {
  // VSCode API
  window.vscode = window.vscode || acquireVsCodeApi();

  // Global state variables
  window.selectedPackage = window.selectedPackage || null;
  window.packages = window.packages || [];
  window.sources = window.sources || [];
  window.projects = window.projects || [];
  window.searchEndpoints = window.searchEndpoints || [];
  window.isOperationInProgress = window.isOperationInProgress || false;
  window.pendingSelections = window.pendingSelections || new Map();
  window.nugetSearchResults = window.nugetSearchResults || [];
  window.searchTimeout = window.searchTimeout || null;
  window.isSearchingNuGet = window.isSearchingNuGet || false;
  window.activeTab = window.activeTab || "installed";
  window.browseTabInitialized = window.browseTabInitialized || false;
  window.isPreloadInProgress = window.isPreloadInProgress || false;
  window.allFeeds = window.allFeeds || [];
  window.originalFeedStates = window.originalFeedStates || {};
  // Pagination variables for infinite scrolling
  window.currentSkip = window.currentSkip || 0;
  window.currentTake = window.currentTake || 25;
  window.hasMoreResults = window.hasMoreResults !== false; // default to true
  window.isLoadingMore = window.isLoadingMore || false;
  window.currentSearchQuery = window.currentSearchQuery || "";
  
  // Cache for default browse results (keyed by source + prerelease state)
  window.browseDefaultCache = window.browseDefaultCache || null;
  window.browseDefaultCacheKey = window.browseDefaultCacheKey || null;
  
  // Debounce tracking
  window.lastSearchId = window.lastSearchId || 0;
  
  // Request tracking to prevent race conditions
  window.currentRequestId = window.currentRequestId || 0;
  window.lastCompletedRequestId = window.lastCompletedRequestId || 0;
}

// Utility functions for webview
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showLoading(loadingOverlay) {
  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
  }
}

function hideLoading(loadingOverlay) {
  if (loadingOverlay) {
    loadingOverlay.style.display = "none";
  }
}

function generateOperationKey(operation, packageName, projectPath) {
  return `${operation}:${packageName}:${projectPath}`;
}

// Create package icon element
function createPackageIcon(iconUrl) {
  const iconContainer = document.createElement("div");
  iconContainer.className = "package-icon";

  if (iconUrl) {
    const img = document.createElement("img");
    img.src = iconUrl;
    img.onerror = () => {
      // Fallback to default NuGet icon (outlined, theme-aware)
      iconContainer.innerHTML = `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.3369 5.81836C22.06 5.84398 23.7022 6.55234 24.9043 7.78711C26.1044 9.0199 26.7684 10.6773 26.75 12.3975V20.1621L26.7451 20.4844C26.685 22.0915 26.0314 23.6245 24.9043 24.7822C23.7023 26.0167 22.0598 26.7244 20.3369 26.75H12.54C10.8169 26.7244 9.17379 26.017 7.97168 24.7822C6.76953 23.5474 6.10625 21.8854 6.12695 20.1621V12.3975C6.10858 10.6775 6.77178 9.01986 7.97168 7.78711C9.17379 6.55228 10.8169 5.84393 12.54 5.81836H20.3369ZM19.6846 16.4639C19.0406 16.4587 18.4093 16.644 17.8701 16.9961C17.3307 17.3485 16.9073 17.8532 16.6533 18.4453C16.3994 19.0374 16.326 19.6916 16.4424 20.3252C16.5588 20.9587 16.8599 21.5437 17.3076 22.0068C17.7554 22.47 18.3297 22.791 18.959 22.9287C19.5883 23.0664 20.2444 23.015 20.8447 22.7812C21.4451 22.5474 21.9636 22.1415 22.334 21.6143C22.7043 21.0872 22.9102 20.4623 22.9268 19.8184L22.9365 19.4551L22.9482 19.4453C22.9203 19.1307 22.8476 18.821 22.7305 18.5264C22.5699 18.1225 22.3307 17.7546 22.0264 17.4443C21.7219 17.134 21.3579 16.887 20.957 16.7188C20.5563 16.5506 20.126 16.4638 19.6914 16.4639H19.6846ZM11.7217 10.207C11.2447 10.2156 10.7896 10.4108 10.4551 10.751C10.1202 11.0916 9.93259 11.5506 9.93262 12.0283C9.93262 12.5114 10.1252 12.9748 10.4668 13.3164C10.8083 13.6578 11.2711 13.8495 11.7539 13.8496H11.7627C12.2456 13.8439 12.7064 13.6471 13.0439 13.3018C13.3815 12.9562 13.5681 12.4899 13.5625 12.0068C13.5567 11.524 13.36 11.0631 13.0146 10.7256C12.6695 10.3883 12.2042 10.2018 11.7217 10.207ZM4.06543 1.25C4.62082 1.25004 5.16471 1.41478 5.62695 1.72266C6.08894 2.03051 6.45004 2.4682 6.66406 2.98047C6.87806 3.49285 6.93589 4.05744 6.83008 4.60254C6.72426 5.14748 6.45934 5.64891 6.06934 6.04395C5.67913 6.43902 5.18047 6.71063 4.63672 6.82324C4.09291 6.9358 3.52773 6.88446 3.0127 6.67676C2.49763 6.46901 2.05477 6.11368 1.74121 5.65527C1.42779 5.19693 1.25691 4.6558 1.25 4.10059C1.24539 3.72805 1.31478 3.35823 1.4541 3.0127C1.59352 2.66702 1.80058 2.3521 2.0625 2.08691C2.3244 1.82178 2.6366 1.61144 2.98047 1.46777C3.3242 1.32419 3.69292 1.25003 4.06543 1.25Z" stroke="currentColor" stroke-width="1"/></svg>`;
    };
    iconContainer.appendChild(img);
  } else {
    // Default NuGet icon (outlined, theme-aware)
    iconContainer.innerHTML = `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.3369 5.81836C22.06 5.84398 23.7022 6.55234 24.9043 7.78711C26.1044 9.0199 26.7684 10.6773 26.75 12.3975V20.1621L26.7451 20.4844C26.685 22.0915 26.0314 23.6245 24.9043 24.7822C23.7023 26.0167 22.0598 26.7244 20.3369 26.75H12.54C10.8169 26.7244 9.17379 26.017 7.97168 24.7822C6.76953 23.5474 6.10625 21.8854 6.12695 20.1621V12.3975C6.10858 10.6775 6.77178 9.01986 7.97168 7.78711C9.17379 6.55228 10.8169 5.84393 12.54 5.81836H20.3369ZM19.6846 16.4639C19.0406 16.4587 18.4093 16.644 17.8701 16.9961C17.3307 17.3485 16.9073 17.8532 16.6533 18.4453C16.3994 19.0374 16.326 19.6916 16.4424 20.3252C16.5588 20.9587 16.8599 21.5437 17.3076 22.0068C17.7554 22.47 18.3297 22.791 18.959 22.9287C19.5883 23.0664 20.2444 23.015 20.8447 22.7812C21.4451 22.5474 21.9636 22.1415 22.334 21.6143C22.7043 21.0872 22.9102 20.4623 22.9268 19.8184L22.9365 19.4551L22.9482 19.4453C22.9203 19.1307 22.8476 18.821 22.7305 18.5264C22.5699 18.1225 22.3307 17.7546 22.0264 17.4443C21.7219 17.134 21.3579 16.887 20.957 16.7188C20.5563 16.5506 20.126 16.4638 19.6914 16.4639H19.6846ZM11.7217 10.207C11.2447 10.2156 10.7896 10.4108 10.4551 10.751C10.1202 11.0916 9.93259 11.5506 9.93262 12.0283C9.93262 12.5114 10.1252 12.9748 10.4668 13.3164C10.8083 13.6578 11.2711 13.8495 11.7539 13.8496H11.7627C12.2456 13.8439 12.7064 13.6471 13.0439 13.3018C13.3815 12.9562 13.5681 12.4899 13.5625 12.0068C13.5567 11.524 13.36 11.0631 13.0146 10.7256C12.6695 10.3883 12.2042 10.2018 11.7217 10.207ZM4.06543 1.25C4.62082 1.25004 5.16471 1.41478 5.62695 1.72266C6.08894 2.03051 6.45004 2.4682 6.66406 2.98047C6.87806 3.49285 6.93589 4.05744 6.83008 4.60254C6.72426 5.14748 6.45934 5.64891 6.06934 6.04395C5.67913 6.43902 5.18047 6.71063 4.63672 6.82324C4.09291 6.9358 3.52773 6.88446 3.0127 6.67676C2.49763 6.46901 2.05477 6.11368 1.74121 5.65527C1.42779 5.19693 1.25691 4.6558 1.25 4.10059C1.24539 3.72805 1.31478 3.35823 1.4541 3.0127C1.59352 2.66702 1.80058 2.3521 2.0625 2.08691C2.3244 1.82178 2.6366 1.61144 2.98047 1.46777C3.3242 1.32419 3.69292 1.25003 4.06543 1.25Z" stroke="currentColor" stroke-width="1"/></svg>`;
  }

  return iconContainer;
}

// Format number with commas
function formatNumber(num) {
  return num ? num.toLocaleString() : "0";
}

// Format number in compact format (1.5B, 653.9M, etc.)
function formatCompactNumber(num) {
  if (!num || num < 1000) {
    return num ? num.toString() : "0";
  }

  const units = [
    { value: 1000000000, suffix: "B" },
    { value: 1000000, suffix: "M" },
    { value: 1000, suffix: "K" },
  ];

  for (const unit of units) {
    if (num >= unit.value) {
      const formatted = (num / unit.value).toFixed(1);
      // Remove .0 if it's a whole number
      const finalValue = formatted.endsWith(".0")
        ? formatted.slice(0, -2)
        : formatted;
      return finalValue + unit.suffix;
    }
  }

  return num.toString();
}

// Search icon/spinner management
function showSearchSpinner() {
  const searchIcon = document.querySelector(".search-icon");
  const searchSpinner = document.querySelector(".search-spinner");
  if (searchIcon && searchSpinner) {
    searchIcon.style.display = "none";
    searchSpinner.style.display = "block";
  }
}

function hideSearchSpinner() {
  const searchIcon = document.querySelector(".search-icon");
  const searchSpinner = document.querySelector(".search-spinner");
  if (searchIcon && searchSpinner) {
    searchIcon.style.display = "block";
    searchSpinner.style.display = "none";
  }
}

function showEmptyPackageDetails() {
  const packageDetails = document.getElementById("packageDetails");
  if (packageDetails) {
    // Reset any existing animations
    if (typeof resetPackageDetailsAnimation === "function") {
      resetPackageDetailsAnimation();
    }

    packageDetails.innerHTML = `
      <div class="empty-state">
          <svg class="empty-state-svg" xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 12.5l-5 -3l5 -3l5 3v5.5l-5 3z" />
              <path d="M11 9.5v5.5l5 3" />
              <path d="M16 12.545l5 -3.03" />
              <path d="M7 9h-5" />
              <path d="M7 12h-3" />
              <path d="M7 15h-1" />
          </svg>
          <div class="empty-state-title">Package Details</div>
          <div class="empty-state-description">Select a package to view details</div>
      </div>
    `;
  }
}

function toggleSection(header) {
  const content = header.nextElementSibling;
  header.classList.toggle("collapsed");
  content.classList.toggle("hidden");
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.escapeHtml = escapeHtml;
  window.showLoading = showLoading;
  window.hideLoading = hideLoading;
  window.generateOperationKey = generateOperationKey;
  window.createPackageIcon = createPackageIcon;
  window.formatNumber = formatNumber;
  window.formatCompactNumber = formatCompactNumber;
  window.showSearchSpinner = showSearchSpinner;
  window.hideSearchSpinner = hideSearchSpinner;
  window.showEmptyPackageDetails = showEmptyPackageDetails;
  window.toggleSection = toggleSection;
}
