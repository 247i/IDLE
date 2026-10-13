/**
 * Search and pagination utilities for the NuGet Package Manager
 * Contains functionality for searching packages, debouncing, infinite scrolling, and pagination
 */

// Access global variables from main module via window object
// Global state is managed in nuget-manager-main.js

// Module-specific scroll throttling variables
let scrollThrottleTimeout = null;
let lastScrollTime = 0;
let isActivelyScrolling = false;

// New backend-based search function
async function searchPackagesViaBackend(
  query,
  source = null,
  skip = 0,
  take = 25
) {
  // If no source specified, use the selected feed
  if (!source) {
    const feedSelect = document.getElementById("feedSelect");
    const selectedFeed = feedSelect ? feedSelect.value : null;
    source = selectedFeed || null;
  }

  // Get the current prerelease checkbox state
  const prereleaseToggle = document.getElementById("prereleaseToggle");
  const includePrerelease = prereleaseToggle ? prereleaseToggle.checked : false;

  // Generate unique request ID to track this specific request
  const requestId = ++window.currentRequestId;
  
  console.log(
    `🔍 [Request #${requestId}] Searching packages via backend: "${query}", source: ${source}, skip: ${skip}, take: ${take}, includePrerelease: ${includePrerelease}`
  );
  
  // Set searching flag
  window.isSearchingNuGet = true;

  // Send search request to backend with request ID
  if (typeof vscode !== "undefined") {
    vscode.postMessage({
      command: "searchPackages",
      query: query || "",
      source: source,
      skip: skip,
      take: take,
      includePrerelease: includePrerelease,
      requestId: requestId, // Include request ID in message
    });
  }

  // Results will be handled by the "searchResults" message handler
  // This function is async but doesn't return anything since results come via message
}

// Update browseCount element with loading state
function updateBrowseCountLoadingState(isLoading) {
  const browseCountElement = document.getElementById("browseCount");
  if (browseCountElement) {
    if (isLoading) {
      browseCountElement.innerHTML = `
        <div class="inline-loading-spinner" style="margin-right: 6px;"></div>
        <span>Searching packages...</span>
      `;
    } else {
      // Will be updated by updateBrowseDisplay after results come
      const nugetSearchResults = getNugetSearchResults();
      const hasMoreResults = getHasMoreResults();
      const countText =
        nugetSearchResults.length > 0
          ? `${nugetSearchResults.length} packages found${
              hasMoreResults ? "+" : ""
            }`
          : "No packages";
      browseCountElement.textContent = countText;
    }
  }
}

// Generate cache key for default browse results
function generateBrowseCacheKey() {
  const feedSelect = document.getElementById("feedSelect");
  const prereleaseToggle = document.getElementById("prereleaseToggle");
  const selectedFeed = feedSelect ? feedSelect.value : "";
  const includePrerelease = prereleaseToggle ? prereleaseToggle.checked : false;
  return `${selectedFeed}|${includePrerelease}`;
}

// Save default results to cache
function saveBrowseDefaultCache(results, hasMore) {
  const cacheKey = generateBrowseCacheKey();
  window.browseDefaultCache = {
    results: [...results],
    hasMoreResults: hasMore,
    timestamp: Date.now()
  };
  window.browseDefaultCacheKey = cacheKey;
}

// Try to load from cache
function loadBrowseDefaultCache() {
  const currentKey = generateBrowseCacheKey();
  
  // Check if cache exists and key matches (same source + prerelease state)
  if (window.browseDefaultCache && window.browseDefaultCacheKey === currentKey) {
    return window.browseDefaultCache;
  }
  
  return null;
}

// Clear browse cache (call when source or prerelease changes)
function clearBrowseDefaultCache() {
  window.browseDefaultCache = null;
  window.browseDefaultCacheKey = null;
}

// Debounced search function
function debouncedNuGetSearch(query) {
  // Increment search ID to track the latest search
  const searchId = ++window.lastSearchId;
  
  // Clear any pending search timeout
  if (window.searchTimeout) {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = null;
  }
  
  // Hide spinner if previous search was cancelled
  const activeTab = getActiveTab();
  if (activeTab === "browse") {
    hideSearchSpinner();
  }
  
  // Reset pagination for new search
  window.currentSkip = 0;
  window.hasMoreResults = true;
  window.currentSearchQuery = query || "";
  
  // If query is empty, try to load from cache first
  const trimmedQuery = (query || "").trim();
  if (!trimmedQuery) {
    const cached = loadBrowseDefaultCache();
    if (cached) {
      // Use cached results immediately
      window.nugetSearchResults = [...cached.results];
      window.hasMoreResults = cached.hasMoreResults;
      window.currentSkip = cached.results.length;
      
      // Scroll to top
      const browseList = document.getElementById("browseList");
      if (browseList) {
        browseList.scrollTop = 0;
      }
      
      // Update display from cache
      if (typeof updateBrowseDisplay === "function") {
        updateBrowseDisplay(false);
      }
      updateBrowseCountLoadingState(false);
      return;
    }
  }

  window.searchTimeout = setTimeout(
    async () => {
      // Check if this is still the latest search request
      if (searchId !== window.lastSearchId) {
        return;
      }
      
      // Clear previous results for new search
      window.nugetSearchResults = [];
      window.currentSkip = 0;
      window.hasMoreResults = true;

      // Show spinner
      if (getActiveTab() === "browse") {
        showSearchSpinner();
        // Update browseCount to show loading state
        updateBrowseCountLoadingState(true);
      }

      // Scroll to top of the package list before starting new search
      const browseList = document.getElementById("browseList");
      if (browseList) {
        browseList.scrollTop = 0;
      }

      // Use backend search for all sources with initial pagination
      await searchPackagesViaBackend(query || "", null, 0, window.currentTake);
    },
    trimmedQuery ? 300 : 50 // 300ms for search queries (increased for better debounce), 50ms for empty queries
  );
}

// Load more results for infinite scrolling
async function loadMoreResults() {
  if (
    window.isLoadingMore ||
    !window.hasMoreResults ||
    window.isSearchingNuGet
  ) {
    console.log("⚠️ Cannot load more:", {
      isLoadingMore: window.isLoadingMore,
      hasMoreResults: window.hasMoreResults,
      isSearchingNuGet: window.isSearchingNuGet,
    });
    return;
  }

  console.log(
    `🔄 Loading more results... skip: ${
      window.currentSkip + window.currentTake
    }, take: ${window.currentTake}, query: "${window.currentSearchQuery}"`
  );

  // Set loading flag
  window.isLoadingMore = true;  // Show loading indicator
  const existingLoadMore = document.getElementById("loadingMore");
  if (existingLoadMore) {
    existingLoadMore.innerHTML = '<div class="inline-loading-spinner"></div><span>Loading more packages...</span>';
  }

  // Update skip for next batch
  window.currentSkip += window.currentTake;

  // Search for more results
  await searchPackagesViaBackend(
    window.currentSearchQuery,
    null,
    window.currentSkip,
    window.currentTake
  );
}

// Check if user scrolled near bottom of browse list
function checkScrollPosition() {
  const activeTab = getActiveTab();
  if (activeTab !== "browse") return;

  const browseList = document.getElementById("browseList");
  if (!browseList) return;

  const scrollTop = browseList.scrollTop;
  const scrollHeight = browseList.scrollHeight;
  const clientHeight = browseList.clientHeight;
  // Load more when user are within 300px of bottom (reduced from 500px for faster loading)
  const threshold = 300;
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold;
  console.log("Scroll check:", {
    isNearBottom,
    hasMoreResults: window.hasMoreResults,
    isLoadingMore: window.isLoadingMore,
    isSearchingNuGet: window.isSearchingNuGet,
    resultsLength: window.nugetSearchResults.length,
  });

  if (
    isNearBottom &&
    window.hasMoreResults &&
    !window.isLoadingMore &&
    !window.isSearchingNuGet &&
    window.nugetSearchResults.length > 0
  ) {
    loadMoreResults();
  }
}

// Throttled scroll handler to prevent excessive calls
function throttledScrollCheck() {
  
  if (scrollThrottleTimeout) return;

  // Track active scrolling for optimization
  const now = Date.now();
  isActivelyScrolling = now - lastScrollTime < 1000; // Consider actively scrolling if last scroll was within 1 second
  lastScrollTime = now;

  scrollThrottleTimeout = setTimeout(() => {
    checkScrollPosition();
    scrollThrottleTimeout = null;
  }, 25); // Reduced from 50ms to 25ms for more responsive feel
}

// Preload browse packages in the background
function preloadBrowsePackages() {
  // Only preload if not already done and no results exist
  if (
    !getBrowseTabInitialized() &&
    window.nugetSearchResults.length === 0 &&
    !getIsPreloadInProgress()
  ) {
    // Set preload flag to prevent duplicate preloads
    setIsPreloadInProgress(true);

    // Reset pagination for initial load
    window.currentSkip = 0;
    window.hasMoreResults = true;
    window.currentSearchQuery = "";

    // Load initial batch of packages silently in background from all sources
    searchPackagesViaBackend("", null, 0, window.currentTake);
  }
}

// Helper functions to get state from main file (these need to be implemented in main file)
function getActiveTab() {
  // This should be implemented to return the current active tab
  return window.activeTab || "installed";
}

function getBrowseTabInitialized() {
  return window.browseTabInitialized || false;
}

function getIsPreloadInProgress() {
  return window.isPreloadInProgress || false;
}

function setIsPreloadInProgress(value) {
  window.isPreloadInProgress = value;
}

// Getters and setters for search state
function getCurrentSkip() {
  return window.currentSkip;
}
function setCurrentSkip(value) {
  window.currentSkip = value;
}
function getCurrentTake() {
  return window.currentTake;
}
function setCurrentTake(value) {
  window.currentTake = value;
}
function getHasMoreResults() {
  return window.hasMoreResults;
}
function setHasMoreResults(value) {
  window.hasMoreResults = value;
}
function getIsLoadingMore() {
  return window.isLoadingMore;
}
function setIsLoadingMore(value) {
  window.isLoadingMore = value;
}
function getCurrentSearchQuery() {
  return window.currentSearchQuery;
}
function setCurrentSearchQuery(value) {
  window.currentSearchQuery = value;
}
function getIsSearchingNuGet() {
  return window.isSearchingNuGet;
}
function setIsSearchingNuGet(value) {
  window.isSearchingNuGet = value;
}
function getNugetSearchResults() {
  return window.nugetSearchResults;
}
function setNugetSearchResults(value) {
  window.nugetSearchResults = value;
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.searchPackagesViaBackend = searchPackagesViaBackend;
  window.debouncedNuGetSearch = debouncedNuGetSearch;
  window.loadMoreResults = loadMoreResults;
  window.checkScrollPosition = checkScrollPosition;
  window.throttledScrollCheck = throttledScrollCheck;
  window.preloadBrowsePackages = preloadBrowsePackages;
  
  // Cache functions
  window.generateBrowseCacheKey = generateBrowseCacheKey;
  window.saveBrowseDefaultCache = saveBrowseDefaultCache;
  window.loadBrowseDefaultCache = loadBrowseDefaultCache;
  window.clearBrowseDefaultCache = clearBrowseDefaultCache;

  // State getters/setters
  window.getCurrentSkip = getCurrentSkip;
  window.setCurrentSkip = setCurrentSkip;
  window.getCurrentTake = getCurrentTake;
  window.setCurrentTake = setCurrentTake;
  window.getHasMoreResults = getHasMoreResults;
  window.setHasMoreResults = setHasMoreResults;
  window.getIsLoadingMore = getIsLoadingMore;
  window.setIsLoadingMore = setIsLoadingMore;
  window.getCurrentSearchQuery = getCurrentSearchQuery;
  window.setCurrentSearchQuery = setCurrentSearchQuery;
  window.getIsSearchingNuGet = getIsSearchingNuGet;
  window.setIsSearchingNuGet = setIsSearchingNuGet;
  window.getNugetSearchResults = getNugetSearchResults;
  window.setNugetSearchResults = setNugetSearchResults;
  
  // UI update functions
  window.updateBrowseCountLoadingState = updateBrowseCountLoadingState;
}
