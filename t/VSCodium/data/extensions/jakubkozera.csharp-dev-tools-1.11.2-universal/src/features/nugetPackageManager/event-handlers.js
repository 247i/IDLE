/**
 * Event handlers for the NuGet Package Manager
 * Contains all event listeners and their handlers
 */

// Initialize all event listeners
function initializeEventHandlers() {
  // Get DOM elements
  const searchPackages = document.getElementById("searchPackages");
  const installedTab = document.getElementById("installedTab");
  const browseTab = document.getElementById("browseTab");
  const prereleaseToggle = document.getElementById("prereleaseToggle");
  const refreshBtn = document.getElementById("refreshBtn");
  const browseList = document.getElementById("browseList");
  const settingsBtn = document.getElementById("settingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const openNuGetConfigBtn = document.getElementById("openNuGetConfigBtn");
  const settingsModal = document.getElementById("settingsModal");
  const packageList = document.getElementById("packageList");

  // Search input event listener
  if (searchPackages) {
    searchPackages.addEventListener("input", handleSearchInput);
  }

  // Tab event listeners
  if (installedTab) {
    installedTab.addEventListener("click", () => switchTab("installed"));
  }
  if (browseTab) {
    browseTab.addEventListener("click", () => switchTab("browse"));
  }

  // Note: Dropdown change handlers are now managed by SharedDropdown component
  // via the onChange callback passed during initialization in populateFilters()

  if (prereleaseToggle) {
    prereleaseToggle.addEventListener("change", handlePrereleaseToggleChange);
  }

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener("click", handleRefreshClick);
  }

  // Add scroll event listener for infinite scrolling on browse list
  if (browseList) {
    browseList.addEventListener("scroll", throttledScrollCheck);
  }
  // Settings event listeners
  if (settingsBtn) {
    
    settingsBtn.addEventListener("click", handleSettingsClick);
  } else {
    console.error("Settings button not found");
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", handleCloseSettingsClick);
  }
  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener("click", handleCancelSettingsClick);
  }
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", handleSaveSettingsClick);
  }
  if (openNuGetConfigBtn) {
    openNuGetConfigBtn.addEventListener("click", handleOpenNuGetConfigClick);
  }

  // Close modal when clicking outside
  if (settingsModal) {
    settingsModal.addEventListener("click", handleSettingsModalClick);
  }

  // Mobile close panel button
  const closePanelBtn = document.getElementById("closePanelBtn");
  if (closePanelBtn) {
    closePanelBtn.addEventListener("click", handleClosePanelClick);
  }

  // Close panel when clicking backdrop on mobile
  const rightPanel = document.querySelector(".right-panel");
  if (rightPanel) {
    rightPanel.addEventListener("click", handleRightPanelBackdropClick);
  }

  // Package item click handlers
  if (packageList) {
    packageList.addEventListener("click", handlePackageListClick);
  }
  if (browseList) {
    browseList.addEventListener("click", handleBrowseListClick);
  }
}

// Event handler functions
function handleSearchInput(e) {
  const query = e.target.value;
  const activeTab = getActiveTab();

  if (activeTab === "installed") {
    filterPackages();
  } else if (activeTab === "browse") {
    debouncedNuGetSearch(query);
  }
}

function handleProjectSelectChange() {
  const activeTab = getActiveTab();
  if (activeTab === "installed") {
    filterPackages();
  }
}

function handleFeedSelectChange() {
  const activeTab = getActiveTab();
  
  // Clear default browse cache when feed changes (results will be different)
  if (typeof clearBrowseDefaultCache === "function") {
    clearBrowseDefaultCache();
  }
  
  if (activeTab === "installed") {
    filterPackages();
  } else if (activeTab === "browse") {
    // Trigger new search with current search term and new feed
    const searchPackages = document.getElementById("searchPackages");
    const searchTerm = searchPackages ? searchPackages.value.trim() : "";

    // Reset pagination
    setCurrentSkip(0);
    setHasMoreResults(true);
    setNugetSearchResults([]);

    // Trigger new search
    debouncedNuGetSearch(searchTerm);
  }
}

// Note: handleProjectSelectChange and handleFeedSelectChange are kept for compatibility
// but are now triggered by SharedDropdown's onChange callbacks rather than direct event listeners

function handlePrereleaseToggleChange() {
  const activeTab = getActiveTab();
  
  // Clear default browse cache when prerelease changes (results will be different)
  if (typeof clearBrowseDefaultCache === "function") {
    clearBrowseDefaultCache();
  }
  
  if (activeTab === "installed") {
    filterPackages();
  } else if (activeTab === "browse") {
    // Trigger new search with updated prerelease setting
    const searchPackages = document.getElementById("searchPackages");
    const searchTerm = searchPackages ? searchPackages.value.trim() : "";
    if (searchTerm) {
      debouncedNuGetSearch(searchTerm);
    } else {
      // Refresh with empty search to show all packages with new prerelease setting
      searchPackagesViaBackend("", null, 0, getCurrentTake());
    }
  }

  // Refresh version dropdown when prerelease setting changes
  const selectedPackage = getSelectedPackage();
  if (selectedPackage) {
    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "getPackageVersions",
        packageName: selectedPackage.name,
      });
    }
  }
}

function handleRefreshClick() {
  // Show loading overlay
  if (typeof showLeftPanelLoadingOverlay === "function") {
    showLeftPanelLoadingOverlay();

    // Add a fallback timeout to hide overlay after 30 seconds
    setTimeout(() => {
      if (typeof hideLeftPanelLoadingOverlay === "function") {
        hideLeftPanelLoadingOverlay();
      }
    }, 30000); // 30 seconds timeout
  }

  if (typeof vscode !== "undefined") {
    vscode.postMessage({ command: "refreshPackages" });
  } else {
    // For testing without vscode context, hide overlay after 2 seconds
    setTimeout(() => {
      if (typeof hideLeftPanelLoadingOverlay === "function") {
        hideLeftPanelLoadingOverlay();
      }
    }, 2000);
  }
}

function handleSettingsClick() {
  
  openSettingsModal();
}

function handleCloseSettingsClick() {
  closeSettingsModal();
}

function handleCancelSettingsClick() {
  closeSettingsModal();
}

function handleSaveSettingsClick() {
  saveSettings();
}

function handleOpenNuGetConfigClick() {
  if (typeof vscode !== "undefined") {
    vscode.postMessage({ command: "openNuGetConfig" });
  }
}

function handleSettingsModalClick(e) {
  const settingsModal = document.getElementById("settingsModal");
  if (e.target === settingsModal) {
    closeSettingsModal();
  }
}

function handlePackageListClick(e) {
  

  // Check if the click is on the folder icon button or its children
  const folderBtn = e.target.closest(".folder-icon-btn");
  if (folderBtn) {
    
    handleFolderIconClick(e, folderBtn);
    return; // Don't process package selection for folder icon clicks
  }

  const packageItem = e.target.closest(".package-item");
  
  if (packageItem) {
    selectPackage(packageItem);
  } else {
    
  }
}

function handleBrowseListClick(e) {
  // Check if the click is on the folder icon button or its children
  const folderBtn = e.target.closest(".folder-icon-btn");
  if (folderBtn) {
    handleFolderIconClick(e, folderBtn);
    return; // Don't process package selection for folder icon clicks
  }

  const nugetPackageItem = e.target.closest(".nuget-package-item");
  if (nugetPackageItem) {
    selectNuGetPackage(nugetPackageItem);
  }
}

// Keyboard event handlers
function handleKeyboardEvents() {
  document.addEventListener("keydown", (e) => {
    // ESC key to close modals
    if (e.key === "Escape") {
      const settingsModal = document.getElementById("settingsModal");
      if (settingsModal && settingsModal.classList.contains("show")) {
        closeSettingsModal();
        e.preventDefault();
      }
    }

    // Ctrl+F to focus search
    if (e.ctrlKey && e.key === "f") {
      const searchPackages = document.getElementById("searchPackages");
      if (searchPackages) {
        searchPackages.focus();
        searchPackages.select();
        e.preventDefault();
      }
    }

    // Ctrl+R to refresh
    if (e.ctrlKey && e.key === "r") {
      if (typeof vscode !== "undefined") {
        vscode.postMessage({ command: "refreshPackages" });
      }
      e.preventDefault();
    }

    // Tab navigation
    if (e.key === "Tab" && e.ctrlKey) {
      const activeTab = getActiveTab();
      if (activeTab === "installed") {
        switchTab("browse");
      } else {
        switchTab("installed");
      }
      e.preventDefault();
    }
  });
}

// Mobile panel handlers
function handleClosePanelClick(e) {
  e.stopPropagation();
  closeMobilePanel();
}

function handleRightPanelBackdropClick(e) {
  // Close panel only if clicking on the backdrop (::before pseudo-element area)
  const rightPanel = document.querySelector(".right-panel");
  if (e.target === rightPanel && rightPanel.classList.contains("mobile-active")) {
    closeMobilePanel();
  }
}

function openMobilePanel() {
  const rightPanel = document.querySelector(".right-panel");
  if (rightPanel && window.innerWidth <= 900) {
    rightPanel.classList.add("mobile-active");
    // Prevent body scroll when panel is open
    document.body.style.overflow = "hidden";
  }
}

function closeMobilePanel() {
  const rightPanel = document.querySelector(".right-panel");
  if (rightPanel) {
    rightPanel.classList.remove("mobile-active");
    // Restore body scroll
    document.body.style.overflow = "";
  }
}

// Initialize all event handling
function initializeAllEventHandlers() {
  initializeEventHandlers();
  handleKeyboardEvents();
  initializeMessageHandler();
}

// Helper function to get selected package
function getSelectedPackage() {
  return window.selectedPackage || null;
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.initializeEventHandlers = initializeEventHandlers;
  window.initializeAllEventHandlers = initializeAllEventHandlers;
  window.handleKeyboardEvents = handleKeyboardEvents;
  window.openMobilePanel = openMobilePanel;
  window.closeMobilePanel = closeMobilePanel;

  // Individual event handlers
  window.handleSearchInput = handleSearchInput;
  window.handleProjectSelectChange = handleProjectSelectChange;
  window.handleFeedSelectChange = handleFeedSelectChange;
  window.handlePrereleaseToggleChange = handlePrereleaseToggleChange;
  window.handleRefreshClick = handleRefreshClick;
  window.handleSettingsClick = handleSettingsClick;
  window.handleCloseSettingsClick = handleCloseSettingsClick;
  window.handleCancelSettingsClick = handleCancelSettingsClick;
  window.handleSaveSettingsClick = handleSaveSettingsClick;
  window.handleOpenNuGetConfigClick = handleOpenNuGetConfigClick;
  window.handleSettingsModalClick = handleSettingsModalClick;
  window.handlePackageListClick = handlePackageListClick;
  window.handleBrowseListClick = handleBrowseListClick;
}
