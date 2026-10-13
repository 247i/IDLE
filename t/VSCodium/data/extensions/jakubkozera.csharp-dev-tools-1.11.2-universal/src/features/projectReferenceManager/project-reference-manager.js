// Project Reference Manager JavaScript
const vscode = acquireVsCodeApi();

// Utility function for HTML escaping
function escapeHtml(text) {
  if (typeof text !== "string") {
    return text;
  }

  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Loading utility functions
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

let projectReferences = [];
let groupedReferences = {};
let filteredReferences = [];
let filteredGroups = {};
let originalState = new Map(); // Track original state for change detection
let collapsedGroups = new Set(); // Track which groups are collapsed

// DOM elements
const searchInput = document.getElementById("searchInput");
const projectsList = document.getElementById("projectsList");
const selectAllBtn = document.getElementById("selectAllBtn");
const deselectAllBtn = document.getElementById("deselectAllBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const cancelBtn = document.getElementById("cancelBtn");
const loadingOverlay = document.getElementById("loadingOverlay");

// Event listeners
searchInput.addEventListener("input", handleSearch);
selectAllBtn.addEventListener("click", selectAllProjects);
deselectAllBtn.addEventListener("click", deselectAllProjects);
saveBtn.addEventListener("click", saveChanges);
resetBtn.addEventListener("click", resetChanges);
cancelBtn.addEventListener("click", cancel);

// Handle messages from the extension
window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.command) {
    case "projectsLoaded":
      initializeProjects(
        message.references,
        message.groupedReferences,
        message.targetProject
      );
      break;
    case "showLoading":
      showLoadingWithMessage(message.message);
      break;
    case "hideLoading":
      hideLoadingOverlay();
      break;
  }
});

function initializeProjects(references, grouped, targetProject) {
  projectReferences = references;
  groupedReferences = grouped;
  filteredReferences = [...references];
  filteredGroups = { ...grouped };

  // Store original state
  originalState.clear();
  references.forEach((ref) => {
    originalState.set(ref.absolutePath, ref.isSelected);
  });

  renderProjectsList();
  updateButtonStates();
}

function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  if (!searchTerm) {
    filteredReferences = [...projectReferences];
    filteredGroups = { ...groupedReferences };
  } else {
    filteredReferences = projectReferences.filter(
      (ref) =>
        ref.name.toLowerCase().includes(searchTerm) ||
        ref.relativePath.toLowerCase().includes(searchTerm)
    );

    // Group filtered references
    filteredGroups = {};
    filteredReferences.forEach((ref) => {
      const folderName = ref.solutionFolder || "Root";
      if (!filteredGroups[folderName]) {
        filteredGroups[folderName] = [];
      }
      filteredGroups[folderName].push(ref);
    });
  }

  renderProjectsList();
}

function renderProjectsList() {
  if (filteredReferences.length === 0) {
    projectsList.innerHTML = `
            <div class="empty-state">
                <h3>No projects found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
    return;
  }

  // Sort groups to put Root at the end
  const sortedGroupNames = Object.keys(filteredGroups).sort((a, b) => {
    if (a === "Root") return 1;
    if (b === "Root") return -1;
    return a.localeCompare(b);
  });

  const groupHtml = sortedGroupNames
    .map((groupName) => createGroupHTML(groupName, filteredGroups[groupName]))
    .join("");

  projectsList.innerHTML = groupHtml;

  // Add event listeners
  addGroupEventListeners();
  updateButtonStates();
}

function createGroupHTML(groupName, projects) {
  const isCollapsed = collapsedGroups.has(groupName);
  const selectedCount = projects.filter((p) => p.isSelected).length;

  const folderIcon = `
    <svg class="folder-icon ${
      isCollapsed ? "collapsed" : ""
    }" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12 4l-1.5-1.5L6 7l4.5 4.5L12 10l-3-3 3-3z"/>
    </svg>
  `;

  const projectItems = projects
    .map((ref) => {
      const status = getProjectStatus(ref);
      return createProjectItemHTML(ref, status);
    })
    .join("");

  return `
    <div class="solution-folder-group">
      <div class="solution-folder-header ${
        isCollapsed ? "collapsed" : ""
      }" data-group="${escapeHtml(groupName)}">
        ${folderIcon}
        <span class="folder-name">${escapeHtml(groupName)}</span>
        <span class="folder-project-count">(${selectedCount}/${
    projects.length
  })</span>
        <div class="folder-actions">
          <button class="folder-action-btn" data-action="select-all" data-group="${escapeHtml(
            groupName
          )}">Select All</button>
          <button class="folder-action-btn" data-action="deselect-all" data-group="${escapeHtml(
            groupName
          )}">Unselect All</button>
        </div>
      </div>
      <div class="solution-folder-content ${
        isCollapsed ? "collapsed" : "expanded"
      }">
        ${projectItems}
      </div>
    </div>
  `;
}

function addGroupEventListeners() {
  // Group header click events
  document.querySelectorAll(".solution-folder-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      if (e.target.classList.contains("folder-action-btn")) {
        return; // Don't toggle if clicking on action buttons
      }

      const groupName = header.getAttribute("data-group");
      toggleGroup(groupName);
    });
  });

  // Folder action buttons
  document.querySelectorAll(".folder-action-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.getAttribute("data-action");
      const groupName = btn.getAttribute("data-group");

      if (action === "select-all") {
        selectAllInGroup(groupName);
      } else if (action === "deselect-all") {
        deselectAllInGroup(groupName);
      }
    });
  });
  // Project item event listeners
  document.querySelectorAll(".project-item").forEach((item) => {
    const checkbox = item.querySelector(".project-checkbox");
    const projectPath = item.getAttribute("data-project-path");
    const ref = projectReferences.find((r) => r.absolutePath === projectPath);

    if (ref) {
      item.addEventListener("click", (e) => {
        if (
          e.target !== checkbox &&
          !e.target.classList.contains("project-checkbox")
        ) {
          // Toggle the reference state
          const mainRef = projectReferences.find(
            (r) => r.absolutePath === ref.absolutePath
          );
          if (mainRef) {
            mainRef.isSelected = !mainRef.isSelected;
            // Update all instances of this reference
            updateAllReferenceInstances(
              mainRef.absolutePath,
              mainRef.isSelected
            );
          }
          renderProjectsList();
        }
      });
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        // Update the main reference
        const mainRef = projectReferences.find(
          (r) => r.absolutePath === ref.absolutePath
        );
        if (mainRef) {
          mainRef.isSelected = checkbox.checked;
          // Update all instances of this reference
          updateAllReferenceInstances(mainRef.absolutePath, mainRef.isSelected);
        }
        renderProjectsList();
      });
    }
  });
}

function toggleGroup(groupName) {
  if (collapsedGroups.has(groupName)) {
    collapsedGroups.delete(groupName);
  } else {
    collapsedGroups.add(groupName);
  }

  const header = document.querySelector(`[data-group="${groupName}"]`);
  const content = header.nextElementSibling;
  const icon = header.querySelector(".folder-icon");

  if (collapsedGroups.has(groupName)) {
    header.classList.add("collapsed");
    content.classList.remove("expanded");
    content.classList.add("collapsed");
    icon.classList.add("collapsed");
  } else {
    header.classList.remove("collapsed");
    content.classList.remove("collapsed");
    content.classList.add("expanded");
    icon.classList.remove("collapsed");
  }
}

function selectAllInGroup(groupName) {
  const groupProjects = filteredGroups[groupName] || [];
  groupProjects.forEach((ref) => {
    const mainRef = projectReferences.find(
      (r) => r.absolutePath === ref.absolutePath
    );
    if (mainRef) {
      mainRef.isSelected = true;
      updateAllReferenceInstances(mainRef.absolutePath, true);
    }
  });
  renderProjectsList();
}

function deselectAllInGroup(groupName) {
  const groupProjects = filteredGroups[groupName] || [];
  groupProjects.forEach((ref) => {
    const mainRef = projectReferences.find(
      (r) => r.absolutePath === ref.absolutePath
    );
    if (mainRef) {
      mainRef.isSelected = false;
      updateAllReferenceInstances(mainRef.absolutePath, false);
    }
  });
  renderProjectsList();
}

function createProjectItemHTML(ref, status) {
  // Create project icon HTML
  let projectIconHtml = "";
  if (ref.iconPaths && ref.iconPaths.light && ref.iconPaths.dark) {
    // Use the webview URIs directly (already converted in backend)
    projectIconHtml = `
      <div class="project-icon">
        <img src="${ref.iconPaths.light}" 
             alt="${ref.projectType}" 
             class="project-icon-light" />
        <img src="${ref.iconPaths.dark}" 
             alt="${ref.projectType}" 
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

  return `
        <div class="project-item ${
          ref.isSelected ? "selected" : ""
        }" data-project-path="${escapeHtml(ref.absolutePath)}">
            <input type="checkbox" 
                   class="project-checkbox" 
                   ${ref.isSelected ? "checked" : ""}>
            ${projectIconHtml}
            <div class="project-info-item">
                <div class="project-name-item">${escapeHtml(ref.name)}</div>
            </div>
            <div class="project-status">
                <div class="status-indicator status-${status.type}"></div>
                <span>${status.text}</span>
            </div>
        </div>
    `;
}

function getProjectStatus(ref) {
  const originalSelected = originalState.get(ref.absolutePath);

  if (originalSelected && ref.isSelected) {
    return { type: "current", text: "Current" };
  } else if (!originalSelected && ref.isSelected) {
    return { type: "new", text: "Will Add" };
  } else if (originalSelected && !ref.isSelected) {
    return { type: "removed", text: "Will Remove" };
  } else {
    return { type: "none", text: "" };
  }
}

function toggleProject(ref) {
  // Find the reference in the main array and toggle it
  const mainRef = projectReferences.find(
    (r) => r.absolutePath === ref.absolutePath
  );
  if (mainRef) {
    mainRef.isSelected = !mainRef.isSelected;

    // Update all instances of this reference
    updateAllReferenceInstances(mainRef.absolutePath, mainRef.isSelected);
  }

  renderProjectsList();
}

function updateAllReferenceInstances(absolutePath, isSelected) {
  // Update in filteredReferences
  const filteredRef = filteredReferences.find(
    (r) => r.absolutePath === absolutePath
  );
  if (filteredRef) {
    filteredRef.isSelected = isSelected;
  }

  // Update in filteredGroups
  Object.keys(filteredGroups).forEach((groupName) => {
    const groupRef = filteredGroups[groupName].find(
      (r) => r.absolutePath === absolutePath
    );
    if (groupRef) {
      groupRef.isSelected = isSelected;
    }
  });

  // Update in groupedReferences
  Object.keys(groupedReferences).forEach((groupName) => {
    const groupRef = groupedReferences[groupName].find(
      (r) => r.absolutePath === absolutePath
    );
    if (groupRef) {
      groupRef.isSelected = isSelected;
    }
  });
}

function selectAllProjects() {
  projectReferences.forEach((mainRef) => {
    mainRef.isSelected = true;
    updateAllReferenceInstances(mainRef.absolutePath, true);
  });
  renderProjectsList();
}

function deselectAllProjects() {
  projectReferences.forEach((mainRef) => {
    mainRef.isSelected = false;
    updateAllReferenceInstances(mainRef.absolutePath, false);
  });
  renderProjectsList();
}

function updateButtonStates() {
  const hasChanges = projectReferences.some((ref) => {
    const originalSelected = originalState.get(ref.absolutePath);
    return originalSelected !== ref.isSelected;
  });

  saveBtn.disabled = !hasChanges;

  // Show/hide reset button based on whether there are changes
  resetBtn.style.display = hasChanges ? "inline-block" : "none";

  const selectedInFiltered = filteredReferences.filter(
    (ref) => ref.isSelected
  ).length;
  const totalFiltered = filteredReferences.length;

  selectAllBtn.disabled = selectedInFiltered === totalFiltered;
  deselectAllBtn.disabled = selectedInFiltered === 0;
}

function saveChanges() {
  const hasChanges = projectReferences.some((ref) => {
    const originalSelected = originalState.get(ref.absolutePath);
    return originalSelected !== ref.isSelected;
  });

  if (!hasChanges) {
    vscode.postMessage({
      command: "cancel",
    });
    return;
  }

  vscode.postMessage({
    command: "saveChanges",
    references: projectReferences,
  });
}

function cancel() {
  vscode.postMessage({
    command: "cancel",
  });
}

function resetChanges() {
  // Reset all project references to their original state
  projectReferences.forEach((ref) => {
    const originalSelected = originalState.get(ref.absolutePath);
    if (originalSelected !== undefined) {
      ref.isSelected = originalSelected;
      updateAllReferenceInstances(ref.absolutePath, originalSelected);
    }
  });
  // Re-render the list to show the reset state
  renderProjectsList();
}

function showLoadingWithMessage(message = "Processing...") {
  const loadingMessage = loadingOverlay.querySelector(".loading-message");
  if (loadingMessage) {
    loadingMessage.textContent = message;
  }
  showLoading(loadingOverlay);
}

function hideLoadingOverlay() {
  hideLoading(loadingOverlay);
}

// VS Code automatically sets data-vscode-theme-kind attribute on body element
// No manual theme detection needed - CSS will handle icon switching automatically

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", () => {
  // Request initial data
  vscode.postMessage({ command: "loadProjects" });
});

// Handle keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "s":
        e.preventDefault();
        if (!saveBtn.disabled) {
          saveChanges();
        }
        break;
      case "r":
        e.preventDefault();
        if (resetBtn.style.display !== "none") {
          resetChanges();
        }
        break;
      case "Escape":
        e.preventDefault();
        cancel();
        break;
      case "a":
        e.preventDefault();
        if (!selectAllBtn.disabled) {
          selectAllProjects();
        }
        break;
    }
  }

  if (e.key === "Escape") {
    e.preventDefault();
    cancel();
  }
});

// Auto-focus search input
setTimeout(() => {
  if (searchInput) {
    searchInput.focus();
  }
}, 100);
