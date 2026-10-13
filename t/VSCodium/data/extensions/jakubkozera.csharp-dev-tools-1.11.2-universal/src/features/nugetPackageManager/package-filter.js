/**
 * Package filtering utilities for the NuGet Package Manager
 * Contains logic for filtering packages by updates and consolidation needs
 */

// Active filter state
let activeFilter = null; // 'updates', 'consolidate', or null for no filter

/**
 * Initialize filter button event handlers
 */
function initializeFilterButtons() {
  const updatesFilterBtn = document.getElementById('updatesFilterBtn');
  const consolidateFilterBtn = document.getElementById('consolidateFilterBtn');

  if (updatesFilterBtn) {
    updatesFilterBtn.addEventListener('click', () => toggleFilter('updates'));
  }

  if (consolidateFilterBtn) {
    consolidateFilterBtn.addEventListener('click', () => toggleFilter('consolidate'));
  }
}

/**
 * Toggle filter state
 * @param {string} filterType - 'updates' or 'consolidate'
 */
function toggleFilter(filterType) {
  console.log(`Filter toggle: ${filterType}, current active: ${activeFilter}`);
  
  // Track telemetry
  if (typeof vscode !== 'undefined') {
    vscode.postMessage({
      command: 'trackFilterUsage',
      filterType: filterType,
      isActivating: activeFilter !== filterType
    });
  }
  
  if (activeFilter === filterType) {
    // Deactivate current filter
    activeFilter = null;
  } else {
    // Activate new filter
    activeFilter = filterType;
  }

  // Update button states
  updateFilterButtonStates();

  // Refilter packages with new filter
  if (typeof filterPackages === 'function') {
    filterPackages();
  }
}

/**
 * Update visual state of filter buttons
 */
function updateFilterButtonStates() {
  const updatesFilterBtn = document.getElementById('updatesFilterBtn');
  const consolidateFilterBtn = document.getElementById('consolidateFilterBtn');

  if (updatesFilterBtn) {
    if (activeFilter === 'updates') {
      updatesFilterBtn.classList.add('active');
    } else {
      updatesFilterBtn.classList.remove('active');
    }
  }

  if (consolidateFilterBtn) {
    if (activeFilter === 'consolidate') {
      consolidateFilterBtn.classList.add('active');
    } else {
      consolidateFilterBtn.classList.remove('active');
    }
  }
}

/**
 * Calculate packages needing updates and consolidation
 * @param {Array} packages - All packages
 * @returns {Object} - Object with updates and consolidate sets
 */
function calculateFilterCounts(packages) {
  const packagesNeedingUpdates = new Set();
  const packagesNeedingConsolidation = new Set();

  // Group packages by name to detect consolidation needs
  const packagesByName = new Map();

  packages.forEach(pkg => {
    const packageName = pkg.name;
    
    if (!packagesByName.has(packageName)) {
      packagesByName.set(packageName, []);
    }
    packagesByName.get(packageName).push(pkg);
  });

  // Check each package group
  packagesByName.forEach((pkgs, packageName) => {
    // Get all unique versions for this package
    const versions = new Set();
    pkgs.forEach(pkg => versions.add(pkg.version));

    // If more than one version exists, package needs consolidation
    if (versions.size > 1) {
      packagesNeedingConsolidation.add(packageName);
    }

    // Check if any instance has an update available
    pkgs.forEach(pkg => {
      if (pkg.hasUpdateAvailable) {
        packagesNeedingUpdates.add(packageName);
      }
    });
  });

  return {
    updates: packagesNeedingUpdates,
    consolidate: packagesNeedingConsolidation
  };
}

/**
 * Update filter counts in UI
 * @param {Set} updatesSet - Set of package names needing updates
 * @param {Set} consolidateSet - Set of package names needing consolidation
 */
function updateFilterCounts(updatesSet, consolidateSet) {
  const updatesCount = document.getElementById('updatesCount');
  const consolidateCount = document.getElementById('consolidateCount');
  const updatesFilterBtn = document.getElementById('updatesFilterBtn');
  const consolidateFilterBtn = document.getElementById('consolidateFilterBtn');

  if (updatesCount) {
    updatesCount.textContent = updatesSet.size;
  }
  if (consolidateCount) {
    consolidateCount.textContent = consolidateSet.size;
  }

  // Update button data attributes for count visibility
  if (updatesFilterBtn) {
    updatesFilterBtn.setAttribute('data-count', updatesSet.size);
  }
  if (consolidateFilterBtn) {
    consolidateFilterBtn.setAttribute('data-count', consolidateSet.size);
  }
}

/**
 * Apply active filter to package list
 * @param {Array} packages - Packages to filter
 * @returns {Array} - Filtered packages
 */
function applyActiveFilter(packages) {
  if (!activeFilter) {
    return packages; // No filter active, return all packages
  }

  const { updates, consolidate } = calculateFilterCounts(packages);

  if (activeFilter === 'updates') {
    // Filter to show only packages with updates
    return packages.filter(pkg => updates.has(pkg.name));
  } else if (activeFilter === 'consolidate') {
    // Filter to show only packages needing consolidation
    return packages.filter(pkg => consolidate.has(pkg.name));
  }

  return packages;
}

/**
 * Get current active filter
 * @returns {string|null} - Active filter type or null
 */
function getActiveFilter() {
  return activeFilter;
}

/**
 * Clear active filter
 */
function clearActiveFilter() {
  activeFilter = null;
  updateFilterButtonStates();
}

/**
 * Update package version badges and filter counts without re-rendering the entire list
 * Called when async version checks complete
 */
function updatePackageVersionBadges() {
  // Get current packages
  const packages = typeof getPackages === 'function' ? getPackages() : [];
  
  if (packages.length === 0) {
    return;
  }
  
  // Apply the same filters as filterPackages() to respect project/feed/search filters
  const searchPackages = document.getElementById("searchPackages");
  const prereleaseToggle = document.getElementById("prereleaseToggle");
  
  const searchTerm = searchPackages ? searchPackages.value.toLowerCase() : "";
  const selectedProject = window.projectDropdown ? window.projectDropdown.getValue() : "";
  const selectedFeed = window.feedDropdown ? window.feedDropdown.getValue() : "";
  const includePrerelease = prereleaseToggle ? prereleaseToggle.checked : false;
  
  // Filter packages to match current project/feed/search filters
  const filteredPackages = packages.filter((pkg) => {
    // Text search
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm);

    // Project filter - handle both old projectPath (string) and new projectPaths (array) formats
    const packageProjects =
      pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
    const matchesProject =
      !selectedProject || packageProjects.includes(selectedProject);

    // Feed filter (simplified)
    const matchesFeed =
      !selectedFeed || (pkg.source && pkg.source.includes(selectedFeed));

    // Prerelease filter (simplified check for alpha, beta, rc in version)
    const isPrerelease = /-/i.test(pkg.version);
    const matchesPrerelease = includePrerelease || !isPrerelease;

    return matchesSearch && matchesProject && matchesFeed && matchesPrerelease;
  });
  
  // Calculate filter counts:
  // - Updates: count from filtered packages (respects current filters)
  // - Consolidate: count from ALL packages (solution-wide view)
  const updateCounts = calculateFilterCounts(filteredPackages);
  const consolidateCounts = calculateFilterCounts(packages);
  
  // Update filter count display with mixed counts
  updateFilterCounts(updateCounts.updates, consolidateCounts.consolidate);
  
  // Dynamically add update icons to package items without re-rendering the entire list
  packages.forEach(pkg => {
    if (pkg.hasUpdateAvailable) {
      // Find the package item div by data-package attribute
      const packageItem = document.querySelector(`.package-item[data-package="${pkg.name}"]`);
      if (packageItem) {
        const packageInfo = packageItem.querySelector('.nuget-package-info');
        if (packageInfo) {
          // Check if icon already exists
          const existingIcon = packageInfo.querySelector('svg[title="Update available"]');
          if (!existingIcon) {
            // Create and insert the update icon after the version span
            const iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;" title="Update available">
                <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
                <path d="M12 8l-4 4" />
                <path d="M12 8v8" />
                <path d="M16 12l-4 -4" />
            </svg>`;
            
            // Insert the icon at the end of packageInfo div
            packageInfo.insertAdjacentHTML('beforeend', iconHtml);
          }
        }
      }
    }
  });
  
  // If a filter is currently active, we need to re-apply it
  // but only if we're on the installed tab
  if (activeFilter && typeof getActiveTab === 'function' && getActiveTab() === 'installed') {
    // Get current filtered packages with active filter applied
    const finalFilteredPackages = applyActiveFilter(filteredPackages);
    
    // Add skip-animations class to package-list to prevent animation replay during update
    const packageList = document.getElementById('packageList');
    if (packageList && !packageList.classList.contains('skip-animations')) {
      packageList.classList.add('skip-animations');
    }
    
    // Update package display with filtered packages
    if (typeof updatePackageDisplay === 'function') {
      updatePackageDisplay(finalFilteredPackages);
    }
  }
}

// Export functions to global scope for use in webview context
if (typeof window !== 'undefined') {
  window.initializeFilterButtons = initializeFilterButtons;
  window.toggleFilter = toggleFilter;
  window.updateFilterButtonStates = updateFilterButtonStates;
  window.calculateFilterCounts = calculateFilterCounts;
  window.updateFilterCounts = updateFilterCounts;
  window.applyActiveFilter = applyActiveFilter;
  window.getActiveFilter = getActiveFilter;
  window.clearActiveFilter = clearActiveFilter;
  window.updatePackageVersionBadges = updatePackageVersionBadges;
}
