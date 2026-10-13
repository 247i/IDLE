const vscode = acquireVsCodeApi();

// Global variables will be injected by the TypeScript provider
let iconBaseUri = "";
let allTemplates = {};
let frameworks = [];
let recentlyUsed = [];
let selectedTemplate = null;
let selectedCategory = null;
let filteredTemplates = {};
let isSelectingRecentTemplate = false; // Flag to prevent infinite loops
let isNewSolution = false; // Flag to indicate if we're creating a new solution
let hoverDelay = 300; // Default hover delay in milliseconds (from VS Code settings)
let currentTemplateOptions = []; // Store current template options for hidden parameter handling

/**
 * Format parameter name from camelCase to spaced format with special handling for acronyms
 * @param {string} name - The parameter name to format
 * @returns {string} - Formatted parameter name
 */
function formatParameterName(name) {
  // Special cases mapping
  const specialCases = {
    'AAdB2CInstance': 'AAD B2C Instance',
    'AADb2cInstance': 'AAD B2C Instance',
    'TenantId': 'Tenant ID',
    'ClientId': 'Client ID',
    'CallbackPath': 'Callback Path',
    'SignedOutCallbackPath': 'Signed Out Callback Path',
    'OrgReadAccess': 'Org Read Access',
    'MsGraphBaseUrl': 'MS Graph Base URL',
    'UserSecrets': 'User Secrets',
    'UseLocalDB': 'Use Local DB',
    'UseWebApi': 'Use Web API',
    'UseHttps': 'Use HTTPS',
    'UseProgramMain': 'Use Program Main',
    'CalledApiUrl': 'Called API URL',
    'CalledApiScopes': 'Called API Scopes',
    'SignUpSignInPolicyId': 'Sign Up Sign In Policy ID',
    'ResetPasswordPolicyId': 'Reset Password Policy ID',
    'EditProfilePolicyId': 'Edit Profile Policy ID'
  };

  // Check if there's a special case for this name
  if (specialCases[name]) {
    return specialCases[name];
  }

  // Handle common acronyms that should stay together
  let formatted = name
    // Handle ID at the end
    .replace(/Id$/g, ' ID')
    // Handle URL at the end
    .replace(/Url$/g, ' URL')
    // Handle API
    .replace(/Api/g, ' API ')
    // Handle HTTP/HTTPS
    .replace(/Https/g, ' HTTPS ')
    .replace(/Http/g, ' HTTP ')
    // Handle DB
    .replace(/DB/g, ' DB ')
    // Insert space before uppercase letters (camelCase to spaces)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space between multiple uppercase letters followed by lowercase
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  return formatted;
}

// SharedDropdown instances
let frameworkDropdown = null;
const templateOptionDropdowns = {}; // Store template option dropdowns by ID

const elements = {
  loading: document.getElementById("loading"),
  content: document.getElementById("content"),
  formPanel: document.getElementById("formPanel"),
  headerDescription: document.getElementById("headerDescription"),
  searchInput: document.getElementById("searchInput"),
  categoriesList: document.getElementById("categoriesList"),
  recentlyUsedSection: document.getElementById("recentlyUsedSection"),
  recentlyUsedList: document.getElementById("recentlyUsedList"),
  templateSelector: document.getElementById("templateSelector"),
  solutionNameGroup: document.getElementById("solutionNameGroup"),
  solutionName: document.getElementById("solutionName"),
  solutionFolder: document.getElementById("solutionFolder"),
  enableCpm: document.getElementById("enableCpm"),
  initGitRepo: document.getElementById("initGitRepo"),
  projectName: document.getElementById("projectName"),
  frameworkContainer: document.getElementById("frameworkContainer"),
  outputPath: document.getElementById("outputPath"),
  pathPreviewText: document.getElementById("pathPreviewText"),
  dynamicOptionsContainer: document.getElementById("dynamicOptionsContainer"),
  dynamicOptions: document.getElementById("dynamicOptions"),
  selectFolder: document.getElementById("selectFolder"),
  cancelButton: document.getElementById("cancelButton"),
  createButton: document.getElementById("createButton"),
  errorMessage: document.getElementById("errorMessage"),
  successMessage: document.getElementById("successMessage"),
  loadingBackdrop: document.getElementById("loadingBackdrop"),
};

// Icon mappings for categories and templates
const categoryIcons = {
  "Empty solution": "solution.svg",
  Console: "csproj-console.svg",
  Web: "csproj-api.svg",
  Desktop: "csproj-desktop.svg",
  Test: "csproj-test.svg",
  Library: "csproj.svg",
  Other: "csproj.svg",
};

// Function to get theme-appropriate icon
function getThemeIcon(iconName) {
  // Detect if we're in dark theme by checking background color brightness
  const backgroundColor = window.getComputedStyle(document.body)
    .getPropertyValue('--vscode-editor-background')
    .trim();
  
  // Convert hex to RGB if needed and calculate brightness
  let isDarkTheme = true; // Default to dark theme
  
  if (backgroundColor.startsWith('#')) {
    // Hex color
    const hex = backgroundColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Calculate brightness (luminance)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    isDarkTheme = brightness < 128;
  } else if (backgroundColor.startsWith('rgb')) {
    // RGB color
    const matches = backgroundColor.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = parseInt(matches[0]);
      const g = parseInt(matches[1]);
      const b = parseInt(matches[2]);
      
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      isDarkTheme = brightness < 128;
    }
  }
  
  // For the specific icons that have light variants
  const hasLightVariant = ['solution.svg', 'csproj-console.svg', 'csproj-api.svg', 'csproj-test.svg', 'csproj.svg', 'csproj-desktop.svg'];
  
  if (!isDarkTheme && hasLightVariant.includes(iconName)) {
    // Replace .svg with -light.svg for light theme
    return iconName.replace('.svg', '-light.svg');
  }
  
  return iconName;
}

const templateIcons = {
  emptysolution: "solution.svg",
  console: "csproj-console.svg",
  web: "csproj-api.svg",
  webapi: "csproj-api.svg",
  mvc: "csproj-api.svg",
  blazor: "csproj-api.svg",
  blazorserver: "csproj-api.svg",
  blazorwasm: "csproj-api.svg",
  classlib: "csproj.svg",
  xunit: "csproj-test.svg",
  mstest: "csproj-test.svg",
  nunit: "csproj-test.svg",
  wpf: "csproj-desktop.svg",
  winforms: "csproj-desktop.svg",
  worker: "csproj-console.svg",
  angular: "angular.svg",
  react: "react.svg",
  grpc: "csproj-api.svg",
  razor: "razor.png",
  func: "csproj-api.svg",
  default: "csproj.svg",
};

// Function to position popovers dynamically
function positionPopover(triggerElement, popover) {
  const rect = triggerElement.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default position: above the trigger, centered horizontally
  let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
  let top = rect.top - popoverRect.height - 8; // 8px gap
  
  // Adjust horizontal position if it would go off-screen
  if (left < 5) {
    left = 5; // 5px margin from left edge
  } else if (left + popoverRect.width > viewportWidth - 5) {
    left = viewportWidth - popoverRect.width - 5; // 5px margin from right edge
  }
  
  // If popover would go above viewport, show it below instead
  if (top < 5) {
    top = rect.bottom + 8; // 8px gap below
  }
  
  // If it would still go below viewport, position it within viewport
  if (top + popoverRect.height > viewportHeight - 5) {
    top = viewportHeight - popoverRect.height - 5;
  }
  
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

// Initialize the webview
function initializeWebview(data) {
  console.log('[NewProject WebView] Initializing with data:', {
    hasIconBaseUri: !!data.iconBaseUri,
    templateCategories: Object.keys(data.groupedTemplates || {}),
    templateCounts: Object.entries(data.groupedTemplates || {}).map(([k, v]) => `${k}: ${v.length}`),
    frameworkCount: (data.frameworks || []).length,
    frameworks: (data.frameworks || []).map(f => f.version),
    recentlyUsedCount: (data.recentlyUsed || []).length,
    isNewSolution: data.isNewSolution,
    defaultFramework: data.defaultFramework
  });

  iconBaseUri = data.iconBaseUri;
  allTemplates = data.groupedTemplates;
  frameworks = data.frameworks;
  recentlyUsed = data.recentlyUsed || [];
  isNewSolution = data.isNewSolution || false;
  hoverDelay = data.hoverDelay || 300; // Get hover delay from VS Code settings
  filteredTemplates = { ...allTemplates };

  // Set the default output path from backend (Documents folder or last used folder)
  if (data.defaultOutputPath) {
    elements.outputPath.value = data.defaultOutputPath;
  }

  // Initialize solution folder with same value as solution name
  if (elements.solutionName.value) {
    elements.solutionFolder.value = elements.solutionName.value;
  }

  // Show/hide solution name field and git checkbox based on isNewSolution flag
  const initGitRepoLabel = document.getElementById('initGitRepoLabel');
  const enableCpmGroup = document.getElementById('enableCpmGroup');
  const addEditorConfigGroup = document.getElementById('addEditorConfigGroup');
  if (isNewSolution) {
    elements.solutionNameGroup.style.display = 'flex';
    elements.headerDescription.textContent = 'Create a new solution, project, or both';
    if (initGitRepoLabel) {
      initGitRepoLabel.style.display = 'flex';
    }
    if (enableCpmGroup) {
      enableCpmGroup.style.display = 'flex';
    }
    if (addEditorConfigGroup) {
      addEditorConfigGroup.style.display = 'flex';
    }
  } else {
    elements.solutionNameGroup.style.display = 'none';
    elements.headerDescription.textContent = 'Create a new .NET project and add it to your solution';
    if (initGitRepoLabel) {
      initGitRepoLabel.style.display = 'none';
    }
    if (enableCpmGroup) {
      enableCpmGroup.style.display = 'none';
    }
    if (addEditorConfigGroup) {
      addEditorConfigGroup.style.display = 'none';
    }
  }

  populateUI(data.defaultFramework);
  
  // Initialize resizable divider
  initializeResizableDivider();
}

// Initialize resizable divider for sidebar/templates-panel
function initializeResizableDivider() {
  const divider = document.getElementById('resizeDivider');
  const sidebar = document.querySelector('.sidebar');
  const templatesPanel = document.querySelector('.templates-panel');
  const mainContent = document.querySelector('.main-content');
  
  if (!divider || !sidebar || !templatesPanel || !mainContent) {
    console.warn('Resizable divider elements not found');
    return;
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  const startResize = (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    
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
    
    // Calculate min/max widths
    const minWidth = Math.max(250, containerWidth * 0.2);
    const maxWidth = Math.min(containerWidth * 0.6, containerWidth - 400);
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      const percentage = (newWidth / containerWidth) * 100;
      sidebar.style.width = `${percentage}%`;
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
}

// Track if user manually changed solution folder
let solutionFolderManuallyChanged = false;

// Event listeners
elements.searchInput.addEventListener("input", handleSearch);
elements.solutionName.addEventListener("input", () => {
  // Auto-sync solution folder if not manually changed
  if (!solutionFolderManuallyChanged) {
    elements.solutionFolder.value = elements.solutionName.value;
  }
  updatePathPreview();
  validateForm();
});
elements.solutionFolder.addEventListener("input", () => {
  solutionFolderManuallyChanged = elements.solutionFolder.value !== elements.solutionName.value;
  updatePathPreview();
});
elements.projectName.addEventListener("input", () => {
  updatePathPreview();
  validateForm();
});
elements.outputPath.addEventListener("input", updatePathPreview);
// Framework dropdown change handler will be added when dropdown is created
elements.selectFolder.addEventListener("click", () =>
  vscode.postMessage({ command: "selectFolder" })
);
// Toggle solution folder visibility
document.getElementById("toggleSolutionFolder").addEventListener("click", () => {
  const solutionFolderRow = document.getElementById("solutionFolderRow");
  if (solutionFolderRow.classList.contains("show")) {
    solutionFolderRow.classList.remove("show");
  } else {
    solutionFolderRow.classList.add("show");
    // Initialize with solution name if empty
    if (!elements.solutionFolder.value) {
      elements.solutionFolder.value = elements.solutionName.value;
    }
  }
});
elements.cancelButton.addEventListener("click", () =>
  vscode.postMessage({ command: "cancel" })
);
elements.createButton.addEventListener("click", createProject);

// Disable right-click context menu on the entire webview to prevent UI issues
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  return false;
});

// Listen for theme changes and refresh icons
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      // VS Code changes body class when theme changes, refresh UI
      setTimeout(() => {
        if (selectedCategory) {
          populateCategories();
          populateTemplates(filteredTemplates[selectedCategory] || []);
        }
      }, 100);
    }
  });
});

observer.observe(document.body, {
  attributes: true,
  attributeFilter: ['class']
});

// Handle messages from the extension
window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "initialize":
      initializeWebview(message.data);
      break;

    case "templatesUpdated":
      updateTemplateData(message);
      break;

    case "projectCreated":
      hideLoadingBackdrop();
      // The extension will show the native VS Code notification
      break;

    case "showError":
      hideLoadingBackdrop();
      // The extension will show the native VS Code notification
      break;

    case "folderSelected":
      elements.outputPath.value = message.path;
      updatePathPreview();
      // Don't save the folder here - it will be saved after successful project creation
      break;

    case "templateHelpReceived":
      handleTemplateHelpReceived(message.helpInfo);
      break;

    case "recentlyUsedUpdated":
      recentlyUsed = message.recentlyUsed || [];
      populateRecentlyUsed();
      break;

    case "templateHelpError":
      console.error("Failed to get template help:", message.error);
      break;

    case "templateCompatibilityChecked":
      handleTemplateCompatibilityChecked(message);
      break;

    case "templateCompatibilityError":
      console.error("Failed to check template compatibility:", message.error);
      break;
  }
});

function createFrameworkDropdown(defaultFramework, preferredFramework) {
  // Populate frameworks with SharedDropdown - sort from highest to lowest
  const frameworkItems = frameworks
    .sort((a, b) => {
      // Sort frameworks in descending order (highest first)
      const versionA = a.version.replace(/[^0-9.]/g, '');
      const versionB = b.version.replace(/[^0-9.]/g, '');
      return versionB.localeCompare(versionA, undefined, { numeric: true });
    })
    .map((fw) => ({
      value: fw.version,
      label: fw.displayName
    }));

  // Determine initial value: use defaultFramework if provided and available, otherwise use highest version
  let initialValue = frameworkItems.length > 0 ? frameworkItems[0].value : '';
  if (defaultFramework && frameworkItems.some(item => item.value === defaultFramework)) {
    initialValue = defaultFramework;
  }

  if (preferredFramework && frameworkItems.some(item => item.value === preferredFramework)) {
    initialValue = preferredFramework;
  }

  frameworkDropdown = new SharedDropdown({
    containerId: 'frameworkContainer',
    placeholder: 'Select framework...',
    items: frameworkItems,
    initialValue: initialValue,
    onChange: (value, label) => {
      handleFrameworkChange();
    }
  });
}

function updateTemplateData(data) {
  const selectedFramework = frameworkDropdown ? frameworkDropdown.currentValue : '';
  if (frameworkDropdown) {
    frameworkDropdown.destroy();
  }

  allTemplates = data.groupedTemplates || {};
  frameworks = data.frameworks || [];
  filteredTemplates = { ...allTemplates };
  createFrameworkDropdown(data.defaultFramework, selectedFramework);

  populateCategories();
  if (selectedCategory) {
    const categoryElement = document.querySelector(`[data-category="${selectedCategory}"]`);
    if (categoryElement) {
      categoryElement.classList.add("selected");
      populateTemplates(filteredTemplates[selectedCategory] || []);
    } else {
      selectedCategory = null;
      selectedTemplate = null;
      clearDynamicOptions();
    }
  }
}

function populateUI(defaultFramework) {
  createFrameworkDropdown(defaultFramework);

  // Populate categories
  populateCategories();

  // Populate recently used templates
  populateRecentlyUsed();

  // Auto-select Console category and Console template as default
  autoSelectDefaultTemplate();

  elements.loading.style.display = "none";
  elements.content.style.display = "flex";

  // Setup delayed hover for Enable CPM info icon
  setupDelayedHover();
}

function autoSelectDefaultTemplate() {
  // No longer auto-select any category or template
  // User must explicitly select what they want to create
}

function setupDelayedHover() {
  // Setup delayed hover for Enable CPM info icon
  const enableCpmInfo = document.getElementById('enableCpmInfo');
  const enableCpmPopover = document.getElementById('enableCpmPopover');
  
  if (enableCpmInfo && enableCpmPopover) {
    let cpmHoverTimeout = null;
    
    enableCpmInfo.addEventListener('mouseenter', (e) => {
      cpmHoverTimeout = setTimeout(() => {
        enableCpmPopover.style.display = 'block';
        positionPopover(enableCpmInfo, enableCpmPopover);
        enableCpmPopover.classList.add('show');
      }, hoverDelay);
    });
    
    enableCpmInfo.addEventListener('mouseleave', () => {
      if (cpmHoverTimeout) {
        clearTimeout(cpmHoverTimeout);
        cpmHoverTimeout = null;
      }
      enableCpmPopover.classList.remove('show');
      enableCpmPopover.style.display = 'none';
    });
  }

  // Setup delayed hover for Template Options label
  const dynamicOptionsLabel = document.getElementById('dynamicOptionsLabel');
  if (dynamicOptionsLabel) {
    const labelPopover = dynamicOptionsLabel.querySelector('.label-popover');
    if (labelPopover) {
      let labelHoverTimeout = null;
      
      dynamicOptionsLabel.addEventListener('mouseenter', (e) => {
        labelHoverTimeout = setTimeout(() => {
          labelPopover.style.display = 'block';
          positionPopover(dynamicOptionsLabel, labelPopover);
          labelPopover.classList.add('show');
        }, hoverDelay);
      });
      
      dynamicOptionsLabel.addEventListener('mouseleave', () => {
        if (labelHoverTimeout) {
          clearTimeout(labelHoverTimeout);
          labelHoverTimeout = null;
        }
        labelPopover.classList.remove('show');
        labelPopover.style.display = 'none';
      });
    }
  }

  // Setup delayed hover for Add EditorConfig info icon
  const addEditorConfigInfo = document.getElementById('addEditorConfigInfo');
  const addEditorConfigPopover = document.getElementById('addEditorConfigPopover');
  
  if (addEditorConfigInfo && addEditorConfigPopover) {
    let editorConfigHoverTimeout = null;
    
    addEditorConfigInfo.addEventListener('mouseenter', (e) => {
      editorConfigHoverTimeout = setTimeout(() => {
        addEditorConfigPopover.style.display = 'block';
        positionPopover(addEditorConfigInfo, addEditorConfigPopover);
        addEditorConfigPopover.classList.add('show');
      }, hoverDelay);
    });
    
    addEditorConfigInfo.addEventListener('mouseleave', () => {
      if (editorConfigHoverTimeout) {
        clearTimeout(editorConfigHoverTimeout);
        editorConfigHoverTimeout = null;
      }
      addEditorConfigPopover.classList.remove('show');
      addEditorConfigPopover.style.display = 'none';
    });
  }
}

function populateCategories() {
  // Clear only category items, preserve recently used section
  const categoryItems = elements.categoriesList.querySelectorAll('.category-item');
  categoryItems.forEach(item => item.remove());

  const recentlyUsedSection = elements.categoriesList.querySelector('#recentlyUsedSection');

  Object.entries(filteredTemplates).forEach(([category, templates]) => {
    // Skip "Empty solution" category when not creating a new solution
    if (category === "Empty solution" && !isNewSolution) {
      return;
    }
    
    if (templates.length > 0) {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "category-item";
      categoryDiv.dataset.category = category;

      const iconName = getThemeIcon(categoryIcons[category] || categoryIcons["Other"]);

      // Only show count if there's more than one template
      const countHTML = templates.length > 1 ? `<span class="category-count">${templates.length}</span>` : '';

      categoryDiv.innerHTML = `
                <img src="${iconBaseUri}/${iconName}" class="category-icon" alt="${category}" />
                <span class="category-name">${category}</span>
                ${countHTML}
            `;

      categoryDiv.addEventListener("click", () =>
        selectCategory(category, categoryDiv)
      );
      
      // Insert before the recently used section if it exists, otherwise append normally
      if (recentlyUsedSection) {
        elements.categoriesList.insertBefore(categoryDiv, recentlyUsedSection);
      } else {
        elements.categoriesList.appendChild(categoryDiv);
      }
    }
  });
}

function populateRecentlyUsed() {
  if (!recentlyUsed || recentlyUsed.length === 0) {
    elements.recentlyUsedSection.style.display = "none";
    return;
  }

  elements.recentlyUsedSection.style.display = "block";
  elements.recentlyUsedList.innerHTML = "";

  // Filter out "Empty solution" templates when not creating a new solution
  const filteredRecentlyUsed = recentlyUsed.filter(item => 
    !(item.category === "Empty solution" && !isNewSolution)
  );

  if (filteredRecentlyUsed.length === 0) {
    elements.recentlyUsedSection.style.display = "none";
    return;
  }

  filteredRecentlyUsed.forEach((item) => {
    const recentDiv = document.createElement("div");
    recentDiv.className = "recently-used-item";
    
    // Get template icon based on short name or category
    const templateIcon = getTemplateIcon(item.template.shortName);
    const iconName = getThemeIcon(templateIcon);
    
    recentDiv.innerHTML = `
      <div class="recently-used-content" data-template="${item.template.shortName}" data-framework="${item.framework}" data-category="${item.category}">
        <img src="${iconBaseUri}/${iconName}" class="recently-used-icon" alt="${item.template.templateName}" />
        <div class="recently-used-info">
          <div class="recently-used-name">${item.template.templateName} <span class="recently-used-framework">${item.framework}</span></div>
        </div>
      </div>
      <button class="recently-used-remove" data-template="${item.template.shortName}" data-framework="${item.framework}" title="Remove from recently used">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </svg>
      </button>
    `;

    // Add click event for selecting the recently used template (on entire item)
    recentDiv.addEventListener('click', () => {
      selectRecentlyUsedTemplate(item);
    });

    // Add click event for removing the item
    const removeBtn = recentDiv.querySelector('.recently-used-remove');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeRecentlyUsed(item.template.shortName, item.framework);
    });

    elements.recentlyUsedList.appendChild(recentDiv);
  });
}

function getTemplateIcon(shortName) {
  // Map template short names to icons
  const lowerShortName = shortName.toLowerCase();
  
  if (templateIcons[lowerShortName]) {
    return templateIcons[lowerShortName];
  }
  
  // Fallback based on keywords in the short name
  if (lowerShortName.includes('console')) { return templateIcons.console; }
  if (lowerShortName.includes('web') || lowerShortName.includes('api')) { return templateIcons.web; }
  if (lowerShortName.includes('test') || lowerShortName.includes('xunit') || lowerShortName.includes('mstest') || lowerShortName.includes('nunit')) { return templateIcons.xunit; }
  if (lowerShortName.includes('classlib') || lowerShortName.includes('library')) { return templateIcons.classlib; }
  if (lowerShortName.includes('wpf')) { return templateIcons.wpf; }
  if (lowerShortName.includes('winforms')) { return templateIcons.winforms; }
  if (lowerShortName.includes('blazor')) { return templateIcons.blazor; }
  if (lowerShortName.includes('mvc')) { return templateIcons.mvc; }
  
  // Default icon
  return "default.png";
}

function selectRecentlyUsedTemplate(item) {
  // Hide any error messages
  hideMessages();
  
  // Set flag to prevent recursive calls
  isSelectingRecentTemplate = true;
  
  try {
    // ALWAYS set the framework to match the recently used template
    frameworkDropdown.setValue(item.framework);
    
    // Select the category without triggering compatibility checks
    const categoryElement = document.querySelector(`[data-category="${item.category}"]`);
    if (categoryElement) {
      // Remove previous selection
      document.querySelectorAll(".category-item.selected").forEach((item) => {
        item.classList.remove("selected");
      });

      // Select new category
      categoryElement.classList.add("selected");
      selectedCategory = item.category;

      // Handle project name field visibility based on category
      const projectNameGroup = elements.projectName.closest('.form-group');
      if (item.category === "Empty solution") {
        // Hide project name field for Empty solution category
        if (projectNameGroup) {
          projectNameGroup.style.display = 'none';
        }
        // Clear project name
        elements.projectName.value = '';
      } else {
        // Show project name field for other categories
        if (projectNameGroup) {
          projectNameGroup.style.display = '';
        }
      }

      // Clear previous template selection and dynamic options
      selectedTemplate = null;
      clearDynamicOptions();

      // Get templates for this category
      const categoryTemplates = filteredTemplates[item.category] || [];
      
      // Populate templates immediately without compatibility check (since we know it's compatible)
      populateTemplates(categoryTemplates);
      
      // Wait a bit for templates to render, then ALWAYS select the specific template
      setTimeout(() => {
        const templateElement = document.querySelector(`.template-option[data-short-name="${item.template.shortName}"]`);
        if (templateElement) {
          // ALWAYS select the template, even if it was already selected
          document.querySelectorAll(".template-option.selected").forEach((tmpl) => {
            tmpl.classList.remove("selected");
          });
          
          templateElement.classList.add("selected");
          selectedTemplate = item.template;
          
          // Load template help for this specific template and framework
          loadTemplateHelp(item.template.shortName, item.framework);
          
          // Validate form to enable/disable create button
          validateForm();
        }
      }, 50);
    }
  } finally {
    // Reset flag after a short delay to allow all operations to complete
    setTimeout(() => {
      isSelectingRecentTemplate = false;
    }, 200);
  }
}

function removeRecentlyUsed(templateShortName, framework) {
  vscode.postMessage({
    command: "removeRecentlyUsed",
    templateShortName,
    framework
  });
}

function selectCategory(category, element) {
  // Hide any error messages
  hideMessages();
  
  // Remove previous selection
  document.querySelectorAll(".category-item.selected").forEach((item) => {
    item.classList.remove("selected");
  });

  // Select new category
  element.classList.add("selected");
  selectedCategory = category;

  // Clear previous template selection and dynamic options
  selectedTemplate = null;
  clearDynamicOptions();

  // Handle project name field visibility based on category
  const projectNameGroup = elements.projectName.closest('.form-group');
  if (category === "Empty solution") {
    // Hide project name field for Empty solution category
    if (projectNameGroup) {
      projectNameGroup.style.display = 'none';
    }
    // Don't clear project name - just hide the field
  } else {
    // Show project name field for other categories
    if (projectNameGroup) {
      projectNameGroup.style.display = '';
    }
  }

  // Update path preview when category changes
  updatePathPreview();

  // Skip template compatibility check if we're selecting a recent template
  // (since we'll handle it manually in selectRecentlyUsedTemplate)
  if (isSelectingRecentTemplate) {
    return;
  }

  // Check template compatibility for the current framework and update templates display
  const currentFramework = frameworkDropdown.getValue();
  const categoryTemplates = filteredTemplates[category] || [];
  
  if (categoryTemplates.length > 0) {
    checkTemplateCompatibility(categoryTemplates, currentFramework);
  } else {
    // If no templates, show empty state
    elements.templateSelector.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">No templates found</div>
                <div class="empty-state-description">Try adjusting your search or selecting a different category</div>
            </div>
        `;
  }
}

function populateTemplates(templates) {
  elements.templateSelector.innerHTML = "";

  if (templates.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No templates found</div>
            <div class="empty-state-description">Try adjusting your search or selecting a different category</div>
        `;
    elements.templateSelector.appendChild(emptyState);
    return;
  }

  const isOnlyOneTemplate = templates.length === 1;

  templates.forEach((template) => {
    const templateOption = document.createElement("div");
    templateOption.className = "template-option";
    templateOption.dataset.shortName = template.shortName;

    const iconName = getTemplateIcon(template.shortName);

    templateOption.innerHTML = `
            <img src="${iconBaseUri}/${iconName}" class="template-option-icon" alt="${
      template.templateName
    }" />
            <div class="template-option-content">
                <div class="template-option-name">${template.templateName}</div>
            </div>
        `;

    // Add description popover directly to the template option if it has a description
    if (template.description) {
      const popover = document.createElement('div');
      popover.className = 'template-popover';
      popover.textContent = template.description;
      templateOption.appendChild(popover);

      let hoverTimeout = null;
      
      // Add hover event listeners with delay
      templateOption.addEventListener('mouseenter', (e) => {
        const element = e.currentTarget; // Capture element reference before setTimeout
        hoverTimeout = setTimeout(() => {
          positionPopover(element, popover);
          popover.classList.add('show');
        }, hoverDelay);
      });
      
      templateOption.addEventListener('mouseleave', () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        popover.classList.remove('show');
      });
    }

    // For single template or Console category, auto-select (no deselection allowed)
    // Special case: For Console category, always auto-select the Console template
    if (isOnlyOneTemplate || (selectedCategory === "Console" && template.shortName === "console")) {
      templateOption.classList.add("selected", "auto-selected");
      selectedTemplate = template;
    }
    
    // Add click listener for all templates (including single auto-selected ones)
    templateOption.addEventListener("click", () =>
      selectTemplate(template, templateOption)
    );
    
    elements.templateSelector.appendChild(templateOption);
  });

  // If we auto-selected a template, request its help and validate form
  if (isOnlyOneTemplate && selectedTemplate) {
    requestTemplateHelp();
    validateForm();
  }
}

function selectTemplate(template, element) {
  // Hide any error messages
  hideMessages();

  // Check if this template is incompatible - prevent selection
  if (element.classList.contains("incompatible")) {
    return;
  }

  // Check if clicking on already selected template
  const isCurrentlySelected = element.classList.contains("selected");

  // Don't allow deselection of any selected template
  if (isCurrentlySelected) {
    return; // Prevent deselection of any selected template
  }
  document.querySelectorAll(".template-option.selected").forEach((item) => {
    item.classList.remove("selected");
  });

  // Select new template
  element.classList.add("selected");
  selectedTemplate = template;

  // Special handling for Empty Solution template
  if (template.shortName === 'emptysolution') {
    // Don't request template help for empty solution
  } else {
    // Request template help for current framework
    requestTemplateHelp();
  }

  // Validate form
  validateForm();
}


function getTemplateIcon(shortName) {
  const lowerShortName = shortName.toLowerCase();
  return getThemeIcon(templateIcons[lowerShortName] || templateIcons["default"]);
}

function handleSearch() {
  const query = elements.searchInput.value.toLowerCase().trim();

  if (query === "") {
    filteredTemplates = { ...allTemplates };
  } else {
    filteredTemplates = {};

    Object.entries(allTemplates).forEach(([category, templates]) => {
      const filtered = templates.filter(
        (template) =>
          template.templateName.toLowerCase().includes(query) ||
          template.shortName.toLowerCase().includes(query) ||
          (template.tags &&
            template.tags.some((tag) => tag.toLowerCase().includes(query)))
      );

      if (filtered.length > 0) {
        filteredTemplates[category] = filtered;
      }
    });
  }

  populateCategories();

  // Clear template selection if current category is no longer available
  if (selectedCategory && !filteredTemplates[selectedCategory]) {
    selectedTemplate = null;
    selectedCategory = null;
    clearDynamicOptions();
    elements.templateSelector.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-title">No category selected</div>
                <div class="empty-state-description">Select a project type from the left sidebar to see available templates</div>
            </div>
        `;
    validateForm();
  }
}

function updatePathPreview() {
  const outputPath = elements.outputPath.value.trim();
  const solutionName = elements.solutionName.value.trim();
  const solutionFolder = elements.solutionFolder.value.trim() || solutionName;
  const projectName = elements.projectName.value.trim();
  
  if (!outputPath) {
    elements.pathPreviewText.textContent = '';
    return;
  }
  
  // Don't show preview if no solution name or project name provided
  if (!solutionName && !projectName) {
    elements.pathPreviewText.textContent = '';
    return;
  }
  
  // Special case: Empty solution category - always show solution creation
  if (selectedCategory === "Empty solution") {
    if (solutionName && solutionFolder) {
      elements.pathPreviewText.textContent = `The solution will be created in ~\\${solutionFolder}`;
    } else {
      elements.pathPreviewText.textContent = '';
    }
    return;
  }
  
  // For other categories: show project creation if project name exists
  if (projectName) {
    if (isNewSolution && solutionName && solutionFolder) {
      // Solution + project
      elements.pathPreviewText.textContent = `The project will be created in ~\\${solutionFolder}\\${projectName}`;
    } else {
      // Only project (standalone)
      elements.pathPreviewText.textContent = `The project will be created in ~\\${projectName}`;
    }
  } else {
    // No project name for non-empty-solution categories
    elements.pathPreviewText.textContent = '';
  }
}

function validateForm() {
  // Validation logic depends on whether we're creating a new solution or adding to existing:
  // 1. New solution + Empty solution template: solution name required
  // 2. New solution + Project template: project name + template required (solution name optional)
  // 3. Existing solution + Project template: project name + template required

  const hasSolutionName = elements.solutionName.value.trim() !== "";
  const hasProjectNameAndTemplate = elements.projectName.value.trim() !== "" && selectedTemplate;

  // Special case: Empty solution template only needs solution name
  const isEmptySolutionTemplate = selectedTemplate && selectedTemplate.shortName === 'emptysolution';

  let isValid = false;

  if (isNewSolution) {
    // Creating a new solution
    if (isEmptySolutionTemplate) {
      // For Empty solution: only solution name is required
      isValid = hasSolutionName;
    } else {
      // For new solution with project: project name + template are required (solution name optional)
      isValid = hasProjectNameAndTemplate;
    }
  } else {
    // Adding project to existing solution: only project name + template are required
    isValid = hasProjectNameAndTemplate;
  }

  elements.createButton.disabled = !isValid;

  // Add tooltip when button is disabled
  if (!isValid) {
    if (isNewSolution) {
      if (isEmptySolutionTemplate) {
        elements.createButton.title = 'Solution name is required';
      } else {
        elements.createButton.title = 'Project name and template selection are required';
      }
    } else {
      elements.createButton.title = 'Project name and template selection are required';
    }
  } else {
    elements.createButton.title = '';
  }
}

function handleFrameworkChange() {
  // Skip framework change handling if we're selecting a recent template
  if (isSelectingRecentTemplate) {
    return;
  }
  
  // When framework changes, check template compatibility and request new template help
  if (selectedCategory && filteredTemplates[selectedCategory]) {
    checkTemplateCompatibility(filteredTemplates[selectedCategory], frameworkDropdown.getValue());
  }
  
  if (selectedTemplate) {
    requestTemplateHelp();
  }
}

function requestTemplateHelp() {
  if (!selectedTemplate) {
    return;
  }

  const framework = frameworkDropdown.getValue();

  vscode.postMessage({
    command: "getTemplateHelp",
    templateShortName: selectedTemplate.shortName,
    framework: framework,
  });
}

function loadTemplateHelp(templateShortName, framework) {
  vscode.postMessage({
    command: "getTemplateHelp",
    templateShortName: templateShortName,
    framework: framework,
  });
}

function handleTemplateHelpReceived(helpInfo) {
  currentTemplateOptions = helpInfo.options || [];
  populateDynamicOptions(helpInfo.options);
}

function clearDynamicOptions() {
  const container = elements.dynamicOptionsContainer;
  const optionsContainer = elements.dynamicOptions;

  // Destroy all template option dropdowns
  for (const [optionName, dropdown] of Object.entries(templateOptionDropdowns)) {
    dropdown.destroy();
    delete templateOptionDropdowns[optionName];
  }

  // Hide the container and clear options
  container.style.display = "none";
  optionsContainer.innerHTML = "";
  
  // Clear current template options
  currentTemplateOptions = [];
}

// Configuration for visible parameters per template
const templateVisibleParams = {
  'webapi': ['auth', 'no-https', 'no-openapi', 'use-program-main', 'use-controllers'],
  'blazor': ['interactivity', 'all-interactive']
};

// Parameters that should always be visible when available (regardless of template)
const alwaysVisibleParams = ['use-program-main', 'auth', 'no-https', 'no-openapi', 'interactivity', 'all-interactive', 'use-controllers', 'use-minimal-apis'];

// System parameters that should never be shown in UI
const hiddenSystemParams = ['name', 'language', 'type', 'framework', 'Framework', 'LangVersion', 'no-restore', 'skipRestore'];

function populateDynamicOptions(options) {
  const container = elements.dynamicOptionsContainer;
  const optionsContainer = elements.dynamicOptions;

  // Clear existing options
  optionsContainer.innerHTML = "";

  if (!options || options.length === 0) {
    container.style.display = "none";
    return;
  }

  // Filter out system parameters that should never be shown in UI
  const filteredOptions = options.filter(option => 
    !hiddenSystemParams.includes(option.longName) && 
    !hiddenSystemParams.includes(option.name)
  );

  if (filteredOptions.length === 0) {
    container.style.display = "none";
    return;
  }

  // Show the container
  container.style.display = "block";

  // Get visible parameters for current template
  const templateShortName = selectedTemplate?.shortName;
  const templateSpecificParams = templateVisibleParams[templateShortName] || [];
  
  // Combine template-specific params with always visible params
  const visibleParams = [...new Set([...templateSpecificParams, ...alwaysVisibleParams])];
  
  // Separate options into visible and advanced
  const visibleOptions = [];
  const advancedOptions = [];
  
  filteredOptions.forEach(option => {
    if (visibleParams.includes(option.longName)) {
      visibleOptions.push(option);
    } else {
      advancedOptions.push(option);
    }
  });

  // Render visible options first
  visibleOptions.forEach(option => {
    renderOption(option, optionsContainer);
  });

  // Render advanced options in collapsible section if any exist
  if (advancedOptions.length > 0) {
    createAdvancedOptionsSection(advancedOptions, optionsContainer);
  }

  // Hide the entire container if there are no options to show
  if (visibleOptions.length === 0 && advancedOptions.length === 0) {
    container.style.display = "none";
  }
}

function createAdvancedOptionsSection(advancedOptions, container) {
  // Create advanced options section
  const advancedSection = document.createElement("div");
  advancedSection.className = "advanced-options-section";

  // Create collapsible header
  const header = document.createElement("div");
  header.className = "advanced-options-header";
  header.innerHTML = `
    <span class="advanced-options-toggle">
      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"/>
      </svg>
    </span>
    <span class="advanced-options-title" id="advancedOptionsTitle">Advanced options</span>
  `;
  
  // Add popover for advanced options title
  const advancedPopover = document.createElement('div');
  advancedPopover.className = 'label-popover';
  advancedPopover.style.display = 'none';
  advancedPopover.textContent = 'Advanced configuration options for the selected template. These settings provide fine-grained control over project generation and are optional.';
  header.appendChild(advancedPopover);

  // Add delayed hover for advanced options title
  const advancedTitle = header.querySelector('.advanced-options-title');
  let advancedHoverTimeout = null;
  
  advancedTitle.addEventListener('mouseenter', (e) => {
    advancedHoverTimeout = setTimeout(() => {
      advancedPopover.style.display = 'block';
      positionPopover(advancedTitle, advancedPopover);
      advancedPopover.classList.add('show');
    }, hoverDelay);
  });
  
  advancedTitle.addEventListener('mouseleave', () => {
    if (advancedHoverTimeout) {
      clearTimeout(advancedHoverTimeout);
      advancedHoverTimeout = null;
    }
    advancedPopover.classList.remove('show');
    advancedPopover.style.display = 'none';
  });

  // Create collapsible content
  const content = document.createElement("div");
  content.className = "advanced-options-content";
  content.style.display = "none";

  // Render advanced options in the content area
  advancedOptions.forEach(option => {
    renderOption(option, content);
  });

  // Add click handler for toggle
  header.addEventListener("click", () => {
    const isExpanded = content.style.display !== "none";
    const toggle = header.querySelector(".advanced-options-toggle svg");
    
    if (isExpanded) {
      content.style.display = "none";
      toggle.style.transform = "rotate(0deg)";
      header.classList.remove("expanded");
    } else {
      content.style.display = "block";
      toggle.style.transform = "rotate(90deg)";
      header.classList.add("expanded");
    }
  });

  advancedSection.appendChild(header);
  advancedSection.appendChild(content);
  container.appendChild(advancedSection);
}

function renderOption(option, container) {
  if (option.type === "bool") {
    // Boolean option - render as checkbox
    const optionDiv = document.createElement("div");
    optionDiv.className = "checkbox-item";

    // Create checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `option-${option.longName}`;
    checkbox.name = option.longName;
    checkbox.className = "project-checkbox";
    
    // Special handling for inverted options to reverse the logic
    if (option.longName === 'use-program-main' || option.longName === 'no-openapi' || option.longName === 'no-https') {
      // These options are inverted - we show the positive form but the underlying option is negative
      // So we need to invert the default value
      checkbox.checked = option.defaultValue !== true;
    } else {
      checkbox.checked = option.defaultValue === true;
    }
    
    // Special handling for OpenAPI checkbox - add OpenAPI UI checkbox below it
    if (option.longName === 'no-openapi') {
      checkbox.addEventListener('change', (e) => {
        const openApiUiCheckbox = document.getElementById('option-enable-openapi-ui');
        if (openApiUiCheckbox) {
          if (!e.target.checked) {
            // If OpenAPI is disabled, disable and uncheck OpenAPI UI
            openApiUiCheckbox.checked = false;
            openApiUiCheckbox.disabled = true;
            openApiUiCheckbox.parentElement.style.opacity = '0.5';
          } else {
            // If OpenAPI is enabled, enable and check OpenAPI UI
            openApiUiCheckbox.checked = true;
            openApiUiCheckbox.disabled = false;
            openApiUiCheckbox.parentElement.style.opacity = '1';
          }
        }
      });
    }

    const label = document.createElement("label");
    label.htmlFor = `option-${option.longName}`;
    
    // Customize display names for specific options
    let displayName = option.name;
    if (option.longName === 'aot' || option.name === 'Aot') {
      displayName = 'Enable native AOT publish';
    } else if (option.longName === 'use-program-main' || option.name === 'Use Program Main') {
      displayName = 'Use top-level statement';
    } else if (option.longName === 'no-openapi' || option.name === 'No Openapi') {
      displayName = 'Enable OpenAPI';
    } else if (option.longName === 'no-https' || option.name === 'No Https') {
      displayName = 'Enable HTTPS';
    } else if (option.longName === 'auth' || option.name === 'Auth') {
      displayName = 'Authentication type';
    } else if (option.longName === 'pwa' || option.name === 'Pwa') {
      displayName = 'PWA';
    } else if (option.longName === 'interactivity' || option.name === 'Interactivity') {
      displayName = 'Interactivity';
    } else if (option.longName === 'all-interactive' || option.name === 'All Interactive') {
      displayName = 'All interactive';
    } else {
      // Format camelCase to spaced format with special handling for acronyms
      displayName = formatParameterName(option.name);
    }
    
    label.textContent = displayName;

    // Create description popover directly on the label
    const popover = document.createElement("div");
    popover.className = "param-popover";
    
    // Customize descriptions for inverted options
    let description = option.description;
    if (option.longName === 'use-program-main') {
      description = 'Use top-level statements for cleaner, more concise program entry point, instead of static Main method';
    } else if (option.longName === 'no-openapi') {
      description = 'Enable OpenAPI support with Swagger/OpenAPI documentation generation';
    } else if (option.longName === 'no-https') {
      description = 'Enable HTTPS redirection and configure the app for secure connections';
    } else if (option.longName === 'auth') {
      description = 'Select the authentication type for your application';
    } else if (option.longName === 'interactivity') {
      description = 'Choose which interactive render mode to use for interactive components';
    } else if (option.longName === 'all-interactive') {
      description = 'Make every page interactive by applying an interactive render mode at the top level';
    }
    
    popover.textContent = description;
    label.appendChild(popover);

    // Add hover event listeners for dynamic positioning with delay
    let boolHoverTimeout = null;
    label.addEventListener('mouseenter', (e) => {
      const element = e.currentTarget;
      boolHoverTimeout = setTimeout(() => {
        popover.style.display = 'block';
        positionPopover(element, popover);
        popover.classList.add('show');
      }, hoverDelay);
    });
    
    label.addEventListener('mouseleave', () => {
      if (boolHoverTimeout) {
        clearTimeout(boolHoverTimeout);
        boolHoverTimeout = null;
      }
      popover.classList.remove('show');
      popover.style.display = 'none';
    });

    // Add checkbox and label to the option div
    optionDiv.appendChild(checkbox);
    optionDiv.appendChild(label);

    container.appendChild(optionDiv);
    
    // Special handling: Add "Enable OpenAPI UI" checkbox right after "Enable OpenAPI" checkbox
    if (option.longName === 'no-openapi') {
      const openApiUiDiv = document.createElement("div");
      openApiUiDiv.className = "checkbox-item";

      const openApiUiCheckbox = document.createElement("input");
      openApiUiCheckbox.type = "checkbox";
      openApiUiCheckbox.id = "option-enable-openapi-ui";
      openApiUiCheckbox.name = "enable-openapi-ui";
      openApiUiCheckbox.className = "project-checkbox";
      openApiUiCheckbox.checked = checkbox.checked; // Match OpenAPI checkbox state
      openApiUiCheckbox.disabled = !checkbox.checked; // Disable if OpenAPI is disabled

      const openApiUiLabel = document.createElement("label");
      openApiUiLabel.htmlFor = "option-enable-openapi-ui";
      openApiUiLabel.textContent = "Enable OpenAPI UI";

      // Create description popover
      const openApiUiPopover = document.createElement("div");
      openApiUiPopover.className = "param-popover";
      openApiUiPopover.textContent = "Enable OpenAPI UI for an enhanced API documentation interface with improved user experience";
      openApiUiLabel.appendChild(openApiUiPopover);

      // Add hover event listeners
      let openApiUiHoverTimeout = null;
      openApiUiLabel.addEventListener('mouseenter', (e) => {
        const element = e.currentTarget;
        openApiUiHoverTimeout = setTimeout(() => {
          openApiUiPopover.style.display = 'block';
          positionPopover(element, openApiUiPopover);
          openApiUiPopover.classList.add('show');
        }, hoverDelay);
      });

      openApiUiLabel.addEventListener('mouseleave', () => {
        if (openApiUiHoverTimeout) {
          clearTimeout(openApiUiHoverTimeout);
          openApiUiHoverTimeout = null;
        }
        openApiUiPopover.classList.remove('show');
        openApiUiPopover.style.display = 'none';
      });

      openApiUiDiv.appendChild(openApiUiCheckbox);
      openApiUiDiv.appendChild(openApiUiLabel);

      // Set initial opacity based on checkbox state
      if (!checkbox.checked) {
        openApiUiDiv.style.opacity = '0.5';
      }

      container.appendChild(openApiUiDiv);
    }
  } else if (option.type === "choice" && option.choices) {
    // Choice option - render as select
    const optionDiv = document.createElement("div");
    optionDiv.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = `option-${option.longName}`;
    
    // Customize display names for specific options
    let displayName = option.name;
    if (option.longName === 'aot' || option.name === 'Aot') {
      displayName = 'Enable native AOT publish';
    } else if (option.longName === 'use-program-main' || option.name === 'Use Program Main') {
      displayName = 'Use top-level statement';
    } else if (option.longName === 'no-openapi' || option.name === 'No Openapi') {
      displayName = 'Enable OpenAPI';
    } else if (option.longName === 'no-https' || option.name === 'No Https') {
      displayName = 'Enable HTTPS';
    } else if (option.longName === 'auth' || option.name === 'Auth') {
      displayName = 'Authentication type';
    } else if (option.longName === 'pwa' || option.name === 'Pwa') {
      displayName = 'PWA';
    } else if (option.longName === 'interactivity' || option.name === 'Interactivity') {
      displayName = 'Interactivity';
    } else if (option.longName === 'all-interactive' || option.name === 'All Interactive') {
      displayName = 'All interactive';
    } else {
      // Format camelCase to spaced format with special handling for acronyms
      displayName = formatParameterName(option.name);
    }
    
    label.textContent = displayName;

    // Create description popover directly on the label
    const popover = document.createElement("div");
    popover.className = "param-popover";
    
    // Customize descriptions for inverted options
    let description = option.description;
    if (option.longName === 'use-program-main') {
      description = 'Use top-level statements for cleaner, more concise program entry point';
    } else if (option.longName === 'no-openapi') {
      description = 'Enable OpenAPI support with Swagger/OpenAPI documentation generation';
    } else if (option.longName === 'no-https') {
      description = 'Enable HTTPS redirection and configure the app for secure connections';
    } else if (option.longName === 'auth') {
      description = 'Select the authentication type for your application';
    } else if (option.longName === 'interactivity') {
      description = 'Choose which interactive render mode to use for interactive components';
    } else if (option.longName === 'all-interactive') {
      description = 'Make every page interactive by applying an interactive render mode at the top level';
    }
    
    popover.textContent = description;
    label.appendChild(popover);

    // Add hover event listeners for dynamic positioning
    label.addEventListener('mouseenter', (e) => {
      positionPopover(e.currentTarget, popover);
    });

    // Create label wrapper to hold just the label
    const labelWrapper = document.createElement("div");
    labelWrapper.className = "param-label-wrapper";
    labelWrapper.appendChild(label);

    // Create dropdown container
    const dropdownContainer = document.createElement("div");
    const dropdownContainerId = `option-${option.longName}-container`;
    dropdownContainer.id = dropdownContainerId;

    optionDiv.appendChild(labelWrapper);
    optionDiv.appendChild(dropdownContainer);

    container.appendChild(optionDiv);

    // Create SharedDropdown after appending to DOM
    const dropdownItems = option.choices.map((choice) => ({
      value: choice,
      label: choice
    }));

    const dropdown = new SharedDropdown({
      containerId: dropdownContainerId,
      placeholder: 'Select option...',
      items: dropdownItems,
      initialValue: option.defaultValue || (dropdownItems.length > 0 ? dropdownItems[0].value : '')
    });

    // Store dropdown reference
    templateOptionDropdowns[option.longName] = dropdown;
  } else if (option.type === "string") {
    // String option - render as input
    const optionDiv = document.createElement("div");
    optionDiv.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = `option-${option.longName}`;
    
    // Customize display names for specific options
    let displayName = option.name;
    if (option.longName === 'aot' || option.name === 'Aot') {
      displayName = 'Enable native AOT publish';
    } else if (option.longName === 'use-program-main' || option.name === 'Use Program Main') {
      displayName = 'Use top-level statement';
    } else if (option.longName === 'no-openapi' || option.name === 'No Openapi') {
      displayName = 'Enable OpenAPI';
    } else if (option.longName === 'no-https' || option.name === 'No Https') {
      displayName = 'Enable HTTPS';
    } else if (option.longName === 'auth' || option.name === 'Auth') {
      displayName = 'Authentication type';
    } else if (option.longName === 'pwa' || option.name === 'Pwa') {
      displayName = 'PWA';
    } else if (option.longName === 'interactivity' || option.name === 'Interactivity') {
      displayName = 'Interactivity';
    } else if (option.longName === 'all-interactive' || option.name === 'All Interactive') {
      displayName = 'All interactive';
    } else {
      // Format camelCase to spaced format with special handling for acronyms
      displayName = formatParameterName(option.name);
    }
    
    label.textContent = displayName;

    // Create description popover directly on the label
    const popover = document.createElement("div");
    popover.className = "param-popover";
    
    // Customize descriptions for inverted options
    let description = option.description;
    if (option.longName === 'use-program-main') {
      description = 'Use top-level statements for cleaner, more concise program entry point';
    } else if (option.longName === 'no-openapi') {
      description = 'Enable OpenAPI support with Swagger/OpenAPI documentation generation';
    } else if (option.longName === 'no-https') {
      description = 'Enable HTTPS redirection and configure the app for secure connections';
    } else if (option.longName === 'auth') {
      description = 'Select the authentication type for your application';
    } else if (option.longName === 'interactivity') {
      description = 'Choose which interactive render mode to use for interactive components';
    } else if (option.longName === 'all-interactive') {
      description = 'Make every page interactive by applying an interactive render mode at the top level';
    }
    
    popover.textContent = description;
    label.appendChild(popover);

    // Add hover event listeners for dynamic positioning with delay
    let stringHoverTimeout = null;
    label.addEventListener('mouseenter', (e) => {
      const element = e.currentTarget;
      stringHoverTimeout = setTimeout(() => {
        popover.style.display = 'block';
        positionPopover(element, popover);
        popover.classList.add('show');
      }, hoverDelay);
    });
    
    label.addEventListener('mouseleave', () => {
      if (stringHoverTimeout) {
        clearTimeout(stringHoverTimeout);
        stringHoverTimeout = null;
      }
      popover.classList.remove('show');
      popover.style.display = 'none';
    });

    // Create label wrapper to hold just the label
    const labelWrapper = document.createElement("div");
    labelWrapper.className = "param-label-wrapper";
    labelWrapper.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.id = `option-${option.longName}`;
    input.name = option.longName;

    // Use default value as placeholder, fallback to description
    if (option.defaultValue && typeof option.defaultValue === "string") {
      input.placeholder = option.defaultValue;
    } else {
      input.placeholder = option.description;
    }

    optionDiv.appendChild(labelWrapper);
    optionDiv.appendChild(input);

    container.appendChild(optionDiv);
  }
}

function getTemplateOptionsFromForm() {
  const options = {};
  const optionsContainer = elements.dynamicOptions;

  if (!optionsContainer) {
    return options;
  }

  // Get all form controls in the dynamic options (only inputs now, dropdowns handled separately)
  const inputs = optionsContainer.querySelectorAll("input");
  inputs.forEach((input) => {
    const optionName = input.name;
    if (!optionName) {
      return;
    }

    if (input.type === "checkbox") {
      // Special handling for inverted options to reverse the logic
      if (optionName === "use-program-main") {
        // When "Use top-level statement" is checked (true), we DON'T pass use-program-main
        // When "Use top-level statement" is unchecked (false), we pass use-program-main = true
        if (!input.checked) {
          options[optionName] = true;
        }
      } else if (optionName === "no-openapi") {
        // When "Enable OpenAPI" is checked (true), we DON'T pass no-openapi
        // When "Enable OpenAPI" is unchecked (false), we pass no-openapi = true
        if (!input.checked) {
          options[optionName] = true;
        }
      } else if (optionName === "no-https") {
        // When "Enable HTTPS" is checked (true), we DON'T pass no-https
        // When "Enable HTTPS" is unchecked (false), we pass no-https = true
        if (!input.checked) {
          options[optionName] = true;
        }
      } else if (optionName === "enable-openapi-ui") {
        // Custom option for OpenAPI UI - pass as standard boolean
        if (input.checked) {
          options[optionName] = true;
        }
      } else {
        // Standard boolean handling for other options
        if (input.checked) {
          options[optionName] = true;
        }
      }
    } else if (input.value && input.value.trim() !== "") {
      options[optionName] = input.value.trim();
    }
  });

  // Get values from SharedDropdowns
  for (const [optionName, dropdown] of Object.entries(templateOptionDropdowns)) {
    const value = dropdown.getValue();
    if (value && value.trim() !== "") {
      options[optionName] = value.trim();
    }
  }

  // Handle hidden system parameters that should always be sent if supported
  if (currentTemplateOptions.some(opt => opt.longName === 'no-restore' || opt.name === 'no-restore')) {
     options['no-restore'] = true;
  }

  return options;
}

function createProject() {
  const hasSolutionName = isNewSolution && elements.solutionName.value.trim();
  const hasProjectName = elements.projectName.value.trim();
  const hasTemplate = selectedTemplate;
  
  // Special handling for Empty Solution template
  const isEmptySolutionTemplate = hasTemplate && selectedTemplate.shortName === 'emptysolution';

  // Determine creation scenario
  const creationType = getCreationType(hasSolutionName, hasProjectName, hasTemplate, isEmptySolutionTemplate);
  
  if (creationType === 'invalid') {
    showError("Please provide at least: solution name, or project name with template.");
    return;
  }

  // Hide any existing messages and show loading backdrop
  hideMessages();
  showLoadingBackdrop();

  const options = {
    creationType: isEmptySolutionTemplate ? 'emptySolution' : creationType,
    outputPath: elements.outputPath.value,
  };

  // Add solution-specific data if applicable
  if (hasSolutionName) {
    options.solutionName = elements.solutionName.value.trim();
    options.solutionFolder = elements.solutionFolder.value.trim() || elements.solutionName.value.trim();
  }

  // Always add git repo option (works for both solution and standalone project)
  options.initGitRepo = elements.initGitRepo.checked;

  // Add CPM option for new solutions only
  if (isNewSolution) {
    options.enableCpm = elements.enableCpm.checked;
    options.addEditorConfig = document.getElementById("addEditorConfig")?.checked || false;
  }

  // Add framework for all creation types (including empty solution)
  if (frameworkDropdown) {
    options.framework = frameworkDropdown.getValue();
  }

  // Add project-specific data if applicable (skip for empty solution)
  if (hasProjectName && hasTemplate && !isEmptySolutionTemplate) {
    options.templateShortName = selectedTemplate.shortName;
    options.projectName = hasProjectName;
    options.templateOptions = getTemplateOptionsFromForm();
    options.category = selectedCategory;
  }

  vscode.postMessage({
    command: "createProject",
    options: options
  });
}

function getCreationType(hasSolutionName, hasProjectName, hasTemplate, isEmptySolutionTemplate = false) {
  // If we're adding to an existing solution (isNewSolution is false) and have project + template
  // Always return 'projectInSolution' regardless of hasSolutionName
  if (!isNewSolution && hasProjectName && hasTemplate) {
    return 'projectInSolution';
  }
  
  if (hasSolutionName && hasProjectName && hasTemplate) {
    return 'projectInSolution'; // Create both solution and project
  } else if (hasSolutionName && !hasProjectName && !hasTemplate) {
    return 'emptySolution'; // Create only solution
  } else if (hasSolutionName && !hasProjectName && hasTemplate && isEmptySolutionTemplate) {
    return 'emptySolution'; // Create empty solution with template
  } else if (!hasSolutionName && hasProjectName && hasTemplate) {
    return 'projectOnly'; // Create only project (standalone, no solution)
  } else if (hasSolutionName && hasProjectName && !hasTemplate) {
    // Solution + project name but no template - invalid for now
    // Could potentially create empty solution with a folder, but let's keep it simple
    return 'invalid';
  } else {
    return 'invalid';
  }
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.style.display = "block";
  elements.successMessage.style.display = "none";
  elements.createButton.disabled = false;
  elements.createButton.textContent = "Create";
}

function showSuccess(message) {
  elements.successMessage.textContent = message;
  elements.successMessage.style.display = "block";
  elements.errorMessage.style.display = "none";
  elements.createButton.textContent = "Created!";
}

function hideMessages() {
  elements.errorMessage.style.display = "none";
  elements.successMessage.style.display = "none";
}

function showLoadingBackdrop() {
  elements.loadingBackdrop.classList.add('show');
  // Disable all form controls to prevent interaction during creation
  const formControls = document.querySelectorAll('input, select, button');
  formControls.forEach(control => {
    control.disabled = true;
  });
}

function hideLoadingBackdrop() {
  elements.loadingBackdrop.classList.remove('show');
  // Re-enable form controls
  const formControls = document.querySelectorAll('input, select, button');
  formControls.forEach(control => {
    control.disabled = false;
  });
  // Re-validate form to set correct button state
  validateForm();
}

function checkTemplateCompatibility(templates, framework) {
  if (!templates || templates.length === 0) {
    return;
  }
  
  // Skip compatibility check if we're selecting a recent template
  if (isSelectingRecentTemplate) {
    return;
  }
  
  // Send request to check compatibility - this will be instant due to pre-caching
  vscode.postMessage({
    command: "checkTemplateCompatibility",
    templates: templates,
    framework: framework,
  });
}

function handleTemplateCompatibilityChecked(message) {
  const { compatible, incompatible, framework } = message;
  
  // Re-populate templates with compatibility information
  populateTemplatesWithCompatibility(compatible, incompatible);
}

function populateTemplatesWithCompatibility(compatibleTemplates, incompatibleTemplates) {
  elements.templateSelector.innerHTML = "";

  const totalTemplates = compatibleTemplates.length + incompatibleTemplates.length;
  if (totalTemplates === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No templates found</div>
            <div class="empty-state-description">Try adjusting your search or selecting a different category</div>
        `;
    elements.templateSelector.appendChild(emptyState);
    return;
  }

  // Add compatible templates first
  if (compatibleTemplates.length > 0) {
    compatibleTemplates.forEach((template) => {
      const templateOption = createTemplateOption(template, true);
      elements.templateSelector.appendChild(templateOption);
    });
  }

  // Add divider and incompatible templates if any
  if (incompatibleTemplates.length > 0) {
    // Add divider
    const divider = document.createElement("div");
    divider.className = "template-divider";
    divider.innerHTML = `
      <div class="divider-line"></div>
      <div class="divider-text">Not available for selected framework</div>
      <div class="divider-line"></div>
    `;
    elements.templateSelector.appendChild(divider);

    // Add incompatible templates (disabled)
    incompatibleTemplates.forEach((template) => {
      const templateOption = createTemplateOption(template, false);
      elements.templateSelector.appendChild(templateOption);
    });
  }

  // Re-select previously selected template if it's still available
  if (selectedTemplate) {
    const isStillCompatible = compatibleTemplates.some(t => t.shortName === selectedTemplate.shortName);
    const isIncompatible = incompatibleTemplates.some(t => t.shortName === selectedTemplate.shortName);
    
    if (isStillCompatible) {
      // Find and re-select the template element
      const templateOptions = elements.templateSelector.querySelectorAll('.template-option');
      templateOptions.forEach(option => {
        const templateShortName = option.dataset.shortName;
        if (templateShortName === selectedTemplate.shortName) {
          option.classList.add("selected");
          requestTemplateHelp();
        }
      });
    } else if (isIncompatible) {
      // Selected template is now incompatible, clear selection
      selectedTemplate = null;
      clearDynamicOptions();
      validateForm();
    } else {
      // Selected template is no longer available, clear selection
      selectedTemplate = null;
      clearDynamicOptions();
      validateForm();
    }
  }
  // Auto-select if only one compatible template and nothing is currently selected
  else if (compatibleTemplates.length === 1 && selectedCategory) {
    const templateOption = elements.templateSelector.querySelector('.template-option.compatible');
    if (templateOption) {
      templateOption.classList.add("selected", "auto-selected");
      selectedTemplate = compatibleTemplates[0];
      requestTemplateHelp();
      validateForm();
    }
  }
}

function createTemplateOption(template, isCompatible) {
  const templateOption = document.createElement("div");
  templateOption.className = `template-option ${isCompatible ? 'compatible' : 'incompatible'}`;
  templateOption.dataset.shortName = template.shortName;

  const iconName = getTemplateIcon(template.shortName);

  templateOption.innerHTML = `
    <img src="${iconBaseUri}/${iconName}" class="template-option-icon" alt="${template.templateName}" />
    <div class="template-option-content">
        <div class="template-option-name">${template.templateName}</div>
    </div>
  `;

  // Add description popover directly to the template option if it has a description
  if (template.description) {
    const popover = document.createElement('div');
    popover.className = 'template-popover';
    popover.textContent = template.description;
    templateOption.appendChild(popover);

    let hoverTimeout = null;
    
    // Add hover event listeners with delay
    templateOption.addEventListener('mouseenter', (e) => {
      const element = e.currentTarget; // Capture element reference before setTimeout
      hoverTimeout = setTimeout(() => {
        positionPopover(element, popover);
        popover.classList.add('show');
      }, hoverDelay);
    });
    
    templateOption.addEventListener('mouseleave', () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      popover.classList.remove('show');
    });
  }

  // Only add click handler for compatible templates
  if (isCompatible) {
    templateOption.addEventListener("click", () =>
      selectTemplate(template, templateOption)
    );
  }

  return templateOption;
}
