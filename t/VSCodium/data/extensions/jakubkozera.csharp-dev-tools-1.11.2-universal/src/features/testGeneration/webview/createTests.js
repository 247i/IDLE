const vscode = acquireVsCodeApi();

// DOM elements
const testFrameworkSelect = document.getElementById('testFrameworkSelect');
const assertionLibrarySelect = document.getElementById('assertionLibrarySelect');
const testProjectSelect = document.getElementById('testProjectSelect');
const testFileSelect = document.getElementById('testFileSelect');
const fileSelectionSection = document.getElementById('fileSelectionSection');
const testFileNameSection = document.getElementById('testFileNameSection');
const outputFileInput = document.getElementById('outputFile');
const newProjectNameInput = document.getElementById('newProjectName');
const newProjectFolderInput = document.getElementById('newProjectFolder');
const browseFolderButton = document.getElementById('browseFolder');
const existingProjectRadio = document.getElementById('existingProject');
const newProjectRadio = document.getElementById('newProject');
const existingProjectSection = document.getElementById('existingProjectSection');
const newProjectSection = document.getElementById('newProjectSection');
const existingFileRadio = document.getElementById('existingFile');
const newFileRadio = document.getElementById('newFile');
const existingFileSection = document.getElementById('existingFileSection');
const newFileSection = document.getElementById('newFileSection');
const cancelButton = document.getElementById('cancelButton');
const generateButton = document.getElementById('generateButton');
const generateWithCopilotCheckbox = document.getElementById('generateWithCopilot');
const loadingOverlay = document.getElementById('loadingOverlay');
const currentModelName = document.getElementById('currentModelName');
const selectModelButton = document.getElementById('selectModelButton');

// New DOM elements for enhanced functionality
const copilotPromptSection = document.getElementById('copilotPromptSection');
const additionalPromptTextarea = document.getElementById('additionalPrompt');
const textareaBackdrop = document.getElementById('textareaBackdrop');
const fileAutocomplete = document.getElementById('fileAutocomplete');
const selectFilesButton = document.getElementById('selectFilesButton');
const autoIncludedFilesList = document.getElementById('autoIncludedFilesList');
const selectedFilesList = document.getElementById('selectedFilesList');
const selectedFilesContainer = document.querySelector('.selected-files-inline');
const includeCopilotInstructionsCheckbox = document.getElementById('includeCopilotInstructions');
const copilotInstructionsContainer = document.getElementById('copilotInstructionsContainer');

// State variables
let currentData = null;
let selectedTestFramework = '';
let selectedAssertionLibrary = '';
let selectedTestProject = '';
let selectedTestFile = '';
let allProjects = [];
let testFrameworks = [];
let assertionLibraries = [];
let methodContext = null;
let currentModel = null;
let availableModels = [];

// New state variables for enhanced functionality
let workspaceFiles = [];
let selectedAdditionalFiles = [];
let autoIncludedFiles = [];
let autocompletePosition = { line: 0, char: 0 };
let autocompleteStartIndex = -1;

// Initialize event listeners
function initializeEventListeners() {
    // Load workspace files for file reference highlighting
    vscode.postMessage({ type: 'getWorkspaceFiles' });
    
    // Project type radio buttons
    existingProjectRadio.addEventListener('change', handleProjectTypeChange);
    newProjectRadio.addEventListener('change', handleProjectTypeChange);

    // File type radio buttons
    existingFileRadio.addEventListener('change', handleFileTypeChange);
    newFileRadio.addEventListener('change', handleFileTypeChange);

    // Browse folder button
    browseFolderButton.addEventListener('click', handleBrowseFolderClick);

    // Input change listeners for validation
    outputFileInput.addEventListener('input', updateValidation);
    newProjectNameInput.addEventListener('input', updateValidation);
    newProjectFolderInput.addEventListener('input', updateValidation);
    generateWithCopilotCheckbox.addEventListener('change', handleCopilotToggle);

    // Copilot model selection
    selectModelButton.addEventListener('click', handleSelectModel);

    // New event listeners for enhanced functionality
    additionalPromptTextarea.addEventListener('input', handlePromptInput);
    additionalPromptTextarea.addEventListener('keydown', handlePromptKeydown);
    additionalPromptTextarea.addEventListener('keydown', handleFileReferenceKeydown);
    additionalPromptTextarea.addEventListener('scroll', highlightFileReferencesInTextarea);
    additionalPromptTextarea.addEventListener('resize', highlightFileReferencesInTextarea);
    additionalPromptTextarea.addEventListener('blur', (e) => {
        // Small delay to allow clicking on autocomplete items
        setTimeout(() => {
            if (!fileAutocomplete.contains(document.activeElement)) {
                hideFileAutocomplete();
            }
        }, 150);
    });
    selectFilesButton.addEventListener('click', handleSelectFiles);

    // Button listeners
    cancelButton.addEventListener('click', handleCancel);
    generateButton.addEventListener('click', handleGenerate);

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        // Don't close if clicking within the file autocomplete or textarea
        if (fileAutocomplete && fileAutocomplete.contains(e.target)) {
            return;
        }
        if (additionalPromptTextarea && additionalPromptTextarea.contains(e.target)) {
            return;
        }
        closeAllCustomSelects();
    });
}

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'initialData':
            currentData = message;
            allProjects = message.projects;
            testFrameworks = message.testFrameworks;
            assertionLibraries = message.assertionLibraries;
            methodContext = message.methodContext;
            
            initializeUI();
            
            if (message.preferences) {
                setTimeout(() => {
                    loadSavedPreferences(message.preferences);
                }, 100);
            }
            break;
        case 'projectsData':
            allProjects = message.projects;
            populateProjectDropdown();
            break;
        case 'savedPreferences':
            loadSavedPreferences(message.preferences);
            break;
        case 'folderSelected':
            newProjectFolderInput.value = message.folderPath;
            updateValidation();
            break;
        case 'projectFiles':
            populateFileSelect(message.files);
            break;
        case 'availableModels':
            availableModels = message.models;
            currentModel = message.currentModel;
            updateModelDisplay();
            break;
        case 'modelSelected':
            currentModel = message.model;
            updateModelDisplay();
            break;
        case 'generationComplete':
            hideLoadingOverlay();
            break;
        case 'generationError':
            hideLoadingOverlay();
            break;
        case 'streamingStarted':
            showStreamingView(message.message);
            break;
        case 'streamingContent':
            appendStreamingContent(message.content);
            break;
        case 'streamingComplete':
            showStreamingComplete();
            break;
        case 'workspaceFiles':
            workspaceFiles = message.files;
            // Update highlighting now that we have workspace files
            highlightFileReferencesInTextarea();
            break;
        case 'autoIncludedFiles':
            updateAutoIncludedFilesDisplay(message.files);
            break;
        case 'copilotInstructionsExists':
            if (message.exists) {
                copilotInstructionsContainer.style.display = 'block';
            } else {
                copilotInstructionsContainer.style.display = 'none';
            }
            break;
    }
});

function initializeUI() {
    // Update header with method and class information
    updateHeaderWithMethodClassInfo();
    
    // Generate default output file name
    if (methodContext) {
        generateDefaultOutputFileName(methodContext);
    }

    // Populate dropdowns
    populateTestFrameworkDropdown();
    populateAssertionLibraryDropdown();
    populateProjectDropdown();

    // Pre-populate new project fields
    if (currentData && currentData.sourceProjectName) {
        newProjectNameInput.value = `${currentData.sourceProjectName}.Tests`;
    }
    
    if (currentData && currentData.solutionDir) {
        newProjectFolderInput.value = currentData.solutionDir;
    }

    // Set initial project type
    handleProjectTypeChange();
    
    // Update validation after initialization
    setTimeout(() => {
        updateValidation();
    }, 50);
}

function generateDefaultOutputFileName(context) {
    if (!context || !context.filePath) {
        const fileName = `${context.class.name}Tests.cs`;
        outputFileInput.value = fileName;
        return;
    }
    
    // Extract the directory structure from the source file path
    const sourceFilePath = context.filePath;
    const pathParts = sourceFilePath.split(/[\\\/]/);
    
    // Find the source project directory (look for typical project directory patterns)
    let projectIndex = -1;
    for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i].toLowerCase();
        // Look for typical project directory patterns
        if (dirName.includes('.') || 
            dirName.includes('src') ||
            dirName.includes('lib') ||
            dirName.includes('core') ||
            dirName.includes('infrastructure') ||
            dirName.includes('domain') ||
            dirName.includes('application')) {
            projectIndex = i;
            break;
        }
    }
    
    // Build the relative path within the project
    let relativePath = '';
    if (projectIndex >= 0 && projectIndex < pathParts.length - 1) {
        const pathInProject = pathParts.slice(projectIndex + 1, -1); // exclude filename
        if (pathInProject.length > 0) {
            relativePath = pathInProject.join('\\') + '\\';
        }
    }
    
    // Generate the test file name
    const fileName = `${context.class.name}Tests.cs`;
    
    // Only show the filename, not the full path
    outputFileInput.value = fileName;
}

function updateHeaderWithMethodClassInfo() {
    const pageTitle = document.getElementById('pageTitle');
    
    if (methodContext && methodContext.method && methodContext.class) {
        const methodName = methodContext.method.name;
        const className = methodContext.class.name;
        const isClassLevel = methodContext.isClassLevel;
        
        // Update the page title with code blocks
        if (isClassLevel) {
            pageTitle.innerHTML = `Create Unit Tests: <code>${className}</code>`;
        } else {
            pageTitle.innerHTML = `Create Unit Tests: <code>${methodName}</code>`;
        }
    } else {
        pageTitle.textContent = 'Create Unit Tests';
    }
}

function populateTestFrameworkDropdown() {
    populateCustomSelect(
        'testFrameworkSelect',
        testFrameworks,
        'Select test framework...',
        (item) => item.name,
        (item) => item.id,
        (item) => null, // Remove icons
        'framework'
    );
}

function populateAssertionLibraryDropdown() {
    populateCustomSelect(
        'assertionLibrarySelect',
        assertionLibraries,
        'Select assertion library...',
        (item) => item.name,
        (item) => item.id,
        (item) => null, // Remove icons
        'assertion'
    );
}

function populateProjectDropdown() {
    // Filter for test projects only
    const testProjects = allProjects.filter(p => p.isTestProject);
    
    populateCustomSelect(
        'testProjectSelect',
        testProjects,
        'Select test project...',
        (item) => item.name,
        (item) => item.path,  // Use full path instead of relativePath
        (item) => item.iconPaths,
        'project'
    );
}

function populateFileDropdown(projectPath) {
    if (!projectPath) {
        fileSelectionSection.style.display = 'none';
        newFileSection.style.display = 'block';
        return;
    }

    // Show file selection section
    fileSelectionSection.style.display = 'block';
    
    // Request files from the selected test project
    vscode.postMessage({
        type: 'getProjectFiles',
        projectPath: projectPath
    });
}

function populateFileSelect(files) {
    // Create file options (no longer including "Create new file" option)
    const fileOptions = files.map(file => ({
        name: file.name,
        path: file.path,
        isNewFile: false
    }));
    
    populateCustomSelect(
        'testFileSelect',
        fileOptions,
        'Select test file...',
        (item) => item.name,
        (item) => item.path,
        (item) => null, // No icons for files
        'file'
    );
    
    // Apply current file type selection
    handleFileTypeChange();
}

function populateCustomSelect(selectId, items, placeholder, nameFn, valueFn, iconFn, type) {
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    const trigger = selectElement.querySelector('.custom-select-trigger');
    const nameSpan = trigger.querySelector(`.${type}-name`);
    const iconDiv = trigger.querySelector(`.${type}-icon`);
    
    // Clear existing options
    optionsContainer.innerHTML = '';
    
    // Add placeholder option
    const placeholderOption = document.createElement('div');
    placeholderOption.className = 'custom-select-option';
    placeholderOption.dataset.value = '';
    
    const placeholderIconDiv = document.createElement('div');
    placeholderIconDiv.className = `${type}-icon`;
    
    const placeholderSpan = document.createElement('span');
    placeholderSpan.className = `${type}-name placeholder-text`;
    placeholderSpan.textContent = placeholder;
    
    placeholderOption.appendChild(placeholderIconDiv);
    placeholderOption.appendChild(placeholderSpan);
    optionsContainer.appendChild(placeholderOption);
    
    // Add item options
    items.forEach(item => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = valueFn(item);
        
        const itemIconDiv = document.createElement('div');
        itemIconDiv.className = `${type}-icon`;
        
        const iconPath = iconFn(item);
        if (iconPath) {
            if (type === 'project' && iconPath.dark) {
                itemIconDiv.style.backgroundImage = `url(${iconPath.dark})`;
            } else if (typeof iconPath === 'string') {
                // For framework and assertion icons, construct the path
                // This is handled by the extension, so we don't need to do anything here
            }
        }
        
        const itemNameSpan = document.createElement('span');
        itemNameSpan.className = `${type}-name`;
        itemNameSpan.textContent = nameFn(item);
        
        option.appendChild(itemIconDiv);
        option.appendChild(itemNameSpan);
        optionsContainer.appendChild(option);
    });
    
    // Reset to placeholder
    nameSpan.textContent = placeholder;
    nameSpan.className = `${type}-name placeholder-text`;
    iconDiv.style.backgroundImage = '';
    
    // Setup event handlers
    setupCustomSelectHandlers(selectId, type);
}

function setupCustomSelectHandlers(selectId, type) {
    const selectElement = document.getElementById(selectId);
    const trigger = selectElement.querySelector('.custom-select-trigger');
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // Remove existing event listeners by cloning the element
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    
    // Toggle dropdown on trigger click
    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCustomSelects();
        selectElement.classList.toggle('open');
    });
    
    // Handle keyboard navigation
    newTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            newTrigger.click();
        }
    });
    
    // Handle option clicks
    optionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (option) {
            selectCustomOption(selectId, option, type);
        }
    });
}

function selectCustomOption(selectId, optionElement, type) {
    const selectElement = document.getElementById(selectId);
    const trigger = selectElement.querySelector('.custom-select-trigger');
    const nameSpan = trigger.querySelector(`.${type}-name`);
    const iconDiv = trigger.querySelector(`.${type}-icon`);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // Remove selected class from all options
    optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    optionElement.classList.add('selected');
    
    // Update trigger display
    const optionIcon = optionElement.querySelector(`.${type}-icon`);
    const optionName = optionElement.querySelector(`.${type}-name`);
    
    if (optionIcon) {
        iconDiv.style.backgroundImage = optionIcon.style.backgroundImage;
    }
    nameSpan.textContent = optionName.textContent;
    nameSpan.className = optionName.className;
    
    // Store selected value
    const value = optionElement.dataset.value;
    if (selectId === 'testFrameworkSelect') {
        selectedTestFramework = value;
    } else if (selectId === 'assertionLibrarySelect') {
        selectedAssertionLibrary = value;
    } else if (selectId === 'testProjectSelect') {
        selectedTestProject = value;
        // When a test project is selected, populate the file dropdown
        populateFileDropdown(value);
    } else if (selectId === 'testFileSelect') {
        selectedTestFile = value;
        // Handle file selection
        handleFileSelection(value);
    }
    
    // Close dropdown
    selectElement.classList.remove('open');
    
    // Update validation
    updateValidation();
}

function setCustomSelectValue(selectId, value, type) {
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // Find option by comparing data-value directly instead of using CSS selector
    // This avoids issues with special characters like backslashes in paths
    let option = null;
    const options = optionsContainer.querySelectorAll('.custom-select-option');
    for (const opt of options) {
        if (opt.dataset.value === value) {
            option = opt;
            break;
        }
    }
    
    if (option) {
        selectCustomOption(selectId, option, type);
    }
}

function closeAllCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        select.classList.remove('open');
    });
    
    // Also close file autocomplete if clicking outside
    if (fileAutocomplete && fileAutocomplete.style.display !== 'none') {
        hideFileAutocomplete();
    }
}

function handleProjectTypeChange() {
    const isNewProject = newProjectRadio.checked;
    
    if (isNewProject) {
        existingProjectSection.style.display = 'none';
        newProjectSection.style.display = 'block';
        fileSelectionSection.style.display = 'none';
        // Show the new file section by default
        newFileSection.style.display = 'block';
    } else {
        existingProjectSection.style.display = 'block';
        newProjectSection.style.display = 'none';
        // File selection will be shown when a project is selected
        if (selectedTestProject) {
            populateFileDropdown(selectedTestProject);
            // Show file selection with current file type setting
            handleFileTypeChange();
        } else {
            fileSelectionSection.style.display = 'none';
            newFileSection.style.display = 'block';
        }
    }
    
    // Update validation after changing project type
    setTimeout(() => {
        updateValidation();
    }, 10);
}

function handleFileTypeChange() {
    const isNewFile = newFileRadio.checked;
    
    if (isNewFile) {
        existingFileSection.style.display = 'none';
        newFileSection.style.display = 'block';
    } else {
        existingFileSection.style.display = 'block';
        newFileSection.style.display = 'none';
    }
    
    // Update validation after changing file type
    setTimeout(() => {
        updateValidation();
    }, 10);
}

function handleFileSelection(filePath) {
    // File selection is now handled by radio buttons
    // Just update validation
    updateValidation();
}

function handleBrowseFolderClick() {
    vscode.postMessage({
        type: 'selectOutputFolder'
    });
}

function loadSavedPreferences(preferences) {
    if (preferences.testFramework) {
        setCustomSelectValue('testFrameworkSelect', preferences.testFramework, 'framework');
    }
    if (preferences.assertionLibrary) {
        setCustomSelectValue('assertionLibrarySelect', preferences.assertionLibrary, 'assertion');
    }
    if (preferences.testProject) {
        setCustomSelectValue('testProjectSelect', preferences.testProject, 'project');
    }
    // Don't load the output file from preferences - always generate fresh based on current context
    // This ensures each file gets the correct test file name
    if (methodContext && methodContext.class && methodContext.class.name) {
        generateDefaultOutputFileName(methodContext);
    }
}

function validateForm() {
    // Check test framework selection
    if (!selectedTestFramework) {
        return false;
    }
    
    // Check assertion library selection
    if (!selectedAssertionLibrary) {
        return false;
    }
    
    // Check project selection based on project type
    if (newProjectRadio.checked) {
        // For new project: need project name and folder
        if (!newProjectNameInput.value.trim()) {
            return false;
        }
        if (!newProjectFolderInput.value.trim()) {
            return false;
        }
        // For new project, always need output file name (creating new file)
        if (!outputFileInput.value.trim()) {
            return false;
        }
    } else {
        // For existing project: need project selection
        if (!selectedTestProject) {
            return false;
        }
        
        // Check file selection based on file type
        if (newFileRadio.checked) {
            // For new file: need output file name
            if (!outputFileInput.value.trim()) {
                return false;
            }
        } else {
            // For existing file: need file selection
            if (!selectedTestFile) {
                return false;
            }
        }
    }
    
    return true;
}

function updateValidation() {
    const isValid = validateForm();
    generateButton.disabled = !isValid;
}

function handleCancel() {
    vscode.postMessage({
        type: 'cancel'
    });
}

function parseFileReferencesFromPrompt() {
    const additionalPrompt = additionalPromptTextarea.value.trim();
    if (!additionalPrompt) {
        return [];
    }
    
    const fileRefs = [];
    // Match both #filename and #file:filename patterns
    const regex = /#(?:file:)?(\w+(?:\.\w+)*)/g;
    let match;
    
    while ((match = regex.exec(additionalPrompt)) !== null) {
        const fileName = match[1]; // Extract just the filename (e.g., "Program.cs")
        
        // Find the full path for this filename in the workspace
        if (workspaceFiles) {
            const matchingFile = workspaceFiles.find(file => {
                return file.name === fileName || 
                       file.relativePath === fileName ||
                       file.relativePath.endsWith('/' + fileName) ||
                       file.relativePath.endsWith('\\' + fileName);
            });
            
            if (matchingFile && !fileRefs.includes(matchingFile.relativePath)) {
                fileRefs.push(matchingFile.relativePath);
            }
        }
    }
    
    return fileRefs;
}

function handleGenerate() {
    if (!validateForm()) {
        return;
    }
    
    // Show loading overlay
    showLoadingOverlay();
    
    // Combine files from prompt and manually selected files
    const promptFiles = parseFileReferencesFromPrompt();
    const allAdditionalFiles = [...new Set([...selectedAdditionalFiles, ...promptFiles])];
    
    const data = {
        testFramework: selectedTestFramework,
        assertionLibrary: selectedAssertionLibrary,
        outputFile: outputFileInput.value.trim(),
        isNewProject: newProjectRadio.checked,
        testProject: selectedTestProject,
        selectedTestFile: selectedTestFile,
        isCreateNewFile: newProjectRadio.checked || newFileRadio.checked,
        newProjectName: newProjectNameInput.value.trim(),
        newProjectFolder: newProjectFolderInput.value.trim(),
        generateWithCopilot: generateWithCopilotCheckbox.checked,
        selectedModel: currentModel,
        additionalPrompt: generateWithCopilotCheckbox.checked ? additionalPromptTextarea.value.trim() : '',
        additionalContextFiles: generateWithCopilotCheckbox.checked ? allAdditionalFiles : [],
        includeCopilotInstructions: generateWithCopilotCheckbox.checked ? (includeCopilotInstructionsCheckbox?.checked || false) : false
    };
    
    vscode.postMessage({
        type: 'generateTests',
        data: data
    });
}

function handleCopilotToggle() {
    const isEnabled = generateWithCopilotCheckbox.checked;
    copilotPromptSection.style.display = isEnabled ? 'block' : 'none';
    
    if (isEnabled) {
        if (!currentModel) {
            // Request available models from the extension
            vscode.postMessage({
                type: 'getAvailableModels'
            });
        }
        
        // Load workspace files for autocomplete
        loadWorkspaceFiles();
        
        // Load auto-included files
        loadAutoIncludedFiles();
        
        // Check for copilot instructions file
        checkCopilotInstructionsFile();
    }
    
    updateValidation();
}

function handleSelectModel() {
    vscode.postMessage({
        type: 'selectModel',
        availableModels: availableModels,
        currentModel: currentModel
    });
}

function updateModelDisplay() {
    if (currentModel) {
        currentModelName.textContent = currentModel.name || currentModel.id || 'Unknown Model';
    } else {
        currentModelName.textContent = 'Not selected';
    }
}

function showLoadingOverlay() {
    loadingOverlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    loadingOverlay.style.display = 'none';
}

// Streaming functions
function showStreamingView(message) {
    // Hide the loading overlay and show a streaming view
    hideLoadingOverlay();
    
    // Create or show streaming container
    let streamingContainer = document.getElementById('streamingContainer');
    if (!streamingContainer) {
        streamingContainer = document.createElement('div');
        streamingContainer.id = 'streamingContainer';
        streamingContainer.className = 'streaming-container';
        streamingContainer.innerHTML = `
            <div class="streaming-header">
                <div class="streaming-spinner"></div>
                <h3 id="streamingTitle">${message}</h3>
            </div>
            <div class="streaming-content">
                <pre id="streamingCode"></pre>
            </div>
        `;
        document.body.appendChild(streamingContainer);
    }
    
    // Show the streaming container
    streamingContainer.style.display = 'flex';
    
    // Hide the main form
    const container = document.querySelector('.container');
    if (container) {
        container.style.display = 'none';
    }
}

function appendStreamingContent(content) {
    const streamingCode = document.getElementById('streamingCode');
    if (streamingCode) {
        streamingCode.textContent += content;
        
        // Auto-scroll to bottom
        streamingCode.scrollTop = streamingCode.scrollHeight;
    }
}

function showStreamingComplete() {
    const streamingTitle = document.getElementById('streamingTitle');
    const streamingSpinner = document.querySelector('.streaming-spinner');
    
    if (streamingTitle) {
        streamingTitle.textContent = 'Test generation complete! Opening file...';
    }
    
    if (streamingSpinner) {
        streamingSpinner.style.display = 'none';
    }
    
    // Show completion checkmark
    const streamingHeader = document.querySelector('.streaming-header');
    if (streamingHeader) {
        const checkmark = document.createElement('div');
        checkmark.className = 'streaming-checkmark';
        checkmark.innerHTML = '✓';
        streamingHeader.insertBefore(checkmark, streamingTitle);
    }
}

// New functions for enhanced functionality
function highlightMatches(text, query) {
    if (!query) {
        return text;
    }
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // First, try to find consecutive phrase matches
    const phraseIndex = lowerText.indexOf(lowerQuery);
    if (phraseIndex !== -1) {
        const before = text.substring(0, phraseIndex);
        const match = text.substring(phraseIndex, phraseIndex + query.length);
        const after = text.substring(phraseIndex + query.length);
        return `${before}<span class="fuzzy-phrase">${match}</span>${after}`;
    }
    
    // If no phrase match, highlight individual matching characters
    let result = '';
    let textIndex = 0;
    let queryIndex = 0;
    
    while (textIndex < text.length) {
        if (queryIndex < query.length && 
            text[textIndex].toLowerCase() === query[queryIndex].toLowerCase()) {
            result += `<span class="fuzzy-match">${text[textIndex]}</span>`;
            queryIndex++;
        } else {
            result += text[textIndex];
        }
        textIndex++;
    }
    
    return result;
}

function getFuzzyScore(text, query) {
    if (!query) {
        return 1;
    }
    if (!text) {
        return 0;
    }
    
    let textIndex = 0;
    let queryIndex = 0;
    let score = 0;
    let consecutiveMatches = 0;
    let wordBoundaryMatches = 0;
    
    while (textIndex < text.length && queryIndex < query.length) {
        const char = text[textIndex];
        const queryChar = query[queryIndex];
        const prevChar = textIndex > 0 ? text[textIndex - 1] : '';
        
        if (char === queryChar) {
            queryIndex++;
            consecutiveMatches++;
            score += consecutiveMatches; // Bonus for consecutive matches
            
            // Check if this is a word boundary match
            const isWordBoundary = textIndex === 0 || 
                                  (char >= 'a' && char <= 'z' && prevChar >= 'A' && prevChar <= 'Z') || // camelCase
                                  (char >= 'A' && char <= 'Z' && prevChar >= 'a' && prevChar <= 'z') || // camelCase
                                  prevChar === '_' || prevChar === '-' || prevChar === '.';
            
            if (isWordBoundary) {
                wordBoundaryMatches++;
                score += 10; // Big bonus for word boundary matches
            }
        } else {
            consecutiveMatches = 0;
        }
        textIndex++;
    }
    
    // Must match all characters in query
    if (queryIndex !== query.length) {
        return 0;
    }
    
    // Additional scoring
    score += wordBoundaryMatches * 5;
    
    // Bonus for shorter text (more specific matches)
    score += Math.max(0, 100 - text.length);
    
    return score;
}

function loadWorkspaceFiles() {
    vscode.postMessage({
        type: 'getWorkspaceFiles'
    });
}

function loadAutoIncludedFiles() {
    if (methodContext && methodContext.filePath) {
        vscode.postMessage({
            type: 'getAutoIncludedFiles',
            sourceFilePath: methodContext.filePath
        });
    }
}

function checkCopilotInstructionsFile() {
    vscode.postMessage({
        type: 'checkCopilotInstructions'
    });
}

// State variables for file reference tracking
let fileReferences = new Map(); // Maps positions to file references
let isUpdatingTextarea = false; // Prevent recursive updates

function highlightFileReferencesInTextarea() {
    if (!textareaBackdrop || isUpdatingTextarea) {
        return;
    }
    
    const textarea = additionalPromptTextarea;
    const text = textarea.value;
    
    // Clear previous file references
    fileReferences.clear();
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Create highlighted version of the text, but only for files that exist in workspace
    let offset = 0;
    const escapedText = escapeHtml(text);
    // Match both #filename and #file:filename patterns
    const highlightedText = escapedText.replace(/#(?:file:)?(\w+(?:\.\w+)*)/g, (match, filename, matchIndex) => {
        // Check if this file exists in the workspace
        const fileExists = workspaceFiles && workspaceFiles.some(file => {
            return file.name === filename || 
                   file.relativePath === filename ||
                   file.relativePath.endsWith('/' + filename) ||
                   file.relativePath.endsWith('\\' + filename);
        });
        
        if (fileExists) {
            // Store the file reference for tracking
            const startPos = matchIndex + offset;
            const fileRef = `#file:${filename}`;
            fileReferences.set(startPos, {
                original: match,
                replacement: fileRef,
                length: fileRef.length,
                filename: filename
            });
            
            // Update offset for subsequent matches
            offset += fileRef.length - match.length;
            
            return `<span class="file-reference-highlight">#file:${filename}</span>`;
        } else {
            return match; // Return unhighlighted if file doesn't exist
        }
    });
    
    // Update backdrop content
    textareaBackdrop.innerHTML = highlightedText;
    
    // Sync backdrop scroll with textarea
    textareaBackdrop.scrollTop = textarea.scrollTop;
    textareaBackdrop.scrollLeft = textarea.scrollLeft;
}

function handlePromptInput(event) {
    if (isUpdatingTextarea) {
        return;
    }
    
    const text = event.target.value;
    const cursorPosition = event.target.selectionStart;
    
    // Check if user is trying to edit within a file reference
    const editedFileRef = checkForFileReferenceEdit(text, cursorPosition);
    if (editedFileRef) {
        // Remove the entire file reference
        isUpdatingTextarea = true;
        const newText = text.substring(0, editedFileRef.start) + text.substring(editedFileRef.end);
        event.target.value = newText;
        event.target.setSelectionRange(editedFileRef.start, editedFileRef.start);
        isUpdatingTextarea = false;
        
        // Update highlighting with new text
        highlightFileReferencesInTextarea();
        return;
    }
    
    // Highlight file references
    highlightFileReferencesInTextarea();
    
    // Find the last # symbol before cursor for autocomplete
    const beforeCursor = text.substring(0, cursorPosition);
    const lastHashIndex = beforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
        // Check if there's a space or newline before the #
        const charBeforeHash = lastHashIndex > 0 ? beforeCursor[lastHashIndex - 1] : ' ';
        if (charBeforeHash === ' ' || charBeforeHash === '\n' || lastHashIndex === 0) {
            // Get the partial filename after #
            const afterHash = beforeCursor.substring(lastHashIndex + 1);
            
            // Skip if this looks like a completed file reference
            if (afterHash.startsWith('file:')) {
                hideFileAutocomplete();
                return;
            }
            
            // Check if we haven't completed this file reference yet (no space after #)
            const spaceAfterHash = text.substring(lastHashIndex).indexOf(' ');
            const newlineAfterHash = text.substring(lastHashIndex).indexOf('\n');
            const endIndex = spaceAfterHash === -1 ? newlineAfterHash : 
                             newlineAfterHash === -1 ? spaceAfterHash : 
                             Math.min(spaceAfterHash, newlineAfterHash);
            
            if (endIndex === -1 || lastHashIndex + endIndex >= cursorPosition) {
                autocompleteStartIndex = lastHashIndex;
                showFileAutocomplete(afterHash, event.target);
                return;
            }
        }
    }
    
    hideFileAutocomplete();
}

function checkForFileReferenceEdit(text, cursorPosition) {
    // Look for file references in the format #file:filename
    const fileRefRegex = /#file:\w+(?:\.\w+)*/g;
    let match;
    
    while ((match = fileRefRegex.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        
        // Check if cursor is within this file reference
        if (cursorPosition > start && cursorPosition < end) {
            return { start, end, match: match[0] };
        }
    }
    
    return null;
}

function handleFileReferenceKeydown(event) {
    if (isUpdatingTextarea) {
        return;
    }
    
    const textarea = event.target;
    const text = textarea.value;
    const cursorPosition = textarea.selectionStart;
    
    // Handle backspace and delete keys
    if (event.key === 'Backspace' || event.key === 'Delete') {
        const fileRef = checkForFileReferenceEdit(text, cursorPosition);
        if (fileRef) {
            event.preventDefault();
            
            // Remove the entire file reference
            isUpdatingTextarea = true;
            const newText = text.substring(0, fileRef.start) + text.substring(fileRef.end);
            textarea.value = newText;
            textarea.setSelectionRange(fileRef.start, fileRef.start);
            isUpdatingTextarea = false;
            
            // Update highlighting
            highlightFileReferencesInTextarea();
            return;
        }
        
        // Also check if we're about to delete into a file reference
        let checkPos = cursorPosition;
        if (event.key === 'Backspace') {
            checkPos = cursorPosition - 1;
        } else if (event.key === 'Delete') {
            checkPos = cursorPosition + 1;
        }
        
        const adjacentFileRef = checkForFileReferenceEdit(text, checkPos);
        if (adjacentFileRef) {
            event.preventDefault();
            
            // Remove the entire file reference
            isUpdatingTextarea = true;
            const newText = text.substring(0, adjacentFileRef.start) + text.substring(adjacentFileRef.end);
            textarea.value = newText;
            textarea.setSelectionRange(adjacentFileRef.start, adjacentFileRef.start);
            isUpdatingTextarea = false;
            
            // Update highlighting
            highlightFileReferencesInTextarea();
            return;
        }
    }
}

function handlePromptKeydown(event) {
    const autocompleteList = document.querySelector('.file-autocomplete-list');
    if (!autocompleteList || fileAutocomplete.style.display === 'none') {
        return;
    }
    
    const items = autocompleteList.querySelectorAll('.file-autocomplete-item');
    const selectedItem = autocompleteList.querySelector('.file-autocomplete-item.selected');
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (selectedItem) {
                selectedItem.classList.remove('selected');
                const nextItem = selectedItem.nextElementSibling;
                if (nextItem) {
                    nextItem.classList.add('selected');
                } else if (items.length > 0) {
                    items[0].classList.add('selected');
                }
            } else if (items.length > 0) {
                items[0].classList.add('selected');
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            if (selectedItem) {
                selectedItem.classList.remove('selected');
                const prevItem = selectedItem.previousElementSibling;
                if (prevItem) {
                    prevItem.classList.add('selected');
                } else if (items.length > 0) {
                    items[items.length - 1].classList.add('selected');
                }
            } else if (items.length > 0) {
                items[items.length - 1].classList.add('selected');
            }
            break;
            
        case 'Enter':
        case 'Tab':
            event.preventDefault();
            if (selectedItem) {
                selectAutocompleteFile(selectedItem.dataset.file);
            } else if (items.length > 0) {
                selectAutocompleteFile(items[0].dataset.file);
            }
            break;
            
        case 'Escape':
            hideFileAutocomplete();
            break;
    }
}

function showFileAutocomplete(query, textarea) {
    if (!workspaceFiles || workspaceFiles.length === 0) {
        hideFileAutocomplete();
        return;
    }
    
    // Filter and score files based on fuzzy search on filename
    const scoredFiles = workspaceFiles
        .map(file => ({
            file,
            score: getFuzzyScore(file.name.toLowerCase(), query.toLowerCase())
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10) // Limit to 10 results
        .map(item => item.file);
    
    if (scoredFiles.length === 0) {
        hideFileAutocomplete();
        return;
    }
    
    const autocompleteList = fileAutocomplete.querySelector('.file-autocomplete-list');
    autocompleteList.innerHTML = '';
    
    scoredFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-autocomplete-item';
        if (index === 0) {
            item.classList.add('selected');
        }
        item.dataset.file = file.relativePath;
        
        // Highlight matching characters
        const highlightedName = highlightMatches(file.name, query);
        
        item.innerHTML = `
            <div class="file-name" title="${file.relativePath}">${highlightedName}</div>
        `;
        
        item.addEventListener('click', () => selectAutocompleteFile(file.relativePath));
        autocompleteList.appendChild(item);
    });
    
    // Position the autocomplete dropdown
    positionAutocomplete(textarea);
    fileAutocomplete.style.display = 'block';
}

function hideFileAutocomplete() {
    fileAutocomplete.style.display = 'none';
}

function positionAutocomplete(textarea) {
    const rect = textarea.getBoundingClientRect();
    const containerRect = textarea.parentElement.getBoundingClientRect();
    
    // Calculate cursor position within textarea
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;
    const currentChar = lines[lines.length - 1].length;
    
    // Approximate positioning (this is simplified)
    const lineHeight = 20; // Approximate line height
    const charWidth = 8; // Approximate character width
    
    const top = (currentLine - 1) * lineHeight + 40; // Offset for padding
    const left = Math.min(currentChar * charWidth, textarea.offsetWidth - 200);
    
    fileAutocomplete.style.top = `${top}px`;
    fileAutocomplete.style.left = `${left}px`;
}

function selectAutocompleteFile(filePath) {
    const textarea = additionalPromptTextarea;
    const text = textarea.value;
    const cursorPosition = textarea.selectionStart;
    
    if (autocompleteStartIndex === -1) {
        return;
    }
    
    // Find the end of the current file reference
    const afterHash = text.substring(autocompleteStartIndex);
    const spaceIndex = afterHash.indexOf(' ');
    const newlineIndex = afterHash.indexOf('\n');
    let endIndex;
    
    if (spaceIndex === -1 && newlineIndex === -1) {
        endIndex = text.length;
    } else if (spaceIndex === -1) {
        endIndex = autocompleteStartIndex + newlineIndex;
    } else if (newlineIndex === -1) {
        endIndex = autocompleteStartIndex + spaceIndex;
    } else {
        endIndex = autocompleteStartIndex + Math.min(spaceIndex, newlineIndex);
    }
    
    // Get just the filename for display
    const fileName = filePath.split(/[\\\/]/).pop();
    
    // Replace the text from # to the end of the current word with the file reference format
    const fileReference = `#file:${fileName}`;
    const newText = text.substring(0, autocompleteStartIndex) + fileReference + text.substring(endIndex);
    
    isUpdatingTextarea = true;
    textarea.value = newText;
    
    // Position cursor after the file reference
    const newCursorPosition = autocompleteStartIndex + fileReference.length;
    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    isUpdatingTextarea = false;
    
    hideFileAutocomplete();
    autocompleteStartIndex = -1;
    
    // Update highlighting
    highlightFileReferencesInTextarea();
    
    // Focus back on textarea
    textarea.focus();
}

function handleSelectFiles() {
    showFileSelectionDialog();
}

function showFileSelectionDialog() {
    if (!workspaceFiles || workspaceFiles.length === 0) {
        vscode.postMessage({ type: 'getWorkspaceFiles' });
        return;
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'file-selection-overlay';
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'file-selection-dialog';
    
    dialog.innerHTML = `
        <div class="file-selection-header">
            <h3>Select Additional Context Files</h3>
            <button type="button" class="file-selection-close" onclick="closeFileSelectionDialog()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="file-selection-search">
            <input type="text" placeholder="Search files by name..." id="fileSearchInput">
        </div>
        <div class="file-selection-list" id="fileSelectionList">
            ${renderFileSelectionItems(workspaceFiles)}
        </div>
        <div class="file-selection-actions">
            <button type="button" class="secondary-button" onclick="closeFileSelectionDialog()">Cancel</button>
            <button type="button" class="primary-button" onclick="confirmFileSelection()">Add Selected Files</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Add search functionality
    const searchInput = dialog.querySelector('#fileSearchInput');
    searchInput.addEventListener('input', (e) => {
        filterFileSelectionItems(e.target.value);
    });
    
    // Add click handlers for file items (clicking on name toggles checkbox)
    const addFileItemClickHandlers = () => {
        const fileItems = dialog.querySelectorAll('.file-selection-item');
        fileItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const fileName = item.querySelector('.file-selection-item-name');
            
            if (fileName && checkbox) {
                fileName.style.cursor = 'pointer';
                fileName.addEventListener('click', (e) => {
                    e.stopPropagation();
                    checkbox.checked = !checkbox.checked;
                });
            }
        });
    };
    
    // Initial setup of click handlers
    addFileItemClickHandlers();
    
    // Re-add click handlers after filtering
    const originalFilterFunction = filterFileSelectionItems;
    window.addFileItemClickHandlers = addFileItemClickHandlers;
    
    // Prevent closing when clicking inside dialog
    dialog.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Close when clicking overlay
    overlay.addEventListener('click', () => {
        closeFileSelectionDialog();
    });
}

function renderFileSelectionItems(files) {
    return files.map(file => `
        <div class="file-selection-item">
            <input type="checkbox" id="file_${file.relativePath.replace(/[^a-zA-Z0-9]/g, '_')}" 
                   value="${file.relativePath}" 
                   ${selectedAdditionalFiles.includes(file.relativePath) ? 'checked' : ''}>
            <div class="file-selection-item-info">
                <div class="file-selection-item-name" title="${file.relativePath}">${file.name}</div>
            </div>
        </div>
    `).join('');
}

function filterFileSelectionItems(query) {
    const list = document.getElementById('fileSelectionList');
    if (!list) {
        return;
    }
    
    const scoredFiles = workspaceFiles
        .map(file => ({
            file,
            score: getFuzzyScore(file.name.toLowerCase(), query.toLowerCase())
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.file);
    
    list.innerHTML = renderFileSelectionItems(scoredFiles);
    
    // Re-add click handlers after filtering
    if (window.addFileItemClickHandlers) {
        window.addFileItemClickHandlers();
    }
}

function confirmFileSelection() {
    const checkboxes = document.querySelectorAll('.file-selection-item input[type="checkbox"]:checked');
    selectedAdditionalFiles = Array.from(checkboxes).map(cb => cb.value);
    
    updateSelectedFilesDisplay();
    closeFileSelectionDialog();
}

function closeFileSelectionDialog() {
    const overlay = document.querySelector('.file-selection-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function updateSelectedFilesDisplay() {
    if (selectedAdditionalFiles.length === 0) {
        selectedFilesContainer.style.display = 'none';
        return;
    }
    
    selectedFilesContainer.style.display = 'flex';
    selectedFilesList.innerHTML = '';
    
    selectedAdditionalFiles.forEach(filePath => {
        const file = workspaceFiles.find(f => f.relativePath === filePath);
        if (!file) {
            return;
        }
        
        const fileTag = document.createElement('div');
        fileTag.className = 'file-tag-inline';
        fileTag.title = `${file.relativePath} (click to remove)`;
        fileTag.onclick = () => removeSelectedFile(filePath);
        
        fileTag.textContent = file.name;
        
        selectedFilesList.appendChild(fileTag);
    });
}

function removeSelectedFile(filePath) {
    selectedAdditionalFiles = selectedAdditionalFiles.filter(f => f !== filePath);
    updateSelectedFilesDisplay();
}

function toggleAutoIncludedFiles() {
    const content = document.getElementById('autoIncludedFilesContent');
    const chevron = document.getElementById('autoIncludedChevron');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        chevron.classList.add('expanded');
    } else {
        content.style.display = 'none';
        chevron.classList.remove('expanded');
    }
}

function updateAutoIncludedFilesLabel(count) {
    const label = document.getElementById('autoIncludedFilesLabel');
    label.textContent = `Automatically included files (${count})`;
}

function updateAutoIncludedFilesDisplay(files) {
    autoIncludedFiles = files || [];
    updateAutoIncludedFilesLabel(autoIncludedFiles.length);
    
    if (autoIncludedFiles.length === 0) {
        autoIncludedFilesList.innerHTML = '<div class="loading-auto-files">No additional files found from namespaces</div>';
        return;
    }
    
    autoIncludedFilesList.innerHTML = '';
    autoIncludedFiles.forEach(file => {
        const fileTag = document.createElement('div');
        fileTag.className = 'file-tag';
        fileTag.title = file.relativePath;
        fileTag.textContent = file.name;
        
        autoIncludedFilesList.appendChild(fileTag);
    });
}

// Make functions available globally for onclick handlers
window.closeFileSelectionDialog = closeFileSelectionDialog;
window.confirmFileSelection = confirmFileSelection;
window.removeSelectedFile = removeSelectedFile;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEventListeners);
