/**
 * Package operations for the NuGet Package Manager
 * Contains functionality for package installation, updates, uninstalls, and related operations
 */

// Package selection and detail functions
function selectPackage(packageItem) {
  // Remove previous selection
  document
    .querySelectorAll(".package-item, .nuget-package-item")
    .forEach((item) => {
      item.classList.remove("selected");
    });

  // Select new package
  packageItem.classList.add("selected");

  // Scroll the selected item into view
  packageItem.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
  const packageName = packageItem.dataset.package;
  const packageVersion = packageItem.dataset.version;
  const projectPath = packageItem.dataset.projectPath;
  const isGrouped = packageItem.dataset.isGrouped === "true";
  const packages = getPackages();

  if (!packages || packages.length === 0) {
    console.error("No packages available from getPackages()");
    return;
  }

  let selectedPackage;
  if (isGrouped) {
    // For grouped packages, we need to find the first package with the given name
    // The dataset.version contains the first package's version for grouped packages
    selectedPackage = packages.find((p) => p.name === packageName);

    // Create a virtual grouped package object for details
    if (selectedPackage) {
      const allPackagesForName = packages.filter((p) => p.name === packageName);
      const uniqueVersions = [
        ...new Set(allPackagesForName.map((p) => p.version)),
      ].sort();

      selectedPackage = {
        ...selectedPackage,
        isGrouped: true,
        groupedVersions: uniqueVersions,
        allPackages: allPackagesForName,
        version: uniqueVersions.join("; "), // Show combined versions in details
        projectPath: "", // Clear individual project path for grouped
        projectCount: new Set(
          allPackagesForName.flatMap(
            (p) => p.projectPaths || (p.projectPath ? [p.projectPath] : [])
          )
        ).size,
      };
    }
  } else {
    // For individual packages, find exact match
    selectedPackage = packages.find((p) => {
      const packageProjects =
        p.projectPaths || (p.projectPath ? [p.projectPath] : []);

      const nameMatch = p.name === packageName;
      const versionMatch = p.version === packageVersion;

      // Handle project path matching more flexibly
      let pathMatch = false;
      if (!projectPath || projectPath === "") {
        // If no project path specified in HTML, match the first package with this name and version
        pathMatch = true;
      } else {
        // If project path is specified, try to match it
        pathMatch = packageProjects.includes(projectPath);
      }

      return nameMatch && versionMatch && pathMatch;
    }); // If no exact match found and projectPath was specified, try without project path constraint
    if (!selectedPackage && projectPath && projectPath !== "") {
      selectedPackage = packages.find((p) => {
        const nameMatch = p.name === packageName;
        const versionMatch = p.version === packageVersion;

        return nameMatch && versionMatch;
      });
    }

    // For individual packages, store the specific selected project path
    if (selectedPackage && projectPath) {
      selectedPackage = {
        ...selectedPackage,
        selectedProjectPath: projectPath, // Store the specific project path selected by the user
      };
    }
  }
  if (selectedPackage) {
    setSelectedPackage(selectedPackage);
    showPackageDetails(selectedPackage);

    // Update project usage immediately
    updateProjectUsageForPackage(selectedPackage.name);

    // Request additional package details
    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "getPackageDetails",
        packageName: selectedPackage.name,
        packageVersion: isGrouped
          ? selectedPackage.groupedVersions[0]
          : selectedPackage.version,
      });
    }
  } else {
    console.error(
      "No selected package found! Available packages:",
      packages.map((p) => ({
        name: p.name,
        version: p.version,
        projectPath: p.projectPath,
      }))
    );
  }
}

function selectNuGetPackage(nugetPackageItem) {
  // Remove previous selection from both lists
  document.querySelectorAll(".package-item").forEach((item) => {
    item.classList.remove("selected");
  });
  document.querySelectorAll(".nuget-package-item").forEach((item) => {
    item.classList.remove("selected");
  });

  // Select new package
  nugetPackageItem.classList.add("selected");

  // Scroll to the selected item
  nugetPackageItem.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });

  const packageId = nugetPackageItem.dataset.nugetPackage;
  const packageVersion = nugetPackageItem.dataset.version;
  const nugetSearchResults = getNugetSearchResults();

  // Find the NuGet package data (handle both remote and local packages)
  const nugetPackage = nugetSearchResults.find(
    (p) => p.id === packageId || p.name === packageId
  );

  if (nugetPackage) {
    setSelectedPackage(nugetPackage); // Set selected package for version updates
    showNuGetPackageDetails(nugetPackage);
  }
}

// Shared function to generate package details HTML
function generatePackageDetailsHTML(packageInfo, isInstalled = false) {
  const packageDetails = document.getElementById("packageDetails");
  if (!packageDetails) {
    console.error(
      "packageDetails element not found in generatePackageDetailsHTML!"
    );
    return "";
  }

  // Handle versions - if not available, create a single version entry or request versions
  let versionsHtml = "";

  // Handle grouped packages specially
  if (packageInfo.isGrouped && packageInfo.groupedVersions) {
    versionsHtml = packageInfo.groupedVersions
      .slice()
      .reverse() // Show all versions, newest first
      .map((version) => `<option value="${version}">${version}</option>`)
      .join("");
  } else if (packageInfo.versions && Array.isArray(packageInfo.versions)) {
    versionsHtml = packageInfo.versions
      .reverse() // Show all versions, newest first
      .map((v) => {
        // Handle both string versions (local packages) and object versions (remote packages)
        const version = typeof v === "string" ? v : v.version;
        return `<option value="${version}">${version}</option>`;
      })
      .join("");
  } else if (packageInfo.version) {
    // If no versions array but we have a single version, use that
    versionsHtml = `<option value="${packageInfo.version}">${packageInfo.version}</option>`;
  } else {
    // No version info available
    versionsHtml = '<option value="">No versions available</option>';
  }

  const isLocal = packageInfo.isLocal || false;
  const downloadCount = packageInfo.totalDownloads || 0;

  // Store project information for uninstall operations (for installed packages)
  const projectName = isInstalled
    ? packageInfo.projectName ||
      packageInfo.projectPath
        ?.split(/[\\\/]/)
        .pop()
        ?.replace(".csproj", "") ||
      "Unknown Project"
    : null;

  // Choose appropriate icon
  const iconHtml =
    packageInfo.iconUrl && !isLocal
      ? `<img src="${packageInfo.iconUrl}" alt="${
          packageInfo.name || packageInfo.id
        } icon" class="package-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`
      : packageInfo.iconBase64
      ? `<img src="${packageInfo.iconBase64}" alt="${packageInfo.name} icon" class="package-icon-img">`
      : "";

  const fallbackIconHtml = `<svg width="40" height="40" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" ${
    (packageInfo.iconUrl && !isLocal) || packageInfo.iconBase64
      ? 'style="display:none;"'
      : ""
  }>
    <path d="M20.3369 5.81836C22.06 5.84398 23.7022 6.55234 24.9043 7.78711C26.1044 9.0199 26.7684 10.6773 26.75 12.3975V20.1621L26.7451 20.4844C26.685 22.0915 26.0314 23.6245 24.9043 24.7822C23.7023 26.0167 22.0598 26.7244 20.3369 26.75H12.54C10.8169 26.7244 9.17379 26.017 7.97168 24.7822C6.76953 23.5474 6.10625 21.8854 6.12695 20.1621V12.3975C6.10858 10.6775 6.77178 9.01986 7.97168 7.78711C9.17379 6.55228 10.8169 5.84393 12.54 5.81836H20.3369ZM19.6846 16.4639C19.0406 16.4587 18.4093 16.644 17.8701 16.9961C17.3307 17.3485 16.9073 17.8532 16.6533 18.4453C16.3994 19.0374 16.326 19.6916 16.4424 20.3252C16.5588 20.9587 16.8599 21.5437 17.3076 22.0068C17.7554 22.47 18.3297 22.791 18.959 22.9287C19.5883 23.0664 20.2444 23.015 20.8447 22.7812C21.4451 22.5474 21.9636 22.1415 22.334 21.6143C22.7043 21.0872 22.9102 20.4623 22.9268 19.8184L22.9365 19.4551L22.9482 19.4453C22.9203 19.1307 22.8476 18.821 22.7305 18.5264C22.5699 18.1225 22.3307 17.7546 22.0264 17.4443C21.7219 17.134 21.3579 16.887 20.957 16.7188C20.5563 16.5506 20.126 16.4638 19.6914 16.4639H19.6846ZM11.7217 10.207C11.2447 10.2156 10.7896 10.4108 10.4551 10.751C10.1202 11.0916 9.93259 11.5506 9.93262 12.0283C9.93262 12.5114 10.1252 12.9748 10.4668 13.3164C10.8083 13.6578 11.2711 13.8495 11.7539 13.8496H11.7627C12.2456 13.8439 12.7064 13.6471 13.0439 13.3018C13.3815 12.9562 13.5681 12.4899 13.5625 12.0068C13.5567 11.524 13.36 11.0631 13.0146 10.7256C12.6695 10.3883 12.2042 10.2018 11.7217 10.207ZM4.06543 1.25C4.62082 1.25004 5.16471 1.41478 5.62695 1.72266C6.08894 2.03051 6.45004 2.4682 6.66406 2.98047C6.87806 3.49285 6.93589 4.05744 6.83008 4.60254C6.72426 5.14748 6.45934 5.64891 6.06934 6.04395C5.67913 6.43902 5.18047 6.71063 4.63672 6.82324C4.09291 6.9358 3.52773 6.88446 3.0127 6.67676C2.49763 6.46901 2.05477 6.11368 1.74121 5.65527C1.42779 5.19693 1.25691 4.6558 1.25 4.10059C1.24539 3.72805 1.31478 3.35823 1.4541 3.0127C1.59352 2.66702 1.80058 2.3521 2.0625 2.08691C2.3244 1.82178 2.6366 1.61144 2.98047 1.46777C3.3242 1.32419 3.69292 1.25003 4.06543 1.25Z" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
  // Choose appropriate action buttons
  const actionButtons = isInstalled
    ? `<button id="updateBtn" onclick="updatePackage()" class="icon-btn-clean" title="Update Package">
         <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
           <path stroke-linecap="round" stroke-linejoin="round" d="m15 11.25-3-3m0 0-3 3m3-3v7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>
         </svg>
       </button>
       <button id="uninstallBtn" onclick="uninstallPackage()" class="icon-btn-clean danger" title="Uninstall Package">
         <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
           <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"></path>
         </svg>
       </button>`
    : `<button id="installBtn" onclick="installNuGetPackage()" class="icon-btn-clean" title="Install Package">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
         </svg>
       </button>`;
  return `
    <div class="package-details-header">
        <!-- Row 1: Icon and Package Name -->
        <div class="package-title-row">
            <div class="package-icon">
                ${iconHtml}
                ${fallbackIconHtml}
            </div>
            <div class="package-name">
                <h2>${
                  packageInfo.title || packageInfo.name || packageInfo.id
                }</h2>
            </div>
        </div>
        
        <!-- Row 2: Version, Source, Authors, Downloads -->
        <div class="package-info-row">
            ${
              packageInfo.version
                ? `<span class="info-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M7.70696 2.29289L1.29485 8.705C0.904322 9.09553 0.904322 9.72869 1.29485 10.1192L5.88063 14.705C6.27116 15.0955 6.90432 15.0955 7.29485 14.705L13.707 8.29289C13.8945 8.10536 13.9998 7.851 13.9998 7.58579V3C13.9998 2.44772 13.5521 2 12.9998 2H8.41406C8.14885 2 7.89449 2.10536 7.70696 2.29289ZM2.00195 9.41211L8.41406 3L12.9998 3V7.58579L6.58774 13.9979L2.00195 9.41211Z" fill="#6C707E"/>
                      <circle cx="10" cy="6" r="1.5" stroke="#6C707E"/>
                    </svg>
                    ${packageInfo.version}
                  </span>`
                : ""
            }
            ${
              packageInfo.source
                ? `<span class="info-item"><strong>Source:</strong> ${packageInfo.source}</span>`
                : ""
            }
            ${
              packageInfo.authors && packageInfo.authors.length > 0
                ? `<span class="info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          ${
            Array.isArray(packageInfo.authors)
              ? packageInfo.authors.join(", ")
              : packageInfo.authors
          }${
                    packageInfo.verified
                      ? ' <span class="verified-author" title="Verified Author"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.2 6.4L7.2 10.4C7.09 10.51 6.95 10.57 6.8 10.57C6.65 10.57 6.51 10.51 6.4 10.4L4.8 8.8C4.58 8.58 4.58 8.22 4.8 8C5.02 7.78 5.38 7.78 5.6 8L6.8 9.2L10.4 5.6C10.62 5.38 10.98 5.38 11.2 5.6C11.42 5.82 11.42 6.18 11.2 6.4Z" fill="#22c55e"/></svg> Verified</span>'
                      : ""
                  }
        </span>`
                : packageInfo.metadata?.authors
                ? `<span class="info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          ${packageInfo.metadata.authors}${
                    packageInfo.verified
                      ? ' <span class="verified-author" title="Verified Author"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.2 6.4L7.2 10.4C7.09 10.51 6.95 10.57 6.8 10.57C6.65 10.57 6.51 10.51 6.4 10.4L4.8 8.8C4.58 8.58 4.58 8.22 4.8 8C5.02 7.78 5.38 7.78 5.6 8L6.8 9.2L10.4 5.6C10.62 5.38 10.98 5.38 11.2 5.6C11.42 5.82 11.42 6.18 11.2 6.4Z" fill="#22c55e"/></svg> Verified</span>'
                      : ""
                  }
        </span>`
                : ""
            }
            ${
              downloadCount && downloadCount > 0
                ? `<span class="info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7,10 12,15 17,10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    ${
                      typeof window !== "undefined" &&
                      window.formatCompactNumber
                        ? window.formatCompactNumber(downloadCount)
                        : downloadCount.toLocaleString()
                    } downloads
                  </span>`
                : ""
            }
        </div>
        
        <!-- Row 3: Version Selector and Action Buttons -->
        <div class="package-actions">
            <div class="version-control">
                <label for="versionSelectContainer">Version:</label>
                <div id="versionSelectContainer" class="version-loading">
                    <svg class="version-spinner" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.25"/>
                        <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </div>
    </div>    <!-- Package Information Section -->
    <div class="details-section">
        <h3 onclick="toggleSection(this)">
            <div class="section-header">
            <svg class="section-icon" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-info-circle"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>

                Package Information
            </div>
            <svg class="collapse-icon" viewBox="0 0 24 24">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
            </svg>
        </h3>
        <div class="details-content">
            <!-- Description -->
            <div class="description-section">
                <p>${
                  packageInfo.description ||
                  packageInfo.metadata?.description ||
                  "No description available"
                }</p>
            </div>            <!-- Links Row: Project URL, Repository, and License -->
            <div class="package-links">
                ${
                  packageInfo.metadata?.projectUrl || packageInfo.projectUrl
                    ? `<a href="${
                        packageInfo.metadata?.projectUrl ||
                        packageInfo.projectUrl
                      }" target="_blank" style="color: var(--vscode-textLink-foreground); margin-right: 16px; display: inline-flex; align-items: center; gap: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-world-www">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <path d="M19.5 7a9 9 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4" />
                          <path d="M11.5 3a16.989 16.989 0 0 0 -1.826 4" />
                          <path d="M12.5 3a16.989 16.989 0 0 1 1.828 4" />
                          <path d="M19.5 17a9 9 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4" />
                          <path d="M11.5 21a16.989 16.989 0 0 1 -1.826 -4" />
                          <path d="M12.5 21a16.989 16.989 0 0 0 1.828 -4" />
                          <path d="M2 10l1 4l1.5 -4l1.5 4l1 -4" />
                          <path d="M17 10l1 4l1.5 -4l1.5 4l1 -4" />
                          <path d="M9.5 10l1 4l1.5 -4l1.5 4l1 -4" />
                        </svg>
                        Project URL
                      </a>`
                    : ""
                }
                ${
                  packageInfo.metadata?.repository?.url
                    ? `<a href="${packageInfo.metadata.repository.url}" target="_blank" style="color: var(--vscode-textLink-foreground); margin-right: 16px; display: inline-flex; align-items: center; gap: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-git">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <path d="M16 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                          <path d="M12 8m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                          <path d="M12 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                          <path d="M12 15v-6" />
                          <path d="M15 11l-2 -2" />
                          <path d="M11 7l-1.9 -1.9" />
                          <path d="M13.446 2.6l7.955 7.954a2.045 2.045 0 0 1 0 2.892l-7.955 7.955a2.045 2.045 0 0 1 -2.892 0l-7.955 -7.955a2.045 2.045 0 0 1 0 -2.892l7.955 -7.955a2.045 2.045 0 0 1 2.892 0z" />
                        </svg>
                        Repository
                      </a>`
                    : ""
                }                ${
    packageInfo.metadata?.licenseUrl
      ? `<a href="${packageInfo.metadata.licenseUrl}" target="_blank" style="color: var(--vscode-textLink-foreground); display: inline-flex; align-items: center; gap: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-license">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <path d="M15 21h-9a3 3 0 0 1 -3 -3v-1h10v2a2 2 0 0 0 4 0v-14a2 2 0 1 1 2 2h-2m2 -4h-11a3 3 0 0 0 -3 3v11" />
                          <path d="M9 7l4 0" />
                          <path d="M9 11l4 0" />
                        </svg>
                        License
                      </a>`
      : ""
  }
            </div>
        </div>
    </div>    <div class="details-section">
        <h3 onclick="toggleSection(this)">
            <div class="section-header">                <svg class="section-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"></path>
                        </svg>
                Projects using this package
            </div>
            <svg class="collapse-icon" viewBox="0 0 24 24">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
            </svg>
        </h3>
        <div class="details-content">
            <ul class="project-list" id="projectUsageList">
                <li><div class="inline-loading-spinner" style="margin-right: 5px;"></div>Loading project usage...</li>
            </ul>
        </div>
    </div>

    <div class="details-section">
        <h3 onclick="toggleSection(this)">
            <div class="section-header">
            <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24" class="section-icon" viewBox="0 0 24 24" stroke="currentColor"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-hierarchy-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 3h4v4h-4z" /><path d="M3 17h4v4h-4z" /><path d="M17 17h4v4h-4z" /><path d="M7 17l5 -4l5 4" /><path d="M12 7l0 6" /></svg>

                Dependencies
            </div>
            <svg class="collapse-icon" viewBox="0 0 24 24">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
            </svg>
        </h3>
        <div class="details-content">
            <ul class="dependency-list" id="dependencyList">
                <li><div class="inline-loading-spinner" style="margin-right: 5px;"></div>Loading dependencies...</li>
            </ul>
        </div>
    </div>
  `;
}

function animatePackageDetailsSlideIn() {
  const rightPanel = document.querySelector(".right-panel");
  const packageDetailsHeader = document.querySelector(
    ".package-details-header"
  );
  const detailsSections = document.querySelectorAll(".details-section");

  // Open mobile panel if on mobile device
  if (window.innerWidth <= 900 && typeof window.openMobilePanel === "function") {
    window.openMobilePanel();
  }

  // Add slide-in class to right panel
  if (rightPanel) {
    rightPanel.classList.add("slide-in");

    // Remove the class after animation completes and clean up will-change
    setTimeout(() => {
      rightPanel.classList.remove("slide-in");
      rightPanel.style.willChange = "auto";
    }, 400);
  }

  // Show header instantly (no animation)
  if (packageDetailsHeader) {
    packageDetailsHeader.classList.add("animate-in");
    packageDetailsHeader.style.willChange = "auto";
  }

  // Animate only the sections with staggered delays
  setTimeout(() => {
    detailsSections.forEach((section, index) => {
      section.classList.add("animate-in");

      // Clean up will-change after animation (accounting for shorter staggered delays)
      setTimeout(() => {
        section.style.willChange = "auto";
      }, 500 + index * 80);
    });
  }, 50); // Reduced delay since header shows instantly
}

function resetPackageDetailsAnimation() {
  const packageDetailsHeader = document.querySelector(
    ".package-details-header"
  );
  const detailsSections = document.querySelectorAll(".details-section");

  // Reset header
  if (packageDetailsHeader) {
    packageDetailsHeader.classList.remove("animate-in");
    packageDetailsHeader.style.willChange = "";
  }

  // Reset all sections
  detailsSections.forEach((section) => {
    section.classList.remove("animate-in");
    section.style.willChange = "";
  });
}

function showPackageDetailsGeneric(packageInfo, isInstalled = false) {
  const packageDetails = document.getElementById("packageDetails");
  if (!packageDetails) {
    console.error("packageDetails element not found!");
    return;
  }

  // Reset any existing animations first
  resetPackageDetailsAnimation();

  packageDetails.innerHTML = generatePackageDetailsHTML(
    packageInfo,
    isInstalled
  );

  // Start the slide-in animation
  requestAnimationFrame(() => {
    animatePackageDetailsSlideIn();
  });

  // Request available versions for this package
  if (typeof vscode !== "undefined") {
    vscode.postMessage({
      command: "getPackageVersions",
      packageName: packageInfo.name || packageInfo.id,
      packageSource: packageInfo.source, // Include the source feed name
    });
  }

  // Calculate and display projects using this package
  updateProjectUsageForPackage(packageInfo.name || packageInfo.id);
}

function showPackageDetails(packageInfo) {
  showPackageDetailsGeneric(packageInfo, true);
}

function showNuGetPackageDetails(packageInfo) {
  showPackageDetailsGeneric(packageInfo, false);
}

function updatePackage() {
  const selectedPackage = getSelectedPackage();
  const isOperationInProgress = getIsOperationInProgress();

  if (!selectedPackage || isOperationInProgress) return;

  const selectedVersion = window.versionDropdown ? window.versionDropdown.getValue() : null;

  if (!selectedVersion) return;

  const allPackages = getPackages();
  const packageName = selectedPackage.name;

  // Find all packages with the same name (regardless of version)
  const packagesWithSameName = allPackages.filter(
    (pkg) => pkg.name === packageName
  );

  // Get all unique project paths that have this package
  const projectPathsSet = new Set();
  packagesWithSameName.forEach((pkg) => {
    const packageProjects =
      pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
    packageProjects.forEach((projectPath) => {
      projectPathsSet.add(projectPath);
    });
  });

  const projectPaths = Array.from(projectPathsSet);
  const projectCount = projectPaths.length;
  const currentVersions = [
    ...new Set(packagesWithSameName.map((p) => p.version)),
  ];

  if (projectCount === 0) {
    return; // No projects have this package
  }

  // Check if all projects already have the selected version
  const allAlreadyOnSelectedVersion = packagesWithSameName.every(
    (pkg) => pkg.version === selectedVersion
  );
  if (allAlreadyOnSelectedVersion) {
    return; // Nothing to update
  }

  // Show confirmation dialog with details about all affected projects
  if (typeof showConfirmDialog === "function") {
    const confirmMessage =
      projectCount === 1
        ? `Update ${packageName} to version ${selectedVersion}?`
        : currentVersions.length === 1
        ? `Update ${packageName} from version ${currentVersions[0]} to ${selectedVersion} in all ${projectCount} projects?`
        : `Update ${packageName} to version ${selectedVersion} in all ${projectCount} projects (currently on ${currentVersions.length} different versions)?`;

    showConfirmDialog(confirmMessage, () => {
      // Update in all projects that have this package
      if (typeof vscode !== "undefined") {
        projectPaths.forEach((projectPath) => {
          vscode.postMessage({
            command: "updatePackage",
            packageName: packageName,
            version: selectedVersion,
            projectPath: projectPath,
          });
        });
      }
    });
  }
}

function uninstallPackage() {
  const selectedPackage = getSelectedPackage();
  const isOperationInProgress = getIsOperationInProgress();

  if (!selectedPackage || isOperationInProgress) return;

  const allPackages = getPackages();
  const packageName = selectedPackage.name;

  // Find all packages with the same name (regardless of version)
  const packagesWithSameName = allPackages.filter(
    (pkg) => pkg.name === packageName
  );

  // Get all unique project paths that have this package
  const projectPathsSet = new Set();
  packagesWithSameName.forEach((pkg) => {
    const packageProjects =
      pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
    packageProjects.forEach((projectPath) => {
      projectPathsSet.add(projectPath);
    });
  });

  const projectPaths = Array.from(projectPathsSet);
  const projectCount = projectPaths.length;
  const versionCount = new Set(packagesWithSameName.map((p) => p.version)).size;

  if (projectCount === 0) {
    return; // No projects have this package
  }

  // Show confirmation dialog with details about all affected projects
  if (typeof showConfirmDialog === "function") {
    const confirmMessage =
      projectCount === 1
        ? `Are you sure you want to uninstall ${packageName}?`
        : `This will uninstall ${packageName} from all ${projectCount} projects${
            versionCount > 1 ? ` (${versionCount} versions)` : ""
          }. Are you sure?`;

    showConfirmDialog(confirmMessage, () => {
      // Uninstall from all projects that have this package
      if (typeof vscode !== "undefined") {
        projectPaths.forEach((projectPath) => {
          vscode.postMessage({
            command: "uninstallPackage",
            packageName: packageName,
            projectPath: projectPath,
          });
        });
      }
    });
  }
}

function installNuGetPackage() {
  const selectedPackage = getSelectedPackage();
  const isOperationInProgress = getIsOperationInProgress();
  const projects = getProjects();

  if (!selectedPackage || isOperationInProgress) return;

  const selectedVersion = window.versionDropdown
    ? window.versionDropdown.getValue()
    : selectedPackage.version;
  const packageName = selectedPackage.name || selectedPackage.id;
  
  // DEBUG: Log version info
  console.log('[INSTALL DEBUG] window.versionDropdown exists:', !!window.versionDropdown);
  console.log('[INSTALL DEBUG] selectedVersion from dropdown:', selectedVersion);
  console.log('[INSTALL DEBUG] selectedPackage.version:', selectedPackage.version);
  
  // Ensure we have a valid version
  const versionToInstall = selectedVersion || selectedPackage.version;
  console.log('[INSTALL DEBUG] Final versionToInstall:', versionToInstall);
  
  if (!versionToInstall) {
    console.error('No version available for installation');
    return;
  }

  if (projects.length === 1) {
    // Only one project, install directly
    const projectPath = projects[0].path;
    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "installPackage",
        packageName: packageName,
        version: versionToInstall,
        projectPath: projectPath,
      });
      
      // Close mobile panel if on small screen
      if (window.innerWidth <= 900 && typeof window.closeMobilePanel === 'function') {
        window.closeMobilePanel();
      }
    }
  } else if (projects.length > 1) {
    // Multiple projects, show selection dialog
    const projectItems = projects.map((p) => ({
      value: p.path,
      label: p.name
    }));

    if (typeof showInfoDialog === "function") {
      showInfoDialog(
        "Select Project",
        `<p style="margin: 0 0 10px 0;">Select the project to install ${packageName}:</p>
         <div id="projectSelectDialogContainer"></div>`,
        () => {
          const selectedProjectPath = window.projectSelectDialogDropdown
            ? window.projectSelectDialogDropdown.getValue()
            : null;
          
          if (selectedProjectPath && typeof vscode !== "undefined") {
            vscode.postMessage({
              command: "installPackage",
              packageName: packageName,
              version: versionToInstall,
              projectPath: selectedProjectPath,
            });
            
            // Clean up dropdown
            if (window.projectSelectDialogDropdown) {
              window.projectSelectDialogDropdown.destroy();
              window.projectSelectDialogDropdown = null;
            }
            
            // Close mobile panel if on small screen
            if (window.innerWidth <= 900 && typeof window.closeMobilePanel === 'function') {
              window.closeMobilePanel();
            }
            
            return true; // Indicate that we handled the dialog
          }
          return false; // Keep dialog open if no project selected
        }
      );
      
      // Initialize SharedDropdown after dialog is shown
      setTimeout(() => {
        if (window.projectSelectDialogDropdown) {
          window.projectSelectDialogDropdown.destroy();
        }
        window.projectSelectDialogDropdown = new SharedDropdown({
          containerId: 'projectSelectDialogContainer',
          placeholder: 'Select project...',
          items: projectItems,
          initialValue: projectItems.length > 0 ? projectItems[0].value : '',
          enableSearch: true
        });
      }, 50);
    }
  } else {
    if (typeof showErrorDialog === "function") {
      showErrorDialog(
        "No Projects",
        "No projects found to install the package."
      );
    }
  }
}

// Calculate and display which projects use a specific package
// Calculate and display which projects use a specific package
function updateProjectUsageForPackage(packageName) {
  const projectUsageList = document.getElementById("projectUsageList");
  if (!projectUsageList) return;

  const allPackages = getPackages();
  const allProjects = getProjects();

  // Create a map of project paths to their package info for this specific package
  const projectPackageMap = new Map();
  allPackages.forEach((pkg) => {
    if (pkg.name === packageName) {
      const packageProjects =
        pkg.projectPaths || (pkg.projectPath ? [pkg.projectPath] : []);
      packageProjects.forEach((projectPath) => {
        projectPackageMap.set(projectPath, { version: pkg.version });
      });
    }
  });

  // Create entries for all projects in the solution
  const projectEntries = allProjects.map((project) => {
    const packageInfo = projectPackageMap.get(project.path);
    return {
      projectPath: project.path,
      projectName: project.name,
      projectType: project.projectType || "unknown",
      iconPaths: project.iconPaths,
      version: packageInfo?.version || null,
      hasPackage: !!packageInfo,
    };
  });

  // Sort projects: those with the package installed first, then those without
  projectEntries.sort((a, b) => {
    if (a.hasPackage && !b.hasPackage) return -1;
    if (!a.hasPackage && b.hasPackage) return 1;
    return 0;
  });

  if (projectEntries.length > 0) {
    projectUsageList.innerHTML = projectEntries
      .map((project) => {
        const projectName = project.projectName || "Unknown Project";
        // Properly escape the project path for onclick attribute (JavaScript string escaping)
        const escapedProjectPath = project.projectPath
          ? project.projectPath.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
          : "";
        const escapedPackageName = packageName.replace(/'/g, "\\'"); // Create project icon HTML
        let projectIconHtml = "";
        if (
          project.iconPaths &&
          project.iconPaths.light &&
          project.iconPaths.dark
        ) {
          // Use the webview URIs directly (already converted in backend)
          projectIconHtml = `
            <div class="project-icon">
              <img src="${project.iconPaths.light}" 
                   alt="${project.projectType}" 
                   class="project-icon-light" />
              <img src="${project.iconPaths.dark}" 
                   alt="${project.projectType}" 
                   class="project-icon-dark" />
            </div>
          `;
        } else {
          // Fallback icon
          projectIconHtml = `
            <div class="project-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h12v12H2V2zm1 1v10h10V3H3z"/>
              </svg>
            </div>
          `;
        }
        if (project.hasPackage) {
          return `
          <li style="display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: center; padding: 2px 0; margin: 0; background: none; border: none;">
            ${projectIconHtml}
            <span style="font-weight: 500; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis;">${projectName}</span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 0.95em; color: var(--vscode-descriptionForeground); white-space: nowrap; font-weight: 500;">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0;">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M7.70696 2.29289L1.29485 8.705C0.904322 9.09553 0.904322 9.72869 1.29485 10.1192L5.88063 14.705C6.27116 15.0955 6.90432 15.0955 7.29485 14.705L13.707 8.29289C13.8945 8.10536 13.9998 7.851 13.9998 7.58579V3C13.9998 2.44772 13.5521 2 12.9998 2H8.41406C8.14885 2 7.89449 2.10536 7.70696 2.29289ZM2.00195 9.41211L8.41406 3L12.9998 3V7.58579L6.58774 13.9979L2.00195 9.41211Z" fill="#6C707E"/>
                <circle cx="10" cy="6" r="1.5" stroke="#6C707E"/>
              </svg>
              ${project.version}
            </span>
            <div style="display: flex; align-items: center; gap: 4px; justify-self: end;">
              <button onclick="updatePackageInProject('${escapedProjectPath}', '${escapedPackageName}')" class="icon-btn-clean" title="Update package in ${projectName}" style="padding: 3px; min-width: 24px; height: 24px; background: none; border: none;">
                <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m15 11.25-3-3m0 0-3 3m3-3v7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>
                </svg>
              </button>
              <button onclick="uninstallFromProject('${escapedProjectPath}', '${escapedPackageName}')" class="icon-btn-clean danger" title="Uninstall from ${projectName}" style="padding: 3px; min-width: 24px; height: 24px; background: none; border: none;">
                <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"></path>
                </svg>
              </button>
            </div>
          </li>`;
        } else {
          return `
          <li style="display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: center; padding: 2px 0; margin: 0; background: none; border: none;">
            ${projectIconHtml}
            <span style="font-weight: 400; font-size: 0.9em; color: var(--vscode-descriptionForeground); overflow: hidden; text-overflow: ellipsis;">${projectName}</span>
            <span style="width: 60px;"></span>
            <div style="display: flex; align-items: center; justify-self: end;">
              <button onclick="installPackageInProject('${escapedProjectPath}', '${escapedPackageName}')" class="icon-btn-clean" title="Install package in ${projectName}" style="padding: 3px; min-width: 24px; height: 24px; background: none; border: none;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
            </div>
          </li>`;
        }
      })
      .join("");
  } else {
    projectUsageList.innerHTML = "<li>No projects found in the solution</li>";
  }
}

// Function to handle uninstall from specific project
function uninstallFromProject(projectPath, packageName) {
  if (!packageName) {
    // If packageName not provided, get it from selected package
    const selectedPackage = getSelectedPackage();
    if (selectedPackage) {
      packageName = selectedPackage.name;
    }
  }

  if (packageName && projectPath) {
    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "uninstallPackage",
        packageName: packageName,
        projectPath: projectPath,
      });
    }
  }
}

// Function to handle update package in specific project
function updatePackageInProject(projectPath, packageName) {
  if (!packageName) {
    // If packageName not provided, get it from selected package
    const selectedPackage = getSelectedPackage();
    if (selectedPackage) {
      packageName = selectedPackage.name;
    }
  }

  if (packageName && projectPath) {
    const selectedVersion = window.versionDropdown ? window.versionDropdown.getValue() : null;

    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "updatePackage",
        packageName: packageName,
        version: selectedVersion,
        projectPath: projectPath,
      });
    }
  }
}

// Function to handle install package in specific project
function installPackageInProject(projectPath, packageName) {
  if (!packageName) {
    // If packageName not provided, get it from selected package
    const selectedPackage = getSelectedPackage();
    if (selectedPackage) {
      packageName = selectedPackage.name || selectedPackage.id;
    }
  }

  if (packageName && projectPath) {
    // Use window.versionDropdown (SharedDropdown) instead of old versionSelect element
    let selectedVersion = window.versionDropdown
      ? window.versionDropdown.getValue()
      : null;
    
    // If no version selected from dropdown, try to get it from selected package
    if (!selectedVersion) {
      const selectedPackage = getSelectedPackage();
      if (selectedPackage) {
        selectedVersion = selectedPackage.version;
      }
    }
    
    // Only proceed if we have a valid version
    if (!selectedVersion) {
      console.error('No version available for installation');
      return;
    }

    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "installPackage",
        packageName: packageName,
        version: selectedVersion,
        projectPath: projectPath,
      });
      
      // Close mobile panel if on small screen
      if (window.innerWidth <= 900 && typeof window.closeMobilePanel === 'function') {
        window.closeMobilePanel();
      }
    }
  }
}

function filterPackages() {
  // Prevent rapid consecutive calls during initial load
  const now = Date.now();
  if (window._lastFilterTime && (now - window._lastFilterTime) < 50) {
    return;
  }
  window._lastFilterTime = now;
  
  const searchPackages = document.getElementById("searchPackages");
  const prereleaseToggle = document.getElementById("prereleaseToggle");
  const packages = getPackages();

  if (!searchPackages || !packages) {
    return;
  }

  const searchTerm = searchPackages.value.toLowerCase();
  // Get values from SharedDropdown instances
  const selectedProject = window.projectDropdown ? window.projectDropdown.getValue() : "";
  const selectedFeed = window.feedDropdown ? window.feedDropdown.getValue() : "";
  const includePrerelease = prereleaseToggle ? prereleaseToggle.checked : false;
  
  // First apply basic filters (project, feed, search, prerelease)
  let filteredPackages = packages.filter((pkg) => {
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
  // - Updates: count from filtered packages (respects project/feed/search)
  // - Consolidate: count from ALL packages (ignores filters, shows solution-wide consolidation needs)
  const updateCounts = typeof calculateFilterCounts === 'function' 
    ? calculateFilterCounts(filteredPackages) 
    : { updates: new Set(), consolidate: new Set() };
  const consolidateCounts = typeof calculateFilterCounts === 'function'
    ? calculateFilterCounts(packages)
    : { updates: new Set(), consolidate: new Set() };
  
  // Update filter count display with mixed counts
  if (typeof updateFilterCounts === 'function') {
    updateFilterCounts(updateCounts.updates, consolidateCounts.consolidate);
  }
  
  // Apply active filter (updates/consolidate) after calculating counts
  if (typeof applyActiveFilter === 'function') {
    filteredPackages = applyActiveFilter(filteredPackages);
  }

  updatePackageDisplay(filteredPackages);
}

function updatePackageDetails(details) {
  const selectedPackage = getSelectedPackage();
  if (!selectedPackage) return;

  // Handle both name and id for package matching (browse packages may use id)
  const selectedPackageName = selectedPackage.name || selectedPackage.id;
  if (selectedPackageName !== details.name) return; // Update dependencies
  const dependencyList = document.getElementById("dependencyList");
  if (dependencyList) {
    if (details.dependencies && details.dependencies.length > 0) {
      // Group dependencies by target framework if available
      const dependencyGroups = new Map();

      details.dependencies.forEach((dep) => {
        const framework = dep.targetFramework || "All Frameworks";
        if (!dependencyGroups.has(framework)) {
          dependencyGroups.set(framework, []);
        }
        dependencyGroups.get(framework).push(dep);
      });

      let html = "";
      let groupIndex = 0;
      dependencyGroups.forEach((deps, framework) => {
        if (dependencyGroups.size > 1) {
          // Check if this group has actual dependencies (not just "(No dependencies)" placeholder)
          const hasActualDependencies = deps.some(
            (dep) => dep.name !== "(No dependencies)"
          );

          if (hasActualDependencies) {
            // Create collapsible framework header with chevron on the left for groups with dependencies
            const groupId = `framework-group-${groupIndex}`;
            html += `
              <li class="dependency-framework-header" onclick="toggleFrameworkGroup('${groupId}', this)">
                <svg class="framework-chevron" viewBox="0 0 24 24">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                </svg>
                <span>${framework}</span>
              </li>
              <li class="dependency-framework-content" id="${groupId}">
                <div style="margin-left: 0;">
            `;
            deps.forEach((dep) => {
              if (dep.name === "(No dependencies)") {
                html += `<div class="dependency-item no-dependencies" style="color: var(--vscode-descriptionForeground); font-style: italic;">${dep.name}</div>`;
              } else if (dep.name.includes("(Framework Reference)")) {
                html += `<div class="dependency-item framework-reference" style="color: var(--vscode-foreground); font-style: italic;">${dep.name}</div>`;
              } else {
                html += `<div class="dependency-item">${dep.name} <span style="color: var(--vscode-descriptionForeground); font-weight: normal;">${dep.version}</span></div>`;
              }
            });

            html += `
                </div>
              </li>
            `;
          } else {
            // For groups with no dependencies, just show the framework name (no collapsible section)
            html += `<li class="dependency-framework-name">${framework}</li>`;
          }
        } else {
          // Single framework or no framework grouping - show dependencies directly
          deps.forEach((dep) => {
            if (dep.name === "(No dependencies)") {
              html += `<li class="dependency-item no-dependencies" style="color: var(--vscode-descriptionForeground); font-style: italic;">${dep.name}</li>`;
            } else if (dep.name.includes("(Framework Reference)")) {
              html += `<li class="dependency-item framework-reference" style="color: var(--vscode-foreground); font-style: italic;">${dep.name}</li>`;
            } else {
              html += `<li class="dependency-item">${dep.name} <span style="color: var(--vscode-descriptionForeground); font-weight: normal;">${dep.version}</span></li>`;
            }
          });
        }
        groupIndex++;
      });

      dependencyList.innerHTML = html;
    } else {
      dependencyList.innerHTML = "<li>No dependencies</li>";
    }
  }

  // Update project usage - use the same logic as updateProjectUsageForPackage to show all projects
  updateProjectUsageForPackage(details.name);
}

function updatePackageVersions(packageName, versions) {
  console.log('🔧 updatePackageVersions called:', packageName, 'versions:', versions);
  
  const selectedPackage = getSelectedPackage();
  if (!selectedPackage) {
    console.warn('No selected package');
    return;
  }

  // Handle both name and id for package matching (browse packages may use id)
  const selectedPackageName = selectedPackage.name || selectedPackage.id;
  
  if (selectedPackageName !== packageName) {
    console.warn('Package name mismatch:', selectedPackageName, '!==', packageName);
    return;
  }

  if (versions && versions.length > 0) {
    const currentVersion = selectedPackage.version;
    const prereleaseToggle = document.getElementById("prereleaseToggle");
    const includePrerelease = prereleaseToggle
      ? prereleaseToggle.checked
      : false; // Filter versions based on prerelease setting
    const filteredVersions = includePrerelease
      ? versions
      : versions.filter((v) => !/-/i.test(v));

    // Versions already in newest-first order
    // Convert versions to dropdown items format
    const versionItems = filteredVersions.map(version => ({
      value: version,
      label: version
    }));

    console.log('updatePackageVersions - versionItems:', versionItems.length, versionItems);

    // If no versions after filtering, don't create dropdown
    if (versionItems.length === 0) {
      console.warn('No versions available after filtering - skipping dropdown creation');
      return;
    }

    // Destroy old dropdown if exists (new package = new container)
    if (window.versionDropdown) {
      window.versionDropdown.destroy();
      window.versionDropdown = null;
    }

    // Wait for DOM to be ready (container might not exist yet)
    const initDropdown = () => {
      const container = document.getElementById('versionSelectContainer');
      if (!container) {
        console.warn('versionSelectContainer not found, retrying...');
        setTimeout(initDropdown, 50);
        return;
      }

      // Remove loading state
      container.classList.remove('version-loading');
      container.innerHTML = '';

      // Create new version dropdown
      window.versionDropdown = new SharedDropdown({
        containerId: 'versionSelectContainer',
        placeholder: 'Select version...',
        items: versionItems,
        onChange: (value, label) => {
          // Version change handled by action buttons
          console.log('Version changed to:', value);
        },
        initialValue: currentVersion || (versionItems.length > 0 ? versionItems[0].value : ''),
        enableSearch: true
      });
    };

    // Try to initialize immediately, or wait if needed
    initDropdown();
  }
}

function updateVersionsDetailsSection(versions) {
  // This can be implemented if needed for showing version history in details
}

function handleFolderIconClick(e, folderBtn) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  // Get the feed location from the data attribute
  const feedLocation = folderBtn.dataset.feedLocation;

  if (!feedLocation) {
    console.error("No feed location found on button");
    return;
  }

  try {
    if (typeof vscode !== "undefined") {
      vscode.postMessage({
        command: "openFeedLocation",
        feedLocation: feedLocation,
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }

  return false;
}

// Toggle framework group in dependencies section
function toggleFrameworkGroup(groupId, headerElement) {
  const content = document.getElementById(groupId);
  if (!content || !headerElement) return;

  const isCollapsed = content.classList.contains("collapsed");

  if (isCollapsed) {
    // Expand
    content.classList.remove("collapsed");
    headerElement.classList.remove("collapsed");
  } else {
    // Collapse
    content.classList.add("collapsed");
    headerElement.classList.add("collapsed");
  }
}

// Helper functions to get state from main file (these need to be implemented in main file)
function getSelectedPackage() {
  return window.selectedPackage || null;
}

function setSelectedPackage(pkg) {
  window.selectedPackage = pkg;
}

function getIsOperationInProgress() {
  return window.isOperationInProgress || false;
}

function getPackages() {
  return window.packages || [];
}

function getProjects() {
  return window.projects || [];
}

// Clear package selection from UI
function clearPackageSelection() {
  // Remove selection from all package items
  document
    .querySelectorAll(".package-item, .nuget-package-item")
    .forEach((item) => {
      item.classList.remove("selected");
    });
}

// Clear package details panel
function clearPackageDetails() {
  if (typeof showEmptyPackageDetails === "function") {
    showEmptyPackageDetails();
  }
}

// Export functions to global scope for use in webview context
if (typeof window !== "undefined") {
  window.selectPackage = selectPackage;
  window.selectNuGetPackage = selectNuGetPackage;
  window.generatePackageDetailsHTML = generatePackageDetailsHTML;
  window.showPackageDetails = showPackageDetails;
  window.showNuGetPackageDetails = showNuGetPackageDetails;
  window.animatePackageDetailsSlideIn = animatePackageDetailsSlideIn;
  window.resetPackageDetailsAnimation = resetPackageDetailsAnimation;
  window.updatePackage = updatePackage;
  window.uninstallPackage = uninstallPackage;
  window.installNuGetPackage = installNuGetPackage;
  window.uninstallFromProject = uninstallFromProject;
  window.updatePackageInProject = updatePackageInProject;
  window.installPackageInProject = installPackageInProject;
  window.updateProjectUsageForPackage = updateProjectUsageForPackage;
  window.filterPackages = filterPackages;
  window.updatePackageDetails = updatePackageDetails;
  window.updatePackageVersions = updatePackageVersions;
  window.updateVersionsDetailsSection = updateVersionsDetailsSection;
  window.handleFolderIconClick = handleFolderIconClick;
  window.clearPackageSelection = clearPackageSelection;
  window.clearPackageDetails = clearPackageDetails;
  window.toggleFrameworkGroup = toggleFrameworkGroup;
}
