// Global variables and state management
const vscode = acquireVsCodeApi();

let repositoryInfo = null;
let branches = [];
let templates = [];
let currentBranch = null;
let branchSelector = null; // Will hold our branch selector instance
let tags = {
    reviewers: [],
    assignees: [],
    labels: [],
    workItems: []
};

let currentChanges = [];
let selectedFile = null;
let hasLoadedChanges = false; // Track if we've attempted to load changes

// Global loader state management
let globalLoaderState = {
    isVisible: false,
    isInitializing: true,
    branchesLoaded: false,
    repositoryInfoLoaded: false,
    currentBranchLoaded: false
};

// Helper function to show global overlay loader
function showGlobalLoader(title = 'Loading...', message = 'Please wait while we prepare the pull request interface') {
    if (globalLoaderState.isVisible) {
        // Update existing loader
        updateGlobalLoaderText(title, message);
        return;
    }

    let loader = document.getElementById('globalOverlaySpinner');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalOverlaySpinner';
        loader.className = 'overlay-spinner show';
        loader.innerHTML = `
            <div class="overlay-spinner-content">
                <div class="overlay-spinner-icon"></div>
                <div class="overlay-spinner-title" id="globalLoaderTitle">${title}</div>
                <div class="overlay-spinner-text" id="globalLoaderText">${message}</div>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.classList.add('show');
        updateGlobalLoaderText(title, message);
    }

    globalLoaderState.isVisible = true;
    // Disable scrolling
    document.body.style.overflow = 'hidden';
}

// Helper function to update global loader text
function updateGlobalLoaderText(title, message) {
    const titleElement = document.getElementById('globalLoaderTitle');
    const textElement = document.getElementById('globalLoaderText');
    
    if (titleElement) {
        titleElement.textContent = title;
    }
    if (textElement) {
        textElement.textContent = message;
    }
}

// Helper function to hide global overlay loader
function hideGlobalLoader() {
    if (!globalLoaderState.isVisible) {
        return;
    }

    const loader = document.getElementById('globalOverlaySpinner');
    if (loader) {
        loader.classList.remove('show');
        loader.classList.add('hidden');
        setTimeout(() => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 300);
    }

    globalLoaderState.isVisible = false;
    globalLoaderState.isInitializing = false;
    // Re-enable scrolling
    document.body.style.overflow = '';
}

// Helper function to check if we should hide the global loader
function checkGlobalLoaderState() {
    // Don't hide if still initializing
    if (globalLoaderState.isInitializing) {
        return;
    }

    // Check if basic data is loaded
    const basicDataLoaded = globalLoaderState.branchesLoaded && 
                           globalLoaderState.repositoryInfoLoaded && 
                           globalLoaderState.currentBranchLoaded;

    if (!basicDataLoaded) {
        return;
    }

    // Check if branches are selected and different
    const source = branchSelector ? branchSelector.getSelectedBranch('source') : '';
    const target = branchSelector ? branchSelector.getSelectedBranch('target') : '';
    
    if (!source || !target) {
        // Both branches not selected yet, hide loader
        hideGlobalLoader();
        return;
    }

    if (source === target) {
        // Same branches selected, hide loader
        hideGlobalLoader();
        return;
    }

    // Different branches selected, check if changes are loaded
    if (hasLoadedChanges) {
        // Changes have been loaded (or attempted), hide loader
        hideGlobalLoader();
    }
    // If changes haven't been loaded yet, keep loader visible
}

// Helper function to get saved view mode
function getSavedViewMode() {
    try {
        return localStorage.getItem('diffViewMode') || 'unified';
    } catch (error) {
        console.warn('Could not access localStorage:', error);
        return 'unified';
    }
}

// Helper function to update Files tab badge
function updateFilesTabBadge(state, count = 0) {
    const badge = document.getElementById('filesBadge');
    if (!badge) {
        return;
    }
    
    switch (state) {
        case 'ready':
            if (count > 0) {
                badge.style.display = 'inline-flex';
                badge.className = 'tab-badge ready';
                badge.textContent = count.toString();
            } else {
                badge.style.display = 'none';
            }
            break;
        case 'hidden':
        default:
            badge.style.display = 'none';
            break;
    }
}

// Helper function to check and update Create button state
function updateCreateButtonState() {
    const createButton = document.getElementById('createButton');
    if (!createButton) {
        return;
    }

    // Check if we have both branches selected
    const source = branchSelector ? branchSelector.getSelectedBranch('source') : '';
    const target = branchSelector ? branchSelector.getSelectedBranch('target') : '';
    
    // Check if we have a title
    const title = document.getElementById('title');
    const hasTitle = title && title.value.trim().length > 0;
    
    // Determine if Create button should be enabled
    let shouldEnable = true;
    let disabledReason = '';

    // Only disable if there are no changes between branches
    if (hasLoadedChanges && currentChanges.length === 0) {
        shouldEnable = false;
        disabledReason = 'No differences found between branches';
    }

    // Update button state
    createButton.disabled = !shouldEnable;
    createButton.title = disabledReason;
}

// Helper functions to show/hide no differences note
function showNoDifferencesNote() {
    hideNoDifferencesNote(); // Remove any existing note first
    
    const noteContainer = document.querySelector('.form-section');
    if (noteContainer) {
        const note = document.createElement('div');
        note.id = 'noDifferencesNote';
        note.className = 'no-differences-note';
        note.innerHTML = `
            <div class="note-content">
                <svg class="note-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM6.5 7.5a.5.5 0 0 1 .5-.5h.5v3a.5.5 0 0 1 0 1h-1a.5.5 0 0 1 0-1V8H7a.5.5 0 0 1-.5-.5Z"/>
                </svg>
                <span>No differences found between the selected branches. The branches appear to be identical.</span>
            </div>
        `;
        noteContainer.appendChild(note);
    }
}

function hideNoDifferencesNote() {
    const existingNote = document.getElementById('noDifferencesNote');
    if (existingNote) {
        existingNote.remove();
    }
}

// Branch Selector Class (adapted from demo)
class BranchSelector {
    constructor() {
        this.activeDropdown = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        
        
        // Handle dropdown button clicks
        document.querySelectorAll('.branch-button').forEach(button => {
            
            button.addEventListener('click', (e) => {
                
                e.stopPropagation();
                this.toggleDropdown(button.closest('.branch-dropdown'));
            });
        });

        // Handle filter input
        document.querySelectorAll('.filter-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.filterBranches(e.target);
            });
            
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });

        // Prevent dropdown from closing when clicking inside
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    toggleDropdown(dropdown) {
        
        const menu = dropdown.querySelector('.dropdown-menu');
        const button = dropdown.querySelector('.branch-button');
        const filterInput = dropdown.querySelector('.filter-input');

        

        if (this.activeDropdown && this.activeDropdown !== dropdown) {
            this.closeDropdown(this.activeDropdown);
        }

        if (menu.classList.contains('show')) {
            
            this.closeDropdown(dropdown);
        } else {
            
            this.openDropdown(dropdown);
            // Focus and clear the filter input
            setTimeout(() => {
                filterInput.focus();
                filterInput.value = '';
                this.filterBranches(filterInput);
            }, 0);
        }
    }

    openDropdown(dropdown) {
        const menu = dropdown.querySelector('.dropdown-menu');
        const button = dropdown.querySelector('.branch-button');
        
        menu.classList.add('show');
        button.classList.add('active');
        this.activeDropdown = dropdown;
        
        // Populate branches when opening
        this.populateBranches(dropdown);
    }

    closeDropdown(dropdown) {
        const menu = dropdown.querySelector('.dropdown-menu');
        const button = dropdown.querySelector('.branch-button');
        
        menu.classList.remove('show');
        button.classList.remove('active');
        
        if (this.activeDropdown === dropdown) {
            this.activeDropdown = null;
        }
    }

    closeAllDropdowns() {
        document.querySelectorAll('.branch-dropdown').forEach(dropdown => {
            this.closeDropdown(dropdown);
        });
    }

    populateBranches(dropdown) {
        const listContainer = dropdown.querySelector('.branch-list');
        listContainer.innerHTML = '';
        
        if (!branches || branches.length === 0) {
            listContainer.innerHTML = '<div class="form-help">No branches found</div>';
            return;
        }

        // Prioritize main branches (in order: master, main, develop)
        const mainBranches = ['master', 'main', 'develop'];
        const isMainBranch = (name) => mainBranches.includes(name);
        
        // Create a section for main branches
        const mainSection = document.createElement('div');
        mainSection.className = 'branch-section';
        
        // Create another section for other branches
        const otherSection = document.createElement('div');
        otherSection.className = 'branch-section';
        
        // Add section title for main branches
        const mainTitle = document.createElement('div');
        mainTitle.className = 'branch-section-title';
        mainTitle.textContent = 'Main Branches';
        mainSection.appendChild(mainTitle);
        
        // Add section title for other branches
        const otherTitle = document.createElement('div');
        otherTitle.className = 'branch-section-title';
        otherTitle.textContent = 'Feature Branches';
        otherSection.appendChild(otherTitle);
        
        let mainCount = 0;
        
        branches.forEach(branch => {
            const option = document.createElement('div');
            option.className = 'branch-option';
            option.dataset.branch = branch.name;
            option.innerHTML = `
                <svg class="branch-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.5 2.5 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                </svg>
                <span>${branch.name}</span>
            `;
            
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectBranch(option);
            });
            
            // Add to the appropriate section
            if (isMainBranch(branch.name)) {
                mainSection.appendChild(option);
                mainCount++;
            } else {
                otherSection.appendChild(option);
            }
        });
        
        // Add sections to the list container
        if (mainCount > 0) {
            listContainer.appendChild(mainSection);
        }
        
        listContainer.appendChild(otherSection);
    }

    selectBranch(option) {
        const dropdown = option.closest('.branch-dropdown');
        const branchName = option.dataset.branch;
        const button = dropdown.querySelector('.branch-button');
        const branchNameSpan = button.querySelector('.branch-name');
        
        // Update the button text
        if (branchNameSpan) {
            branchNameSpan.textContent = branchName;
        }
        
        // Store the value on the button for form submission
        button.setAttribute('data-value', branchName);
        
        // Update selected state in this dropdown
        dropdown.querySelectorAll('.branch-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
        
        // Close the dropdown
        this.closeDropdown(dropdown);
        
        // Trigger change event
        onBranchChange();
        
        // Update Create button state
        updateCreateButtonState();
    }

    filterBranches(input) {
        const dropdown = input.closest('.branch-dropdown');
        const filter = input.value.toLowerCase();
        const options = dropdown.querySelectorAll('.branch-option');
        
        options.forEach(option => {
            const branchName = option.dataset.branch.toLowerCase();
            if (branchName.includes(filter)) {
                option.classList.remove('hidden');
            } else {
                option.classList.add('hidden');
            }
        });
    }

    // Helper method to get selected branch value
    getSelectedBranch(side) {
        const button = document.getElementById(side + 'Branch');
        return button ? button.getAttribute('data-value') || '' : '';
    }

    // Helper method to set selected branch
    setSelectedBranch(side, branchName) {
        const button = document.getElementById(side + 'Branch');
        const nameSpan = button?.querySelector('.branch-name');
        
        if (button && nameSpan) {
            nameSpan.textContent = branchName;
            button.setAttribute('data-value', branchName);
        }
    }
}

// Updated functions to work with new branch selector

function populateBranches() {
    // Set current branch as source
    let sourceBranchSelected = false;
    if (currentBranch && branchSelector) {
        branchSelector.setSelectedBranch('source', currentBranch);
        sourceBranchSelected = true;
    }

    let targetBranchSelected = false;    

    // Find preferred target branch in priority order: master, main, develop
    if (branchSelector) {
        // Check for preferred branches in order of priority
        const preferredBranches = ['master', 'main', 'develop'];
        let targetBranch = '';
        
        // Find the first matching preferred branch
        if (branches && branches.length > 0) {
            for (const preferred of preferredBranches) {
                const found = branches.find(b => b.name === preferred);
                if (found) {
                    targetBranch = found.name;
                    targetBranchSelected = true;
                    break;
                }
            }
        }
        
        // If no preferred branch found, try the repository's default branch
        if (!targetBranch && repositoryInfo?.defaultBranch) {
            targetBranch = repositoryInfo.defaultBranch;
        }
        
        if (targetBranch) {
            branchSelector.setSelectedBranch('target', targetBranch);
        }
    }

    // Mark branches as loaded
    globalLoaderState.branchesLoaded = true;
    
    if(sourceBranchSelected && targetBranchSelected) {  
        onBranchChange();
    } else {
        // Check if we should hide loader (branches loaded but not both selected)
        hideGlobalLoader();
    }

}

// Updated branch change handler
function onBranchChange() {
    if (!branchSelector) {
        return;
    }
    
    const source = branchSelector.getSelectedBranch('source');
    const target = branchSelector.getSelectedBranch('target');
    
    if (source && target && source !== target) {
        // Auto-generate title from branch name
        const title = document.getElementById('title');
        if (!title.value && source) {
            title.value = `${source.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} to ${target.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        }
        
        // Update global loader for loading changes
        if (globalLoaderState.isVisible) {
            updateGlobalLoaderText('Loading Changes', 'Analyzing differences between branches...');
        }
        
        // Reset loading state and load changes
        hasLoadedChanges = false;
        currentChanges = []; // Reset to trigger reload
        updateCreateButtonState(); // Update button immediately to show loading state
        loadChangesPreview();
    } else {
        // Hide badge when branches are incomplete
        updateFilesTabBadge('hidden');
        hasLoadedChanges = false;
        currentChanges = [];
        updateCreateButtonState();
        checkGlobalLoaderState();
    }
}

// Tab switching functionality
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.querySelector('[data-tab="' + tabName + '"]');
    const selectedContent = document.getElementById(tabName + 'Tab');

    if (selectedTab && selectedContent) {
        selectedTab.classList.add('active');
        selectedContent.classList.add('active');
        
        // If switching to Files tab, only load changes if branches are selected but no changes loaded yet
        if (tabName === 'files') {
            const source = branchSelector ? branchSelector.getSelectedBranch('source') : null;
            const target = branchSelector ? branchSelector.getSelectedBranch('target') : null;
            
            // Only load if we have branches selected but no changes loaded yet
            if (source && target && source !== target && currentChanges.length === 0) {
                loadChangesPreview();
            }
            
            // Initialize diff container when switching to files tab
            const diffContainer = document.getElementById('diffContainer');
            if (diffContainer && !diffContainer.getAttribute('data-initialized')) {
                // Set the default view mode to unified
                toggleView('unified');
                diffContainer.setAttribute('data-initialized', 'true');
            }
            
            // Resize Monaco Editor when switching to files tab (may be needed if editor was created while tab was hidden)
            resizeMonacoEditor(5);
        }
    }
}


// Load changes for file preview
function loadChangesPreview() {
    if (!branchSelector) {
        return;
    }
    
    const source = branchSelector.getSelectedBranch('source');
    const target = branchSelector.getSelectedBranch('target');
    
    if (!source || !target) {
        const fileList = document.getElementById('fileList');
        const diffPreview = document.getElementById('diffPreview');
        fileList.innerHTML = '<div class="form-help">Please select both source and target branches</div>';
        diffPreview.innerHTML = '<div class="form-help">No file selected</div>';
        updateFilesTabBadge('hidden');
        checkGlobalLoaderState();
        return;
    }

    // Hide badge while loading (no loading indication needed)
    updateFilesTabBadge('hidden');
    
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = `
        <div class="loading">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading files...</div>
                <div class="loading-subtext">Analyzing changes between branches</div>
            </div>
        </div>
    `;
    
    const diffPreview = document.getElementById('diffPreview');
    diffPreview.innerHTML = '<div class="form-help">Loading changes...</div>';
    
    vscode.postMessage({
        command: 'loadChanges',
        sourceBranch: source,
        targetBranch: target
    });
}

// Display the file tree with changes
function displayFileChanges(changes) {
    currentChanges = changes;
    hasLoadedChanges = true;
    const fileList = document.getElementById('fileList');
    const diffPreview = document.getElementById('diffPreview');
    
    // Check if we should hide global loader now that changes are loaded
    checkGlobalLoaderState();
    
    if (!changes || changes.length === 0) {
        fileList.innerHTML = '<div class="form-help">No changes found between selected branches</div>';
        diffPreview.innerHTML = '<div class="form-help">No changes to preview</div>';
        updateFilesTabBadge('hidden');
        updateCreateButtonState();
        
        // Show a note about no differences
        showNoDifferencesNote();
        hideGlobalLoader();

        return;
    }

    // Update Files tab badge with file count
    updateFilesTabBadge('ready', changes.length);
    
    // Update Create button state
    updateCreateButtonState();
    
    // Hide no differences note if it was shown
    hideNoDifferencesNote();
    
    // Build a hierarchical tree structure
    const fileTree = buildFileTree(changes);
    
    
    let html = '<div class="file-tree">';
    html += renderFileTree(fileTree, '');
    html += '</div>';
    
    fileList.innerHTML = html;
    
    // Select first file by default
    if (changes.length > 0) {
        // Use setTimeout to ensure DOM is updated before selecting the file
        setTimeout(() => {
            selectFile(changes[0].path, changes[0].status);
        }, 50);
    } else {
        diffPreview.innerHTML = '<div class="form-help">No changes to preview</div>';
    }
    hideGlobalLoader();

}

// Build hierarchical file tree structure
function buildFileTree(changes) {
    const tree = { children: {}, files: [] };
    
    changes.forEach(change => {
        const parts = change.path.split('/');
        const fileName = parts.pop();
        
        let currentLevel = tree;
        
        // Navigate/create directory structure
        parts.forEach((part, index) => {
            if (!currentLevel.children) {
                currentLevel.children = {};
            }
            
            if (!currentLevel.children[part]) {
                currentLevel.children[part] = {
                    type: 'directory',
                    path: parts.slice(0, index + 1).join('/'),
                    children: {},
                    files: [],
                    expanded: true // Start expanded for better UX
                };
            }
            currentLevel = currentLevel.children[part];
        });
        
        // Add the file to the final level only
        currentLevel.files.push({ ...change, fileName });
    });
    
    return tree;
}

// Render the hierarchical file tree
function renderFileTree(tree, parentPath) {
    let html = '';
    
    // First render directories
    if (tree.children) {
        Object.keys(tree.children).sort().forEach(key => {
            const item = tree.children[key];
            if (item.type === 'directory') {
                const hasFiles = item.files && item.files.length > 0;
                const hasSubdirs = item.children && Object.keys(item.children).length > 0;
                const isEmpty = !hasFiles && !hasSubdirs;
                
                if (!isEmpty) {
                    const directoryId = 'dir-' + item.path.replace(/[^a-zA-Z0-9]/g, '-');
                    const expandedClass = item.expanded ? 'expanded' : '';
                    const chevronIcon = item.expanded ? 
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg>' : 
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg>';
                    
                    html += '<div class="file-directory-container ' + expandedClass + '">';
                    html += '<div class="file-directory-header" onclick="toggleDirectory(\'' + directoryId + '\', \'' + item.path + '\')">';
                    html += '<span class="directory-chevron">' + chevronIcon + '</span>';
                                                            html += `<span class="directory-icon">`
                                                                + `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/>`
                                                                + `<path stroke="white" stroke-width="1" d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />`
                                                                + `</svg>`
                                                                + `</span>`;
                    html += '<span class="directory-name">' + key + '</span>';
                    html += '</div>';
                    
                    html += '<div class="file-directory-contents" id="' + directoryId + '"' + (item.expanded ? '' : ' style="display: none;"') + '>';
                    
                    // Render subdirectories
                    html += renderFileTree(item, item.path);
                    
                    // Render files in this directory
                    if (hasFiles) {
                        item.files.forEach(change => {
                            html += '<div class="file-item ' + change.status + '" onclick="selectFile(\'' + change.path + '\', \'' + change.status + '\')">';
                            html += '<span class="file-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-file"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg></span>';
                            html += '<span class="file-name">' + change.fileName + '</span>';
                            html += '</div>';
                        });
                    }
                    
                    html += '</div>';
                    html += '</div>';
                }
            }
        });
    }
    
    // Render root files (files not in any directory) only at the root level
    if ((!parentPath || parentPath === '') && tree.files && tree.files.length > 0) {
        tree.files.forEach(change => {
            html += '<div class="file-item ' + change.status + '" onclick="selectFile(\'' + change.path + '\', \'' + change.status + '\')">';
            html += '<span class="file-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-file"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg></span>';
            html += '<span class="file-name">' + change.fileName + '</span>';
            html += '</div>';
        });
    }
    
    return html;
}

// Toggle directory expand/collapse
function toggleDirectory(directoryId, directoryPath) {
    const directoryContents = document.getElementById(directoryId);
    const directoryContainer = directoryContents.parentElement;
    const chevron = directoryContainer.querySelector('.directory-chevron');
    
    if (directoryContents.style.display === 'none') {
        directoryContents.style.display = 'block';
        directoryContainer.classList.add('expanded');
        chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg>';
    } else {
        directoryContents.style.display = 'none';
        directoryContainer.classList.remove('expanded');
        chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg>';
    }
}

// Select and preview a specific file
function selectFile(filePath, status) {
    selectedFile = filePath;
    
    // Update visual selection
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector('[onclick*="' + filePath + '"]');
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Show loading in diff preview
    const diffPreview = document.getElementById('diffPreview');
    diffPreview.innerHTML = `
        <div class="loading">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading diff...</div>
                <div class="loading-subtext">Preparing file comparison</div>
            </div>
        </div>
    `;
    
    // Request file diff from extension
    vscode.postMessage({
        command: 'getFileDiff',
        filePath: filePath,
        status: status,
        sourceBranch: branchSelector ? branchSelector.getSelectedBranch('source') : '',
        targetBranch: branchSelector ? branchSelector.getSelectedBranch('target') : ''
    });
}

// Display file diff content with side-by-side view
// Monaco Editor integration
let monacoEditor = null;
let monacoDiffEditor = null;
let isMonacoAvailable = false;

// Helper function to resize Monaco Editor
function resizeMonacoEditor(delay = 100) {
    if (isMonacoAvailable && monacoDiffEditor) {
        setTimeout(() => {
            try {
                monacoDiffEditor.layout();
                
            } catch (error) {
                console.warn('Error resizing Monaco editor:', error);
            }
        }, delay);
    }
}

// Initialize Monaco Editor
function initializeMonacoEditor() {
    return new Promise((resolve) => {
        if (typeof require !== 'undefined' && require.config) {
            // Monaco is available
            require.config({ 
                paths: { 
                    vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' 
                }
            });
            
            require(['vs/editor/editor.main'], function () {
                isMonacoAvailable = true;
                document.body.classList.add('monaco-active');
                resolve(true);
            }, function(error) {
                console.error('Failed to load Monaco Editor:', error);
                isMonacoAvailable = false;
                document.body.classList.add('monaco-fallback');
                resolve(false);
            });
        } else {
            // Monaco loader not available, fall back
            
            isMonacoAvailable = false;
            document.body.classList.add('monaco-fallback');
            resolve(false);
        }
    });
}

// Enhanced custom diff display
function displayFileDiff(diff) {
    
    const diffPreview = document.getElementById('diffPreview');
    
    if (!diff) {
        diffPreview.innerHTML = '<div class="form-help">Unable to load file diff</div>';
        return;
    }

    // Find the currently selected file
    const currentFileElement = document.querySelector('.file-item.selected');
    if (!currentFileElement) {
        diffPreview.innerHTML = '<div class="form-help">No file selected</div>';
        return;
    }

    const filePath = selectedFile;
    const statusElement = currentFileElement.querySelector('.file-status');
    const status = statusElement?.textContent === '+' ? 'added' : 
                 statusElement?.textContent === '-' ? 'deleted' : 'modified';

    // Update current file path in the header
    const currentFilePathEl = document.getElementById('currentFilePath');
    if (currentFilePathEl) {
        currentFilePathEl.textContent = filePath;
    }
    
    // Create HTML for the diff header
    let html = '';
    
    if (diff) {
        // Process the diff content for side-by-side view
        let parsedDiff = parseDiffOutput(diff);
        
        if (document.getElementById('diffContainer')) {
            displayParsedDiff(parsedDiff);
            return;
        }
        
        // Create diffContainer if it doesn't exist
        
        html += `
            <div class="diff-view-controls">
                <div class="view-controls">
                    <button id="collapseSidebarBtn" class="collapse-sidebar-btn" title="Collapse sidebar" onclick="toggleFilesSidebar()">
                        <span id="chevronIcon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevrons-right"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7l5 5l-5 5" /><path d="M13 7l5 5l-5 5" /></svg>
                        </span>
                    </button>
                    <div class="view-toggle-dropdown">
                        <button class="view-toggle-button" onclick="toggleViewDropdown()">
                            <span class="view-toggle-text">Unified</span>
                            <svg class="view-toggle-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </button>
                        <div class="view-toggle-menu" id="viewToggleMenu">
                            <div class="view-toggle-option active" onclick="selectViewMode('unified')">Unified</div>
                            <div class="view-toggle-option" onclick="selectViewMode('side-by-side')">Side by Side</div>
                        </div>
                    </div>
                </div>
                <h4><span id="currentFilePath">${filePath}</span></h4>

            </div>
            <!-- Monaco Editor Container -->
            <div id="monacoEditor" class="monaco-editor-container" style="display: none;"></div>
            
            <!-- Custom Diff View Container -->
            <div id="customDiffView" class="custom-diff-view">
                <div id="diffContainer" class="diff-container" data-view-mode="unified">
                    <div class="diff-content-wrapper">
                        <div id="leftSide" class="diff-side diff-side-left"></div>
                        <div id="rightSide" class="diff-side diff-side-right"></div>
                    </div>
                </div>
            </div>
        `;
        
        diffPreview.innerHTML = html;
        
        // Now that we've created the container, process the diff
        parsedDiff = parseDiffOutput(diff);
        displayParsedDiff(parsedDiff);
        return;
    } else {
        html += '<div class="form-help">Binary file or no changes to display</div>';
    }
    
    diffPreview.innerHTML = html;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function toggleFilesSidebar() {
    const sidebar = document.getElementById('filesSidebar');
    const chevron = document.getElementById('chevronIcon');
    if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        chevron.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='icon icon-tabler icons-tabler-outline icon-tabler-chevrons-left'><path stroke='none' d='M0 0h24v24H0z' fill='none'/><path d='M11 7l-5 5l5 5' /><path d='M17 7l-5 5l5 5' /></svg>`;
    } else {
        sidebar.classList.remove('collapsed');
        chevron.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='icon icon-tabler icons-tabler-outline icon-tabler-chevrons-right'><path stroke='none' d='M0 0h24v24H0z' fill='none'/><path d='M7 7l5 5l-5 5' /><path d='M13 7l5 5l-5 5' /></svg>`;
    }
    
    // Resize Monaco Editor after sidebar toggle
    resizeMonacoEditor(5); // 300ms delay for CSS transitions
}
// Parse unified diff output to left/right format for side-by-side view
function parseDiffOutput(diff) {
    // Skip the git diff header by removing lines before the first hunk
    const headerEndIndex = diff.indexOf('@@');
    if (headerEndIndex > 0) {
        diff = diff.substring(headerEndIndex);
    }
    
    const lines = diff.split('\n');
    let leftLines = [];
    let rightLines = [];
    
    let leftLineNum = 1;
    let rightLineNum = 1;
    let inHunk = false;
    
    for (const line of lines) {
        if (line.startsWith('@@')) {
            // Parse the hunk header to get line numbers
            // Format: @@ -l,s +l,s @@ optional section heading
            const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) {
                leftLineNum = parseInt(match[1], 10);
                rightLineNum = parseInt(match[2], 10);
                inHunk = true;
                
                // Add the hunk header to both sides
                leftLines.push({ line: '', content: line, type: 'hunk' });
                rightLines.push({ line: '', content: line, type: 'hunk' });
            }
            continue;
        }
        
        if (!inHunk) {
            continue;
        }
        
        if (line.startsWith('-')) {
            // Line removed
            leftLines.push({ line: leftLineNum++, content: line.substring(1), type: 'removed' });
            // No line on right side
        } else if (line.startsWith('+')) {
            // Line added
            rightLines.push({ line: rightLineNum++, content: line.substring(1), type: 'added' });
            // No line on left side
        } else if (line.startsWith(' ')) {
            // Context line - appears on both sides
            leftLines.push({ line: leftLineNum++, content: line.substring(1), type: 'context' });
            rightLines.push({ line: rightLineNum++, content: line.substring(1), type: 'context' });
        } else {
            // Other content, could be a file header or something else
            // Add as context to both sides
            leftLines.push({ line: '', content: line, type: 'context' });
            rightLines.push({ line: '', content: line, type: 'context' });
        }
    }
    
    // Align the line counts (add empty lines where needed)
    const maxLines = Math.max(leftLines.length, rightLines.length);
    for (let i = 0; i < maxLines; i++) {
        if (!leftLines[i] && rightLines[i]) {
            leftLines[i] = { line: '', content: '', type: 'context' };
        }
        if (!rightLines[i] && leftLines[i]) {
            rightLines[i] = { line: '', content: '', type: 'context' };
        }
    }
    
    return { left: leftLines, right: rightLines };
}

// Enhanced diff display with better syntax highlighting
function displayParsedDiff(parsedDiff) {
    // Ensure view mode is set correctly
    const diffContainer = document.getElementById('diffContainer');
    if (diffContainer) {
        const currentViewMode = getSavedViewMode();
        diffContainer.setAttribute('data-view-mode', currentViewMode);
        
        // Update dropdown display
        const textElement = document.querySelector('.view-toggle-text');
        if (textElement) {
            textElement.textContent = currentViewMode === 'unified' ? 'Unified' : 'Side by Side';
        }
        
        // Update dropdown options
        const options = document.querySelectorAll('.view-toggle-option');
        options.forEach(option => {
            option.classList.remove('active');
            if ((currentViewMode === 'unified' && option.textContent === 'Unified') ||
                (currentViewMode === 'side-by-side' && option.textContent === 'Side by Side')) {
                option.classList.add('active');
            }
        });
    }

    if (isMonacoAvailable && window.monaco) {
        // Use Monaco Editor for diff display
        displayMonacoDiff(parsedDiff);
    } else {
        // Ensure custom diff view is visible
        const monacoContainer = document.getElementById('monacoEditor');
        const customDiffView = document.getElementById('customDiffView');
        
        if (monacoContainer) {
            monacoContainer.style.display = 'none';
        }
        if (customDiffView) {
            customDiffView.style.display = 'block';
        }
        
        // Use enhanced custom diff display
        displayCustomDiff(parsedDiff);
    }
}

// Monaco Editor diff display
function getMonacoTheme() {
    const body = document.body;
    if (body.classList.contains('vscode-light')) {
        return 'vs';
    } else if (body.classList.contains('vscode-high-contrast')) {
        return 'hc-black';
    } else {
        return 'vs-code-dark';
    }
}

function displayMonacoDiff(parsedDiff) {
    
    
    
    
    const container = document.getElementById('monacoEditor');
    const customDiffView = document.getElementById('customDiffView');
    
    
    
    
    if (!container) {
        console.error('Monaco editor container not found! Available elements:', 
                     Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        // Show custom diff view as fallback
        if (customDiffView) {
            customDiffView.style.display = 'block';
        }
        displayCustomDiff(parsedDiff);
        return;
    }
    
    if (!isMonacoAvailable || !window.monaco) {
        
        container.style.display = 'none';
        if (customDiffView) {
            customDiffView.style.display = 'block';
        }
        displayCustomDiff(parsedDiff);
        return;
    }

    // Show Monaco container, hide custom diff view
    container.style.display = 'block';
    if (customDiffView) {
        customDiffView.style.display = 'none';
    }

    // Clear any existing editor
    if (monacoDiffEditor) {
        monacoDiffEditor.dispose();
        monacoDiffEditor = null;
    }

    // Get file extension for language detection
    const currentFile = selectedFile || '';
    const extension = currentFile.split('.').pop().toLowerCase();
    let language = 'plaintext';
    
    switch (extension) {
        case 'cs': language = 'csharp'; break;
        case 'js': language = 'javascript'; break;
        case 'ts': language = 'typescript'; break;
        case 'json': language = 'json'; break;
        case 'xml': case 'csproj': language = 'xml'; break;
        case 'html': language = 'html'; break;
        case 'css': language = 'css'; break;
        case 'sql': language = 'sql'; break;
        default: language = 'plaintext';
    }

    // Create original and modified content by reconstructing the full files
    // This approach builds the complete file content without diff markers
    const originalLines = [];
    const modifiedLines = [];
    
    // Process left side (original file)
    for (const line of parsedDiff.left) {
        if (line.type === 'context' || line.type === 'removed') {
            originalLines.push(line.content);
        }
        // Skip 'added' and 'hunk' lines for original
    }
    
    // Process right side (modified file)  
    for (const line of parsedDiff.right) {
        if (line.type === 'context' || line.type === 'added') {
            modifiedLines.push(line.content);
        }
        // Skip 'removed' and 'hunk' lines for modified
    }
    
    const originalContent = originalLines.join('\n');
    const modifiedContent = modifiedLines.join('\n');
    
    
    

    // Get current view mode
    const diffContainer = document.getElementById('diffContainer');
    const viewMode = diffContainer ? diffContainer.getAttribute('data-view-mode') : 'unified';
    const isInline = viewMode === 'unified';

    try {
        // Configure Monaco for VS Code dark theme
        monaco.editor.defineTheme('vs-code-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#cccccc',
                'editorLineNumber.foreground': '#858585',
                'editor.lineHighlightBackground': '#2d2d30',
                'editor.selectionBackground': '#264f78',
                'editor.focusedStackFrameHighlightBackground': '#7abd7a',
                'editor.stackFrameHighlightBackground': '#ffff00'
            }
        });

        // Create Monaco diff editor
        monacoDiffEditor = window.monaco.editor.createDiffEditor(container, {
            theme: getMonacoTheme(), // Use dynamic theme
            language: language,
            readOnly: true,
            enableSplitViewResizing: true,
            renderSideBySide: !isInline,
            ignoreTrimWhitespace: false,
            renderWhitespace: 'boundary',
            diffCodeLens: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
            }
        });

        // Set the model
        monacoDiffEditor.setModel({
            original: window.monaco.editor.createModel(originalContent.trim(), language),
            modified: window.monaco.editor.createModel(modifiedContent.trim(), language)
        });

        // Listen for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const newTheme = getMonacoTheme();
                    monaco.editor.setTheme(newTheme);
                }
            });
        });
        observer.observe(document.body, { attributes: true });

        // Fit the layout
        setTimeout(() => {
            monacoDiffEditor.layout();
        }, 100);

        
    } catch (error) {
        console.error('Error creating Monaco diff editor:', error);
        // Fallback to custom diff view
        container.style.display = 'none';
        if (customDiffView) {
            customDiffView.style.display = 'block';
        }
        displayCustomDiff(parsedDiff);
    }
}

// Enhanced custom diff display with better styling and syntax highlighting
function displayCustomDiff(parsedDiff) {
    const leftSide = document.getElementById('leftSide');
    const rightSide = document.getElementById('rightSide');
    
    if (!leftSide || !rightSide) {
        console.error('Diff sides not found');
        return;
    }
    
    leftSide.innerHTML = '';
    rightSide.innerHTML = '';
    
    
    
    // Create line by line content for left side (original)
    parsedDiff.left.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = `code-line line-${line.type}`;
        
        // Enhanced syntax highlighting
        const highlightedContent = enhancedSyntaxHighlight(line.content);
        
        lineDiv.innerHTML = `
            <div class="line-number">${line.line}</div>
            <div class="line-content">${highlightedContent}</div>
        `;
        leftSide.appendChild(lineDiv);
    });
    
    // Create line by line content for right side (modified)
    parsedDiff.right.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = `code-line line-${line.type}`;
        
        // Enhanced syntax highlighting
        const highlightedContent = enhancedSyntaxHighlight(line.content);
        
        lineDiv.innerHTML = `
            <div class="line-number">${line.line}</div>
            <div class="line-content">${highlightedContent}</div>
        `;
        rightSide.appendChild(lineDiv);
    });
    
    // View mode is now handled by CSS based on data-view-mode attribute
}

// Enhanced syntax highlighting function
function enhancedSyntaxHighlight(content) {
    if (!content) {
        return '';
    }
    
    // Escape HTML first
    let highlighted = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Enhanced C# syntax highlighting with more comprehensive patterns
    highlighted = highlighted
        // Keywords
        .replace(/\b(public|private|protected|internal|static|readonly|const|virtual|override|abstract|sealed|partial|async|await|ref|out|in|params)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(class|interface|struct|enum|record|namespace|using|var|void|bool|int|string|double|float|long|decimal|char|byte|sbyte|short|ushort|uint|ulong|object|dynamic)\b/g, '<span class="type">$1</span>')
        .replace(/\b(if|else|switch|case|default|for|foreach|while|do|break|continue|return|throw|try|catch|finally|lock|yield|goto)\b/g, '<span class="control">$1</span>')
        .replace(/\b(new|this|base|typeof|sizeof|is|as|null|true|false)\b/g, '<span class="literal">$1</span>')
        
        // Framework specific
        .replace(/\b(ApplicationDbContext|HttpGet|HttpPost|HttpPut|HttpDelete|ApiController|IActionResult|Controller|Entity|DbContext|DbSet|IEnumerable|IList|ICollection|Task|Action|Func)\b/g, '<span class="framework">$1</span>')
        
        // Attributes
        .replace(/\[([^\]]+)\]/g, '<span class="attribute">[$1]</span>')
        
        // Strings (handle escaped quotes)
        .replace(/"(?:[^"\\]|\\.)*"/g, '<span class="string">$&</span>')
        .replace(/'(?:[^'\\]|\\.)*'/g, '<span class="string">$&</span>')
        
        // Comments
        .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
        
        // Numbers
        .replace(/\b(\d+\.?\d*[fFdDmM]?)\b/g, '<span class="number">$1</span>')
        
        // Operators
        .replace(/([+\-*/%=!<>&|^~?:]+)/g, '<span class="operator">$1</span>')
        
        // Namespaces and method calls
        .replace(/\b([A-Z][a-zA-Z0-9]*\.)+[A-Z][a-zA-Z0-9]*/g, '<span class="namespace">$&</span>')
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="method">$1</span>(');
    
    return highlighted;
}

// View toggle dropdown functionality
function toggleViewDropdown() {
    const menu = document.getElementById('viewToggleMenu');
    const button = document.querySelector('.view-toggle-button');
    const chevron = document.querySelector('.view-toggle-chevron');
    
    if (menu && button && chevron) {
        const isOpen = menu.classList.contains('show');
        if (isOpen) {
            menu.classList.remove('show');
            button.classList.remove('active');
            chevron.style.transform = 'rotate(0deg)';
        } else {
            menu.classList.add('show');
            button.classList.add('active');
            chevron.style.transform = 'rotate(180deg)';
        }
    }
}

function selectViewMode(viewType) {
    const textElement = document.querySelector('.view-toggle-text');
    const options = document.querySelectorAll('.view-toggle-option');
    
    // Update button text
    if (textElement) {
        textElement.textContent = viewType === 'unified' ? 'Unified' : 'Side by Side';
    }
    
    // Update active state in dropdown
    options.forEach(option => {
        option.classList.remove('active');
        if ((viewType === 'unified' && option.textContent === 'Unified') ||
            (viewType === 'side-by-side' && option.textContent === 'Side by Side')) {
            option.classList.add('active');
        }
    });
    
    // Close dropdown
    toggleViewDropdown();
    
    // Apply the view change
    toggleView(viewType);
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const dropdown = document.querySelector('.view-toggle-dropdown');
    const menu = document.getElementById('viewToggleMenu');
    
    if (dropdown && menu && !dropdown.contains(event.target)) {
        if (menu.classList.contains('show')) {
            toggleViewDropdown();
        }
    }
});

// Toggle between side-by-side and unified diff views
function toggleView(viewType) {
    
    const diffContainer = document.getElementById('diffContainer');
    const leftSide = document.getElementById('leftSide');
    const viewButtons = document.querySelectorAll('.view-toggle');
    
    if (!diffContainer) {
        console.error('diffContainer not found');
        return;
    }

    // Save view mode preference to localStorage
    try {
        localStorage.setItem('diffViewMode', viewType);
    } catch (error) {
        console.warn('Could not save view mode preference:', error);
    }
    
    // Update button states (legacy support for old buttons)
    viewButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(viewType)) {
            btn.classList.add('active');
        }
    });
    
    // Update dropdown button text and state
    const textElement = document.querySelector('.view-toggle-text');
    const options = document.querySelectorAll('.view-toggle-option');
    
    if (textElement) {
        textElement.textContent = viewType === 'unified' ? 'Unified' : 'Side by Side';
    }
    
    if (options.length > 0) {
        options.forEach(option => {
            option.classList.remove('active');
            if ((viewType === 'unified' && option.textContent === 'Unified') ||
                (viewType === 'side-by-side' && option.textContent === 'Side by Side')) {
                option.classList.add('active');
            }
        });
    }
    
    // Update container
    diffContainer.setAttribute('data-view-mode', viewType);
    
    // Update Monaco Editor view mode if available
    if (isMonacoAvailable && monacoDiffEditor) {
        const isInline = viewType === 'unified';
        monacoDiffEditor.updateOptions({
            renderSideBySide: !isInline
        });
        
        // Re-layout after view change
        setTimeout(() => {
            monacoDiffEditor.layout();
        }, 100);
    }
    
    // For custom diff view, CSS handles the display logic
}

// Message handling
window.addEventListener('message', event => {
    const message = event.data;
    debugger

    switch (message.command) {
        case 'dataLoaded':
            currentBranch = message.data.currentBranch;
            repositoryInfo = message.data.repositoryInfo;
            globalLoaderState.repositoryInfoLoaded = true;
            globalLoaderState.currentBranchLoaded = true;
            checkGlobalLoaderState();
            loadBranches();
            break;
        case 'branchesLoaded':
            branches = message.data.branches;
            populateBranches();
            
            // Refresh dropdown content if they're already open
            document.querySelectorAll('.branch-dropdown').forEach(dropdown => {
                if (dropdown.querySelector('.dropdown-menu.show') && branchSelector) {
                    branchSelector.populateBranches(dropdown);
                }
            });
            break;
        case 'templateLoaded':
            populateTemplate(message.data.template);
            break;
        case 'changesLoaded':
            displayChanges(message.data.changes);
            break;
        case 'pullRequestCreated':
            onPullRequestCreated(message.data.pullRequest);
            break;
        case 'error':
            showError(message.data.message);
            // Hide global loader on error
            hideGlobalLoader();
            break;
        case 'fileChangesLoaded':
            displayFileChanges(message.data.changes);
            break;
        case 'fileDiffLoaded':
            displayFileDiff(message.data.diff);
            break;
    }
});

// Branch management
function loadBranches() {
    vscode.postMessage({ command: 'loadBranches' });
}

// Template management
function loadTemplate() {
    const templateName = document.getElementById('template').value;
    if (templateName) {
        vscode.postMessage({
            command: 'loadTemplate',
            templateName: templateName
        });
    }
}

function populateTemplate(template) {
    if (template) {
        const description = document.getElementById('description');
        description.value = template.content;
    }
}

// Tag input handling
function handleTagInput(event, type) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const input = event.target;
        const value = input.value.trim();
        
        if (value && !tags[type].includes(value)) {
            tags[type].push(value);
            input.value = '';
            renderTags(type);
        }
    }
}

function renderTags(type) {
    const container = document.getElementById(type + 'Input');
    const input = container.querySelector('.tag-input');
    
    // Remove existing tags
    container.querySelectorAll('.tag').forEach(tag => tag.remove());
    
    // Add tags before input
    tags[type].forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            ${tag}
            <span class="tag-remove" onclick="removeTag('${type}', '${tag}')">×</span>
        `;
        container.insertBefore(tagElement, input);
    });
}

function removeTag(type, tag) {
    tags[type] = tags[type].filter(t => t !== tag);
    renderTags(type);
}

// Preview changes (legacy function for Overview tab)
function previewChanges() {
    if (!branchSelector) {
        showError('Branch selector not initialized');
        return;
    }
    
    const source = branchSelector.getSelectedBranch('source');
    const target = branchSelector.getSelectedBranch('target');
    
    if (!source || !target) {
        showError('Please select both source and target branches');
        return;
    }
    
    const preview = document.getElementById('changesPreview');
    if (preview) {
        preview.innerHTML = `
            <div class="loading">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading changes...</div>
                    <div class="loading-subtext">Generating pull request preview</div>
                </div>
            </div>
        `;
    }
    
    vscode.postMessage({
        command: 'previewChanges',
        sourceBranch: source,
        targetBranch: target
    });
}

function displayChanges(changes) {
    const preview = document.getElementById('changesPreview');
    if (!preview) { return; }
    
    if (!changes || changes.length === 0) {
        preview.innerHTML = '<div class="form-help">No changes found between selected branches</div>';
        return;
    }
    
    preview.innerHTML = '<div class="changes-preview">' +
        changes.map(change => `
            <div class="change-item change-${change.status}">
                ${change.status === 'added' ? '+' : change.status === 'deleted' ? '-' : 'M'} ${change.path}
            </div>
        `).join('') +
        '</div>';

    hideGlobalLoader();
}

// Pull request creation
function createPullRequest(event) {
    event.preventDefault();
    
    if (!branchSelector) {
        showError('Branch selector not initialized');
        return;
    }
    
    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        sourceBranch: branchSelector.getSelectedBranch('source'),
        targetBranch: branchSelector.getSelectedBranch('target'),
        reviewers: tags.reviewers,
        assignees: tags.assignees,
        labels: tags.labels,
        workItems: tags.workItems
    };
    
    // Validate required fields
    if (!formData.title || !formData.sourceBranch || !formData.targetBranch) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (formData.sourceBranch === formData.targetBranch) {
        showError('Source and target branches must be different');
        return;
    }
    
    // Show full screen loader immediately when create button is clicked
    showGlobalLoader('Creating Pull Request', 'Please wait while we create your pull request...');
    
    // Disable form
    const createButton = document.getElementById('createButton');
    createButton.disabled = true;
    createButton.textContent = 'Creating...';
    
    vscode.postMessage({
        command: 'createPullRequest',
        data: formData
    });
}

function onPullRequestCreated(pullRequest) {
    // Hide the global loader when pull request is successfully created
    hideGlobalLoader();
    
    // Send message to close the webview and open the PR view
    vscode.postMessage({
        command: 'pullRequestCreatedSuccess',
        data: { pullRequest }
    });
}

// Error handling
function showError(message) {
    // Find a good place to show the error
    let errorContainer = document.querySelector('.error');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'error';
        document.querySelector('.container').appendChild(errorContainer);
    }
    
    errorContainer.textContent = message;
    
    // Remove error after 5 seconds
    setTimeout(() => {
        if (errorContainer.parentNode) {
            errorContainer.parentNode.removeChild(errorContainer);
        }
    }, 5000);
}

// Initialize application
function init() {
    
    
    // Show global loader immediately
    showGlobalLoader('Initializing', 'Setting up pull request creation interface...');
    
    // Initialize Monaco Editor
    initializeMonacoEditor().then((success) => {
        if (success) {
            
        } else {
            
        }
    });
    
    // Initialize Files tab badge (hidden by default)
    updateFilesTabBadge('hidden');
    
    // Initialize branch selector
    branchSelector = new BranchSelector();
    
    
    // Set up title input event listener to update Create button state
    const titleInput = document.getElementById('title');
    if (titleInput) {
        titleInput.addEventListener('input', updateCreateButtonState);
    }
    
    // Initialize Create button state
    updateCreateButtonState();
    
    // Set up tab event listeners
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Initialize diff viewer with saved view mode
    const diffContainer = document.getElementById('diffContainer');
    if (diffContainer) {
        const savedViewMode = getSavedViewMode();
        toggleView(savedViewMode);
        diffContainer.setAttribute('data-initialized', 'true');
    }
    
    // Set up view toggle event listeners - not needed as they use onclick in HTML
    // We'll keep them here as a fallback
    document.querySelectorAll('.view-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            
            const viewMode = button.textContent.toLowerCase().includes('unified') ? 'unified' : 'side-by-side';
            toggleView(viewMode);
        });
    });
    
    // Add window resize listener for Monaco Editor
    window.addEventListener('resize', () => {
        resizeMonacoEditor(100);
    });
    
    // Update loader text and load initial data
    updateGlobalLoaderText('Loading Data', 'Fetching repository information and branches...');
    vscode.postMessage({ command: 'loadData' });
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle window resize for Monaco Editor
window.addEventListener('resize', () => {
    if (isMonacoAvailable && monacoDiffEditor) {
        setTimeout(() => {
            monacoDiffEditor.layout();
        }, 100);
    }
});

// Test function to debug from console
window.testBranchSelector = function() {
    
    
    
    
    
    // Try to manually trigger dropdown
    const firstDropdown = document.querySelector('.branch-dropdown');
    if (firstDropdown && branchSelector) {
        
        branchSelector.toggleDropdown(firstDropdown);
    }
};
