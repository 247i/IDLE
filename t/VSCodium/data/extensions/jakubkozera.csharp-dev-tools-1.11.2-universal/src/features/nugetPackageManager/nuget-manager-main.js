// NuGet Package Manager JavaScript - Main Application
// Global variables are initialized in ui-utils.js (loaded first)
// Access them via window object to avoid redeclaration errors

// Initialize VS Code theme detection
function initializeTheme() {
  const updateTheme = () => {
    // Get the current theme kind and name from body attributes
    const themeKind = document.body.getAttribute("data-vscode-theme-kind");
    const themeName = document.body.getAttribute("data-vscode-theme-name");
    
    // Determine the effective theme kind
    // If themeKind is already set by VS Code, use it. Otherwise try to derive from name.
    let effectiveKind = themeKind;
    
    if (!effectiveKind && themeName) {
      if (themeName.toLowerCase().includes("dark") || themeName.toLowerCase().includes("high contrast")) {
        effectiveKind = "vscode-dark";
      } else {
        effectiveKind = "vscode-light";
      }
    }
    
    // Fallback if nothing is detected
    if (!effectiveKind) {
      effectiveKind = "vscode-light";
    }

    // Only update if the attribute is missing or different
    // This prevents infinite loops with the MutationObserver
    if (document.body.getAttribute("data-vscode-theme-kind") !== effectiveKind) {
      document.body.setAttribute("data-vscode-theme-kind", effectiveKind);
    }
  };

  // Initial update
  updateTheme();

  // Listen for theme changes
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "data-vscode-theme-kind" ||
          mutation.attributeName === "data-vscode-theme-name")
      ) {
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      updateTheme();
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-vscode-theme-kind", "data-vscode-theme-name"],
  });
}

// Initialize application
function initializeApplication() {
  // Initialize all event handlers
  initializeAllEventHandlers();

  // Initialize filter buttons
  if (typeof initializeFilterButtons === 'function') {
    initializeFilterButtons();
  }

  // Initialize resizable divider
  initializeResizableDivider();

  // Initialize the default tab state
  switchTab("installed");

  // NOTE: Don't call filterPackages() here - it will be called by initializeData()
  // when the actual package data is ready. Calling it here with empty data causes
  // a double animation as the list renders twice.

  // Set initial placeholder based on active tab (default is installed)
  if (searchPackages) {
    searchPackages.placeholder = "Search packages...";
  }

  // Ensure spinner is hidden on page load
  hideSearchSpinner();

  // Preload browse packages immediately after initialization
  // Use a small delay to ensure DOM is fully ready
  setTimeout(preloadBrowsePackages, 100);
}

// Initialize resizable divider for left/right panels
function initializeResizableDivider() {
  const divider = document.getElementById('resizeDivider');
  const leftPanel = document.querySelector('.left-panel');
  const rightPanel = document.querySelector('.right-panel');
  const mainContent = document.querySelector('.main-content');
  
  if (!divider || !leftPanel || !rightPanel || !mainContent) {
    console.warn('Resizable divider elements not found');
    return;
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  const startResize = (e) => {
    // Don't resize on mobile (< 900px)
    if (window.innerWidth <= 900) {
      return;
    }

    isResizing = true;
    startX = e.clientX;
    startWidth = leftPanel.offsetWidth;
    
    divider.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  };

  const resize = (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    const containerWidth = mainContent.offsetWidth;
    
    // Calculate min/max widths (30% to 70% of container)
    const minWidth = Math.max(300, containerWidth * 0.3);
    const maxWidth = Math.min(containerWidth * 0.7, containerWidth - 300);
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      const percentage = (newWidth / containerWidth) * 100;
      leftPanel.style.flex = `0 0 ${percentage}%`;
    }
  };

  const stopResize = () => {
    if (!isResizing) return;
    
    isResizing = false;
    divider.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  divider.addEventListener('mousedown', startResize);
  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', stopResize);
  
  // Reset on window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 900) {
      leftPanel.style.flex = '';
    }
  });
}

// Initialize data when the script loads (called from backend)
function initializeData(
  packagesData,
  sourcesData,
  projectsData,
  initialSelectedProject
) {
  // Prevent double initialization
  if (window.initialDataLoaded) {
    return;
  }
  
  // Mark that initial data has been loaded BEFORE any render
  // This prevents any other code paths from triggering double render
  window.initialDataLoaded = true;

  window.packages = packagesData || [];
  window.sources = sourcesData || [];
  window.projects = projectsData || [];
  window.initialSelectedProject = initialSelectedProject || null;

  populateFilters();
  filterPackages();
  
  // After initial animation (400ms + buffer), add skip-animations class
  // This prevents any subsequent updates from triggering animations
  setTimeout(() => {
    const packageList = document.getElementById('packageList');
    const browseList = document.getElementById('browseList');
    if (packageList) {
      packageList.classList.add('skip-animations');
    }
    if (browseList) {
      browseList.classList.add('skip-animations');
    }
  }, 500);
}

// Export to window for backend access
if (typeof window !== "undefined") {
  window.initializeData = initializeData;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  // DOM is already ready
  initializeApplication();
}

// Initialize theme immediately
initializeTheme();
