/**
 * Package rendering utilities for the NuGet Package Manager
 * Contains functionality for creating package items and updating package displays
 */

// Loading overlay functions
function showLeftPanelLoadingOverlay() {
  try {
    // Remove existing overlay if present
    hideLeftPanelLoadingOverlay();

    const leftPanel = document.querySelector(".left-panel");
    if (!leftPanel) {
      console.warn('Left panel not found, cannot show loading overlay');
      return;
    }

    // Create overlay element
    const overlay = document.createElement("div");
    overlay.id = "left-panel-overlay";
    overlay.className = "left-panel-loading-overlay";

    // Create loading content
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div style="margin-top: 15px; font-size: 14px; color: var(--vscode-foreground);">
          Refreshing packages...
        </div>
      </div>
    `;

    // Position overlay to cover the left panel
    leftPanel.style.position = "relative";
    leftPanel.appendChild(overlay);

    
  } catch (error) {
    console.error('Error showing left panel loading overlay:', error);
  }
}

function hideLeftPanelLoadingOverlay() {
  try {
    const overlay = document.getElementById("left-panel-overlay");
    if (overlay) {
      overlay.remove();
      
    }
  } catch (error) {
    console.error('Error hiding left panel loading overlay:', error);
  }
}

// Create NuGet package item HTML
function createNuGetPackageItem(pkg) {

  const packageDiv = document.createElement("div");
  packageDiv.className = "nuget-package-item";

  // Handle different package formats (local vs remote)
  const packageId = pkg.id || pkg.name;
  const packageTitle = pkg.title || pkg.name;

  // Use the version provided by the backend (already processed for latest stable)
  const packageVersion = pkg.version;
  const packageDescription = pkg.description || "No description available";
  const isLocal = pkg.isLocal || false;

  packageDiv.dataset.nugetPackage = packageId;
  packageDiv.dataset.version = packageVersion;

  // Create icon - use default for local packages
  const icon = createPackageIcon(isLocal ? null : pkg.iconUrl);

  // Create package info - single row layout
  const infoDiv = document.createElement("div");
  infoDiv.className = "nuget-package-info";
  infoDiv.style.display = "flex";
  infoDiv.style.alignItems = "center";
  infoDiv.style.gap = "10px";
  infoDiv.style.flex = "1";
  infoDiv.style.minWidth = "0";

  // Package name
  const titleText = document.createElement("span");
  titleText.textContent = packageTitle;
  titleText.style.fontWeight = "500";
  titleText.style.overflow = "hidden";
  titleText.style.display = "-webkit-box";
  titleText.style.webkitLineClamp = "2";
  titleText.style.webkitBoxOrient = "vertical";
  titleText.style.wordBreak = "break-word";
  titleText.style.flexShrink = "1";
  infoDiv.appendChild(titleText);

  // Version (without icon)
  const versionDiv = document.createElement("span");
  versionDiv.textContent = packageVersion;
  versionDiv.title = `Version: ${packageVersion}`;
  versionDiv.style.fontSize = "0.85em";
  versionDiv.style.color = "var(--vscode-descriptionForeground)";
  versionDiv.style.flexShrink = "0";
  infoDiv.appendChild(versionDiv);

  // Authors - on the right side (vertical layout with feed below)
  const authorsDiv = document.createElement("div");
  authorsDiv.style.display = "flex";
  authorsDiv.style.flexDirection = "column";
  authorsDiv.style.alignItems = "flex-end";
  authorsDiv.style.fontSize = "0.85em";
  authorsDiv.style.color = "var(--vscode-descriptionForeground)";
  authorsDiv.style.flexShrink = "0";
  authorsDiv.style.marginLeft = "auto";

  // Feed name indicator (source) - will be added below author
  let feedName = pkg.source || pkg.feedName;
  if (!feedName || feedName === "Unknown source") {
    feedName = isLocal ? "Local Feed" : "nuget.org";
  }

  if (isLocal) {
    const authorRow = document.createElement("div");
    authorRow.style.display = "flex";
    authorRow.style.alignItems = "center";
    authorRow.style.whiteSpace = "nowrap";
    
    authorRow.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
<path fill-rule="evenodd" clip-rule="evenodd" d="M8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2ZM6 5C6 3.89543 6.89543 3 8 3C9.10457 3 10 3.89543 10 5C10 6.10457 9.10457 7 8 7C6.89543 7 6 6.10457 6 5ZM3 14C3 11.2386 5.23858 9 8 9C10.7614 9 13 11.2386 13 14H12C12 11.7909 10.2091 10 8 10C5.79086 10 4 11.7909 4 14H3Z" fill="#6C707E"/>
</svg> Local`;
    authorRow.title = "Local package";
    authorsDiv.appendChild(authorRow);
    
    // Add feed indicator below author
    const feedIndicator = document.createElement("span");
    feedIndicator.className = "package-feed-indicator";
    feedIndicator.textContent = feedName;
    feedIndicator.title = `Source: ${feedName}`;
    authorsDiv.appendChild(feedIndicator);
  } else {
    // Check if this is from NuGet.org - only show authors for NuGet.org packages
    const isNuGetOrg =
      feedName.toLowerCase().includes("nuget.org") ||
      (feedName.toLowerCase().includes("nuget") &&
        feedName.toLowerCase() === "nuget.org");

    if (isNuGetOrg) {
      // For NuGet.org packages, show authors
      const authorsList = pkg.authors || [];
      let authorsText;
      let authorsTooltip;

      if (authorsList.length === 0) {
        authorsText = "Unknown";
        authorsTooltip = "Authors: Unknown";
      } else if (authorsList.length === 1) {
        authorsText = authorsList[0];
        authorsTooltip = `Author: ${authorsList[0]}`;
        if (authorsList[0].includes(",")) {
          authorsText = `Multiple`;
          authorsTooltip = `Authors: ${authorsList[0]}`;
        }
      } else {
        authorsText = `Multiple`;
        authorsTooltip = `Authors: ${authorsList.join(", ")}`;
      }

      // Create green checkmark SVG for verified authors
      const verifiedCheckmark = pkg.verified
        ? ` <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-left: 4px;">
          <path d="M7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0ZM10.8536 5.35355L6.35355 9.85355C6.15829 10.0488 5.84171 10.0488 5.64645 9.85355L3.14645 7.35355C2.95118 7.15829 2.95118 6.84171 3.14645 6.64645C3.34171 6.45118 3.65829 6.45118 3.85355 6.64645L6 8.79289L10.1464 4.64645C10.3417 4.45118 10.6583 4.45118 10.8536 4.64645C11.0488 4.84171 11.0488 5.15829 10.8536 5.35355Z" fill="#22c55e"/>
         </svg>`
        : "";

      const authorIcon =
        authorsList.length === 1 && !authorsList[0].includes(",")
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" /><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M17 10h2a2 2 0 0 1 2 2v1" /><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M3 13v-1a2 2 0 0 1 2 -2h2" /></svg>';

      const authorRow = document.createElement("div");
      authorRow.style.display = "flex";
      authorRow.style.alignItems = "center";
      authorRow.style.whiteSpace = "nowrap";
      authorRow.innerHTML = `${authorIcon} ${authorsText}${verifiedCheckmark}`;
      authorRow.title = authorsTooltip;
      authorsDiv.appendChild(authorRow);
      
      // Add feed indicator below author
      const feedIndicator = document.createElement("span");
      feedIndicator.className = "package-feed-indicator";
      feedIndicator.textContent = feedName;
      feedIndicator.title = `Source: ${feedName}`;
      authorsDiv.appendChild(feedIndicator);
    } else {
      // For non-NuGet.org packages, show the feed name as author
      const authorRow = document.createElement("div");
      authorRow.style.display = "flex";
      authorRow.style.alignItems = "center";
      authorRow.style.whiteSpace = "nowrap";
      authorRow.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
<path fill-rule="evenodd" clip-rule="evenodd" d="M8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2ZM6 5C6 3.89543 6.89543 3 8 3C9.10457 3 10 3.89543 10 5C10 6.10457 9.10457 7 8 7C6.89543 7 6 6.10457 6 5ZM3 14C3 11.2386 5.23858 9 8 9C10.7614 9 13 11.2386 13 14H12C12 11.7909 10.2091 10 8 10C5.79086 10 4 11.7909 4 14H3Z" fill="#6C707E"/>
</svg> ${feedName}`;
      authorRow.title = `Source: ${feedName}`;
      authorsDiv.appendChild(authorRow);
      
      // Add feed indicator below (same as author for non-NuGet.org)
      const feedIndicator = document.createElement("span");
      feedIndicator.className = "package-feed-indicator";
      feedIndicator.textContent = feedName;
      feedIndicator.title = `Source: ${feedName}`;
      authorsDiv.appendChild(feedIndicator);
    }
  }

  // Folder icon for local packages
  if (isLocal && pkg.feedLocation) {
    const folderIcon = document.createElement("button");
    folderIcon.className = "folder-icon-btn";
    folderIcon.title = `Open folder: ${pkg.feedLocation}`;
    folderIcon.dataset.feedLocation = pkg.feedLocation;
    folderIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h2.69a.75.75 0 0 1 .53.22L7.44 3.69a.25.25 0 0 0 .18.06h5.88a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-.75.75H2.5a.75.75 0 0 1-.75-.75V2.5Zm1.5.75v8.25h10V5.25H7.44a1.75 1.75 0 0 1-1.24-.51L4.73 3.25H3.25Z" fill="currentColor"/>
</svg>`;
    authorsDiv.appendChild(folderIcon);
  }

  // Downloads/stats section (only for remote packages) - create separate container
  let downloadsContainer = null;
  if (!isLocal && pkg.downloadCount) {
    downloadsContainer = document.createElement("div");
    downloadsContainer.style.display = "flex";
    downloadsContainer.style.alignItems = "center";
    downloadsContainer.style.fontSize = "0.85em";
    downloadsContainer.style.color = "var(--vscode-descriptionForeground)";
    downloadsContainer.style.flexShrink = "0";
    downloadsContainer.style.marginLeft = "12px";

    const formattedDownloads = formatCompactNumber(pkg.downloadCount);
    downloadsContainer.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 3px;">
<path fill-rule="evenodd" clip-rule="evenodd" d="M7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0ZM6.5 3.5C6.5 3.22386 6.72386 3 7 3C7.27614 3 7.5 3.22386 7.5 3.5V8.79289L9.14645 7.14645C9.34171 6.95118 9.65829 6.95118 9.85355 7.14645C10.0488 7.34171 10.0488 7.65829 9.85355 7.85355L7.35355 10.3536C7.15829 10.5488 6.84171 10.5488 6.64645 10.3536L4.14645 7.85355C3.95118 7.65829 3.95118 7.34171 4.14645 7.14645C4.34171 6.95118 4.65829 6.95118 4.85355 7.14645L6.5 8.79289V3.5Z" fill="#6C707E"/>
</svg> ${formattedDownloads}`;
    downloadsContainer.title = `Downloads: ${formatNumber(pkg.downloadCount)}`;
  }

  // Assemble the package item
  packageDiv.appendChild(icon);
  packageDiv.appendChild(infoDiv);
  packageDiv.appendChild(authorsDiv);
  if (downloadsContainer) {
    packageDiv.appendChild(downloadsContainer);
  }

  return packageDiv;
}

// Update package display for installed packages
function updatePackageDisplay(localPackages = null) {
  const packageList = document.getElementById("packageList");
  const packages = getPackages(); // This should be implemented to get packages from main file
  // Get filter values - we need these for both filtering and grouping logic
  const searchPackages = document.getElementById("searchPackages");
  const projectSelect = document.getElementById("projectSelect");
  const feedSelect = document.getElementById("feedSelect");
  const prereleaseToggle = document.getElementById("prereleaseToggle");

  const searchTerm = searchPackages ? searchPackages.value.toLowerCase() : "";
  const selectedProject = projectSelect ? projectSelect.value : "";
  const selectedFeed = feedSelect ? feedSelect.value : "";
  const includePrerelease = prereleaseToggle ? prereleaseToggle.checked : false;

  // This function ONLY updates the installed packages tab
  // If localPackages not provided, recalculate them from the installed packages
  if (localPackages === null) {
    localPackages = packages.filter((pkg) => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchTerm);
      // Handle both old projectPath (string) and new projectPaths (array) formats
      const packageProjects =
        pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
      const matchesProject =
        !selectedProject || packageProjects.includes(selectedProject);
      const matchesFeed =
        !selectedFeed || (pkg.source && pkg.source.includes(selectedFeed));
      const isPrerelease = /-(alpha|beta|rc|preview)/i.test(pkg.version);
      const matchesPrerelease = includePrerelease || !isPrerelease;
      return (
        matchesSearch && matchesProject && matchesFeed && matchesPrerelease
      );
    });
  }

  // Check if we should group packages by name (when "All Projects" is selected)
  const shouldGroupByName = !selectedProject; // selectedProject is empty when "All Projects" is selected

  let packagesToRender = localPackages;

  if (shouldGroupByName && localPackages && localPackages.length > 0) {
    // Group packages by name and combine versions
    const groupedPackages = new Map();
    localPackages.forEach((pkg) => {
      const packageName = pkg.name;
      if (!groupedPackages.has(packageName)) {
        // Handle both old projectPath (string) and new projectPaths (array) formats
        const packageProjects =
          pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
        groupedPackages.set(packageName, {
          ...pkg, // Use the first package as base
          versions: new Set([pkg.version]), // Track unique versions
          projectPaths: new Set(packageProjects), // Track unique project paths
          allPackages: [pkg], // Keep reference to all individual packages
        });
      } else {
        const grouped = groupedPackages.get(packageName);
        grouped.versions.add(pkg.version);
        // Handle both old projectPath (string) and new projectPaths (array) formats
        const packageProjects =
          pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
        packageProjects.forEach((path) => grouped.projectPaths.add(path));
        grouped.allPackages.push(pkg);
      }
    });

    // Convert grouped packages back to array format
    packagesToRender = Array.from(groupedPackages.values()).map(
      (groupedPkg) => ({
        ...groupedPkg,
        version: Array.from(groupedPkg.versions).sort().join("; "), // Combine versions with semicolons
        projectPath: "", // Clear individual project path for grouped packages
        isGrouped: true, // Mark as grouped for special handling
        projectCount: groupedPkg.projectPaths.size,
        versionCount: groupedPkg.versions.size,
      })
    );
  }

  // Sort packages alphabetically by name to maintain consistent order
  // This ensures packages don't jump around after updates
  if (packagesToRender && packagesToRender.length > 0) {
    packagesToRender.sort((a, b) => {
      const nameComparison = a.name
        .toLowerCase()
        .localeCompare(b.name.toLowerCase());
      if (nameComparison !== 0) return nameComparison;

      // If names are the same, sort by project path to handle multiple projects
      const projectA = a.projectPath || "";
      const projectB = b.projectPath || "";
      return projectA.localeCompare(projectB);
    });
  }

  let html = ""; // Display ONLY local installed packages

  if (packagesToRender.length > 0) {
    html += packagesToRender
      .map((pkg) => {
        // Use icon from metadata if available, otherwise use default
        const iconHtml = pkg.iconBase64
          ? `<img src="${pkg.iconBase64}" alt="${pkg.name} icon" class="package-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`
          : "";
        const defaultIconHtml = `
            <svg width="40" height="40" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" ${
              pkg.iconBase64 ? 'style="display:none;"' : ""
            }>
              <path d="M20.3369 5.81836C22.06 5.84398 23.7022 6.55234 24.9043 7.78711C26.1044 9.0199 26.7684 10.6773 26.75 12.3975V20.1621L26.7451 20.4844C26.685 22.0915 26.0314 23.6245 24.9043 24.7822C23.7023 26.0167 22.0598 26.7244 20.3369 26.75H12.54C10.8169 26.7244 9.17379 26.017 7.97168 24.7822C6.76953 23.5474 6.10625 21.8854 6.12695 20.1621V12.3975C6.10858 10.6775 6.77178 9.01986 7.97168 7.78711C9.17379 6.55228 10.8169 5.84393 12.54 5.81836H20.3369ZM19.6846 16.4639C19.0406 16.4587 18.4093 16.644 17.8701 16.9961C17.3307 17.3485 16.9073 17.8532 16.6533 18.4453C16.3994 19.0374 16.326 19.6916 16.4424 20.3252C16.5588 20.9587 16.8599 21.5437 17.3076 22.0068C17.7554 22.47 18.3297 22.791 18.959 22.9287C19.5883 23.0664 20.2444 23.015 20.8447 22.7812C21.4451 22.5474 21.9636 22.1415 22.334 21.6143C22.7043 21.0872 22.9102 20.4623 22.9268 19.8184L22.9365 19.4551L22.9482 19.4453C22.9203 19.1307 22.8476 18.821 22.7305 18.5264C22.5699 18.1225 22.3307 17.7546 22.0264 17.4443C21.7219 17.134 21.3579 16.887 20.957 16.7188C20.5563 16.5506 20.126 16.4638 19.6914 16.4639H19.6846ZM11.7217 10.207C11.2447 10.2156 10.7896 10.4108 10.4551 10.751C10.1202 11.0916 9.93259 11.5506 9.93262 12.0283C9.93262 12.5114 10.1252 12.9748 10.4668 13.3164C10.8083 13.6578 11.2711 13.8495 11.7539 13.8496H11.7627C12.2456 13.8439 12.7064 13.6471 13.0439 13.3018C13.3815 12.9562 13.5681 12.4899 13.5625 12.0068C13.5567 11.524 13.36 11.0631 13.0146 10.7256C12.6695 10.3883 12.2042 10.2018 11.7217 10.207ZM4.06543 1.25C4.62082 1.25004 5.16471 1.41478 5.62695 1.72266C6.08894 2.03051 6.45004 2.4682 6.66406 2.98047C6.87806 3.49285 6.93589 4.05744 6.83008 4.60254C6.72426 5.14748 6.45934 5.64891 6.06934 6.04395C5.67913 6.43902 5.18047 6.71063 4.63672 6.82324C4.09291 6.9358 3.52773 6.88446 3.0127 6.67676C2.49763 6.46901 2.05477 6.11368 1.74121 5.65527C1.42779 5.19693 1.25691 4.6558 1.25 4.10059C1.24539 3.72805 1.31478 3.35823 1.4541 3.0127C1.59352 2.66702 1.80058 2.3521 2.0625 2.08691C2.3244 1.82178 2.6366 1.61144 2.98047 1.46777C3.3242 1.32419 3.69292 1.25003 4.06543 1.25Z" stroke="currentColor" stroke-width="1.5"/>
            </svg>`;

        // Use description from metadata if available
        const description = pkg.metadata?.description || "";
        const authors = pkg.metadata?.authors || "";

        // For grouped packages, we need special handling
        const isGrouped = pkg.isGrouped || false;
        const displayVersion = pkg.version; // This will be the combined versions for grouped packages

        return `
            <div class="package-item ${isGrouped ? "grouped-package" : ""}" 
                 data-package="${pkg.name}" 
                 data-version="${
                   isGrouped ? pkg.allPackages[0].version : pkg.version
                 }" 
                 data-project-path="${pkg.projectPath || ""}"
                 data-is-grouped="${isGrouped}"
                 ${
                   isGrouped
                     ? `data-all-packages='${JSON.stringify(
                         pkg.allPackages.map((p) => ({
                           name: p.name,
                           version: p.version,
                           projectPath: p.projectPath,
                         }))
                       )}'`
                     : ""
                 }>
                <div class="package-icon">
                    ${iconHtml}
                    ${defaultIconHtml}
                </div>
                <div class="nuget-package-info" style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <span style="font-weight: 500; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word; flex-shrink: 1;">${
                      pkg.name
                    }</span>
                    <span style="font-size: 0.85em; color: var(--vscode-descriptionForeground); flex-shrink: 0;">${displayVersion}</span>
                    ${
                      pkg.hasUpdateAvailable
                        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;" title="Update available">
                            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
                            <path d="M12 8l-4 4" />
                            <path d="M12 8v8" />
                            <path d="M16 12l-4 -4" />
                        </svg>`
                        : ""
                    }
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; font-size: 0.85em; color: var(--vscode-descriptionForeground); flex-shrink: 0; margin-left: auto;">
                    ${
                      // Show authors for NuGet.org packages
                      pkg.source &&
                      (pkg.source.toLowerCase().includes("nuget.org") ||
                        pkg.source.toLowerCase() === "nuget")
                        ? `<div style="display: flex; align-items: center; white-space: nowrap;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2ZM6 5C6 3.89543 6.89543 3 8 3C9.10457 3 10 3.89543 10 5C10 6.10457 9.10457 7 8 7C6.89543 7 6 6.10457 6 5ZM3 14C3 11.2386 5.23858 9 8 9C10.7614 9 13 11.2386 13 14H12C12 11.7909 10.2091 10 8 10C5.79086 10 4 11.7909 4 14H3Z" fill="#6C707E"/>
                            </svg>
                            ${authors || "Unknown"}
                        </div>
                        <span class="package-feed-indicator">${pkg.source || "nuget.org"}</span>`
                        : `<span class="package-feed-indicator">${pkg.source || (pkg.isLocal ? "Local Feed" : "nuget.org")}</span>`
                    }
                </div>
            </div>
        `;
      })
      .join("");
  } else {
    html = `
      <div class="empty-state">
          <svg class="empty-state-svg" xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8.812 4.793l3.188 -1.793l8 4.5v8.5m-2.282 1.784l-5.718 3.216l-8 -4.5v-9l2.223 -1.25" />
              <path d="M14.543 10.57l5.457 -3.07" />
              <path d="M12 12v9" />
              <path d="M12 12l-8 -4.5" />
              <path d="M16 5.25l-4.35 2.447m-2.564 1.442l-1.086 .611" />
              <path d="M3 3l18 18" />
          </svg>
          <div class="empty-state-title">No packages found</div>
          <div class="empty-state-description">No packages match your current filters</div>
      </div>
    `;
  }

  if (packageList) {
    packageList.innerHTML = html;
  }
  // Update package count for installed tab
  const packageCountElement = document.getElementById("packageCount");
  if (packageCountElement) {
    const countText =
      packagesToRender.length > 0
        ? `${packagesToRender.length} package${
            packagesToRender.length === 1 ? "" : "s"
          }`
        : "No packages";
    packageCountElement.textContent = countText;
  }
}

// Update browse display for NuGet packages
function updateBrowseDisplay(append = false, newPackages = null) {
  const browseList = document.getElementById("browseList");
  const searchPackages = document.getElementById("searchPackages");
  const nugetSearchResults = getNugetSearchResults();
  const isSearchingNuGet = getIsSearchingNuGet();
  const hasMoreResults = getHasMoreResults();

  // This function ONLY updates the browse packages tab (NuGet search results)
  console.log("updateBrowseDisplay called with:", {
    append,
    newPackages: newPackages ? newPackages.length : null,
    nugetSearchResults: nugetSearchResults.length,
    isSearchingNuGet,
    activeTab: getActiveTab(),
  });

  let html = "";

  if (isSearchingNuGet && !append) {
    html = '<div class="api-loading">Searching NuGet Gallery...</div>';
    
  } else if (nugetSearchResults.length > 0) {
    
    // Create NuGet package items ONLY for browse tab
    const nugetContainer = document.createElement("div");

    // In append mode, only render the new packages
    const packagesToRender =
      append && newPackages ? newPackages : nugetSearchResults;

    
    packagesToRender.forEach((pkg, index) => {
      
      const packageItem = createNuGetPackageItem(pkg);
      nugetContainer.appendChild(packageItem);
    });
    html = nugetContainer.innerHTML;
    

    // Add loading indicator at the bottom if more results are available
    if (
      hasMoreResults &&
      !isSearchingNuGet &&
      (!append || (append && newPackages && newPackages.length > 0))
    ) {
      html +=
        '<div class="load-more-container" id="loadingMore">Scroll down to load more packages...</div>';
    }
  } else if (!append) {
    
    const searchTerm = searchPackages ? searchPackages.value.trim() : "";
    if (searchTerm) {
      html = `
        <div class="empty-state">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="45"
                height="45"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8.812 4.793l3.188 -1.793l8 4.5v8.5m-2.282 1.784l-5.718 3.216l-8 -4.5v-9l2.223 -1.25" />
                <path d="M14.543 10.57l5.457 -3.07" />
                <path d="M12 12v9" />
                <path d="M12 12l-8 -4.5" />
                <path d="M16 5.25l-4.35 2.447m-2.564 1.442l-1.086 .611" />
                <path d="M3 3l18 18" />
              </svg>
            <div class="empty-state-title">No packages found</div>
            <div class="empty-state-description">No packages match your search in NuGet Gallery</div>
        </div>
      `;
    } else {
      html = `
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
  }

  

  // Update browse packages list - append if specified, otherwise replace
  if (append && browseList) {
    // In append mode, we should never clear the existing list
    // Remove any existing "load more" indicator
    const existingLoadMore = browseList.querySelector("#loadingMore");
    if (existingLoadMore) {
      existingLoadMore.remove();
    }

    // Only append if we have new content
    if (html) {
      // Create temporary container to parse the new HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      // Append new package items to the existing list
      while (tempDiv.firstChild) {
        browseList.appendChild(tempDiv.firstChild);
      }
    }
    
    // If no more results and there are existing packages, show "end of results" message
    if (!hasMoreResults && nugetSearchResults.length > 0) {
      const endMessage = document.createElement("div");
      endMessage.className = "load-more-container";
      endMessage.id = "loadingMore";
      endMessage.textContent = "No more packages to load";
      browseList.appendChild(endMessage);
    }
  } else if (browseList) {
    // Replace entire content (only for non-append mode)
    browseList.innerHTML = html;
    
    // Add skip-animations class after initial render to prevent animation replay on updates
    requestAnimationFrame(() => {
      if (browseList && !browseList.classList.contains('skip-animations')) {
        browseList.classList.add('skip-animations');
      }
    });
  }

  // Update browse count
  const browseCountElement = document.getElementById("browseCount");
  if (browseCountElement && !isSearchingNuGet) {
    const countText =
      nugetSearchResults.length > 0
        ? `${nugetSearchResults.length} packages found${
            hasMoreResults ? "+" : ""
          }`
        : "No packages";
    browseCountElement.textContent = countText;
  }
}

// Helper function to get packages from main file (this needs to be implemented in main file)
function getPackages() {
  return window.packages || [];
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.createNuGetPackageItem = createNuGetPackageItem;
  window.updatePackageDisplay = updatePackageDisplay;
  window.updateBrowseDisplay = updateBrowseDisplay;
  window.showLeftPanelLoadingOverlay = showLeftPanelLoadingOverlay;
  window.hideLeftPanelLoadingOverlay = hideLeftPanelLoadingOverlay;
}
