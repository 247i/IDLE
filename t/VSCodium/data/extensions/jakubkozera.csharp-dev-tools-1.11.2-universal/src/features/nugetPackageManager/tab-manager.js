/**
 * Tab management utilities for the NuGet Package Manager
 * Contains functionality for switching between installed and browse tabs
 */

// Tab switching functionality
function switchTab(tabName) {
  const activeTab = getActiveTab();

  // Update active tab
  setActiveTab(tabName);
  // Update tab button states
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Activate selected tab
  const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
  const tabContent = document.getElementById(`${tabName}Content`);

  if (tabButton) tabButton.classList.add("active");
  if (tabContent) tabContent.classList.add("active");

  // Clear package details when switching tabs
  showEmptyPackageDetails();

  // Always hide spinner when switching tabs
  hideSearchSpinner();

  // Remove skip-animations class so new content animates
  const packageList = document.getElementById('packageList');
  const browseList = document.getElementById('browseList');
  if (packageList) packageList.classList.remove('skip-animations');
  if (browseList) browseList.classList.remove('skip-animations');

  // Update placeholder text based on active tab but keep the search value
  const searchPackages = document.getElementById("searchPackages");
  if (searchPackages) {
    if (tabName === "installed") {
      searchPackages.placeholder = "Search packages...";
      // Trigger filtering for current search term if any - ONLY for installed packages
      // Only filter if packages are already loaded (prevents double render on initial load)
      if (window.packages && window.packages.length > 0) {
        filterPackages();
      }
    } else if (tabName === "browse") {
      searchPackages.placeholder = "Search packages...";

      const browseTabInitialized = getBrowseTabInitialized();
      const isPreloadInProgress = getIsPreloadInProgress();
      const searchTerm = searchPackages.value.trim();

      // ALWAYS check for search term first - if user has typed something, search for it
      if (searchTerm) {
        // Scroll to top of the package list before starting new search
        const browseList = document.getElementById("browseList");
        if (browseList) {
          browseList.scrollTop = 0;
        }

        // Reset pagination for new search
        setCurrentSkip(0);
        setHasMoreResults(true);
        setCurrentSearchQuery(searchTerm);

        // Trigger search for the current search term
        debouncedNuGetSearch(searchTerm);
      }
      // Check if we already have packages loaded (either preloaded or from previous searches) - only when no search term
      else if (window.nugetSearchResults.length > 0) {
        // Just update the display with existing results
        updateBrowseDisplay();
      } else if (!browseTabInitialized && !isPreloadInProgress) {
        setBrowseTabInitialized(true);

        // Reset pagination for new tab initialization
        setCurrentSkip(0);
        setHasMoreResults(true);
        setCurrentSearchQuery("");

        // Load default packages immediately when first accessing browse tab
        searchPackagesViaBackend("", null, 0, getCurrentTake());
      } else if (isPreloadInProgress) {
        console.log(
          "⏳ Browse tab: Preload in progress, showing loading state"
        );
        // Show loading state while preload is in progress
        const browseList = document.getElementById("browseList");        if (browseList) {
          browseList.innerHTML = `
            <div class="empty-state">
                <div class="spinner" style="margin: 0 auto 15px;"></div>
                <svg class="empty-state-svg" viewBox="0 0 24 24" style="display: none;">
                    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L20.71,20L19.29,21.41L13.03,15.14C11.88,15.88 10.5,16.5 9.5,16.5A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                </svg>
                <div class="empty-state-title">Browse NuGet Packages</div>
                <div class="empty-state-description">Loading popular packages from nuget.org...</div>
            </div>
          `;
        }
      } else {
        // This branch should only be reached if browseTabInitialized is true but we have no results
        // This could happen if there was an error or the results were cleared
        console.log(
          "Browse tab: Re-loading default packages (no existing results and no search term)"
        );

        // Reset pagination and load default packages
        setCurrentSkip(0);
        setHasMoreResults(true);
        setCurrentSearchQuery("");

        // Load default packages
        searchPackagesViaBackend("", null, 0, getCurrentTake());
      }
    }
  }
}

// Helper functions to get/set state from main file
function getActiveTab() {
  return window.activeTab || "installed";
}

function setActiveTab(tabName) {
  window.activeTab = tabName;
}

function getBrowseTabInitialized() {
  return window.browseTabInitialized || false;
}

function setBrowseTabInitialized(value) {
  window.browseTabInitialized = value;
}

function getIsPreloadInProgress() {
  return window.isPreloadInProgress || false;
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.switchTab = switchTab;
  window.getActiveTab = getActiveTab;
  window.setActiveTab = setActiveTab;
  window.getBrowseTabInitialized = getBrowseTabInitialized;
  window.setBrowseTabInitialized = setBrowseTabInitialized;
}
