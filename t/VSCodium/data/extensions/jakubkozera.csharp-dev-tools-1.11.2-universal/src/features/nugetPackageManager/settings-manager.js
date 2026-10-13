/**
 * Settings management utilities for the NuGet Package Manager
 * Contains functionality for managing settings modal, feed configuration, and package sources
 */

// Settings modal functions
function openSettingsModal() {
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    settingsModal.classList.add("show");

    // Request all feeds data from backend
    if (typeof vscode !== "undefined") {
      vscode.postMessage({ command: "getAllFeeds" });
    }
  } else {
    console.error("Settings modal element not found");
  }
}

function closeSettingsModal() {
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    settingsModal.classList.remove("show");
  }
  resetFeedStates();
}

function resetFeedStates() {
  const allFeeds = getAllFeeds();
  const originalFeedStates = getOriginalFeedStates();

  if (allFeeds && originalFeedStates) {
    // Reset all feeds to their original states
    allFeeds.forEach((feed) => {
      feed.enabled = originalFeedStates[feed.name];
    });
    renderFeedList();
  }
}

function renderFeedList() {
  const feedList = document.getElementById("feedList");
  const allFeeds = getAllFeeds();

  if (!feedList) {
    console.error("feedList element not found!");
    return;
  }

  if (!allFeeds || allFeeds.length === 0) {
    feedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No package sources configured</div>
        <div class="empty-state-description">Add package sources in your NuGet.config file</div>
      </div>
    `;
    return;
  }

  const html = allFeeds
    .map((feed) => {
      const feedUrl = feed.url || feed.source || "No URL";

      return `
        <div class="feed-item ${!feed.enabled ? "disabled" : ""}">
          <div class="feed-info">
            <div class="feed-name">
              <span>${escapeHtml(feed.name)}</span>
              ${
                feed.machineWide
                  ? '<span class="machine-wide-badge">Machine-wide</span>'
                  : ""
              }
            </div>
            <div class="feed-url">${escapeHtml(feedUrl)}</div>
          </div>
          <div class="feed-actions">
            <span class="feed-status-text ${
              feed.enabled ? "feed-enabled" : "feed-disabled"
            }">
              ${feed.enabled ? "Enabled" : "Disabled"}
            </span>
            <label class="toggle-switch">
              <input type="checkbox" ${feed.enabled ? "checked" : ""} 
                     onchange="toggleFeed('${escapeHtml(
                       feed.name
                     )}', this.checked)"
                     ${
                       feed.machineWide
                         ? 'disabled title="Machine-wide feeds cannot be modified"'
                         : ""
                     }>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      `;
    })
    .join("");

  feedList.innerHTML = html;
}

function toggleFeed(feedName, enabled) {
  const allFeeds = getAllFeeds();
  if (!allFeeds) return;

  const feed = allFeeds.find((f) => f.name === feedName);
  if (feed && !feed.machineWide) {
    feed.enabled = enabled;

    // Update status text immediately for smooth transition
    const feedItem = document
      .querySelector(`input[onchange*="${feedName}"]`)
      ?.closest(".feed-item");
    if (feedItem) {
      const statusText = feedItem.querySelector(".feed-status-text");
      if (statusText) {
        statusText.textContent = enabled ? "Enabled" : "Disabled";
        statusText.className = `feed-status-text ${
          enabled ? "feed-enabled" : "feed-disabled"
        }`;
      }
    }
  }
}

function saveSettings() {
  const allFeeds = getAllFeeds();
  const originalFeedStates = getOriginalFeedStates();

  if (!allFeeds || !originalFeedStates) return;

  // Find changes
  const changes = [];
  allFeeds.forEach((feed) => {
    if (originalFeedStates[feed.name] !== feed.enabled && !feed.machineWide) {
      changes.push({
        name: feed.name,
        enabled: feed.enabled,
        url: feed.source,
      });
    }
  });
  if (changes.length > 0) {
    // Send changes to backend
    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "updateFeeds",
        changes: changes,
      });
    }
  } else {
    closeSettingsModal();
  }
}

function handleFeedUpdateResult(success, message) {
  if (success) {
    closeSettingsModal();

    // Show success message
    if (typeof showInfoDialog === "function") {
      showInfoDialog(
        "Settings Saved",
        "Package source settings have been updated successfully.",
        () => {
          // Refresh packages after successful update
          if (typeof vscode !== "undefined") {
            vscode.postMessage({ command: "refreshPackages" });
          }
        }
      );
    }
  } else {
    console.error("Feed update failed:", message);
    if (typeof showErrorDialog === "function") {
      showErrorDialog("Settings Error", message);
    }
  }
}

function configureAuthentication(feedUrl, feedName) {
  if (typeof vscode !== "undefined") {
    vscode.postMessage({
      command: "configureAuthentication",
      feedUrl: feedUrl,
      feedName: feedName,
    });
  }
}

function populateFilters() {
  const packages = getPackages();
  const sources = getSources();
  const projects = window.projects || []; // Get all projects from backend

  if (!sources) {
    return;
  }

  // Prepare project items
  let projectItems = [{ value: '', label: 'All Projects' }];
  
  if (projects && projects.length > 0) {
    // Use the projects array from backend
    projectItems = projectItems.concat(
      projects.map(project => ({
        value: project.path,
        label: project.name
      }))
    );
  } else if (packages) {
    // Fallback to extracting from packages (old behavior)
    const allProjectPaths = packages.flatMap(
      (p) => p.projectPaths || (p.projectPath ? [p.projectPath] : [])
    );
    const uniqueProjects = [...new Set(allProjectPaths)];
    
    projectItems = projectItems.concat(
      uniqueProjects.map(projectPath => {
        const projectName =
          packages.find((p) => {
            const packageProjects =
              p.projectPaths || (p.projectPath ? [p.projectPath] : []);
            return packageProjects.includes(projectPath);
          })?.projectName ||
          projectPath
            .split(/[\\\/]/)
            .pop()
            ?.replace(".csproj", "") ||
          "Unknown Project";
        
        return { value: projectPath, label: projectName };
      })
    );
  }

  // Prepare feed items - only show enabled sources
  const enabledSources = sources.filter((s) => s.enabled);
  const uniqueSources = [...new Set(enabledSources.map((s) => s.name))];
  
  const feedItems = [
    { value: '', label: 'All Sources' },
    ...uniqueSources.map(sourceName => ({
      value: sourceName,
      label: sourceName
    }))
  ];

  // Create or update project dropdown
  if (window.projectDropdown) {
    window.projectDropdown.updateItems(projectItems);
  } else {
    window.projectDropdown = new SharedDropdown({
      containerId: 'projectSelectContainer',
      placeholder: 'All Projects',
      items: projectItems,
      onChange: (value, label) => {
        // Trigger filter change
        if (typeof filterPackages === 'function') {
          filterPackages();
        }
      },
      initialValue: window.initialSelectedProject || '',
      enableSearch: true
    });
  }

  // Create or update feed dropdown
  if (window.feedDropdown) {
    window.feedDropdown.updateItems(feedItems);
  } else {
    window.feedDropdown = new SharedDropdown({
      containerId: 'feedSelectContainer',
      placeholder: 'All Sources',
      items: feedItems,
      onChange: (value, label) => {
        // Trigger filter change
        if (typeof filterPackages === 'function') {
          filterPackages();
        }
      }
    });
  }

  // Set initial project if provided and dropdown was just created
  if (window.initialSelectedProject && window.projectDropdown) {
    const normalizeProjectPath = (path) => path.replace(/\\/g, "/").toLowerCase();
    const targetPath = normalizeProjectPath(window.initialSelectedProject);
    
    const matchingItem = projectItems.find(item => 
      item.value && normalizeProjectPath(item.value) === targetPath
    );

    if (matchingItem) {
      window.projectDropdown.setValue(matchingItem.value);
    }
  }
}

// Helper functions to get state from main file (these need to be implemented in main file)
function getAllFeeds() {
  return window.allFeeds || [];
}

function getOriginalFeedStates() {
  return window.originalFeedStates || {};
}

function getPackages() {
  return window.packages || [];
}

function getSources() {
  return window.sources || [];
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.resetFeedStates = resetFeedStates;
  window.renderFeedList = renderFeedList;
  window.toggleFeed = toggleFeed;
  window.saveSettings = saveSettings;
  window.handleFeedUpdateResult = handleFeedUpdateResult;
  window.configureAuthentication = configureAuthentication;
  window.populateFilters = populateFilters;
}
