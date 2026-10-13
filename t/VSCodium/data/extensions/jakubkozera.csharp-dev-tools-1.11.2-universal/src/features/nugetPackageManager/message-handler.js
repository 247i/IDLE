/**
 * Message handling utilities for the NuGet Package Manager
 * Contains the main message handler and initialization functions
 */

// Debounce utility for batching package UI updates
let filterPackagesDebounceTimer = null;
function debouncedFilterPackages(delay = 150) {
  if (filterPackagesDebounceTimer) {
    clearTimeout(filterPackagesDebounceTimer);
  }
  
  filterPackagesDebounceTimer = setTimeout(() => {
    filterPackagesDebounceTimer = null;
    if (typeof filterPackages === 'function') {
      filterPackages();
    }
  }, delay);
}

// Initialize data when the script loads
function initializeData(
  packagesData,
  sourcesData,
  projectsData,
  initialSelectedProject
) {
  setPackages(packagesData || []);
  setSources(sourcesData || []);
  setProjects(projectsData || []);
  window.initialSelectedProject = initialSelectedProject || null;

  populateFilters();
  filterPackages();
}

// Handle messages from extension
function handleMessage(event) {
  const message = event.data;
  
  switch (message.command) {
    case "updatePackages":
      // Merge version information into existing packages without re-rendering
      const currentPackages = getPackages();
      const updatedPackages = message.packages || [];
      
      // Create a map for quick lookup of updated package info
      const updateMap = new Map();
      updatedPackages.forEach(pkg => {
        const key = `${pkg.name}@${pkg.version}`;
        updateMap.set(key, {
          hasUpdateAvailable: pkg.hasUpdateAvailable,
          latestVersion: pkg.latestVersion
        });
      });
      
      // Update existing packages in-place
      currentPackages.forEach(pkg => {
        const key = `${pkg.name}@${pkg.version}`;
        const update = updateMap.get(key);
        if (update) {
          pkg.hasUpdateAvailable = update.hasUpdateAvailable;
          pkg.latestVersion = update.latestVersion;
        }
      });
      
      // Always update package state and filter counts
      setPackages(currentPackages);
      
      // Update UI badges (this will recalculate filter counts)
      if (typeof updatePackageVersionBadges === "function") {
        updatePackageVersionBadges();
      } else {
        // Fallback: update only the active tab if needed
        if (getActiveTab() === "installed") {
          filterPackages();
        }
      }

      // Clear any pending selections after successful operations
      const pendingSelections = getPendingSelections();
      pendingSelections.clear();
      setIsOperationInProgress(false);

      // Hide any loading overlays
      hideLoadingOverlay();

      // Hide left panel loading overlay after update
      if (typeof hideLeftPanelLoadingOverlay === "function") {
        hideLeftPanelLoadingOverlay();
      }
      break;
    case "packagesRefreshed":
      // Check if this is the first data load or a refresh
      const isFirstLoad = !window.initialDataLoaded;
      
      // If data was already loaded via initializeData, skip the initial render
      // as it would cause double animation
      if (window.initialDataLoaded) {
        // Just update the data without re-rendering
        // The UI should already be showing the correct packages
        const existingPackages = getPackages();
        const newPackages = message.packages || [];
        
        // Don't update if operation is in progress and we got empty data
        // This prevents showing "No packages found" during update operations
        if (getIsOperationInProgress() && newPackages.length === 0) {
          console.log('Skipping packagesRefreshed during operation - no data yet');
          break;
        }
        
        // Check if there are any differences (length OR content/versions changed)
        const hasChanges = existingPackages.length !== newPackages.length ||
          existingPackages.some((existingPkg, index) => {
            const newPkg = newPackages.find(p => p.name === existingPkg.name);
            return !newPkg || newPkg.version !== existingPkg.version;
          });
        
        if (hasChanges) {
          setPackages(newPackages);
          setSources(message.sources || []);
          setProjects(message.projects || []);
          
          // Add skip-animations before re-rendering
          const packageList = document.getElementById('packageList');
          if (packageList) {
            packageList.classList.add('skip-animations');
          }
          
          populateFilters();
          filterPackages();
        }
      } else {
        // First load - render with animation
        setPackages(message.packages || []);
        setSources(message.sources || []);
        setProjects(message.projects || []);
        populateFilters();
        filterPackages();

        // After initial animation completes (0.4s + buffer), add skip-animations class
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

      // Hide left panel loading overlay after refresh
      if (typeof hideLeftPanelLoadingOverlay === "function") {
        hideLeftPanelLoadingOverlay();
      }

      // Check if currently selected package still exists after refresh
      const selectedPackage = getSelectedPackage();
      if (selectedPackage) {
        // Check if the selected package still exists in the updated package list
        const allPackages = getPackages();
        const packageStillExists = allPackages.some((pkg) => {
          if (selectedPackage.isGrouped) {
            // For grouped packages, check if any package with the same name exists
            return pkg.name === selectedPackage.name;
          } else {
            // For individual packages, check for exact match including project path
            const packageProjects =
              pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
            const selectedProjectPath =
              selectedPackage.selectedProjectPath ||
              (selectedPackage.projectPaths &&
                selectedPackage.projectPaths[0]) ||
              selectedPackage.projectPath;
            return (
              pkg.name === selectedPackage.name &&
              pkg.version === selectedPackage.version &&
              packageProjects.includes(selectedProjectPath)
            );
          }
        });

        if (packageStillExists) {
          // Package still exists, update project usage
          updateProjectUsageForPackage(selectedPackage.name);
        } else {
          // Package no longer exists, clear selection and UI
          setSelectedPackage(null);
          clearPackageSelection();
          clearPackageDetails();
        }
      }
      break;

    case "updateSelectedProject":
      updateSelectedProject(message.projectPath);
      break;

    case "updateSources":
      setSources(message.sources || []);
      populateFilters();
      break;

    case "updateProjects":
      setProjects(message.projects || []);
      populateFilters();
      break;

    case "packageDetails":
      updatePackageDetails(message.details);
      break;

    case "packageVersions":
      updatePackageVersions(message.packageName, message.versions);
      break;

    case "packageVersionsBatch":
      // Handle batch version responses
      if (message.results && Array.isArray(message.results)) {
        message.results.forEach(({ packageName, versions }) => {
          updatePackageVersions(packageName, versions);
        });
      }
      break;

    case "operationStarted":
      console.log(
        `Operation started: ${message.operation} ${message.packageName}`
      );
      setIsOperationInProgress(true);

      // Show loading overlay
      showLoadingOverlay(message.operation, message.packageName);

      // Store pending selection for after operation completes
      const operationKey = generateOperationKey(
        message.operation,
        message.packageName,
        message.projectPath
      );
      getPendingSelections().set(operationKey, {
        packageName: message.packageName,
        projectPath: message.projectPath,
      });
      break;

    case "packageUpdated":
      console.log(
        `Package updated: ${message.packageName} to version ${message.version} in ${message.projectPath}`
      );
      
      // Update package version in memory instead of reloading everything
      const packages = getPackages();
      let packageUpdated = false;
      
      packages.forEach((pkg) => {
        // Check if this is the package we updated
        const projectPaths = pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
        if (pkg.name === message.packageName && projectPaths.includes(message.projectPath)) {
          // Update the version in memory
          pkg.version = message.version;
          packageUpdated = true;
          
          // If this package had hasUpdateAvailable flag, remove it since we just updated
          if (pkg.hasUpdateAvailable) {
            delete pkg.hasUpdateAvailable;
          }
        }
      });
      
      if (packageUpdated) {
        // Update the state
        setPackages(packages);
        
        // Re-render the package list to show new version
        // Add skip-animations to prevent animation on update
        const packageList = document.getElementById('packageList');
        if (packageList) {
          packageList.classList.add('skip-animations');
        }
        
        // Use debounced version to batch multiple updates
        debouncedFilterPackages();
        
        console.log(`Successfully updated ${message.packageName} to version ${message.version} in UI`);
      }
      break;

    case "packageInstalled":
      console.log(
        `Package installed: ${message.packageName} version ${message.version} in ${message.projectPath}`
      );
      
      // Add new package to memory instead of reloading everything
      const packagesForInstall = getPackages();
      
      // Check if package already exists (shouldn't, but just in case)
      const existingPkg = packagesForInstall.find(pkg => {
        const projectPaths = pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
        return pkg.name === message.packageName && projectPaths.includes(message.projectPath);
      });
      
      if (!existingPkg) {
        // Add new package to the list
        packagesForInstall.push({
          name: message.packageName,
          version: message.version,
          isExplicit: true,
          source: "NuGet",
          projectPaths: [message.projectPath],
          projectPath: message.projectPath
        });
        
        // Sort packages by name
        packagesForInstall.sort((a, b) => a.name.localeCompare(b.name));
        
        // Update the state
        setPackages(packagesForInstall);
        
        // Re-render the package list
        const packageList = document.getElementById('packageList');
        if (packageList) {
          packageList.classList.add('skip-animations');
        }
        
        // Use debounced version to batch multiple installs
        debouncedFilterPackages();
        
        console.log(`Successfully added ${message.packageName} to UI`);
      }
      break;

    case "packageUninstalled":
      console.log(
        `Package uninstalled: ${message.packageName} from ${message.projectPath}`
      );
      
      // Remove package from memory instead of reloading everything
      const packagesForUninstall = getPackages();
      
      // Find and remove the package
      const indexToRemove = packagesForUninstall.findIndex(pkg => {
        const projectPaths = pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
        return pkg.name === message.packageName && projectPaths.includes(message.projectPath);
      });
      
      if (indexToRemove !== -1) {
        packagesForUninstall.splice(indexToRemove, 1);
        
        // Update the state
        setPackages(packagesForUninstall);
        
        // Re-render the package list
        const packageList = document.getElementById('packageList');
        if (packageList) {
          packageList.classList.add('skip-animations');
        }
        
        // Use debounced version to batch multiple uninstalls
        debouncedFilterPackages();
        
        console.log(`Successfully removed ${message.packageName} from UI`);
      }
      break;

    case "operationCompleted":
      console.log(
        `Operation completed: ${message.operation} ${message.packageName}`
      );
      setIsOperationInProgress(false);

      // Hide loading overlay
      hideLoadingOverlay(); // Handle pending selections (but not for uninstall operations since the package may no longer exist)
      if (message.operation !== "uninstall") {
        const completedKey = generateOperationKey(
          message.operation,
          message.packageName,
          message.projectPath
        );
        const pendingSelection = getPendingSelections().get(completedKey);
        if (pendingSelection) {
          // Re-select the package after operation
          setTimeout(() => {
            const packages = getPackages();
            const packageToSelect = packages.find(
              (p) =>
                p.name === pendingSelection.packageName &&
                (
                  p.projectPaths || (p.projectPath ? [p.projectPath] : [])
                ).includes(pendingSelection.projectPath)
            );
            if (packageToSelect) {
              const packageElements =
                document.querySelectorAll(".package-item");
              packageElements.forEach((element) => {
                if (
                  element.dataset.package === packageToSelect.name &&
                  element.dataset.projectPath === pendingSelection.projectPath
                ) {
                  selectPackage(element);
                }
              });
            }
          }, 100);

          getPendingSelections().delete(completedKey);
        }
      }
      break;

    case "operationFailed":
      console.error(
        `Operation failed: ${message.operation} ${message.packageName}`,
        message.error
      );
      setIsOperationInProgress(false);

      // Hide loading overlay
      hideLoadingOverlay();

      // Show error dialog
      showErrorDialog(
        `${message.operation} Failed`,
        `Failed to ${message.operation.toLowerCase()} ${
          message.packageName
        }:\n${message.error}`
      );

      // Clear pending selection
      const failedKey = generateOperationKey(
        message.operation,
        message.packageName,
        message.projectPath
      );
      getPendingSelections().delete(failedKey);
      break;

    case "searchResults":
      const newResults = message.results || [];
      const requestId = message.requestId;
      
      console.log(
        `📦 [Request #${requestId}] Received search results: ${
          newResults.length
        } packages, isLoadingMore: ${getIsLoadingMore()}, lastCompleted: ${window.lastCompletedRequestId}, current: ${window.currentRequestId}`
      );
      
      // Race condition protection: ignore results from outdated requests
      if (requestId && requestId < window.lastCompletedRequestId) {
        console.warn(
          `⚠️ [Request #${requestId}] Ignoring outdated search results (last completed: ${window.lastCompletedRequestId})`
        );
        // Still reset the searching flag
        setIsSearchingNuGet(false);
        return;
      }
      
      // Update last completed request ID
      if (requestId) {
        window.lastCompletedRequestId = requestId;
        console.log(`✅ [Request #${requestId}] Marked as completed`);
      }

      // Handle pagination - append results if loading more, otherwise replace
      const wasLoadingMore = getIsLoadingMore(); // Store the state before we modify it

      if (wasLoadingMore) {
        // Append new results to existing ones
        const currentResults = getNugetSearchResults();
        setNugetSearchResults([...currentResults, ...newResults]);
        console.log(
          `➕ Appended ${newResults.length} packages. Total: ${
            getNugetSearchResults().length
          }`
        );

        // Check if we have more results (if we got less than requested, we're at the end)
        const hasMoreResults = message.pagination
          ? message.pagination.hasMoreResults
          : newResults.length === getCurrentTake();
        setHasMoreResults(hasMoreResults);
        
      } else {
        // Replace results for new search
        setNugetSearchResults(newResults);

        // Sort packages to show local packages first when "All Sources" is selected
        const feedSelect = document.getElementById("feedSelect");
        const selectedFeed = feedSelect ? feedSelect.value : "";
        if (selectedFeed === "" && newResults.length > 0) {
          // Check if there are any local packages
          const hasLocalPackages = newResults.some((pkg) => pkg.isLocal);
          if (hasLocalPackages) {
            
            const sortedResults = [...newResults].sort((a, b) => {
              // Local packages come first
              if (a.isLocal && !b.isLocal) return -1;
              if (!a.isLocal && b.isLocal) return 1;
              // Within the same type (local or remote), maintain original order
              return 0;
            });
            setNugetSearchResults(sortedResults);
          }
        }

        console.log(
          `🔄 New search results: ${
            getNugetSearchResults().length
          } packages, activeTab: ${getActiveTab()}`
        );

        // Mark browse tab as initialized when we get our first results
        // This is especially important for background preloading
        if (!getBrowseTabInitialized() && getNugetSearchResults().length > 0) {
          console.log(
            "✅ Marking browse tab as initialized after receiving prefetch results"
          );
          setBrowseTabInitialized(true);
        }

        // Clear preload flag when we receive results
        if (getIsPreloadInProgress()) {
          console.log("✅ Prefetch completed, clearing preload flag");
          setIsPreloadInProgress(false);
        }

        // Check if we have more results
        const hasMoreResults = message.pagination
          ? message.pagination.hasMoreResults
          : newResults.length === getCurrentTake();
        setHasMoreResults(hasMoreResults);
        console.log(
          `🔚 hasMoreResults: ${hasMoreResults} (got ${
            newResults.length
          }, expected ${getCurrentTake()}${
            message.pagination ? ", from pagination metadata" : ", estimated"
          })`
        );

        // Cache default results (when search query is empty) for faster restore
        const currentSearchQuery = getCurrentSearchQuery();
        if (!currentSearchQuery && getNugetSearchResults().length > 0) {
          if (typeof saveBrowseDefaultCache === "function") {
            saveBrowseDefaultCache(getNugetSearchResults(), hasMoreResults);
          }
        }

        // Only switch to browse tab if user explicitly searched (not for background preloading)
        if (
          getNugetSearchResults().length > 0 &&
          getActiveTab() !== "browse" &&
          currentSearchQuery
        ) {
          
          switchTab("browse");
        }
      }

      // Reset search state flags
      setIsSearchingNuGet(false);

      // Update display if we're on the browse tab (or just switched to it)
      if (getActiveTab() === "browse") {
        // For pagination, pass the new results to append
        if (wasLoadingMore) {
          updateBrowseDisplay(true, newResults);
        } else {
          updateBrowseDisplay();
        }
        hideSearchSpinner();
      }

      // Reset loading more flag after display update
      setIsLoadingMore(false);
      break;

    case "allFeeds":
      setAllFeeds(message.feeds || []);
      // Store original states
      const originalFeedStates = {};
      const allFeeds = getAllFeeds();
      allFeeds.forEach((feed) => {
        originalFeedStates[feed.name] = feed.enabled;
      });
      setOriginalFeedStates(originalFeedStates);
      renderFeedList();
      break;

    case "feedUpdateResult":
      handleFeedUpdateResult(message.success, message.message);
      break;

    case "searchEndpoints":
      
      setSearchEndpoints(message.endpoints || []);
      if (message.error) {
        console.warn("Search endpoints error:", message.error);
      }
      break;

    case "feedAuthError":
      console.error("Feed authentication error:", message);
      showAuthErrorDialog(
        "Authentication Required",
        message.message,
        message.feedName,
        message.feedUrl,
        message.canConfigureAuth || false
      );
      break;

    case "authenticationSuccess":
      
      // Show success notification
      showInfoDialog("Authentication Success", message.message, () => {
        // Refresh data after successful authentication
        if (typeof vscode !== "undefined") {
          vscode.postMessage({ command: "refreshPackages" });
        }
      });
      break;

    case "authenticationCancelled":
      
      showInfoDialog("Authentication Cancelled", message.message);
      break;

    case "authenticationError":
      console.error("Authentication error:", message);
      showErrorDialog("Authentication Error", message.message);
      break;

    case "authenticationRemoved":
      
      showInfoDialog("Authentication Removed", message.message, () => {
        // Refresh data after removing authentication
        if (typeof vscode !== "undefined") {
          vscode.postMessage({ command: "refreshPackages" });
        }
      });
      break;

    case "authenticationConfigured":
      
      // Show success message
      if (typeof showToast === "function") {
        showToast(
          `Authentication configured for ${message.feedName}`,
          "success"
        );
      } else {
        // Fallback if showToast is not available
        
      }
      break;

    default:
      console.warn("Unknown message command:", message.command);
      break;
  }
}

// Initialize the message handler
function initializeMessageHandler() {
  window.addEventListener("message", handleMessage);
}

// Helper functions to get/set state (these need to be implemented or imported)
function setPackages(packages) {
  window.packages = packages;
}
function getPackages() {
  return window.packages || [];
}
function setSources(sources) {
  window.sources = sources;
}
function getSources() {
  return window.sources || [];
}
function setProjects(projects) {
  window.projects = projects;
}
function getProjects() {
  return window.projects || [];
}
function setIsOperationInProgress(value) {
  window.isOperationInProgress = value;
}
function getIsOperationInProgress() {
  return window.isOperationInProgress || false;
}
function getPendingSelections() {
  return window.pendingSelections || new Map();
}
function setAllFeeds(feeds) {
  window.allFeeds = feeds;
}
function getAllFeeds() {
  return window.allFeeds || [];
}
function setOriginalFeedStates(states) {
  window.originalFeedStates = states;
}
function getOriginalFeedStates() {
  return window.originalFeedStates || {};
}
function setSearchEndpoints(endpoints) {
  window.searchEndpoints = endpoints;
}
function getSearchEndpoints() {
  return window.searchEndpoints || [];
}
function setIsPreloadInProgress(value) {
  window.isPreloadInProgress = value;
}
function getIsPreloadInProgress() {
  return window.isPreloadInProgress || false;
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.initializeData = initializeData;
  window.handleMessage = handleMessage;
  window.initializeMessageHandler = initializeMessageHandler;

  // State management
  window.setPackages = setPackages;
  window.getPackages = getPackages;
  window.setSources = setSources;
  window.getSources = getSources;
  window.setProjects = setProjects;
  window.getProjects = getProjects;
  window.setIsOperationInProgress = setIsOperationInProgress;
  window.getIsOperationInProgress = getIsOperationInProgress;
  window.getPendingSelections = getPendingSelections;
  window.setAllFeeds = setAllFeeds;
  window.getAllFeeds = getAllFeeds;
  window.setOriginalFeedStates = setOriginalFeedStates;
  window.getOriginalFeedStates = getOriginalFeedStates;
  window.setSearchEndpoints = setSearchEndpoints;
  window.getSearchEndpoints = getSearchEndpoints;
  window.setIsPreloadInProgress = setIsPreloadInProgress;
  window.getIsPreloadInProgress = getIsPreloadInProgress;
}

// Function to update the selected project when NuGet manager is already open
function updateSelectedProject(projectPath) {
  

  const projectSelect = document.getElementById("projectSelect");
  if (!projectSelect) {
    console.warn("Project select element not found");
    return;
  }

  // If projectPath is empty, select "All Projects" (first option with empty value)
  if (!projectPath || projectPath === "") {
    projectSelect.value = "";
    
  }
  // Try direct match first
  else if (projectSelect.querySelector(`option[value="${projectPath}"]`)) {
    projectSelect.value = projectPath;
    
  } else {
    // Try to find a matching project path (case-insensitive, normalized paths)
    const normalizeProjectPath = (path) =>
      path.replace(/\\/g, "/").toLowerCase();
    const targetPath = normalizeProjectPath(projectPath);

    const options = Array.from(projectSelect.options);
    const matchingOption = options.find((option) => {
      if (!option.value) return false; // Skip "All Projects" option
      return normalizeProjectPath(option.value) === targetPath;
    });

    if (matchingOption) {
      projectSelect.value = matchingOption.value;
      console.log(
        `✅ Selected project: ${matchingOption.textContent} (${matchingOption.value})`
      );
    } else {
      console.warn(`⚠️ Could not find matching project for: ${projectPath}`);
      console.log(
        "Available projects:",
        options.map((o) => o.value).filter((v) => v)
      );
      return;
    }
  }

  // Trigger project change event to update the package list
  const changeEvent = new Event("change", { bubbles: true });
  projectSelect.dispatchEvent(changeEvent);

  // Also trigger filter update if the function is available
  if (typeof filterPackages === "function") {
    filterPackages();
  }
}
