// VS Code API access
const vscode = acquireVsCodeApi();

// Global variables
let currentPullRequest = null;
let currentPullRequestId = null;
let currentProvider = null; // 'azuredevops' or 'github'
let monacoEditor = null;
let monacoDiffEditor = null;
let currentFile = null;
let monacoEditorReady = false;
let isMonacoAvailable = false;
let pendingDiffData = null;
let allFileDiffs = {}; // Store all preloaded file diffs
let allThreads = []; // Store all pull request threads
let fileCommentWidgets = []; // Store Monaco comment widgets
let commentDecorations = []; // Store comment line decorations
let commentVisibilityState = {}; // Store visibility state for each comment thread

// UI state management
let uiState = {
    selectedFile: null,
    scrollPosition: { line: 0, column: 0 },
    scrollPositions: {}, // Store positions for multiple files
    viewMode: 'unified', // 'unified' or 'side-by-side'
    filesLoaded: false,
    diffsLoaded: false
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeWebview();
});

// Initialize the webview
function initializeWebview() {
    
    
    // Listen for messages from the extension
    window.addEventListener('message', handleMessage);
    
    // Initialize Monaco Editor
    initializeMonacoEditor();
    
    // Auto-resize textarea functionality and show/hide comment button
    const textarea = document.querySelector('.comment-input');
    if (textarea) {
        const commentSubmitBtn = document.getElementById('commentSubmitBtn');
        
        textarea.addEventListener('input', function() {
            // Auto-resize
            this.style.height = 'auto';
            this.style.height = Math.max(80, this.scrollHeight) + 'px';
            
            // Show/hide comment button based on content
            if (commentSubmitBtn) {
                const hasContent = this.value.trim().length > 0;
                commentSubmitBtn.style.display = hasContent ? 'inline-flex' : 'none';
                
                // Also show/hide Close with comment button for GitHub
                const closeWithCommentBtn = document.getElementById('closeWithCommentBtn');
                if (closeWithCommentBtn && currentProvider === 'github') {
                    closeWithCommentBtn.style.display = hasContent ? 'inline-flex' : 'none';
                }
            }
        });
        
        // Also handle paste events
        textarea.addEventListener('paste', function() {
            setTimeout(() => {
                this.style.height = 'auto';
                this.style.height = Math.max(80, this.scrollHeight) + 'px';
                
                if (commentSubmitBtn) {
                    const hasContent = this.value.trim().length > 0;
                    commentSubmitBtn.style.display = hasContent ? 'inline-flex' : 'none';
                    
                    // Also show/hide Close with comment button for GitHub
                    const closeWithCommentBtn = document.getElementById('closeWithCommentBtn');
                    if (closeWithCommentBtn && currentProvider === 'github') {
                        closeWithCommentBtn.style.display = hasContent ? 'inline-flex' : 'none';
                    }
                }
            }, 0);
        });
        
        // Handle key events for submit on Ctrl+Enter
        textarea.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (this.value.trim().length > 0) {
                    addComment();
                }
            }
        });
    }
}

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

// Handle messages from the extension
function handleMessage(event) {
    const message = event.data;
    
    
    if (!message || !message.command) {
        console.warn('Received message without command:', message);
        return;
    }
    
    
    
    switch (message.command) {
        case 'loadPullRequest':
            loadPullRequestData(message.data);
            break;
        case 'pullRequestDetailsLoaded':
            displayPullRequestDetails(message.data);
            break;
        case 'pullRequestChangesLoaded':
            displayPullRequestChanges(message.data);
            break;
        case 'fileChangesLoaded':
            displayPullRequestChanges(message.data);  // Use the enhanced function that handles fileDiffs
            break;
        case 'fileDiffLoaded':
            
            displayFileDiff(message.data);
            break;
        case 'azureDevOpsChecksLoaded':
            
            displayAzureDevOpsChecks(message.data);
            break;
        case 'gitHubChecksLoaded':
            
            displayGitHubChecks(message.data);
            break;
        case 'githubReviews':
            
            handleGitHubReviews(message.data);
            break;
        case 'pullRequestMerged':
            handlePullRequestMerged(message.data);
            break;
        case 'pullRequestMergeFailed':
            handlePullRequestMergeFailed(message.data);
            break;
        case 'pullRequestClosed':
            handlePullRequestClosed(message.data);
            break;
        case 'pullRequestCloseFailed':
            handlePullRequestCloseFailed(message.data);
            break;
        case 'closeWithCommentCompleted':
            handlePullRequestClosed(message.data);
            break;
        case 'closeWithCommentFailed':
            handlePullRequestCloseFailed(message.data);
            break;
        case 'pullRequestApproved':
            handlePullRequestApproved(message.data);
            break;
        case 'changesRequested':
            handleChangesRequested(message.data);
            break;
        case 'commentAdded':
            handleCommentAdded(message.data);
            break;
        case 'commitsLoaded':
            displayCommits(message.data);
            break;
        case 'reviewersLoaded':
            displayReviewers(message.data);
            break;
        case 'azureDevOpsChecksLoaded':
            displayAzureDevOpsChecks(message.data);
            break;
        case 'gitHubChecksLoaded':
            displayGitHubChecks(message.data);
            break;
        case 'pullRequestThreadsLoaded':
            // Route to provider-specific timeline rendering
            if (currentProvider === 'github' && window.pullRequestWebview && window.pullRequestWebview.handleGitHubTimeline) {
                window.pullRequestWebview.handleGitHubTimeline(message.data);
            } else {
                // Fallback to shared thread rendering for Azure DevOps or if provider-specific webview not available
                displayPullRequestThreads(message.data);
            }
            break;
        case 'error':
            displayError(message.data.message);
            break;
        default:
            console.warn('Unknown message command:', message.command);
    }
}

// Load initial pull request data
function loadPullRequestData(data) {
    
    currentPullRequestId = data.pullRequestId;
    currentPullRequest = data.pullRequest;
    currentProvider = data.provider || detectProvider(data) || 'github';
    
    console.log('Provider detection details:', {
        providedProvider: data.provider,
        detectedProvider: detectProvider(data),
        finalProvider: currentProvider,
        pullRequestData: data.pullRequest,
        pullRequestId: currentPullRequestId
    });
    
    if (currentPullRequest) {
        console.log('Pull request details:', {
            id: currentPullRequest.id,
            number: currentPullRequest.number,
            title: currentPullRequest.title,
            sourceBranch: currentPullRequest.sourceBranch,
            targetBranch: currentPullRequest.targetBranch,
            state: currentPullRequest.state,
            provider: currentProvider
        });
    }
    
    // Send the pull request data to the backend for storage
    if (currentPullRequest) {
        vscode.postMessage({
            command: 'setPullRequestData',
            pullRequest: currentPullRequest
        });
    }
    
    if (currentPullRequest) {
        // Use new dynamic rendering functions
        renderPullRequestHeader();
        renderPullRequestInfo(); 
        renderHeaderActions();
        renderSidebar();
        renderOverviewContent();
    }
    
    // Request detailed data from the extension
    vscode.postMessage({
        command: 'loadPullRequestDetails',
        pullRequestId: currentPullRequestId
    });
    
    // Load checks/status data based on provider
    if (currentProvider === 'azuredevops') {
        vscode.postMessage({
            command: 'loadAzureDevOpsChecks',
            pullRequestId: currentPullRequestId
        });
    } else if (currentProvider === 'github') {
        
        vscode.postMessage({
            command: 'loadGitHubChecks', 
            pullRequestId: currentPullRequestId
        });
        
        // Also load GitHub reviews for inline comments
        
        vscode.postMessage({
            command: 'loadGitHubReviews',
            pullRequestId: currentPullRequestId
        });
        
    }
    
    // Load changes for the files tab immediately when PR opens
    vscode.postMessage({
        command: 'loadFileChanges',
        pullRequestId: currentPullRequestId
    });
    
    // Load commits for the commits tab immediately when PR opens
    vscode.postMessage({
        command: 'loadCommits',
        pullRequestId: currentPullRequestId
    });
    
    // Load reviewers for the sidebar immediately when PR opens
    vscode.postMessage({
        command: 'loadReviewers',
        pullRequestId: currentPullRequestId
    });
    
    // Load threads/activity for the history section
    vscode.postMessage({
        command: 'loadPullRequestThreads',
        pullRequestId: currentPullRequestId
    });
    
    // Show loading state for files tab while loading
    const fileList = document.getElementById('fileList');
    if (fileList) {
        fileList.innerHTML = `
            <div class="loading">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading files...</div>
                    <div class="loading-subtext">Analyzing changes in pull request</div>
                </div>
            </div>
        `;
    }
    
    // Mark that we're starting to load data
    uiState.filesLoaded = false;
    uiState.diffsLoaded = false;
}

// Display pull request header
// Display pull request header
function displayPullRequestHeader() {
    if (!currentPullRequest) {
        return;
    }
    
    const header = document.getElementById('prHeader');
    if (!header) {
        console.warn('prHeader element not found');
        return;
    }
    
    const statusClass = currentPullRequest.state?.toLowerCase() || 'open';
    const statusIcon = getStatusIcon(statusClass);
    
    header.innerHTML = `
        <div class="pr-title">${currentPullRequest.title || `Pull Request #${currentPullRequest.number || currentPullRequestId}`}</div>
        <div class="pr-meta">
            <span class="pr-status ${statusClass}">
                ${statusIcon}
                ${currentPullRequest.state || 'Open'}
            </span>
            <span>by ${currentPullRequest.author || 'Unknown'}</span>
            ${currentPullRequest.createdAt ? `<span>created ${new Date(currentPullRequest.createdAt).toLocaleDateString()}</span>` : ''}
            ${currentPullRequest.updatedAt ? `<span>updated ${new Date(currentPullRequest.updatedAt).toLocaleDateString()}</span>` : ''}
        </div>
        ${currentPullRequest.sourceBranch && currentPullRequest.targetBranch ? `
        <div class="pr-branches">
            <div class="branch-info">
                <svg class="branch-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.5 2.5 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                </svg>
                <span class="branch-name">${currentPullRequest.sourceBranch}</span>
            </div>
            <span class="into-text">→</span>
            <div class="branch-info">
                <svg class="branch-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.5 2.5 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                </svg>
                <span class="branch-name">${currentPullRequest.targetBranch}</span>
            </div>
        </div>
        ` : ''}
    `;
}

// Show action buttons
function showActions() {
    const actionsElement = document.getElementById('headerActions');
    if (!actionsElement) {
        console.warn('headerActions element not found');
        return;
    }
    
    actionsElement.style.display = 'flex';
    
    // Update button visibility based on PR state
    if (currentPullRequest && currentPullRequest.state) {
        const state = currentPullRequest.state.toLowerCase();
        
        const mergeButton = document.getElementById('mergeButton');
        const approvalContainer = document.querySelector('.approval-container');
        const requestChangesButton = document.getElementById('requestChangesButton');
        const closeButton = document.getElementById('closeButton');
        
        if (mergeButton) {
            mergeButton.style.display = state === 'open' ? 'flex' : 'none';
        }
        if (approvalContainer) {
            approvalContainer.style.display = state === 'open' ? 'inline-block' : 'none';
        }
        if (requestChangesButton) {
            requestChangesButton.style.display = state === 'open' ? 'flex' : 'none';
        }
        if (closeButton) {
            closeButton.style.display = state === 'open' ? 'flex' : 'none';
        }
    }
}

// Get status icon based on state
function getStatusIcon(state) {
    switch (state) {
        case 'merged':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
            </svg>`;
        case 'closed':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>`;
        case 'open':
        default:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>
            </svg>`;
    }
}

// Display pull request details
function displayPullRequestDetails(data) {
    // This can be used to display additional repository info if needed
    
}

// Display file changes
// Display pull request changes with preloaded diffs
function displayPullRequestChanges(data) {
    
    console.log('Data structure:', {
        hasChanges: !!data.changes,
        changesLength: data.changes?.length || 0,
        hasFileDiffs: !!data.fileDiffs,
        fileDiffsType: typeof data.fileDiffs,
        fileDiffsKeys: data.fileDiffs ? Object.keys(data.fileDiffs) : 'no fileDiffs'
    });
    
    const fileList = document.getElementById('fileList');
    const changes = data.changes || [];
    const fileDiffs = data.fileDiffs || {};
    
    // Store all file diffs globally for instant access
    allFileDiffs = fileDiffs;
    
    
    
    // Mark UI state as loaded
    uiState.filesLoaded = true;
    uiState.diffsLoaded = Object.keys(allFileDiffs).length > 0;
    
    
    
    if (changes.length === 0) {
        fileList.innerHTML = '<div class="form-help">No file changes found</div>';
        return;
    }
    
    // Update files badge
    const filesBadge = document.getElementById('filesBadge');
    filesBadge.textContent = changes.length;
    filesBadge.style.display = 'inline-flex';
    
    // Build a hierarchical tree structure
    const fileTree = buildFileTree(changes);
    
    let html = '<div class="file-tree">';
    html += renderFileTree(fileTree, '');
    html += '</div>';
    
    fileList.innerHTML = html;
    
    // Select first file by default
    if (changes.length > 0) {
        const firstFile = changes[0];
        const fileName = firstFile.filename || firstFile.path || firstFile.name;
        
        // Check if we have a previously selected file and if it exists in current changes
        let fileToSelect = fileName; // Default to first file
        let statusToUse = firstFile.status || 'modified';
        
        if (uiState.selectedFile) {
            const foundFile = changes.find(change => {
                const changeFileName = change.filename || change.path || change.name;
                return changeFileName === uiState.selectedFile;
            });
            if (foundFile) {
                fileToSelect = uiState.selectedFile;
                statusToUse = foundFile.status || 'modified';
            }
        }
        
        // Always select a file to ensure something is displayed
        // Use setTimeout to ensure DOM is updated before selecting the file
        setTimeout(() => {
            selectFileInstant(fileToSelect, statusToUse);
        }, 50);
    }
}

function displayFileChanges(data) {
    
    const fileList = document.getElementById('fileList');
    const changes = data.changes || [];
    
    
    
    if (changes.length === 0) {
        fileList.innerHTML = '<div class="form-help">No file changes found</div>';
        return;
    }
    
    // Update files badge
    const filesBadge = document.getElementById('filesBadge');
    filesBadge.textContent = changes.length;
    filesBadge.style.display = 'inline';
    
    // Build a hierarchical tree structure
    const fileTree = buildFileTree(changes);
    
    let html = '<div class="file-tree">';
    html += renderFileTree(fileTree, '');
    html += '</div>';
    
    fileList.innerHTML = html;
    
    // Select first file by default
    if (changes.length > 0) {
        selectFile(changes[0].filename || changes[0].path || changes[0].name, changes[0].status);
    }
}

// Build hierarchical file tree structure
function buildFileTree(changes) {
    const tree = { children: {}, files: [] };
    
    changes.forEach(change => {
        const filePath = change.filename || change.path || change.name;
        const parts = filePath.split('/');
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
        
        // Add the file to the final level
        currentLevel.files.push({ ...change, fileName, path: filePath });
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
                    html += '<span class="directory-icon">';
                    html += '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-folder">';
                    html += '<path stroke="none" d="M0 0h24v24H0z" fill="none"/>';
                    html += '<path stroke="white" stroke-width="1" d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />';
                    html += '</svg>';
                    html += '</span>';
                    html += '<span class="directory-name">' + key + '</span>';
                    html += '</div>';
                    
                    html += '<div class="file-directory-contents" id="' + directoryId + '">';
                    html += renderFileTree(item, item.path);
                    html += '</div>';
                    
                    html += '</div>';
                }
            }
        });
    }
    
    // Then render files in this level
    if (tree.files) {
        tree.files.sort((a, b) => a.fileName.localeCompare(b.fileName)).forEach(file => {
            const statusClass = file.status || 'modified';
            
            html += '<div class="file-item ' + statusClass + '" onclick="selectFileInstant(\'' + file.path + '\', \'' + statusClass + '\')" data-file="' + file.path + '">';
            html += '<span class="file-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-file"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg></span>';
            html += '<span class="file-name">' + file.fileName + '</span>';
            html += '</div>';
        });
    }
    
    return html;
}

// Toggle directory expansion
function toggleDirectory(directoryId, path) {
    const directory = document.getElementById(directoryId);
    const container = directory.parentElement;
    
    if (container.classList.contains('expanded')) {
        container.classList.remove('expanded');
        directory.style.display = 'none';
        
        // Update chevron
        const chevron = container.querySelector('.directory-chevron');
        chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg>';
    } else {
        container.classList.add('expanded');
        directory.style.display = 'block';
        
        // Update chevron
        const chevron = container.querySelector('.directory-chevron');
        chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg>';
    }
}

// Select a file to view diff
// Select file with instant diff display (uses preloaded diffs)
function selectFileInstant(fileName, status) {
    // Save scroll position of current file before switching
    saveCurrentScrollPosition();
    
    // Remove previous selection
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Select current file
    const fileItem = document.querySelector(`[data-file="${fileName}"]`);
    if (fileItem) {
        fileItem.classList.add('selected');
    }
    
    currentFile = { fileName, status };
    
    // Update UI state
    uiState.selectedFile = fileName;
    
    // Check if we have preloaded diff data
    if (allFileDiffs && allFileDiffs[fileName]) {
        
        // Display diff immediately from preloaded data
        displayFileDiff({
            filePath: fileName,
            diff: allFileDiffs[fileName],
            status: status
        });
    } else {
        
        
        
        
        // Try alternative file path formats
        const alternativeKeys = [
            fileName.startsWith('/') ? fileName.slice(1) : '/' + fileName,
            fileName.replace(/\\/g, '/'),
            fileName.replace(/\//g, '\\')
        ];
        
        
        
        let found = false;
        for (const altKey of alternativeKeys) {
            if (allFileDiffs[altKey]) {
                
                displayFileDiff({
                    filePath: fileName,
                    diff: allFileDiffs[altKey],
                    status: status
                });
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.warn(`No diff found for ${fileName}. Available keys:`, Object.keys(allFileDiffs).slice(0, 5));
            // Fall back to the original method as last resort
            selectFile(fileName, status);
        }
    }
}

// Save current scroll position
function saveCurrentScrollPosition() {
    if (monacoDiffEditor && currentFile) {
        try {
            const position = monacoDiffEditor.getPosition();
            const viewState = monacoDiffEditor.saveViewState();
            
            if (!uiState.scrollPositions) {
                uiState.scrollPositions = {};
            }
            
            uiState.scrollPositions[currentFile.fileName] = {
                position: position,
                viewState: viewState,
                timestamp: Date.now()
            };
            
            
        } catch (error) {
            
        }
    }
}

// Restore scroll position for current file
function restoreScrollPosition() {
    if (monacoDiffEditor && currentFile && uiState.scrollPositions) {
        const savedState = uiState.scrollPositions[currentFile.fileName];
        if (savedState) {
            try {
                setTimeout(() => {
                    if (savedState.viewState) {
                        monacoDiffEditor.restoreViewState(savedState.viewState);
                    } else if (savedState.position) {
                        monacoDiffEditor.setPosition(savedState.position);
                        monacoDiffEditor.revealPosition(savedState.position);
                    }
                    
                }, 100);
            } catch (error) {
                
            }
        }
    }
}

function selectFile(fileName, status) {
    // Remove previous selection
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Select current file
    const fileItem = document.querySelector(`[data-file="${fileName}"]`);
    if (fileItem) {
        fileItem.classList.add('selected');
    }
    
    currentFile = { fileName, status };
    
    // Show loading state
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
    
    // Request file diff
    vscode.postMessage({
        command: 'getFileDiff',
        filePath: fileName,
        status: status,
        pullRequestId: currentPullRequestId
    });
}

// Display file diff
function displayFileDiff(data) {
    
    
    
    
    const diffPreview = document.getElementById('diffPreview');
    
    if (!data.diff) {
        
        diffPreview.innerHTML = '<div class="form-help">No diff available for this file</div>';
        return;
    }
    
    
    
    // Find the currently selected file
    const currentFileElement = document.querySelector('.file-item.selected');
    
    const filePath = currentFile ? currentFile.fileName : data.filePath || 'Unknown file';
    const status = data.status || (currentFile ? currentFile.status : 'modified');

    // Create HTML for the diff header and containers
    let html = `
        <div class="diff-view-controls">
            <div class="view-controls">
                <button id="collapseSidebarBtn" class="collapse-sidebar-btn" title="Collapse sidebar" onclick="toggleFilesSidebar()">
                    <span id="chevronIcon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevrons-left"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M11 7l-5 5l5 5" /><path d="M17 7l-5 5l5 5" /></svg>
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
    
    // Process the diff content
    const parsedDiff = parseDiffOutput(data.diff);
    displayParsedDiff(parsedDiff);
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
                monacoEditorReady = true;
                document.body.classList.add('monaco-active');
                
                
                // If there's pending diff data, display it now
                if (pendingDiffData) {
                    
                    displayFileDiff(pendingDiffData);
                    pendingDiffData = null;
                }
                resolve(true);
            }, function(error) {
                console.error('Failed to load Monaco Editor:', error);
                isMonacoAvailable = false;
                monacoEditorReady = false;
                document.body.classList.add('monaco-fallback');
                resolve(false);
            });
        } else {
            // Monaco loader not available, fall back
            
            isMonacoAvailable = false;
            monacoEditorReady = false;
            document.body.classList.add('monaco-fallback');
            resolve(false);
        }
    });
}

// Display diff in Monaco Editor

// Toggle files sidebar
function toggleFilesSidebar() {
    const sidebar = document.getElementById('filesSidebar');
    const chevron = document.getElementById('chevronIcon');
    if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        chevron.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='icon icon-tabler icons-tabler-outline icon-tabler-chevrons-right'><path stroke='none' d='M0 0h24v24H0z' fill='none'/><path d='M7 7l5 5l-5 5' /><path d='M13 7l5 5l-5 5' /></svg>`;
    } else {
        sidebar.classList.remove('collapsed');
        chevron.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='icon icon-tabler icons-tabler-outline icon-tabler-chevrons-left'><path stroke='none' d='M0 0h24v24H0z' fill='none'/><path d='M11 7l-5 5l5 5' /><path d='M17 7l-5 5l5 5' /></svg>`;
    }
    
    // Resize Monaco Editor after sidebar toggle if available
    resizeMonacoEditor(300);
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

// Parse unified diff output to remove git headers and format properly
function parseDiffContent(diffText) {
    if (!diffText) {
        return '';
    }
    
    // Split into lines
    const lines = diffText.split('\n');
    const cleanedLines = [];
    let foundFirstHunk = false;
    
    for (const line of lines) {
        // Skip git diff headers (everything before first @@)
        if (line.startsWith('@@')) {
            foundFirstHunk = true;
            // Skip the @@ line itself - we don't want to show hunk headers
            continue;
        }
        
        // Only include lines after we find the first hunk header, but not the header itself
        if (foundFirstHunk) {
            cleanedLines.push(line);
        }
    }
    
    return cleanedLines.join('\n');
}

// Toggle between side-by-side and unified diff views
function toggleView(viewType) {
    
    const diffContainer = document.getElementById('diffContainer');
    
    if (!diffContainer) {
        console.error('diffContainer not found');
        return;
    }
    
    // Update container
    diffContainer.setAttribute('data-view-mode', viewType);
    
    // Update Monaco Editor view mode if available
    if (isMonacoAvailable && monacoDiffEditor) {
        const isInline = viewType === 'unified';
        monacoDiffEditor.updateOptions({
            renderSideBySide: !isInline
        });
        
        // Force layout update
        setTimeout(() => {
            monacoDiffEditor.layout();
        }, 100);
    }
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
            // Parse hunk header to get line numbers
            const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) {
                leftLineNum = parseInt(match[1]);
                rightLineNum = parseInt(match[2]);
            }
            inHunk = true;
            
            // Add hunk header to both sides
            leftLines.push({ line: '', content: line, type: 'hunk' });
            rightLines.push({ line: '', content: line, type: 'hunk' });
            continue;
        }
        
        if (!inHunk) {
            continue;
        }
        
        if (line.startsWith('-')) {
            // Removed line (only in left side)
            leftLines.push({ line: leftLineNum, content: line.substring(1), type: 'removed' });
            rightLines.push({ line: '', content: '', type: 'empty' });
            leftLineNum++;
        } else if (line.startsWith('+')) {
            // Added line (only in right side)
            leftLines.push({ line: '', content: '', type: 'empty' });
            rightLines.push({ line: rightLineNum, content: line.substring(1), type: 'added' });
            rightLineNum++;
        } else if (line.startsWith(' ') || line === '') {
            // Context line (in both sides)
            const content = line.length > 0 ? line.substring(1) : '';
            leftLines.push({ line: leftLineNum, content: content, type: 'context' });
            rightLines.push({ line: rightLineNum, content: content, type: 'context' });
            leftLineNum++;
            rightLineNum++;
        }
    }
    
    // Align the line counts (add empty lines where needed)
    const maxLines = Math.max(leftLines.length, rightLines.length);
    for (let i = 0; i < maxLines; i++) {
        if (i >= leftLines.length) {
            leftLines.push({ line: '', content: '', type: 'empty' });
        }
        if (i >= rightLines.length) {
            rightLines.push({ line: '', content: '', type: 'empty' });
        }
    }
    
    return { left: leftLines, right: rightLines };
}

// Enhanced diff display with better syntax highlighting
function displayParsedDiff(parsedDiff) {
    // Ensure view mode is set correctly
    const diffContainer = document.getElementById('diffContainer');
    if (diffContainer) {
        const currentViewMode = diffContainer.getAttribute('data-view-mode') || 'unified';
        
        
        // Update dropdown to reflect current mode
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
    const currentFileData = currentFile || {};
    const fileName = currentFileData.fileName || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
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
            glyphMargin: true,
            folding: false,
            lineDecorationsWidth: 10,
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

        // Update inline comments for this file
        if (currentFile && currentFile.fileName && allThreads && allThreads.length > 0) {
            updateInlineComments(currentFile.fileName);
        }
        
        // Add keyboard shortcut for toggling comment visibility
        const modifiedEditor = monacoDiffEditor.getModifiedEditor();
        const keyboardDisposable = modifiedEditor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyI, () => {
            const position = modifiedEditor.getPosition();
            if (position) {
                // Find comment thread at current line
                const threadsAtLine = allThreads.filter(thread => {
                    return thread.threadContext && 
                           thread.threadContext.rightFileStart && 
                           thread.threadContext.rightFileStart.line === position.lineNumber;
                });
                
                if (threadsAtLine.length > 0) {
                    
                    toggleCommentVisibility(threadsAtLine[0].id);
                }
            }
        });
        
        fileCommentWidgets.push(keyboardDisposable);

        // Fit the layout
        setTimeout(() => {
            monacoDiffEditor.layout();
            // Restore scroll position after layout
            restoreScrollPosition();
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
        .replace(/\b(public|private|protected|internal|static|readonly|const|virtual|override|abstract|sealed|partial|async|await|ref|out|in|params)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(class|interface|struct|enum|record|namespace|using|var|void|bool|int|string|double|float|long|decimal|char|byte|sbyte|short|ushort|uint|ulong|object|dynamic)\b/g, '<span class="type">$1</span>')
        .replace(/\b(if|else|switch|case|default|for|foreach|while|do|break|continue|return|throw|try|catch|finally|lock|yield|goto)\b/g, '<span class="control">$1</span>')
        .replace(/\b(new|this|base|typeof|sizeof|is|as|null|true|false)\b/g, '<span class="literal">$1</span>')
        .replace(/\b(ApplicationDbContext|HttpGet|HttpPost|HttpPut|HttpDelete|ApiController|IActionResult|Controller|Entity|DbContext|DbSet|IEnumerable|IList|ICollection|Task|Action|Func)\b/g, '<span class="framework">$1</span>')
        .replace(/\[([^\]]+)\]/g, '<span class="attribute">[$1]</span>')
        .replace(/"(?:[^"\\]|\\.)*"/g, '<span class="string">$&</span>')
        .replace(/'(?:[^'\\]|\\.)*'/g, '<span class="string">$&</span>')
        .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
        .replace(/\b(\d+\.?\d*[fFdDmM]?)\b/g, '<span class="number">$1</span>')
        .replace(/([+\-*/%=!<>&|^~?:]+)/g, '<span class="operator">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9]*\.)+[A-Z][a-zA-Z0-9]*/g, '<span class="namespace">$&</span>')
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="method">$1</span>(');
    
    return highlighted;
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

// Get language from file extension for syntax highlighting
function getLanguageFromFile(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'cs': 'csharp',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'h': 'c',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'xml': 'xml',
        'md': 'markdown',
        'sql': 'sql',
        'sh': 'shell',
        'ps1': 'powershell',
        'yml': 'yaml',
        'yaml': 'yaml'
    };
    return languageMap[ext] || 'plaintext';
}

// Tab switching
function switchTab(tabName) {
    // Save current scroll position before switching tabs
    if (tabName !== 'files') {
        saveCurrentScrollPosition();
    }
    
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Handle files tab
    if (tabName === 'files' && currentPullRequestId) {
        // Only load files if they haven't been loaded yet
        if (!uiState.filesLoaded) {
            const fileList = document.getElementById('fileList');
            if (fileList) {
                fileList.innerHTML = `
                    <div class="loading">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <div class="loading-text">Loading files...</div>
                            <div class="loading-subtext">Analyzing changes in pull request</div>
                        </div>
                    </div>
                `;
                
                vscode.postMessage({
                    command: 'loadFileChanges',
                    pullRequestId: currentPullRequestId
                });
            }
        } else if (uiState.selectedFile && allFileDiffs[uiState.selectedFile]) {
            // Files are already loaded, restore the previously selected file
            setTimeout(() => {
                // Ensure the file is visually selected in the file list
                document.querySelectorAll('.file-item').forEach(item => {
                    item.classList.remove('selected');
                });
                const fileItem = document.querySelector(`[data-file="${uiState.selectedFile}"]`);
                if (fileItem) {
                    fileItem.classList.add('selected');
                    // Force display of the diff for the selected file
                    currentFile = { fileName: uiState.selectedFile, status: 'modified' };
                    displayFileDiff({
                        filePath: uiState.selectedFile,
                        diff: allFileDiffs[uiState.selectedFile],
                        status: currentFile.status
                    });
                }
                
                restoreScrollPosition();
            }, 50);
        } else if (uiState.filesLoaded) {
            // Files are loaded but no specific file selected, select the first one
            setTimeout(() => {
                const fileItems = document.querySelectorAll('.file-item');
                if (fileItems.length > 0) {
                    const firstFileItem = fileItems[0];
                    const fileName = firstFileItem.getAttribute('data-file');
                    const fileStatus = firstFileItem.classList.contains('added') ? 'added' :
                                     firstFileItem.classList.contains('deleted') ? 'deleted' : 'modified';
                    if (fileName && allFileDiffs[fileName]) {
                        selectFileInstant(fileName, fileStatus);
                    }
                }
            }, 50);
        }
    }
    
    // Handle commits tab
    if (tabName === 'commits' && currentPullRequestId) {
        // Check if commits need to be loaded
        const commitsList = document.getElementById('commitsList');
        if (commitsList && commitsList.innerHTML.includes('loading')) {
            // Commits are still loading, request them again if needed
            vscode.postMessage({
                command: 'loadCommits',
                pullRequestId: currentPullRequestId
            });
        }
    }
}

// Action handlers
function mergePullRequest() {
    if (!currentPullRequestId) {
        return;
    }
    
    // Show full-screen loader
    showFullScreenLoader('Merging pull request...', 'Creating merge commit and updating repository');
    
    vscode.postMessage({
        command: 'mergePullRequest',
        pullRequestId: currentPullRequestId
    });
}

function squashAndMergePullRequest() {
    if (!currentPullRequestId) {
        return;
    }
    
    // Show full-screen loader
    showFullScreenLoader('Squashing and merging...', 'Combining all commits into a single commit');
    
    vscode.postMessage({
        command: 'squashAndMergePullRequest',
        pullRequestId: currentPullRequestId
    });
}

function rebaseAndMergePullRequest() {
    if (!currentPullRequestId) {
        return;
    }
    
    // Show full-screen loader
    showFullScreenLoader('Rebasing and merging...', 'Replaying commits on top of target branch');
    
    vscode.postMessage({
        command: 'rebaseAndMergePullRequest',
        pullRequestId: currentPullRequestId
    });
}

function closePullRequest() {
    if (!currentPullRequestId) {
        return;
    }
    
    // Show full-screen loader
    showFullScreenLoader('Closing pull request...', 'Updating pull request status');
    
    vscode.postMessage({
        command: 'closePullRequest',
        pullRequestId: currentPullRequestId
    });
}

function closeWithComment() {
    const commentInput = document.getElementById('commentInput');
    const comment = commentInput?.value?.trim();
    
    if (!currentPullRequestId) {
        return;
    }
    
    if (!comment) {
        // If no comment, just close the PR
        closePullRequest();
        return;
    }
    
    // Disable buttons during operation
    const commentSubmitBtn = document.getElementById('commentSubmitBtn');
    const closeWithCommentBtn = document.getElementById('closeWithCommentBtn');
    
    if (commentSubmitBtn) {
        commentSubmitBtn.disabled = true;
        commentSubmitBtn.textContent = 'Closing...';
    }
    if (closeWithCommentBtn) {
        closeWithCommentBtn.disabled = true;
        closeWithCommentBtn.textContent = 'Closing...';
    }
    
    vscode.postMessage({
        command: 'closeWithComment',
        pullRequestId: currentPullRequestId,
        comment: comment
    });
    
    // Clear input
    if (commentInput) {
        commentInput.value = '';
        commentInput.style.height = 'auto';
        commentInput.style.height = '80px';
    }
    
    // Reset buttons
    setTimeout(() => {
        if (commentSubmitBtn) {
            commentSubmitBtn.disabled = false;
            commentSubmitBtn.textContent = 'Add Comment';
            commentSubmitBtn.style.display = 'none';
        }
        if (closeWithCommentBtn) {
            closeWithCommentBtn.disabled = false;
            closeWithCommentBtn.textContent = 'Close with comment';
            closeWithCommentBtn.style.display = 'none';
        }
    }, 1000);
}

function approvePullRequest() {
    if (!currentPullRequestId) {
        return;
    }
    
    vscode.postMessage({
        command: 'approvePullRequest',
        pullRequestId: currentPullRequestId
    });
}

function requestChanges() {
    if (!currentPullRequestId) {
        return;
    }
    
    const comment = prompt('Enter a comment explaining the requested changes:');
    if (comment) {
        vscode.postMessage({
            command: 'requestChanges',
            pullRequestId: currentPullRequestId,
            comment: comment
        });
    }
}

// Expandable Approval Button Class
class ExpandableApprovalButton {
    constructor() {
        this.isExpanded = false;
        this.currentSelection = 'approve';
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready and button to be created
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }
    
    setupEventListeners() {
        const mainButton = document.getElementById('approvalMainButton');
        const optionsMenu = document.getElementById('approvalOptionsMenu');
        
        if (!mainButton || !optionsMenu) {
            
            // Retry after a short delay
            setTimeout(() => this.setupEventListeners(), 200);
            return;
        }
        
        
        
        // Main button click handler
        mainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });
        
        // Option selection handlers
        const optionItems = document.querySelectorAll('.approval-option-item');
        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.getAttribute('data-action');
                const text = item.textContent.trim();
                this.selectOption(action, text);
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainButton.contains(e.target) && !optionsMenu.contains(e.target)) {
                this.closeMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        if (this.isExpanded) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        this.isExpanded = true;
        const mainButton = document.getElementById('approvalMainButton');
        const optionsMenu = document.getElementById('approvalOptionsMenu');
        const dropdownArrow = document.getElementById('approvalDropdownArrow');
        
        if (mainButton) {
            mainButton.classList.add('expanded');
        }
        if (optionsMenu) {
            optionsMenu.classList.add('visible');
        }
        if (dropdownArrow) {
            dropdownArrow.classList.add('rotated');
        }
    }
    
    closeMenu() {
        this.isExpanded = false;
        const mainButton = document.getElementById('approvalMainButton');
        const optionsMenu = document.getElementById('approvalOptionsMenu');
        const dropdownArrow = document.getElementById('approvalDropdownArrow');
        
        if (mainButton) {
            mainButton.classList.remove('expanded');
        }
        if (optionsMenu) {
            optionsMenu.classList.remove('visible');
        }
        if (dropdownArrow) {
            dropdownArrow.classList.remove('rotated');
        }
    }
    
    selectOption(action, text) {
        this.currentSelection = action;
        
        // Update button text based on selection
        const actionTexts = {
            'approve': 'Approve',
            'approve-suggestions': 'Approve with suggestions',
            'wait': 'Wait for author',
            'reject': 'Reject',
            'request-changes': 'Request changes',
            'reset': 'Reset feedback'
        };
        
        const buttonText = document.getElementById('approvalButtonText');
        if (buttonText) {
            buttonText.textContent = actionTexts[action] || text;
        }
        
        // Close menu
        this.closeMenu();
        
        // Handle the action
        this.handleAction(action);
    }
    
    handleAction(action) {
        
        
        switch(action) {
            case 'approve':
                approvePullRequest();
                break;
            case 'approve-suggestions':
                this.approvePullRequestWithSuggestions();
                break;
            case 'wait':
                this.waitForAuthor();
                break;
            case 'reject':
                this.rejectPullRequest();
                break;
            case 'request-changes':
                requestChanges();
                break;
            case 'reset':
                this.resetFeedback();
                break;
        }
    }
    
    approvePullRequestWithSuggestions() {
        if (!currentPullRequestId) {
            return;
        }
        
        const comment = prompt('Enter suggestions for the author (optional):');
        vscode.postMessage({
            command: 'approvePullRequestWithSuggestions',
            pullRequestId: currentPullRequestId,
            comment: comment || ''
        });
    }
    
    waitForAuthor() {
        if (!currentPullRequestId) {
            return;
        }
        
        const comment = prompt('Enter a message for the author (optional):');
        vscode.postMessage({
            command: 'waitForAuthor',
            pullRequestId: currentPullRequestId,
            comment: comment || ''
        });
    }
    
    rejectPullRequest() {
        if (!currentPullRequestId) {
            return;
        }
        
        const comment = prompt('Enter a reason for rejection:');
        if (comment) {
            vscode.postMessage({
                command: 'rejectPullRequest',
                pullRequestId: currentPullRequestId,
                comment: comment
            });
        }
    }
    
    resetFeedback() {
        if (!currentPullRequestId) {
            return;
        }
        
        const buttonText = document.getElementById('approvalButtonText');
        if (buttonText) {
            buttonText.textContent = 'Approve';
        }
        
        vscode.postMessage({
            command: 'resetFeedback',
            pullRequestId: currentPullRequestId
        });
    }
}

// Global instance for approval button
let expandableApprovalButton = null;

// Expandable Auto-Complete Button Class
class ExpandableAutoCompleteButton {
    constructor() {
        this.isExpanded = false;
        this.currentSelection = 'set-auto-complete';
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready and button to be created
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }
    
    setupEventListeners() {
        const mainButton = document.getElementById('autoCompleteMainButton');
        const optionsMenu = document.getElementById('autoCompleteOptionsMenu');
        
        if (!mainButton || !optionsMenu) {
            
            // Retry after a short delay
            setTimeout(() => this.setupEventListeners(), 200);
            return;
        }
        
        
        
        // Main button click handler
        mainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });
        
        // Option selection handlers
        const optionItems = document.querySelectorAll('.autocomplete-option-item');
        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.getAttribute('data-action');
                const text = item.textContent.trim();
                this.selectOption(action, text);
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainButton.contains(e.target) && !optionsMenu.contains(e.target)) {
                this.closeMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        if (this.isExpanded) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        this.isExpanded = true;
        const mainButton = document.getElementById('autoCompleteMainButton');
        const optionsMenu = document.getElementById('autoCompleteOptionsMenu');
        const dropdownArrow = document.getElementById('autoCompleteDropdownArrow');
        
        if (mainButton) {
            mainButton.classList.add('expanded');
        }
        if (optionsMenu) {
            optionsMenu.classList.add('visible');
        }
        if (dropdownArrow) {
            dropdownArrow.classList.add('rotated');
        }
    }
    
    closeMenu() {
        this.isExpanded = false;
        const mainButton = document.getElementById('autoCompleteMainButton');
        const optionsMenu = document.getElementById('autoCompleteOptionsMenu');
        const dropdownArrow = document.getElementById('autoCompleteDropdownArrow');
        
        if (mainButton) {
            mainButton.classList.remove('expanded');
        }
        if (optionsMenu) {
            optionsMenu.classList.remove('visible');
        }
        if (dropdownArrow) {
            dropdownArrow.classList.remove('rotated');
        }
    }
    
    selectOption(action, text) {
        this.currentSelection = action;
        
        // Update button text based on selection
        const actionTexts = {
            'complete': 'Complete',
            'set-auto-complete': 'Set auto-complete',
            'mark-draft': 'Mark as draft',
            'abandon': 'Abandon'
        };
        
        const buttonText = document.getElementById('autoCompleteButtonText');
        if (buttonText) {
            buttonText.textContent = actionTexts[action] || text;
        }
        
        // Close menu
        this.closeMenu();
        
        // Handle the action
        this.handleAction(action);
    }
    
    handleAction(action) {
        
        
        switch(action) {
            case 'complete':
                this.completePullRequest();
                break;
            case 'set-auto-complete':
                setAutoComplete();
                break;
            case 'mark-draft':
                this.markAsDraft();
                break;
            case 'abandon':
                this.abandonPullRequest();
                break;
        }
    }
    
    completePullRequest() {
        if (!currentPullRequestId) {
            return;
        }
        
        vscode.postMessage({
            command: 'completePullRequest',
            pullRequestId: currentPullRequestId
        });
    }
    
    markAsDraft() {
        if (!currentPullRequestId) {
            return;
        }
        
        vscode.postMessage({
            command: 'markAsDraft',
            pullRequestId: currentPullRequestId
        });
    }
    
    abandonPullRequest() {
        if (!currentPullRequestId) {
            return;
        }
        
        const confirmed = confirm('Are you sure you want to abandon this pull request?');
        if (confirmed) {
            vscode.postMessage({
                command: 'abandonPullRequest',
                pullRequestId: currentPullRequestId
            });
        }
    }
}

// Global instance for auto-complete button
let expandableAutoCompleteButton = null;

// Expandable Merge Button Class for GitHub
class ExpandableMergeButton {
    constructor() {
        this.isExpanded = false;
        this.currentSelection = 'merge';
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready and button to be created
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }
    
    setupEventListeners() {
        const mainButton = document.getElementById('mergeMainButton');
        const optionsMenu = document.getElementById('mergeOptionsMenu');
        
        if (!mainButton || !optionsMenu) {
            
            // Retry after a short delay
            setTimeout(() => this.setupEventListeners(), 200);
            return;
        }
        
        
        
        // Main button click handler
        mainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });
        
        // Option selection handlers
        const optionItems = document.querySelectorAll('.merge-option-item');
        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.getAttribute('data-action');
                const text = item.textContent.trim();
                this.selectOption(action, text);
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainButton.contains(e.target) && !optionsMenu.contains(e.target)) {
                this.closeMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        if (this.isExpanded) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        this.isExpanded = true;
        const mainButton = document.getElementById('mergeMainButton');
        const optionsMenu = document.getElementById('mergeOptionsMenu');
        const dropdownArrow = document.getElementById('mergeDropdownArrow');
        
        if (mainButton) {
            mainButton.classList.add('expanded');
        }
        if (optionsMenu) {
            optionsMenu.classList.add('visible');
        }
        if (dropdownArrow) {
            dropdownArrow.classList.add('rotated');
        }
    }
    
    closeMenu() {
        this.isExpanded = false;
        const mainButton = document.getElementById('mergeMainButton');
        const optionsMenu = document.getElementById('mergeOptionsMenu');
        const dropdownArrow = document.getElementById('mergeDropdownArrow');
        
        if (mainButton) {
            mainButton.classList.remove('expanded');
        }
        if (optionsMenu) {
            optionsMenu.classList.remove('visible');
        }
        if (dropdownArrow) {
            dropdownArrow.classList.remove('rotated');
        }
    }
    
    selectOption(action, text) {
        this.currentSelection = action;
        
        // Update button text based on selection
        const actionTexts = {
            'merge': 'Merge pull request',
            'squash': 'Squash and merge',
            'rebase': 'Rebase and merge'
        };
        
        const buttonText = document.getElementById('mergeButtonText');
        if (buttonText) {
            buttonText.textContent = actionTexts[action] || text;
        }
        
        // Close menu
        this.closeMenu();
        
        // Handle the action
        this.handleAction(action);
    }
    
    handleAction(action) {
        
        
        switch(action) {
            case 'merge':
                mergePullRequest();
                break;
            case 'squash':
                squashAndMergePullRequest();
                break;
            case 'rebase':
                rebaseAndMergePullRequest();
                break;
        }
    }
}

// Global instance for merge button
let expandableMergeButton = null;

function addComment() {
    if (!currentPullRequestId) {
        return;
    }
    
    const commentInput = document.getElementById('commentInput');
    const commentSubmitBtn = document.getElementById('commentSubmitBtn');
    const comment = commentInput.value.trim();
    
    if (!comment) {
        return;
    }
    
    // Disable button while submitting
    if (commentSubmitBtn) {
        commentSubmitBtn.disabled = true;
        commentSubmitBtn.textContent = 'Adding...';
    }
    
    vscode.postMessage({
        command: 'addComment',
        pullRequestId: currentPullRequestId,
        comment: comment
    });
    
    // Clear the input and reset UI
    commentInput.value = '';
    commentInput.style.height = '80px'; // Reset to original height
    
    // Hide the button and reset its state
    if (commentSubmitBtn) {
        commentSubmitBtn.style.display = 'none';
        commentSubmitBtn.disabled = false;
        commentSubmitBtn.textContent = 'Add Comment';
    }
}

function openInBrowser() {
    if (!currentPullRequest || !currentPullRequestId) {
        console.warn('No pull request data available to open in browser');
        return;
    }
    
    console.log('Opening pull request in browser:', {
        pullRequestId: currentPullRequestId,
        provider: currentProvider,
        pullRequest: currentPullRequest
    });
    
    vscode.postMessage({
        command: 'openInBrowser',
        pullRequestId: currentPullRequestId,
        provider: currentProvider,
        pullRequest: currentPullRequest
    });
}

// Event handlers for action results
function handlePullRequestMerged(data) {
    // Hide the full-screen loader
    hideFullScreenLoader();
    
    // Update the PR state but skip UI updates since we're closing the webview
    if (currentPullRequest) {
        currentPullRequest.state = 'merged';
    }
    
    // Show success message briefly before closing
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 12px 16px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    notification.textContent = 'Pull request merged successfully';
    document.body.appendChild(notification);
    
    // Close webview and refresh pull requests list after a short delay
    setTimeout(() => {
        // Remove notification
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
        
        // Send commands to close webview and refresh the pull requests list
        vscode.postMessage({
            command: 'closeWebview'
        });
        
        vscode.postMessage({
            command: 'refreshPullRequestsList'
        });
    }, 1500); // Show success message for 1.5 seconds before closing
}

function handlePullRequestMergeFailed(data) {
    // Hide the full-screen loader
    hideFullScreenLoader();
    
    // Show error message
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--vscode-inputValidation-errorBackground);
        color: var(--vscode-inputValidation-errorForeground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
        padding: 12px 16px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 400px;
    `;
    notification.textContent = data.message || 'Failed to merge pull request';
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function handlePullRequestClosed(data) {
    // Hide the full-screen loader
    hideFullScreenLoader();
    
    // Update the PR state but skip UI updates since we're closing the webview
    if (currentPullRequest) {
        currentPullRequest.state = 'closed';
    }
    
    // Show success message briefly before closing
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 12px 16px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    notification.textContent = 'Pull request closed successfully';
    document.body.appendChild(notification);
    
    // Close webview and refresh pull requests list after a short delay
    setTimeout(() => {
        // Remove notification
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
        
        // Send commands to close webview and refresh the pull requests list
        vscode.postMessage({
            command: 'closeWebview'
        });
        
        vscode.postMessage({
            command: 'refreshPullRequestsList'
        });
    }, 1500); // Show success message for 1.5 seconds before closing
}

function handlePullRequestCloseFailed(data) {
    // Hide the full-screen loader
    hideFullScreenLoader();
    
    // Re-enable buttons that might have been disabled during close operation
    const commentSubmitBtn = document.getElementById('commentSubmitBtn');
    const closeWithCommentBtn = document.getElementById('closeWithCommentBtn');
    const closeMainButton = document.getElementById('closeMainButton');
    
    if (commentSubmitBtn) {
        commentSubmitBtn.disabled = false;
        commentSubmitBtn.textContent = 'Add Comment';
    }
    if (closeWithCommentBtn) {
        closeWithCommentBtn.disabled = false;
        closeWithCommentBtn.textContent = 'Close with comment';
    }
    if (closeMainButton) {
        closeMainButton.disabled = false;
    }
    
    // Show error notification
    const errorNotification = document.createElement('div');
    errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--vscode-errorForeground);
        color: var(--vscode-editor-background);
        padding: 12px 16px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 300px;
    `;
    errorNotification.textContent = data.message || 'Failed to close pull request. Please try again.';
    document.body.appendChild(errorNotification);
    
    // Remove error notification after 5 seconds
    setTimeout(() => {
        if (errorNotification.parentNode) {
            errorNotification.parentNode.removeChild(errorNotification);
        }
    }, 5000);
}

function handlePullRequestApproved(data) {
    // Could update UI to show approval state
    
}

function handleChangesRequested(data) {
    // Could update UI to show changes requested state
    
}

function handleCommentAdded(data) {
    // Show success feedback briefly
    const commentMeta = document.getElementById('commentMeta');
    if (commentMeta) {
        const originalContent = commentMeta.innerHTML;
        commentMeta.innerHTML = '<span style="color: var(--vscode-notificationsInfoIcon-foreground);">✓ Comment added successfully</span>';
        
        // Restore original content after 3 seconds
        setTimeout(() => {
            commentMeta.innerHTML = originalContent;
        }, 3000);
    }
    
    
}

// Display error messages
function displayError(message) {
    console.error('Error:', message);
    
    // Clear all loading states when an error occurs
    clearAllLoadingStates();
    
    // Re-enable all disabled buttons
    const disabledButtons = document.querySelectorAll('button[disabled]');
    disabledButtons.forEach(button => {
        button.disabled = false;
        if (button.textContent.includes('Adding reply')) {
            button.innerHTML = 'Reply';
        } else if (button.textContent.includes('Replying & Resolving')) {
            button.innerHTML = 'Reply & Resolve';
        } else if (button.textContent.includes('Resolving')) {
            button.innerHTML = 'Resolve';
        }
    });
    
    // Could show a proper error UI here
    alert(`Error: ${message}`);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Azure DevOps Style Functions

// Sidebar action functions
function addReviewer() {
    
    // This would typically open a dialog to select reviewers
    vscode.postMessage({
        command: 'addReviewer',
        pullRequestId: currentPullRequestId || mockPullRequestData.id
    });
}

function addTag() {
    
    // This would typically open a dialog to add tags
    vscode.postMessage({
        command: 'addTag',
        pullRequestId: currentPullRequestId || mockPullRequestData.id
    });
}

function addWorkItem() {
    
    // This would typically open a dialog to link work items
    vscode.postMessage({
        command: 'addWorkItem',
        pullRequestId: currentPullRequestId || mockPullRequestData.id
    });
}

// Enhanced tab switching for Azure DevOps style
// Enhanced button interactions
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects and interactions for buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            
        });
    });
    
    // Add functionality to add buttons
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.closest('.sidebar-section');
            const sectionTitle = section.querySelector('.sidebar-title').textContent.trim();
            
            switch(sectionTitle) {
                case 'Reviewers':
                    addReviewer();
                    break;
                case 'Tags':
                    addTag();
                    break;
                case 'Work items':
                    addWorkItem();
                    break;
                default:
                    
            }
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('viewToggleMenu');
        const button = document.querySelector('.view-toggle-button');
        
        if (dropdown && button && 
            !dropdown.contains(event.target) && 
            !button.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
});

// Dynamic rendering functions for different providers

// Update loadPullRequestData to use provider-specific rendering
function updateLoadPullRequestData(data) {
    
    currentPullRequestId = data.pullRequestId;
    currentPullRequest = data.pullRequest;
    currentProvider = data.provider || detectProvider(data) || 'github';
    
    if (currentPullRequest) {
        renderPullRequestHeader();
        renderPullRequestInfo(); 
        renderHeaderActions();
        renderSidebar();
        renderOverviewContent();
    }
    
    // Send the pull request data to the backend for storage
    if (currentPullRequest) {
        vscode.postMessage({
            command: 'setPullRequestData',
            pullRequest: currentPullRequest
        });
    }
    
    // Request detailed data from the extension
    vscode.postMessage({
        command: 'loadPullRequestDetails',
        pullRequestId: currentPullRequestId
    });
    
    // Load changes for the files tab immediately when PR opens
    vscode.postMessage({
        command: 'loadFileChanges',
        pullRequestId: currentPullRequestId
    });
}

// Detect provider based on data structure
function detectProvider(data) {
    if (data.pullRequest) {
        // Azure DevOps typically has different field names
        if (data.pullRequest.pullRequestId || data.pullRequest.artifactId) {
            return 'azuredevops';
        }
        // GitHub typically has these fields
        if (data.pullRequest.number || data.pullRequest.node_id) {
            return 'github';
        }
    }
    return 'github'; // Default
}

// Render pull request header based on provider
function renderPullRequestHeader() {
    const prTitleText = document.getElementById('prTitleText');
    if (prTitleText && currentPullRequest) {
        prTitleText.textContent = currentPullRequest.title || `Pull Request #${currentPullRequest.number || currentPullRequestId}`;
    }
}

// Render pull request info bar based on provider
function renderPullRequestInfo() {
    if (!currentPullRequest) {
        return;
    }
    
    const statusBadge = document.getElementById('statusBadge');
    const prIdDisplay = document.getElementById('prIdDisplay');
    const branchInfoDisplay = document.getElementById('branchInfoDisplay');
    
    if (statusBadge) {
        const status = getProviderSpecificStatus(currentPullRequest.state);
        statusBadge.textContent = status.text;
        statusBadge.className = `status-badge ${status.class}`;
    }
    
    if (prIdDisplay) {
        const idPrefix = currentProvider === 'azuredevops' ? '!' : '#';
        prIdDisplay.textContent = `${idPrefix}${currentPullRequest.number || currentPullRequest.pullRequestId || currentPullRequestId}`;
    }
    
    if (branchInfoDisplay && currentPullRequest.sourceBranch && currentPullRequest.targetBranch) {
        const author = currentPullRequest.author?.displayName || 
                      currentPullRequest.author?.name || 
                      currentPullRequest.createdBy?.displayName || 
                      currentPullRequest.createdBy?.name ||
                      (typeof currentPullRequest.author === 'string' ? currentPullRequest.author : 'Unknown');
        branchInfoDisplay.innerHTML = `
            <span>${author} proposes to merge <strong>${currentPullRequest.sourceBranch}</strong> into <strong>${currentPullRequest.targetBranch}</strong></span>
        `;
    }
}

// Render header actions based on provider
function renderHeaderActions() {
    const headerActions = document.getElementById('headerActions');
    if (!headerActions || !currentPullRequest) {
        return;
    }
    
    if (currentProvider === 'azuredevops') {
        headerActions.innerHTML = `
            <div class="approval-container">
                <button class="approval-main-button" id="approvalMainButton">
                    <span id="approvalButtonText">Approve</span>
                    <span class="approval-dropdown-arrow" id="approvalDropdownArrow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M6 9l6 6l6 -6" />
                        </svg>
                    </span>
                </button>
                
                <div class="approval-options-menu" id="approvalOptionsMenu">
                    <div class="approval-option-item" data-action="approve">
                        <div class="approval-option-icon approval-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M5 12l5 5l10 -10" />
                            </svg>
                        </div>
                        <span>Approve</span>
                    </div>
                    <div class="approval-option-item" data-action="approve-suggestions">
                        <div class="approval-option-icon approval-suggest-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M5 12l5 5l10 -10" />
                            </svg>
                        </div>
                        <span>Approve with suggestions</span>
                    </div>
                    <div class="approval-option-item" data-action="wait">
                        <div class="approval-option-icon approval-wait-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M20.942 13.018a9 9 0 1 0 -7.909 7.922" />
                                <path d="M12 7v5l2 2" />
                                <path d="M17 17v5" />
                                <path d="M21 17v5" />
                            </svg>
                        </div>
                        <span>Wait for author</span>
                    </div>
                    <div class="approval-option-item" data-action="reject">
                        <div class="approval-option-icon approval-reject-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M18 6l-12 12" />
                                <path d="M6 6l12 12" />
                            </svg>
                        </div>
                        <span>Reject</span>
                    </div>
                    <div class="approval-option-item approval-option-separator" data-action="reset">
                        <div class="approval-option-icon approval-reset-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M3.06 13a9 9 0 1 0 .49 -4.087" />
                                <path d="M3 4.001v5h5" />
                                <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                            </svg>
                        </div>
                        <span>Reset feedback</span>
                    </div>
                </div>
            </div>
            <div class="autocomplete-container">
                <button class="autocomplete-main-button" id="autoCompleteMainButton">
                    <span class="autocomplete-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
                        </svg>
                    </span>
                    <span id="autoCompleteButtonText">Set auto-complete</span>
                    <span class="autocomplete-dropdown-arrow" id="autoCompleteDropdownArrow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M6 9l6 6l6 -6" />
                        </svg>
                    </span>
                </button>
                
                <div class="autocomplete-options-menu" id="autoCompleteOptionsMenu">
                    <div class="autocomplete-option-item" data-action="complete">
                        <div class="autocomplete-option-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M7 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                <path d="M7 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                <path d="M17 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                <path d="M7 8l0 8" />
                                <path d="M9 18h6a2 2 0 0 0 2 -2v-5" />
                                <path d="M14 14l3 -3l3 3" />
                            </svg>
                        </div>
                        <span>Complete</span>
                    </div>
                    <div class="autocomplete-option-item" data-action="set-auto-complete">
                        <div class="autocomplete-option-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
                            </svg>
                        </div>
                        <span>Set auto-complete</span>
                    </div>
                    <div class="autocomplete-option-item" data-action="mark-draft">
                        <div class="autocomplete-option-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M8 21h-2a3 3 0 0 1 -3 -3v-1h5.5" />
                                <path d="M17 8.5v-3.5a2 2 0 1 1 2 2h-2" />
                                <path d="M19 3h-11a3 3 0 0 0 -3 3v11" />
                                <path d="M9 7h4" />
                                <path d="M9 11h4" />
                                <path d="M18.42 12.61a2.1 2.1 0 0 1 2.97 2.97l-6.39 6.42h-3v-3z" />
                            </svg>
                        </div>
                        <span>Mark as draft</span>
                    </div>
                    <div class="autocomplete-option-item" data-action="abandon">
                        <div class="autocomplete-option-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M4 7l16 0" />
                                <path d="M10 11l0 6" />
                                <path d="M14 11l0 6" />
                                <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                                <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                            </svg>
                        </div>
                        <span>Abandon</span>
                    </div>
                </div>
            </div>
            <button class="btn btn-secondary" onclick="openInBrowser()" title="Open in browser">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-world-www">
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
            </button>
        `;
    } else if (currentProvider === 'github') {
        headerActions.innerHTML = `
            <div class="merge-container">
                <button class="merge-main-button" id="mergeMainButton">
                    <span id="mergeButtonText">Merge pull request</span>
                    <span class="merge-dropdown-arrow" id="mergeDropdownArrow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M6 9l6 6l6 -6" />
                        </svg>
                    </span>
                </button>
                
                <div class="merge-options-menu" id="mergeOptionsMenu">
                    <div class="merge-option-item" data-action="merge">
                        <div class="merge-option-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M7 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                <path d="M7 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                <path d="M17 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                <path d="M7 8l0 8" />
                                <path d="M9 18h6a2 2 0 0 0 2 -2v-5" />
                                <path d="M14 14l3 -3l3 3" />
                            </svg>
                        </div>
                        <span>Merge pull request</span>
                    </div>
                    <div class="merge-option-item" data-action="squash">
                        <div class="merge-option-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M12 3v18" />
                                <path d="M8 19l4 4l4 -4" />
                                <path d="M8 5l4 -4l4 4" />
                            </svg>
                        </div>
                        <span>Squash and merge</span>
                    </div>
                    <div class="merge-option-item" data-action="rebase">
                        <div class="merge-option-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M3 12h18" />
                                <path d="M12 3l9 9l-9 9" />
                            </svg>
                        </div>
                        <span>Rebase and merge</span>
                    </div>
                </div>
            </div>
            <div class="close-container">
                <button class="close-main-button" id="closeMainButton" onclick="closePullRequest()">
                    <span id="closeButtonText">Close pull request</span>
                </button>
            </div>
            <button class="btn btn-secondary" onclick="openInBrowser()" title="Open in browser">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-world-www">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M19.5 7a9 9 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4" />
                    <path d="M11.5 3a16.989 16.989 0 0 0 -1.826 4" />
                    <path d="M12.5 3a16.989 16.989 0 0 1 1.828 4" />
                    <path d="M19.5 17a9 9 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4" />
                    <path d="M11.5 21a16.989 16.989 0 0 1 -1.826 4" />
                    <path d="M12.5 21a16.989 16.989 0 0 0 1.828 -4" />
                    <path d="M2 10l1 4l1.5 -4l1.5 4l1 -4" />
                    <path d="M17 10l1 4l1.5 -4l1.5 4l1 -4" />
                    <path d="M9.5 10l1 4l1.5 -4l1.5 4l1 -4" />
                </svg>
            </button>
        `;
    }
    
    // Initialize expandable approval button after rendering (only for Azure DevOps)
    if (currentProvider === 'azuredevops') {
        if (expandableApprovalButton) {
            expandableApprovalButton = null;
        }
        expandableApprovalButton = new ExpandableApprovalButton();
        
        // Initialize expandable auto-complete button after rendering
        if (expandableAutoCompleteButton) {
            expandableAutoCompleteButton = null;
        }
        expandableAutoCompleteButton = new ExpandableAutoCompleteButton();
    }
    
    // Initialize expandable merge button after rendering (only for GitHub)
    if (currentProvider === 'github') {
        if (expandableMergeButton) {
            expandableMergeButton = null;
        }
        expandableMergeButton = new ExpandableMergeButton();
    }
}

// Render sidebar based on provider
function renderSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (!sidebarContent) {
        return;
    }
    
    if (currentProvider === 'azuredevops') {
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <div class="sidebar-title">
                    Reviewers
                </div>
                <div class="reviewer-category"><strong>Required</strong></div>
                <div class="empty-state" id="requiredReviewers">No required reviewers</div>
                <div class="reviewer-category"><strong>Optional</strong></div>
                <div class="empty-state" id="optionalReviewers">No optional reviewers</div>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">
                    Work items
                </div>
                <div class="empty-state" id="workItems">No work items</div>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">
                    Tags
                </div>
                <div class="empty-state" id="tags">No tags</div>
            </div>
        `;
    } else if (currentProvider === 'github') {
        sidebarContent.innerHTML = `
            <div class="sidebar-section">
                <div class="sidebar-title">
                    Reviewers
                </div>
                <div class="empty-state" id="reviewers">No reviewers</div>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">
                    Assignees
                </div>
                <div class="empty-state" id="assignees">No assignees</div>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">
                    Labels
                </div>
                <div class="empty-state" id="labels">No labels</div>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">
                    Projects
                </div>
                <div class="empty-state" id="projects">No projects</div>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">
                    Milestone
                </div>
                <div class="empty-state" id="milestone">No milestone</div>
            </div>
        `;
    }
    
    // Re-attach event listeners for new buttons
    attachSidebarEventListeners();
}

// Render overview content based on provider
function renderOverviewContent() {
    if (!currentPullRequest) {
        return;
    }
    
    // Update description and show/hide section based on content
    const descriptionSection = document.querySelector('.section');
    const prDescriptionContent = document.getElementById('prDescriptionContent');
    
    if (prDescriptionContent) {
        if (currentPullRequest.description && currentPullRequest.description.trim()) {
            prDescriptionContent.textContent = currentPullRequest.description;
            if (descriptionSection) {
                descriptionSection.style.display = 'block';
            }
        } else {
            // Hide the description section if there's no description
            if (descriptionSection) {
                descriptionSection.style.display = 'none';
            }
        }
    }
    
    // Render checks/status based on provider
    
    if (currentProvider === 'azuredevops') {
        
        renderAzureDevOpsChecks();
    } else if (currentProvider === 'github') {
        
        renderGitHubChecks();
    } else {
        
        renderGitHubChecks();
    }
    
    // Update comment meta
    const commentMeta = document.getElementById('commentMeta');
    if (commentMeta && currentPullRequest.author) {
        const timeAgo = getTimeAgo(currentPullRequest.createdAt);
        const author = currentPullRequest.author?.displayName || 
                      currentPullRequest.author?.name || 
                      currentPullRequest.createdBy?.displayName || 
                      currentPullRequest.createdBy?.name ||
                      (typeof currentPullRequest.author === 'string' ? currentPullRequest.author : 'Unknown');
        commentMeta.innerHTML = `
            <span><svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-user"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></svg></span>
            <span>${author} created the pull request</span>
            <span class="timestamp">${timeAgo}</span>
        `;
    }
    
    // Add Close with comment button for GitHub
    if (currentProvider === 'github') {
        const commentActions = document.querySelector('.comment-actions');
        if (commentActions) {
            // Check if Close with comment button already exists
            let closeWithCommentBtn = document.getElementById('closeWithCommentBtn');
            if (!closeWithCommentBtn) {
                closeWithCommentBtn = document.createElement('button');
                closeWithCommentBtn.id = 'closeWithCommentBtn';
                closeWithCommentBtn.className = 'btn btn-secondary comment-close-btn';
                closeWithCommentBtn.style.display = 'none';
                closeWithCommentBtn.textContent = 'Close with comment';
                closeWithCommentBtn.onclick = closeWithComment;
                
                // Insert before the comment meta div
                const commentMeta = document.getElementById('commentMeta');
                if (commentMeta) {
                    commentActions.insertBefore(closeWithCommentBtn, commentMeta);
                } else {
                    commentActions.appendChild(closeWithCommentBtn);
                }
            }
        }
    }
}

// Get provider-specific status
function getProviderSpecificStatus(state) {
    if (currentProvider === 'azuredevops') {
        switch (state?.toLowerCase()) {
            case 'active': return { text: 'Active', class: 'status-active' };
            case 'completed': return { text: 'Completed', class: 'status-completed' };
            case 'abandoned': return { text: 'Abandoned', class: 'status-abandoned' };
            default: return { text: 'Active', class: 'status-active' };
        }
    } else {
        switch (state?.toLowerCase()) {
            case 'open': return { text: 'Open', class: 'status-open' };
            case 'closed': return { text: 'Closed', class: 'status-closed' };
            case 'merged': return { text: 'Merged', class: 'status-merged' };
            default: return { text: 'Open', class: 'status-open' };
        }
    }
}

// Render Azure DevOps specific checks
function renderAzureDevOpsChecks() {
    const checkStatusSection = document.getElementById('checkStatusSection');
    if (!checkStatusSection) {
        return;
    }
    
    // Request checks data from extension
    vscode.postMessage({
        command: 'loadAzureDevOpsChecks',
        pullRequestId: currentPullRequestId
    });
    
    checkStatusSection.style.display = 'block';
}

// Render GitHub specific checks
function renderGitHubChecks() {
    const checkStatusSection = document.getElementById('checkStatusSection');
    if (!checkStatusSection) {
        return;
    }
    
    // Request checks data from extension
    vscode.postMessage({
        command: 'loadGitHubChecks',
        pullRequestId: currentPullRequestId
    });
    
    checkStatusSection.style.display = 'block';
}

// Display Azure DevOps checks data
function displayAzureDevOpsChecks(data) {
    
    const checkStatusSection = document.getElementById('checkStatusSection');
    const checkHeader = document.getElementById('checkHeader');
    const checkItems = document.getElementById('checkItems');
    const statusMessages = document.getElementById('statusMessages');
    
    console.log('Check elements found:', {
        checkStatusSection: !!checkStatusSection,
        checkHeader: !!checkHeader,
        checkItems: !!checkItems,
        statusMessages: !!statusMessages
    });
    
    if (!checkStatusSection || !checkHeader || !checkItems || !statusMessages) {
        console.error('Check status elements not found');
        return;
    }
    
    const checks = data.checks || [];
    const policies = data.policies || [];
    const allChecks = [...checks, ...policies];
    
    if (allChecks.length === 0) {
        checkStatusSection.style.display = 'none';
        return;
    }
    
    // Calculate summary
    const failedCount = allChecks.filter(check => check.status === 'failed' || check.status === 'rejected').length;
    const pendingCount = allChecks.filter(check => check.status === 'pending' || check.status === 'waiting').length;
    const successCount = allChecks.filter(check => check.status === 'succeeded' || check.status === 'approved').length;
    const totalRequired = allChecks.filter(check => check.isRequired).length;
    
    // Render header summary
    let headerContent = '';
    if (failedCount > 0) {
        headerContent = `<span class="status-icon status-failed">✕</span> ${failedCount} of ${totalRequired} required checks failed`;
    } else if (pendingCount > 0) {
        headerContent = `<span class="status-icon status-pending"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#0078d4" /><path d="M23 16c0 .325-.022.645-.065.959-.07.509.137 1.031.582 1.289.622.36 1.42.058 1.545-.65a9.204 9.204 0 0 0-6.27-10.367c-.664-.21-1.292.324-1.292 1.02 0 .532.374.982.873 1.162A7.003 7.003 0 0 1 23 16zM9 16a7.003 7.003 0 0 1 4.627-6.587c.5-.18.873-.63.873-1.161 0-.697-.628-1.232-1.292-1.02a9.204 9.204 0 0 0-6.27 10.367c.124.707.924 1.008 1.545.649.445-.258.652-.78.582-1.29A7.062 7.062 0 0 1 9 16zm7 7a6.975 6.975 0 0 0 4.728-1.838c.403-.37.999-.484 1.472-.21.586.339.744 1.121.261 1.597A9.17 9.17 0 0 1 16 25.2a9.17 9.17 0 0 1-6.461-2.65c-.482-.477-.325-1.26.261-1.599.473-.273 1.069-.159 1.472.21A6.975 6.975 0 0 0 16 23z" fill="#fff"/></svg></span> ${pendingCount} checks pending`;
    } else if (successCount === totalRequired) {
        headerContent = `<span class="status-icon status-success">✓</span> All checks have passed`;
    }
    
    checkHeader.innerHTML = headerContent;
    
    // Render individual check items
    let itemsHtml = '';
    allChecks.forEach(check => {
        const statusClass = getCheckStatusClass(check.status);
        const statusIcon = getCheckStatusIcon(check.status);
        const checkName = check.displayName || check.name || 'Unknown Check';

        
        itemsHtml += `
            <div class="check-item">
                <div class="check-item-header">
                    <div class="check-name">
                        <span class="status-icon ${statusClass}">${statusIcon}</span>
                        <span>${checkName}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    checkItems.innerHTML = itemsHtml;
    
    // Show additional status messages if needed
    if (successCount === totalRequired && failedCount === 0) {
        statusMessages.innerHTML = `
            <div class="success-message">
                <span class="success-icon">✓</span>
                All checks have passed
                <span class="timestamp">${getTimeAgo(new Date().toISOString())}</span>
            </div>
        `;
    } else {
        statusMessages.innerHTML = '';
    }
    
    checkStatusSection.style.display = 'block';
}

// Display GitHub checks data
function displayGitHubChecks(data) {
    
    const checkStatusSection = document.getElementById('checkStatusSection');
    const checkHeader = document.getElementById('checkHeader');
    const checkItems = document.getElementById('checkItems');
    const statusMessages = document.getElementById('statusMessages');
    
    if (!checkStatusSection || !checkHeader || !checkItems || !statusMessages) {
        console.error('Check status elements not found');
        return;
    }
    
    const checkRuns = data.checkRuns || [];
    const statusChecks = data.statusChecks || [];
    const allChecks = [...checkRuns, ...statusChecks];
    
    if (allChecks.length === 0) {
        checkStatusSection.style.display = 'none';
        return;
    }
    
    // Calculate summary
    const failedCount = allChecks.filter(check => 
        check.status === 'failure' || check.status === 'error' || 
        check.conclusion === 'failure' || check.conclusion === 'cancelled'
    ).length;
    const pendingCount = allChecks.filter(check => 
        check.status === 'pending' || check.status === 'queued' || 
        check.status === 'in_progress' || check.conclusion === null
    ).length;
    const successCount = allChecks.filter(check => 
        check.status === 'success' || check.conclusion === 'success'
    ).length;
    
    // Render header summary
    let headerContent = '';
    if (failedCount > 0) {
        headerContent = `<span class="status-icon status-failed">✕</span> ${failedCount} checks failed`;
    } else if (pendingCount > 0) {
        headerContent = `<span class="status-icon status-pending"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#0078d4" /><path d="M23 16c0 .325-.022.645-.065.959-.07.509.137 1.031.582 1.289.622.36 1.42.058 1.545-.65a9.204 9.204 0 0 0-6.27-10.367c-.664-.21-1.292.324-1.292 1.02 0 .532.374.982.873 1.162A7.003 7.003 0 0 1 23 16zM9 16a7.003 7.003 0 0 1 4.627-6.587c.5-.18.873-.63.873-1.161 0-.697-.628-1.232-1.292-1.02a9.204 9.204 0 0 0-6.27 10.367c.124.707.924 1.008 1.545.649.445-.258.652-.78.582-1.29A7.062 7.062 0 0 1 9 16zm7 7a6.975 6.975 0 0 0 4.728-1.838c.403-.37.999-.484 1.472-.21.586.339.744 1.121.261 1.597A9.17 9.17 0 0 1 16 25.2a9.17 9.17 0 0 1-6.461-2.65c-.482-.477-.325-1.26.261-1.599.473-.273 1.069-.159 1.472.21A6.975 6.975 0 0 0 16 23z" fill="#fff"/></svg></span> ${pendingCount} checks pending`;
    } else if (successCount > 0) {
        headerContent = `<span class="status-icon status-success">✓</span> All checks have passed`;
    }
    
    checkHeader.innerHTML = headerContent;
    
    // Render individual check items
    let itemsHtml = '';
    allChecks.forEach(check => {
        const status = check.conclusion || check.status;
        const statusClass = getCheckStatusClass(status);
        const statusIcon = getCheckStatusIcon(status);
        const checkName = check.name || 'Unknown Check';
        const description = check.output?.summary || check.description || '';
        const detailsUrl = check.html_url || check.details_url;
        
        itemsHtml += `
            <div class="check-item">
                <div class="check-item-header">
                    <div class="check-name">
                        <span class="status-icon ${statusClass}">${statusIcon}</span>
                        <span>${checkName}</span>
                    </div>
                    ${detailsUrl ? `<button class="re-queue-btn" onclick="window.open('${detailsUrl}', '_blank')">Details</button>` : ''}
                </div>
            </div>
        `;
    });
    
    checkItems.innerHTML = itemsHtml;
    
    // Show additional status messages if needed
    if (successCount === allChecks.length && failedCount === 0) {
        statusMessages.innerHTML = `
            <div class="success-message">
                <span class="success-icon">✓</span>
                All checks have passed
                <span class="timestamp">${getTimeAgo(new Date().toISOString())}</span>
            </div>
        `;
    } else {
        statusMessages.innerHTML = '';
    }
    
    checkStatusSection.style.display = 'block';
}

// Display commits
function displayCommits(data) {
    
    const commitsList = document.getElementById('commitsList');
    const commitsCount = document.getElementById('commitsCount');
    
    if (!commitsList || !commitsCount) {
        console.error('Commits elements not found');
        return;
    }
    
    const commits = data.commits || [];
    
    if (commits.length === 0) {
        commitsList.innerHTML = `
            <div class="commits-empty">
                <div class="commits-empty-icon">📝</div>
                <div class="commits-empty-title">No commits found</div>
                <div class="commits-empty-message">This pull request doesn't have any commits yet.</div>
            </div>
        `;
        commitsCount.textContent = '0 commits';
        
        // Hide commits badge when there are no commits
        const commitsBadge = document.getElementById('commitsBadge');
        if (commitsBadge) {
            commitsBadge.style.display = 'none';
        }
        return;
    }
    
    // Update commits count
    commitsCount.textContent = `${commits.length} commit${commits.length === 1 ? '' : 's'}`;
    
    // Update commits badge
    const commitsBadge = document.getElementById('commitsBadge');
    if (commitsBadge) {
        commitsBadge.textContent = commits.length;
        commitsBadge.style.display = 'inline-flex';
    }
    
    // Render commits list
    let html = '';
    commits.forEach(commit => {
        const authorInitials = getAuthorInitials(commit.author);
        const commitDate = formatCommitDate(commit.date);
        const shortSha = commit.sha ? commit.sha.substring(0, 7) : 'unknown';
        
        html += `
            <div class="commit-item" onclick="viewCommit('${commit.sha}')" title="Click to view commit details">
                <div class="commit-avatar" title="${escapeHtml(commit.author)}">${authorInitials}</div>
                <div class="commit-content">
                    <div class="commit-message">${escapeHtml(commit.message)}</div>
                    <div class="commit-meta">
                        <span class="commit-author">${escapeHtml(commit.author)}</span>
                        <span class="commit-date">${commitDate}</span>
                        <span class="commit-sha" onclick="event.stopPropagation(); copyToClipboard('${commit.sha}')" title="Copy full SHA: ${commit.sha}">${shortSha}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    commitsList.innerHTML = html;
}

// Helper function to get author initials
function getAuthorInitials(author) {
    if (!author || typeof author !== 'string') {
        return '?';
    }
    
    const parts = author.trim().split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    } else if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return '?';
}

// Helper function to format commit date
function formatCommitDate(dateString) {
    if (!dateString) {
        return 'Unknown date';
    }
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) {
            return 'just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

// Copy commit SHA to clipboard
function copyToClipboard(text) {
    if (!text) {
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        
        // Could show a toast notification here
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            
        } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
        }
        document.body.removeChild(textArea);
    });
}

// View commit details
function viewCommit(sha) {
    if (!sha) {
        return;
    }
    
    
    vscode.postMessage({
        command: 'viewCommit',
        sha: sha,
        pullRequestId: currentPullRequestId
    });
}

// Display reviewers
function displayReviewers(data) {
    
    const reviewers = data.reviewers || [];
    
    if (currentProvider === 'azuredevops') {
        displayAzureDevOpsReviewers(reviewers);
    } else {
        displayGitHubReviewers(reviewers);
    }
}

// Display Azure DevOps reviewers in the sidebar
function displayAzureDevOpsReviewers(reviewers) {
    
    
    // Find required and optional reviewers containers
    const requiredReviewersContainer = document.getElementById('requiredReviewers');
    const optionalReviewersContainer = document.getElementById('optionalReviewers');
    
    if (!requiredReviewersContainer || !optionalReviewersContainer) {
        console.error('Reviewers containers not found');
        return;
    }
    
    const requiredReviewers = reviewers.filter(r => r.isRequired);
    const optionalReviewers = reviewers.filter(r => !r.isRequired);
    
    // Display required reviewers
    if (requiredReviewers.length === 0) {
        requiredReviewersContainer.innerHTML = '<div class="empty-state">No required reviewers</div>';
    } else {
        let requiredHtml = '';
        requiredReviewers.forEach(reviewer => {
            const statusClass = getReviewerStatusClass(reviewer.vote);
            const statusText = reviewer.voteDescription;
            const avatarInitials = getAuthorInitials(reviewer.displayName);
            
            // Use avatarDataUrl if available, otherwise fall back to imageUrl or initials
            let avatarContent = '';
            if (reviewer.avatarDataUrl) {
                avatarContent = `<img src="${reviewer.avatarDataUrl}" alt="${escapeHtml(reviewer.displayName)}" class="reviewer-avatar-img" />`;
            } else if (reviewer.imageUrl) {
                avatarContent = `<img src="${reviewer.imageUrl}" alt="${escapeHtml(reviewer.displayName)}" class="reviewer-avatar-img" />`;
            } else {
                avatarContent = avatarInitials;
            }
            
            requiredHtml += `
                <div class="reviewer-item ${statusClass}" title="${reviewer.voteDescription}">
                    <div class="reviewer-avatar" title="${escapeHtml(reviewer.displayName)}">
                        ${avatarContent}
                    </div>
                    <div class="reviewer-info">
                        <div class="reviewer-name">${escapeHtml(reviewer.displayName)}</div>
                        <div class="reviewer-status">${statusText}</div>
                    </div>
                </div>
            `;
        });
        requiredReviewersContainer.innerHTML = requiredHtml;
    }
    
    // Display optional reviewers
    if (optionalReviewers.length === 0) {
        optionalReviewersContainer.innerHTML = '<div class="empty-state">No optional reviewers</div>';
    } else {
        let optionalHtml = '';
        optionalReviewers.forEach(reviewer => {
            const statusClass = getReviewerStatusClass(reviewer.vote);
            const statusText = reviewer.voteDescription;
            const avatarInitials = getAuthorInitials(reviewer.displayName);
            
            // Use avatarDataUrl if available, otherwise fall back to imageUrl or initials
            let avatarContent = '';
            if (reviewer.avatarDataUrl) {
                avatarContent = `<img src="${reviewer.avatarDataUrl}" alt="${escapeHtml(reviewer.displayName)}" class="reviewer-avatar-img" />`;
            } else if (reviewer.imageUrl) {
                avatarContent = `<img src="${reviewer.imageUrl}" alt="${escapeHtml(reviewer.displayName)}" class="reviewer-avatar-img" />`;
            } else {
                avatarContent = avatarInitials;
            }
            
            optionalHtml += `
                <div class="reviewer-item ${statusClass}" title="${reviewer.voteDescription}">
                    <div class="reviewer-avatar" title="${escapeHtml(reviewer.displayName)}">
                        ${avatarContent}
                    </div>
                    <div class="reviewer-info">
                        <div class="reviewer-name">${escapeHtml(reviewer.displayName)}</div>
                        <div class="reviewer-status">${statusText}</div>
                    </div>
                </div>
            `;
        });
        optionalReviewersContainer.innerHTML = optionalHtml;
    }
}

// Display GitHub reviewers in the sidebar
function displayGitHubReviewers(reviewers) {
    
    
    const reviewersContainer = document.getElementById('reviewers');
    if (!reviewersContainer) {
        console.error('GitHub reviewers container not found');
        return;
    }
    
    if (reviewers.length === 0) {
        reviewersContainer.innerHTML = '<div class="empty-state">No reviewers</div>';
        return;
    }
    
    let html = '';
    reviewers.forEach(reviewer => {
        const statusClass = getGitHubReviewerStatusClass(reviewer.state);
        const statusText = reviewer.state || 'Pending';
        const avatarInitials = getAuthorInitials(reviewer.name);
        
        html += `
            <div class="reviewer-item ${statusClass}" title="${reviewer.state}">
                <div class="reviewer-avatar" title="${escapeHtml(reviewer.name)}">
                    ${avatarInitials}
                </div>
                <div class="reviewer-info">
                    <div class="reviewer-name">${escapeHtml(reviewer.name)}</div>
                    <div class="reviewer-status">${statusText}</div>
                </div>
            </div>
        `;
    });
    
    reviewersContainer.innerHTML = html;
}

// Helper functions for reviewer status
function getReviewerStatusClass(vote) {
    switch (vote) {
        case 10: // Approved
            return 'reviewer-approved';
        case 5: // Approved with suggestions
            return 'reviewer-approved-suggestions';
        case -5: // Waiting for author
            return 'reviewer-waiting';
        case -10: // Rejected
            return 'reviewer-rejected';
        default: // No vote
            return 'reviewer-pending';
    }
}

function getGitHubReviewerStatusClass(state) {
    switch (state?.toLowerCase()) {
        case 'approved':
            return 'reviewer-approved';
        case 'rejected':
        case 'changes_requested':
            return 'reviewer-rejected';
        case 'pending':
        default:
            return 'reviewer-pending';
    }
}

// Helper functions for check status
function getCheckStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'failed':
        case 'failure':
        case 'error':
        case 'cancelled':
        case 'rejected':
            return 'status-failed';
        case 'pending':
        case 'queued':
        case 'in_progress':
        case 'waiting':
            return 'status-pending';
        case 'success':
        case 'succeeded':
        case 'approved':
            return 'status-success';
        default:
            return 'status-pending';
    }
}

function getCheckStatusIcon(status) {
    switch (status?.toLowerCase()) {
        case 'failed':
        case 'failure':
        case 'error':
        case 'cancelled':
        case 'rejected':
            return '✕';
        case 'pending':
        case 'queued':
        case 'in_progress':
        case 'waiting':
            return '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#0078d4" /><path d="M23 16c0 .325-.022.645-.065.959-.07.509.137 1.031.582 1.289.622.36 1.42.058 1.545-.65a9.204 9.204 0 0 0-6.27-10.367c-.664-.21-1.292.324-1.292 1.02 0 .532.374.982.873 1.162A7.003 7.003 0 0 1 23 16zM9 16a7.003 7.003 0 0 1 4.627-6.587c.5-.18.873-.63.873-1.161 0-.697-.628-1.232-1.292-1.02a9.204 9.204 0 0 0-6.27 10.367c.124.707.924 1.008 1.545.649.445-.258.652-.78.582-1.29A7.062 7.062 0 0 1 9 16zm7 7a6.975 6.975 0 0 0 4.728-1.838c.403-.37.999-.484 1.472-.21.586.339.744 1.121.261 1.597A9.17 9.17 0 0 1 16 25.2a9.17 9.17 0 0 1-6.461-2.65c-.482-.477-.325-1.26.261-1.599.473-.273 1.069-.159 1.472.21A6.975 6.975 0 0 0 16 23z" fill="#fff"/></svg>';
        case 'success':
        case 'succeeded':
        case 'approved':
            return '✓';
        default:
            return '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#0078d4" /><path d="M23 16c0 .325-.022.645-.065.959-.07.509.137 1.031.582 1.289.622.36 1.42.058 1.545-.65a9.204 9.204 0 0 0-6.27-10.367c-.664-.21-1.292.324-1.292 1.02 0 .532.374.982.873 1.162A7.003 7.003 0 0 1 23 16zM9 16a7.003 7.003 0 0 1 4.627-6.587c.5-.18.873-.63.873-1.161 0-.697-.628-1.232-1.292-1.02a9.204 9.204 0 0 0-6.27 10.367c.124.707.924 1.008 1.545.649.445-.258.652-.78.582-1.29A7.062 7.062 0 0 1 9 16zm7 7a6.975 6.975 0 0 0 4.728-1.838c.403-.37.999-.484 1.472-.21.586.339.744 1.121.261 1.597A9.17 9.17 0 0 1 16 25.2a9.17 9.17 0 0 1-6.461-2.65c-.482-.477-.325-1.26.261-1.599.473-.273 1.069-.159 1.472.21A6.975 6.975 0 0 0 16 23z" fill="#fff"/></svg>';
    }
}

// Utility function to get time ago
function getTimeAgo(dateString) {
    if (!dateString) {
        return '';
    }
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else {
        return `${diffDays}d ago`;
    }
}

// Attach event listeners for sidebar buttons
function attachSidebarEventListeners() {
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.closest('.sidebar-section');
            const sectionTitle = section.querySelector('.sidebar-title').textContent.trim();
            
            if (currentProvider === 'azuredevops') {
                switch(sectionTitle) {
                    case 'Reviewers':
                        addReviewer();
                        break;
                    case 'Work items':
                        addWorkItem();
                        break;
                    case 'Tags':
                        addTag();
                        break;
                    default:
                        
                }
            } else if (currentProvider === 'github') {
                switch(sectionTitle) {
                    case 'Reviewers':
                        addReviewer();
                        break;
                    case 'Assignees':
                        addAssignee();
                        break;
                    case 'Labels':
                        addLabel();
                        break;
                    case 'Projects':
                        addProject();
                        break;
                    case 'Milestone':
                        addMilestone();
                        break;
                    default:
                        
                }
            }
        });
    });
}

// Provider-specific action functions
function setAutoComplete() {
    
    vscode.postMessage({
        command: 'setAutoComplete',
        pullRequestId: currentPullRequestId
    });
}

function openActionMenu() {
    
    // Could show a context menu with additional actions
}

function addAssignee() {
    
    vscode.postMessage({
        command: 'addAssignee',
        pullRequestId: currentPullRequestId
    });
}

function addLabel() {
    
    vscode.postMessage({
        command: 'addLabel',
        pullRequestId: currentPullRequestId
    });
}

function addProject() {
    
    vscode.postMessage({
        command: 'addProject',
        pullRequestId: currentPullRequestId
    });
}

function addMilestone() {
    
    vscode.postMessage({
        command: 'addMilestone',
        pullRequestId: currentPullRequestId
    });
}


// Display pull request threads/activity
function displayPullRequestThreads(data) {
    
    
    
    // Store threads globally for use in Monaco editor
    allThreads = data.value || [];
    
    
    
    // Clear all loading states since threads are being refreshed
    clearAllLoadingStates();
    
    // Re-enable all disabled buttons
    const disabledButtons = document.querySelectorAll('button[disabled]');
    disabledButtons.forEach(button => {
        button.disabled = false;
        if (button.textContent.includes('Adding reply')) {
            button.innerHTML = 'Reply';
        } else if (button.textContent.includes('Replying & Resolving')) {
            button.innerHTML = 'Reply & Resolve';
        } else if (button.textContent.includes('Resolving')) {
            button.innerHTML = 'Resolve';
        }
    });
    
    const historyTimeline = document.getElementById('historyTimeline');
    const historySection = document.querySelector('.history-section');
    
    if (!historyTimeline) {
        console.warn('History timeline element not found');
        return;
    }
    
    if (!data || !data.value || data.value.length === 0) {
        // Hide the entire history section when there's no activity
        if (historySection) {
            historySection.style.display = 'none';
        }
        return;
    }
    
    // Show the history section when there is activity
    if (historySection) {
        historySection.style.display = 'block';
    }
    
    // Sort threads by publish date (newest first)
    const sortedThreads = data.value.sort((a, b) => 
        new Date(b.publishedDate) - new Date(a.publishedDate)
    );
    
    const threadsHtml = sortedThreads.map(thread => renderThread(thread)).join('');
    historyTimeline.innerHTML = threadsHtml;
    
    // Add reply functionality
    addReplyEventListeners();
    
    // Update inline comments in the current file if Monaco editor is active
    if (monacoDiffEditor && currentFile) {
        updateInlineComments(currentFile.fileName);
    }
}

function renderMarkdown(text) {
    if (!text) {
        return '';
    }
    
    // Escape HTML first to prevent XSS
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    
    // Convert markdown links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--vscode-textLink-foreground); text-decoration: underline;">$1</a>');
    
    // Convert **bold** text
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* text
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert `code` text
    html = html.replace(/`([^`]+)`/g, '<code style="background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family);">$1</code>');
    
    // Convert line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

function renderThread(thread) {
    const firstComment = thread.comments && thread.comments[0];
    if (!firstComment) {
        return '';
    }
    
    const author = firstComment.author;
    
    // Handle different date fields for Azure DevOps vs GitHub
    const publishedDate = new Date(firstComment.publishedDate || firstComment.created_at || firstComment.lastUpdatedDate);
    const formattedDate = formatDate(publishedDate);
    const threadType = getThreadType(thread, firstComment);
    
    // Handle different data structures for Azure DevOps vs GitHub
    let authorName, authorAvatar;
    
    if (author.displayName) {
        // Azure DevOps format
        authorName = author.displayName;
        authorAvatar = getAuthorInitials(author.displayName);
    } else if (author.name || author.login) {
        // GitHub format
        authorName = author.name || author.login;
        if (author.avatar_url) {
            authorAvatar = `<img src="${author.avatar_url}" alt="${escapeHtml(authorName)}" style="width: 100%; height: 100%; border-radius: 50%;">`;
        } else {
            authorAvatar = getAuthorInitials(authorName);
        }
    } else {
        // Fallback
        authorName = 'Unknown';
        authorAvatar = getAuthorInitials('Unknown');
    }
    
    const isResolved = thread.status === 'closed' || thread.status === 'fixed' || thread.isResolved;
    
    // Format the comment content for system messages
    let displayContent = firstComment.content;
    if (firstComment.commentType === 'system') {
        displayContent = formatSystemMessage(firstComment.content, authorName);
    } else {
        // Render markdown for regular comments
        displayContent = renderMarkdown(firstComment.content);
    }

    // Add resolved indicator
    const resolvedIndicator = isResolved ? `
        <span class="resolved-indicator" title="Thread resolved">
            <span style="color: var(--vscode-testing-iconPassed); margin-left: 8px;">✓ Resolved</span>
        </span>
    ` : '';
    
    let threadContent = `
        <div class="thread-item ${isResolved ? 'resolved-thread' : ''}" data-thread-id="${thread.id}">
            <div class="thread-header">
                <div class="author-avatar">${authorAvatar}</div>
                <span class="author-name">${authorName}</span>
                <span class="thread-timestamp">${formattedDate}</span>
                ${threadType.badge}
                ${resolvedIndicator}
            </div>
            <div class="thread-content ${threadType.class}">
                <div class="comment-text">${displayContent}</div>
            </div>
    `;
    
    // Add nested comments if they exist
    if (thread.comments && thread.comments.length > 1) {
        const nestedComments = thread.comments.slice(1).map(comment => renderNestedComment(comment)).join('');
        threadContent += `
            <div class="nested-comments">
                ${nestedComments}
            </div>
        `;
    }
    
    // Add reply functionality only for review comments (inline/file comments), not regular issue comments
    if (firstComment.commentType !== 'system' && thread.commentType === 'review_comment') {
        threadContent += `
            <div class="reply-actions">
                <button class="reply-btn" onclick="toggleReplyForm('${thread.id}')">Reply</button>
                ${!isResolved ? `<button class="resolve-btn" onclick="resolveThread('${thread.id}')">Resolve</button>` : ''}
            </div>
            <div class="reply-form" id="reply-form-${thread.id}">
                <textarea class="reply-input" placeholder="Write a reply..." rows="3"></textarea>
                <div class="reply-form-actions">
                    <button class="btn btn-primary" onclick="submitReply('${thread.id}')">Reply</button>
                    <button class="btn btn-primary resolve-reply-btn" onclick="submitReplyAndResolve('${thread.id}')">Reply & Resolve</button>
                    <button class="btn btn-secondary" onclick="cancelReply('${thread.id}')">Cancel</button>
                </div>
            </div>
        `;
    }
    
    threadContent += '</div>';
    return threadContent;
}

function renderNestedComment(comment) {
    const author = comment.author;
    
    // Handle different date fields for Azure DevOps vs GitHub
    const publishedDate = new Date(comment.publishedDate || comment.created_at || comment.lastUpdatedDate);
    const formattedDate = formatDate(publishedDate);
    
    // Handle different data structures for Azure DevOps vs GitHub
    let authorName, authorAvatar;
    
    if (author.displayName) {
        // Azure DevOps format
        authorName = author.displayName;
        authorAvatar = getAuthorInitials(author.displayName);
    } else if (author.name || author.login) {
        // GitHub format
        authorName = author.name || author.login;
        if (author.avatar_url) {
            authorAvatar = `<img src="${author.avatar_url}" alt="${escapeHtml(authorName)}" style="width: 100%; height: 100%; border-radius: 50%;">`;
        } else {
            authorAvatar = getAuthorInitials(authorName);
        }
    } else {
        // Fallback
        authorName = 'Unknown';
        authorAvatar = getAuthorInitials('Unknown');
    }
    
    // Render markdown for nested comments
    const renderedContent = renderMarkdown(comment.content);
    
    return `
        <div class="nested-comment">
            <div class="thread-header">
                <div class="author-avatar">${authorAvatar}</div>
                <span class="author-name">${authorName}</span>
                <span class="thread-timestamp">${formattedDate}</span>
            </div>
            <div class="thread-content">
                <div class="comment-text">${renderedContent}</div>
            </div>
        </div>
    `;
}

function formatSystemMessage(content, authorName) {
    // Convert verbose system messages to simple "<person> <action>" format
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('approved the pull request')) {
        return `${authorName} approved the pull request`;
    } else if (lowerContent.includes('is waiting for the author')) {
        return `${authorName} is waiting for the author`;
    } else if (lowerContent.includes('voted 10')) {
        return `${authorName} approved`;
    } else if (lowerContent.includes('voted -5')) {
        return `${authorName} is waiting for the author`;
    } else if (lowerContent.includes('voted -10')) {
        return `${authorName} rejected`;
    } else if (lowerContent.includes('voted 5')) {
        return `${authorName} approved with suggestions`;
    } else if (lowerContent.includes('vote changed')) {
        return `${authorName} changed vote`;
    } else if (lowerContent.includes('joined as a reviewer')) {
        return `${authorName} joined as reviewer`;
    } else if (lowerContent.includes('marked as a draft')) {
        return `${authorName} marked as draft`;
    } else if (lowerContent.includes('published')) {
        return `${authorName} published`;
    } else if (lowerContent.includes('feedback has been reset')) {
        return `${authorName} reset feedback`;
    }
    
    // For any other system message, return as-is
    return content;
}

function getThreadType(thread, comment) {
    if (comment.commentType === 'system') {
        const content = comment.content.toLowerCase();
        
        if (content.includes('voted')) {
            const isApproved = content.includes('voted 10');
            const isRejected = content.includes('voted -') || content.includes('voted 0');
            
            if (isApproved) {
                return {
                    badge: '<span class="thread-type vote">Approved</span>',
                    class: 'system'
                };
            } else if (isRejected) {
                return {
                    badge: '<span class="thread-type vote negative">Vote Changed</span>',
                    class: 'system'
                };
            } else {
                return {
                    badge: '<span class="thread-type vote">Vote</span>',
                    class: 'system'
                };
            }
        } else if (content.includes('approved the pull request')) {
            return {
                badge: '<span class="thread-type vote">Approved</span>',
                class: 'system'
            };
        } else if (content.includes('is waiting for the author')) {
            return {
                badge: '<span class="thread-type vote">Waiting</span>',
                class: 'system'
            };
        } else if (content.includes('joined as a reviewer')) {
            return {
                badge: '<span class="thread-type system">Reviewer Added</span>',
                class: 'system'
            };
        } else if (content.includes('marked as a draft')) {
            return {
                badge: '<span class="thread-type system">Draft</span>',
                class: 'system'
            };
        } else if (content.includes('published')) {
            return {
                badge: '<span class="thread-type system">Published</span>',
                class: 'system'
            };
        } else {
            return {
                badge: '<span class="thread-type system">System</span>',
                class: 'system'
            };
        }
    } else {
        return {
            badge: '<span class="thread-type">Comment</span>',
            class: ''
        };
    }
}

function getAuthorInitials(displayName) {
    if (!displayName) {
        return '?';
    }
    
    const words = displayName.split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    } else {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
}

function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function addReplyEventListeners() {
    // Reply event listeners are handled by onclick attributes in the HTML
}

function toggleReplyForm(threadId) {
    const replyForm = document.getElementById(`reply-form-${threadId}`);
    if (replyForm) {
        replyForm.classList.toggle('active');
        
        if (replyForm.classList.contains('active')) {
            const textarea = replyForm.querySelector('.reply-input');
            if (textarea) {
                textarea.focus();
            }
        }
    }
}

function submitReply(threadId) {
    const replyForm = document.getElementById(`reply-form-${threadId}`);
    const textarea = replyForm?.querySelector('.reply-input');
    const submitButton = replyForm?.querySelector('.btn.btn-primary');
    
    if (!textarea || !textarea.value.trim()) {
        return;
    }
    
    const replyContent = textarea.value.trim();
    
    // Show loading state
    showThreadLoadingState(threadId, 'Adding reply...');
    
    // Disable submit buttons
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner-small"></span> Adding reply...';
    }
    
    // Send reply to extension
    vscode.postMessage({
        command: 'addReplyToThread',
        threadId: threadId,
        content: replyContent,
        pullRequestId: currentPullRequestId
    });
    
    // Clear form and hide
    textarea.value = '';
    replyForm.classList.remove('active');
    
    
}

function submitReplyAndResolve(threadId) {
    const replyForm = document.getElementById(`reply-form-${threadId}`);
    const textarea = replyForm?.querySelector('.reply-input');
    const replyResolveButton = replyForm?.querySelector('.resolve-reply-btn');
    
    if (!textarea || !textarea.value.trim()) {
        return;
    }
    
    const replyContent = textarea.value.trim();
    
    // Show loading state
    showThreadLoadingState(threadId, 'Adding reply and resolving...');
    
    // Disable submit buttons
    if (replyResolveButton) {
        replyResolveButton.disabled = true;
        replyResolveButton.innerHTML = '<span class="loading-spinner-small"></span> Replying & Resolving...';
    }
    
    // Send reply and resolve to extension
    vscode.postMessage({
        command: 'addReplyToThreadAndResolve',
        threadId: threadId,
        content: replyContent,
        pullRequestId: currentPullRequestId
    });
    
    // Clear form and hide
    textarea.value = '';
    replyForm.classList.remove('active');
    
    
}

function cancelReply(threadId) {
    const replyForm = document.getElementById(`reply-form-${threadId}`);
    const textarea = replyForm?.querySelector('.reply-input');
    
    if (textarea) {
        textarea.value = '';
    }
    
    if (replyForm) {
        replyForm.classList.remove('active');
    }
}

function resolveThread(threadId) {
    // Show loading state
    showThreadLoadingState(threadId, 'Resolving thread...');
    
    // Disable resolve button
    const resolveButton = document.querySelector(`[onclick="resolveThread('${threadId}')"]`);
    if (resolveButton) {
        resolveButton.disabled = true;
        resolveButton.innerHTML = '<span class="loading-spinner-small"></span> Resolving...';
    }
    
    // Send resolve command without comment
    vscode.postMessage({
        command: 'resolveThread',
        threadId: threadId,
        pullRequestId: currentPullRequestId
    });
    
    
}

// Show loading state for a thread
function showThreadLoadingState(threadId, message) {
    const threadElement = document.querySelector(`[data-thread-id="${threadId}"]`);
    if (!threadElement) {
        return;
    }
    
    // Create or update loading overlay
    let loadingOverlay = threadElement.querySelector('.thread-loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'thread-loading-overlay';
        threadElement.style.position = 'relative';
        threadElement.appendChild(loadingOverlay);
    }
    
    loadingOverlay.innerHTML = `
        <div class="thread-loading-content">
            <div class="loading-spinner-small"></div>
            <span class="loading-text">${message}</span>
        </div>
    `;
    loadingOverlay.style.display = 'flex';
}

// Hide loading state for a thread
function hideThreadLoadingState(threadId) {
    const threadElement = document.querySelector(`[data-thread-id="${threadId}"]`);
    if (!threadElement) {
        return;
    }
    
    const loadingOverlay = threadElement.querySelector('.thread-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    // Re-enable buttons
    const buttons = threadElement.querySelectorAll('button[disabled]');
    buttons.forEach(button => {
        button.disabled = false;
        if (button.textContent.includes('Adding reply')) {
            button.innerHTML = 'Reply';
        } else if (button.textContent.includes('Replying & Resolving')) {
            button.innerHTML = 'Reply & Resolve';
        } else if (button.textContent.includes('Resolving')) {
            button.innerHTML = 'Resolve';
        }
    });
}

// Show loading state for inline comments in Monaco editor
function showInlineCommentLoadingState(threadId, message) {
    const commentWidget = document.querySelector(`[id*="comment.widget.${threadId}"]`);
    if (!commentWidget) {
        return;
    }
    
    // Create or update loading overlay for inline comments
    let loadingOverlay = commentWidget.querySelector('.inline-comment-loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'inline-comment-loading-overlay';
        loadingOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(1px);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            z-index: 10;
        `;
        commentWidget.style.position = 'relative';
        commentWidget.appendChild(loadingOverlay);
    }
    
    loadingOverlay.innerHTML = `
        <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: var(--vscode-editor-background);
            padding: 6px 10px;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        ">
            <div class="loading-spinner-small"></div>
            <span style="font-size: 11px; color: var(--vscode-foreground); font-weight: 500;">${message}</span>
        </div>
    `;
    loadingOverlay.style.display = 'flex';
}

// Hide loading state for inline comments
function hideInlineCommentLoadingState(threadId) {
    const commentWidget = document.querySelector(`[id*="comment.widget.${threadId}"]`);
    if (!commentWidget) {
        return;
    }
    
    const loadingOverlay = commentWidget.querySelector('.inline-comment-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// Clear all loading states (useful when refreshing threads)
function clearAllLoadingStates() {
    // Clear timeline thread loading states
    document.querySelectorAll('.thread-loading-overlay').forEach(overlay => {
        overlay.remove();
    });
    
    // Clear inline comment loading states
    document.querySelectorAll('.inline-comment-loading-overlay').forEach(overlay => {
        overlay.remove();
    });
}

// Inline comments functionality for Monaco editor
function updateInlineComments(filePath) {
    if (!monacoDiffEditor || !allThreads || !filePath) {
        return;
    }
    
    
    
    
    
    // Clear existing comment widgets and decorations
    clearInlineComments();
    
    // Clear any existing loading states for inline comments
    document.querySelectorAll('.inline-comment-loading-overlay').forEach(overlay => {
        overlay.remove();
    });
    
    // Filter threads that have line context for this file
    const fileThreads = allThreads.filter(thread => {
        return thread.threadContext && 
               thread.threadContext.filePath && 
               thread.threadContext.filePath.includes(filePath);
    });
    
    
    
    
    
    
    
    
    // Add comment indicators and widgets for each thread
    fileThreads.forEach(thread => {
        addCommentLineButton(thread);
        // Initially hide the comment widget - will be shown when button is clicked
        commentVisibilityState[thread.id] = false;
    });
}

// Add a clickable button in the glyph margin for comments
function addCommentLineButton(thread) {
    if (!thread.threadContext || !thread.threadContext.rightFileStart) {
        
        return;
    }
    
    const lineNumber = thread.threadContext.rightFileStart.line;
    const modifiedEditor = monacoDiffEditor.getModifiedEditor();
    
    
    
    // Add glyph margin decoration with clickable comment indicator
    const decoration = {
        range: new window.monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
            isWholeLine: true,
            className: 'comment-line-decoration',
            glyphMarginClassName: 'comment-glyph-button',
            glyphMarginHoverMessage: { 
                value: `**${thread.comments.length} comment${thread.comments.length > 1 ? 's' : ''}**\n\nClick to ${commentVisibilityState[thread.id] ? 'hide' : 'show'} conversation`
            },
            hoverMessage: { 
                value: `**Comment Thread**\n\n${thread.comments[0].content.substring(0, 100)}${thread.comments[0].content.length > 100 ? '...' : ''}`
            }
        }
    };
    
    const decorationIds = modifiedEditor.deltaDecorations([], [decoration]);
    commentDecorations.push({ threadId: thread.id, decorationIds: decorationIds });
    
    
    
    // Add click handler for glyph margin and line content
    const disposable = modifiedEditor.onMouseDown((e) => {
        const position = e.target.position;
        
        // Check if clicked on glyph margin
        if (e.target.type === window.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
            if (position && position.lineNumber === lineNumber) {
                
                toggleCommentVisibility(thread.id);
                return;
            }
        }
        
        // Alternative: check if clicked on the line with comment decoration (with Ctrl key)
        if (e.event && e.event.ctrlKey && position && position.lineNumber === lineNumber) {
            
            toggleCommentVisibility(thread.id);
        }
    });
    
    // Store disposable for cleanup
    fileCommentWidgets.push(disposable);
    
    
}

// Toggle visibility of comment thread
function toggleCommentVisibility(threadId) {
    
    const isVisible = commentVisibilityState[threadId];
    commentVisibilityState[threadId] = !isVisible;
    
    
    
    if (!isVisible) {
        // Show comment widget
        
        showInlineComment(threadId);
    } else {
        // Hide comment widget
        
        hideInlineComment(threadId);
    }
    
    // Update glyph margin button appearance and hover message
    updateCommentButtonAppearance(threadId);
}

// Show inline comment widget
function showInlineComment(threadId) {
    const thread = allThreads.find(t => t.id === threadId);
    if (!thread) {
        return;
    }
    
    addInlineCommentWidget(thread);
}

// Hide inline comment widget  
function hideInlineComment(threadId) {
    // Find and remove the specific comment widget
    const widgetIndex = fileCommentWidgets.findIndex(item => 
        item && item.getId && item.getId() === `comment.widget.${threadId}`
    );
    
    if (widgetIndex !== -1) {
        const widget = fileCommentWidgets[widgetIndex];
        if (widget && typeof widget.dispose === 'function') {
            widget.dispose();
        } else if (monacoDiffEditor) {
            // Remove from editor if it's a content widget
            const modifiedEditor = monacoDiffEditor.getModifiedEditor();
            modifiedEditor.removeContentWidget(widget);
        }
        fileCommentWidgets.splice(widgetIndex, 1);
    }
}

// Update comment button appearance based on visibility state
function updateCommentButtonAppearance(threadId) {
    const thread = allThreads.find(t => t.id === threadId);
    if (!thread || !thread.threadContext || !thread.threadContext.rightFileStart) {
        return;
    }
    
    const lineNumber = thread.threadContext.rightFileStart.line;
    const modifiedEditor = monacoDiffEditor.getModifiedEditor();
    const isVisible = commentVisibilityState[threadId];
    const isResolved = thread.status === 'closed' || thread.status === 'fixed' || thread.isResolved;
    
    // Find and update existing decoration
    const decorationItem = commentDecorations.find(d => d.threadId === threadId);
    if (decorationItem) {
        let glyphClassName = 'comment-glyph-button';
        if (isVisible) {
            glyphClassName += ' active';
        }
        if (isResolved) {
            glyphClassName += ' resolved';
        }
        
        const newDecoration = {
            range: new window.monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
                isWholeLine: true,
                className: isVisible ? 'comment-line-decoration active' : 'comment-line-decoration',
                glyphMarginClassName: glyphClassName,
                glyphMarginHoverMessage: { 
                    value: `**${thread.comments.length} comment${thread.comments.length > 1 ? 's' : ''}** ${isResolved ? '(Resolved)' : ''}\n\nClick to ${isVisible ? 'hide' : 'show'} conversation`
                },
                hoverMessage: { 
                    value: `**Comment Thread** ${isResolved ? '(Resolved)' : ''}\n\n${thread.comments[0].content.substring(0, 100)}${thread.comments[0].content.length > 100 ? '...' : ''}`
                }
            }
        };
        
        decorationItem.decorationIds = modifiedEditor.deltaDecorations(decorationItem.decorationIds, [newDecoration]);
    }
}

function clearInlineComments() {
    // Remove all existing comment widgets and disposables
    fileCommentWidgets.forEach(item => {
        if (item && typeof item.dispose === 'function') {
            item.dispose();
        } else if (item && monacoDiffEditor) {
            // Remove content widget if it's not a disposable
            const modifiedEditor = monacoDiffEditor.getModifiedEditor();
            try {
                modifiedEditor.removeContentWidget(item);
            } catch (e) {
                // Ignore errors for items that aren't content widgets
            }
        }
    });
    fileCommentWidgets = [];
    
    // Clear comment decorations
    if (monacoDiffEditor && commentDecorations.length > 0) {
        const modifiedEditor = monacoDiffEditor.getModifiedEditor();
        commentDecorations.forEach(decoration => {
            try {
                modifiedEditor.deltaDecorations(decoration.decorationIds, []);
            } catch (e) {
                // Ignore errors
            }
        });
    }
    commentDecorations = [];
    
    // Reset visibility state
    commentVisibilityState = {};
}

function addInlineCommentWidget(thread) {
    if (!thread.threadContext || !thread.threadContext.rightFileStart) {
        return;
    }
    
    const lineNumber = thread.threadContext.rightFileStart.line;
    const firstComment = thread.comments && thread.comments[0];
    
    if (!firstComment) {
        return;
    }
    
    // Create comment widget content
    const widgetContent = createCommentWidgetContent(thread);
    
    // Create the widget
    const widget = {
        domNode: widgetContent,
        getId: function() {
            return `comment.widget.${thread.id}`;
        },
        getDomNode: function() {
            return this.domNode;
        },
        getPosition: function() {
            return {
                position: {
                    lineNumber: lineNumber,
                    column: 1
                },
                preference: [
                    window.monaco.editor.ContentWidgetPositionPreference.BELOW,
                    window.monaco.editor.ContentWidgetPositionPreference.ABOVE
                ]
            };
        }
    };
    
    // Add the widget to the modified editor (right side of diff)
    const modifiedEditor = monacoDiffEditor.getModifiedEditor();
    modifiedEditor.addContentWidget(widget);
    
    // Store reference for cleanup
    fileCommentWidgets.push(widget);
}

function createCommentWidgetContent(thread) {
    const firstComment = thread.comments[0];
    
    // Handle both GitHub and Azure DevOps comment formats
    let author, authorInitials, formattedDate;
    
    if (firstComment.author) {
        // Azure DevOps format
        author = firstComment.author;
        authorInitials = getAuthorInitials(author.displayName || author.name || author.login || 'Unknown');
        formattedDate = formatDate(new Date(firstComment.publishedDate));
    } else if (thread.user || thread.author) {
        // GitHub format - sometimes the author is on the thread level
        author = thread.user || thread.author;
        authorInitials = getAuthorInitials(author.displayName || author.name || author.login || 'Unknown');
        formattedDate = formatDate(new Date(thread.created_at));
    } else {
        // Fallback
        author = { displayName: 'Unknown', name: 'Unknown', login: 'unknown' };
        authorInitials = 'U';
        formattedDate = 'Unknown date';
    }
    
    const isResolved = thread.status === 'closed' || thread.status === 'fixed' || thread.isResolved;
    
    const container = document.createElement('div');
    container.className = `inline-comment-widget ${isResolved ? 'resolved' : ''}`;
    container.setAttribute('data-thread-id', thread.id);
    container.style.cssText = `
        background: var(--vscode-editorWidget-background);
        border: 1px solid ${isResolved ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-editorWidget-border)'};
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        font-family: var(--vscode-font-family);
        font-size: 13px;
        line-height: 1.4;
        z-index: 1000;
        position: relative;
        ${isResolved ? 'opacity: 0.8;' : ''}
    `;
    
    // Create header without collapse toggle, only with close button and resolution status
    const statusIndicator = isResolved ? `
        <div style="
            display: flex; 
            align-items: center; 
            gap: 4px; 
            color: var(--vscode-testing-iconPassed); 
            font-size: 11px; 
            font-weight: 600;
            margin-left: 8px;
        ">
            <span style="color: var(--vscode-testing-iconPassed);">✓</span>
            Resolved
        </div>
    ` : '';
    
    const authorDisplayName = author.displayName || author.name || author.login || 'Unknown';
    
    // Create avatar HTML with proper GitHub avatar support
    let avatarHtml;
    if (author.avatar_url) {
        avatarHtml = `<img src="${author.avatar_url}" alt="${authorDisplayName}" style="
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            margin-right: 10px;
            object-fit: cover;
        ">`;
    } else {
        avatarHtml = `<div style="
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 10px; 
            font-weight: 600; 
            margin-right: 10px;
        ">${authorInitials}</div>`;
    }

    const headerHtml = `
        <div class="comment-header" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
                ${avatarHtml}
                <div>
                    <div style="font-weight: 500; color: var(--vscode-foreground);">${authorDisplayName}</div>
                    <div style="font-size: 11px; color: var(--vscode-descriptionForeground); display: flex; align-items: center;">
                        ${formattedDate} • ${thread.comments.length} comment${thread.comments.length > 1 ? 's' : ''}
                        ${statusIndicator}
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <button class="close-comment-btn" onclick="event.stopPropagation(); toggleCommentVisibility('${thread.id}')" 
                        tabindex="0" aria-label="Close comment" title="Close comment" 
                        style="
                            background: none; 
                            border: none; 
                            color: var(--vscode-descriptionForeground); 
                            cursor: pointer; 
                            padding: 4px; 
                            border-radius: 3px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                            line-height: 1;
                        "
                        onmouseover="this.style.background='var(--vscode-button-secondaryHoverBackground)'" 
                        onmouseout="this.style.background='none'">✕</button>
            </div>
        </div>
    `;
    
    let commentsHtml = '';
    
    // Add all comments in the thread
    thread.comments.forEach((comment, index) => {
        // Handle both GitHub and Azure DevOps comment formats
        let commentAuthor, commentInitials, commentDate, commentContent;
        
        if (comment.author) {
            // Both Azure DevOps and GitHub format with author
            commentAuthor = comment.author;
            commentInitials = getAuthorInitials(commentAuthor.displayName || commentAuthor.name || commentAuthor.login || 'Unknown');
            commentDate = formatDate(new Date(comment.publishedDate || comment.created_at));
            commentContent = comment.content || comment.body;
        } else if (thread.user || thread.author) {
            // GitHub format - use thread-level author for comments without author
            commentAuthor = thread.user || thread.author;
            commentInitials = getAuthorInitials(commentAuthor.displayName || commentAuthor.name || commentAuthor.login || 'Unknown');
            commentDate = formatDate(new Date(thread.created_at));
            commentContent = thread.body || thread.content || comment.content || '';
        } else {
            // Fallback
            commentAuthor = { displayName: 'Unknown', name: 'Unknown', login: 'unknown' };
            commentInitials = 'U';
            commentDate = 'Unknown date';
            commentContent = comment.content || thread.body || thread.content || '';
        }
        
        const authorDisplayName = commentAuthor.displayName || commentAuthor.name || commentAuthor.login || 'Unknown';
        
        // Show author info for all comments except when it's a single comment thread and we already showed it in header
        const showAuthorInfo = index > 0 || thread.comments.length > 1;
        
        // Create avatar HTML for comment author
        let commentAvatarHtml = '';
        if (showAuthorInfo) {
            if (commentAuthor.avatar_url) {
                commentAvatarHtml = `<img src="${commentAuthor.avatar_url}" alt="${authorDisplayName}" style="
                    width: 20px; 
                    height: 20px; 
                    border-radius: 50%; 
                    margin-right: 8px;
                    object-fit: cover;
                ">`;
            } else {
                commentAvatarHtml = `<div style="
                    width: 20px; 
                    height: 20px; 
                    border-radius: 50%; 
                    background: var(--vscode-button-background); 
                    color: var(--vscode-button-foreground); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 9px; 
                    font-weight: 600; 
                    margin-right: 8px;
                ">${commentInitials}</div>`;
            }
        }
        
        commentsHtml += `
            <div class="inline-comment" style="margin-bottom: ${index < thread.comments.length - 1 ? '12px' : '0'};">
                ${showAuthorInfo ? `
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        ${commentAvatarHtml}
                        <div style="font-weight: 500; color: var(--vscode-foreground);">${authorDisplayName}</div>
                        <div style="margin-left: auto; font-size: 11px; color: var(--vscode-descriptionForeground);">${commentDate}</div>
                    </div>
                ` : ''}
                <div style="color: var(--vscode-foreground); ${showAuthorInfo ? 'margin-left: 28px;' : 'margin-top: 8px;'}">${renderMarkdown(commentContent)}</div>
            </div>
        `;
    });
    
    // Add reply section if not a system comment and not resolved
    let replySection = '';
    if (firstComment.commentType !== 'system' && !isResolved) {
        replySection = `
            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--vscode-editorWidget-border);">
                <div style="display: flex; gap: 8px;">
                    <button onclick="toggleInlineReply('${thread.id}')" style="
                        background: none; 
                        border: none; 
                        color: var(--vscode-button-background); 
                        font-size: 12px; 
                        cursor: pointer; 
                        padding: 6px 12px; 
                        border-radius: 3px;
                        font-weight: 500;
                        display: flex;
                    " onmouseover="this.style.background='var(--vscode-button-secondaryHoverBackground)'" 
                       onmouseout="this.style.background='none'"><svg  xmlns="http://www.w3.org/2000/svg" style="margin-right:6px; height: 14px; width: 14px;  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-message-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9h8" /><path d="M8 13h6" /><path d="M9 18h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-3l-3 3l-3 -3z" /></svg> Reply</button>
                    <button onclick="resolveInlineThread('${thread.id}')" style="
                        background: var(--vscode-testing-iconPassed); 
                        color: white; 
                        border: none; 
                        padding: 6px 12px; 
                        border-radius: 3px; 
                        font-size: 12px; 
                        font-weight: 500;
                        cursor: pointer;
                    ">✓ Resolve</button>
                </div>
                <div id="inline-reply-${thread.id}" style="display: none; margin-top: 12px;">
                    <textarea placeholder="Write a reply..." style="
                        width: 100%; 
                        min-height: 80px; 
                        padding: 8px; 
                        border: 1px solid var(--vscode-input-border); 
                        border-radius: 4px; 
                        background: var(--vscode-input-background); 
                        color: var(--vscode-input-foreground); 
                        font-family: inherit; 
                        font-size: 13px; 
                        resize: vertical;
                        box-sizing: border-box;
                    "></textarea>
                    <div style="margin-top: 8px; display: flex; gap: 8px;">
                        <button onclick="submitInlineReply('${thread.id}')" style="
                            background: var(--vscode-button-background); 
                            color: var(--vscode-button-foreground); 
                            border: none; 
                            padding: 8px 16px; 
                            border-radius: 4px; 
                            font-size: 12px; 
                            font-weight: 500;
                            cursor: pointer;
                        ">Reply</button>
                        <button onclick="submitInlineReplyAndResolve('${thread.id}')" style="
                            background: var(--vscode-testing-iconPassed); 
                            color: white; 
                            border: none; 
                            padding: 8px 16px; 
                            border-radius: 4px; 
                            font-size: 12px; 
                            font-weight: 500;
                            cursor: pointer;
                        ">Reply & Resolve</button>
                        <button onclick="cancelInlineReply('${thread.id}')" style="
                            background: var(--vscode-button-secondaryBackground); 
                            color: var(--vscode-button-secondaryForeground); 
                            border: 1px solid var(--vscode-button-border); 
                            padding: 8px 16px; 
                            border-radius: 4px; 
                            font-size: 12px; 
                            font-weight: 500;
                            cursor: pointer;
                        ">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    } else if (isResolved) {
        // Show resolved message instead of reply section
        replySection = `
            <div style="
                margin-top: 16px; 
                padding: 12px; 
                background: var(--vscode-inputValidation-infoBackground); 
                border: 1px solid var(--vscode-testing-iconPassed); 
                border-radius: 4px;
                color: var(--vscode-foreground);
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span style="color: var(--vscode-testing-iconPassed); font-weight: bold;">✓</span>
                This conversation has been resolved
            </div>
        `;
    }
    
    container.innerHTML = headerHtml + `<div class="comment-body" style="margin-top: 12px;">` + commentsHtml + replySection + `</div>`;
    
    return container;
}

// Make functions available globally for onclick handlers
window.toggleCommentVisibility = toggleCommentVisibility;

// Inline reply functions
function toggleInlineReply(threadId) {
    const replyDiv = document.getElementById(`inline-reply-${threadId}`);
    if (replyDiv) {
        const isVisible = replyDiv.style.display !== 'none';
        replyDiv.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            const textarea = replyDiv.querySelector('textarea');
            if (textarea) {
                textarea.focus();
            }
        }
    }
}

function submitInlineReply(threadId) {
    const replyDiv = document.getElementById(`inline-reply-${threadId}`);
    const textarea = replyDiv?.querySelector('textarea');
    const submitButton = replyDiv?.querySelector('button[onclick*="submitInlineReply"]');
    
    if (!textarea || !textarea.value.trim()) {
        return;
    }
    
    const replyContent = textarea.value.trim();
    
    // Show loading state for inline comment
    showInlineCommentLoadingState(threadId, 'Adding reply...');
    
    // Disable submit button
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner-small"></span> Adding reply...';
    }
    
    // Send reply to extension
    vscode.postMessage({
        command: 'addReplyToThread',
        threadId: threadId,
        content: replyContent,
        pullRequestId: currentPullRequestId
    });
    
    // Clear form and hide
    textarea.value = '';
    replyDiv.style.display = 'none';
    
    
}

function submitInlineReplyAndResolve(threadId) {
    const replyDiv = document.getElementById(`inline-reply-${threadId}`);
    const textarea = replyDiv?.querySelector('textarea');
    const replyResolveButton = replyDiv?.querySelector('button[onclick*="submitInlineReplyAndResolve"]');
    
    if (!textarea || !textarea.value.trim()) {
        // If no content, just resolve the thread
        resolveInlineThread(threadId);
        return;
    }
    
    const replyContent = textarea.value.trim();
    
    // Show loading state for inline comment
    showInlineCommentLoadingState(threadId, 'Adding reply and resolving...');
    
    // Disable submit button
    if (replyResolveButton) {
        replyResolveButton.disabled = true;
        replyResolveButton.innerHTML = '<span class="loading-spinner-small"></span> Replying & Resolving...';
    }
    
    // Send reply and resolve to extension
    vscode.postMessage({
        command: 'addReplyToThreadAndResolve',
        threadId: threadId,
        content: replyContent,
        pullRequestId: currentPullRequestId
    });
    
    // Clear form and hide
    textarea.value = '';
    replyDiv.style.display = 'none';
    
    
}

function resolveThread(threadId) {
    // Send resolve command to extension
    vscode.postMessage({
        command: 'resolveThread',
        threadId: threadId,
        pullRequestId: currentPullRequestId
    });
    
    
}

// GitHub-specific review handling functions
function handleGitHubReviews(reviews) {
    
    
    
    // Store review comments with inline context for later use
    if (reviews.reviewComments && reviews.reviewComments.length > 0) {
        
        
        
        // Group review comments by thread hierarchy using in_reply_to_id
        const commentThreads = groupReviewCommentsByThread(reviews.reviewComments);
        
        
        // Convert grouped comments to thread format for inline comments
        const inlineCommentThreads = commentThreads
            .filter(thread => thread.mainComment.path && thread.mainComment.line) // Only threads with file/line context
            .map(thread => ({
                id: `review-comment-${thread.mainComment.id}`,
                user: thread.mainComment.user,
                author: thread.mainComment.user,
                created_at: thread.mainComment.created_at,
                body: thread.mainComment.body,
                content: thread.mainComment.body,
                commentType: 'review_comment',
                event: 'reviewed',
                threadContext: {
                    filePath: thread.mainComment.path,
                    rightFileStart: {
                        line: thread.mainComment.line || thread.mainComment.original_line
                    },
                    leftFileStart: thread.mainComment.side === 'LEFT' ? {
                        line: thread.mainComment.line || thread.mainComment.original_line
                    } : undefined
                },
                position: thread.mainComment.position,
                path: thread.mainComment.path,
                line: thread.mainComment.line,
                side: thread.mainComment.side,
                in_reply_to_id: thread.mainComment.in_reply_to_id,
                comments: thread.allComments.map(comment => ({
                    id: comment.id,
                    content: comment.body,
                    author: comment.user,
                    publishedDate: comment.created_at,
                    threadContext: {
                        filePath: comment.path,
                        rightFileStart: {
                            line: comment.line || comment.original_line
                        }
                    }
                }))
            }));
        
        // Store threads globally for inline comments
        if (!window.allThreads) {
            window.allThreads = [];
        }
        
        // Add review comment threads to existing threads
        inlineCommentThreads.forEach(thread => {
            
            
            
            // Check if thread already exists to avoid duplicates
            const existingIndex = window.allThreads.findIndex(t => t.id === thread.id);
            if (existingIndex >= 0) {
                
                window.allThreads[existingIndex] = thread;
            } else {
                
                window.allThreads.push(thread);
            }
        });
        
        // Also remove any individual review comments that might have been added separately
        // to prevent duplicates with our threaded comments
        const reviewCommentIds = new Set();
        inlineCommentThreads.forEach(thread => {
            thread.comments.forEach(comment => {
                reviewCommentIds.add(`review-comment-${comment.id}`);
            });
        });
        
        // Filter out any individual review comments that are now part of threads
        window.allThreads = window.allThreads.filter(thread => {
            if (thread.commentType === 'review_comment' && thread.comments && thread.comments.length === 1) {
                const shouldRemove = reviewCommentIds.has(thread.id);
                if (shouldRemove) {
                    
                }
                return !shouldRemove;
            }
            return true;
        });
        
        
        
        
        // Update inline comments if we have a current file open
        if (window.monacoDiffEditor && window.currentFile) {
            
            window.updateInlineComments(window.currentFile.fileName);
        }
    }
    
    // Display reviews in overview timeline if we have a timeline container
    updateReviewsDisplay(reviews);
}

function groupReviewCommentsByThread(reviewComments) {
    
    
    // Create maps for quick lookup
    const commentsById = new Map();
    const commentsByReplyId = new Map();
    
    // First pass: index all comments
    reviewComments.forEach(comment => {
        commentsById.set(comment.id, comment);
        
        if (comment.in_reply_to_id) {
            if (!commentsByReplyId.has(comment.in_reply_to_id)) {
                commentsByReplyId.set(comment.in_reply_to_id, []);
            }
            commentsByReplyId.get(comment.in_reply_to_id).push(comment);
        }
    });
    
    // Find root comments (those without in_reply_to_id or whose parent doesn't exist)
    const rootComments = reviewComments.filter(comment => {
        return !comment.in_reply_to_id || !commentsById.has(comment.in_reply_to_id);
    });
    
    
    
    // Build threads for each root comment
    const threads = rootComments.map(rootComment => {
        const thread = {
            mainComment: rootComment,
            allComments: [rootComment]
        };
        
        // Recursively collect all replies
        const collectReplies = (commentId) => {
            const replies = commentsByReplyId.get(commentId) || [];
            replies.forEach(reply => {
                thread.allComments.push(reply);
                collectReplies(reply.id); // Recursive call for nested replies
            });
        };
        
        collectReplies(rootComment.id);
        
        // Sort comments in thread by creation date
        thread.allComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        
        
        return thread;
    });
    
    return threads;
}

function updateReviewsDisplay(reviews) {
    
    
    // Find the timeline container
    let timelineContainer = document.getElementById('historyTimeline');
    if (!timelineContainer) {
        timelineContainer = document.getElementById('githubTimelineItems');
    }
    
    if (!timelineContainer) {
        console.warn('Timeline container not found for reviews display');
        return;
    }
    
    // Process review data
    let reviewItems = [];
    
    // Add review summary items
    if (reviews.reviews && reviews.reviews.length > 0) {
        reviews.reviews.forEach(review => {
            reviewItems.push({
                type: 'review',
                id: `review-${review.id}`,
                author: review.user,
                created_at: review.submitted_at,
                state: review.state,
                body: review.body,
                commit_id: review.commit_id
            });
        });
    }
    
    // Add threaded review comments
    if (reviews.reviewComments && reviews.reviewComments.length > 0) {
        const commentThreads = groupReviewCommentsByThread(reviews.reviewComments);
        
        commentThreads.forEach(thread => {
            reviewItems.push({
                type: 'review_comments_thread',
                id: `review-comment-thread-${thread.mainComment.id}`,
                mainComment: thread.mainComment,
                allComments: thread.allComments,
                path: thread.mainComment.path,
                line: thread.mainComment.line,
                created_at: thread.mainComment.created_at
            });
        });
    }
    
    // Sort all items by creation date
    reviewItems.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Render review items
    reviewItems.forEach(item => {
        const itemElement = renderReviewItem(item);
        if (itemElement) {
            timelineContainer.appendChild(itemElement);
        }
    });
    
    
}

function renderReviewItem(item) {
    if (item.type === 'review') {
        return renderReviewSummary(item);
    } else if (item.type === 'review_comments_thread') {
        return renderReviewCommentsThread(item);
    }
    
    return null;
}

function renderReviewSummary(review) {
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'thread-item review-summary';
    reviewDiv.setAttribute('data-id', review.id);
    
    const author = review.author;
    const authorName = author.displayName || author.name || author.login || 'Unknown';
    const reviewDate = formatDate(new Date(review.created_at));
    
    // Determine review state styling
    let stateIcon = '';
    let stateClass = '';
    switch (review.state) {
        case 'APPROVED':
            stateIcon = '✓';
            stateClass = 'approved';
            break;
        case 'CHANGES_REQUESTED':
            stateIcon = '⚠';
            stateClass = 'changes-requested';
            break;
        case 'COMMENTED':
            stateIcon = '💬';
            stateClass = 'commented';
            break;
        default:
            stateIcon = '👁';
            stateClass = 'review';
    }
    
    let avatarHtml = '';
    if (author.avatar_url) {
        avatarHtml = `<img src="${author.avatar_url}" alt="${escapeHtml(authorName)}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 12px;">`;
    } else {
        const initials = getAuthorInitials(authorName);
        avatarHtml = `<div style="
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 12px; 
            font-weight: 600; 
            margin-right: 12px;
        ">${initials}</div>`;
    }
    
    reviewDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; padding: 16px;">
            ${avatarHtml}
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <strong style="color: var(--vscode-foreground);">${escapeHtml(authorName)}</strong>
                    <span class="review-state ${stateClass}" style="display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${stateIcon} ${review.state.replace('_', ' ')}
                    </span>
                    <span style="color: var(--vscode-descriptionForeground); font-size: 12px;">${reviewDate}</span>
                </div>
                ${review.body ? `<div style="color: var(--vscode-foreground); margin-top: 8px;">${renderMarkdown(review.body)}</div>` : ''}
            </div>
        </div>
    `;
    
    return reviewDiv;
}

function renderReviewCommentsThread(thread) {
    const threadDiv = document.createElement('div');
    threadDiv.className = 'thread-item review-comments-thread';
    threadDiv.setAttribute('data-id', thread.id);
    
    const mainComment = thread.mainComment;
    const author = mainComment.user;
    const authorName = author.displayName || author.name || author.login || 'Unknown';
    const commentDate = formatDate(new Date(mainComment.created_at));
    
    let avatarHtml = '';
    if (author.avatar_url) {
        avatarHtml = `<img src="${author.avatar_url}" alt="${escapeHtml(authorName)}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 12px;">`;
    } else {
        const initials = getAuthorInitials(authorName);
        avatarHtml = `<div style="
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 12px; 
            font-weight: 600; 
            margin-right: 12px;
        ">${initials}</div>`;
    }
    
    // Render all comments in the thread
    let commentsHtml = '';
    thread.allComments.forEach((comment, index) => {
        const commentAuthor = comment.user;
        const commentAuthorName = commentAuthor.displayName || commentAuthor.name || commentAuthor.login || 'Unknown';
        const commentCreatedAt = formatDate(new Date(comment.created_at));
        
        let commentAvatarHtml = '';
        if (index > 0) { // Show author for replies
            if (commentAuthor.avatar_url) {
                commentAvatarHtml = `<img src="${commentAuthor.avatar_url}" alt="${escapeHtml(commentAuthorName)}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">`;
            } else {
                const commentInitials = getAuthorInitials(commentAuthorName);
                commentAvatarHtml = `<div style="
                    width: 24px; 
                    height: 24px; 
                    border-radius: 50%; 
                    background: var(--vscode-button-background); 
                    color: var(--vscode-button-foreground); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 10px; 
                    font-weight: 600; 
                    margin-right: 8px;
                ">${commentInitials}</div>`;
            }
        }
        
        commentsHtml += `
            <div style="margin-bottom: ${index < thread.allComments.length - 1 ? '16px' : '0'}; ${index > 0 ? 'padding-left: 20px; border-left: 2px solid var(--vscode-editorWidget-border); margin-left: 16px;' : ''}">
                ${index > 0 ? `
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        ${commentAvatarHtml}
                        <strong style="color: var(--vscode-foreground);">${escapeHtml(commentAuthorName)}</strong>
                        <span style="color: var(--vscode-descriptionForeground); font-size: 12px; margin-left: auto;">${commentCreatedAt}</span>
                    </div>
                ` : ''}
                <div style="color: var(--vscode-foreground); ${index > 0 ? 'margin-left: 32px;' : ''}">${renderMarkdown(comment.body)}</div>
            </div>
        `;
    });
    
    threadDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; padding: 16px;">
            ${avatarHtml}
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <strong style="color: var(--vscode-foreground);">${escapeHtml(authorName)}</strong>
                    <span style="color: var(--vscode-descriptionForeground); font-size: 12px;">commented on</span>
                    <code style="background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 3px; font-size: 11px;">${thread.path}:${thread.line}</code>
                    <span style="color: var(--vscode-descriptionForeground); font-size: 12px;">${commentDate}</span>
                    ${thread.allComments.length > 1 ? `<span style="color: var(--vscode-descriptionForeground); font-size: 12px;">• ${thread.allComments.length} comments</span>` : ''}
                </div>
                <div style="margin-top: 12px;">
                    ${commentsHtml}
                </div>
            </div>
        </div>
    `;
    
    return threadDiv;
}

function getAuthorInitials(name) {
    if (!name) { return 'U'; }
    return name.split(' ').map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function cancelInlineReply(threadId) {
    const replyDiv = document.getElementById(`inline-reply-${threadId}`);
    const textarea = replyDiv?.querySelector('textarea');
    
    if (textarea) {
        textarea.value = '';
    }
    
    if (replyDiv) {
        replyDiv.style.display = 'none';
    }
}

function resolveInlineThread(threadId) {
    // Show loading state for inline comment
    showInlineCommentLoadingState(threadId, 'Resolving thread...');
    
    // Disable resolve button
    const resolveButton = document.querySelector(`button[onclick="resolveInlineThread('${threadId}')"]`);
    if (resolveButton) {
        resolveButton.disabled = true;
        resolveButton.innerHTML = '<span class="loading-spinner-small"></span> Resolving...';
    }
    
    // Send resolve command without comment for inline threads
    vscode.postMessage({
        command: 'resolveThread',
        threadId: threadId,
        pullRequestId: currentPullRequestId
    });
    
    
}

// Full-screen loader functions
function showFullScreenLoader(message = 'Processing...', subtext = 'Please wait while we complete this operation') {
    // Create loader if it doesn't exist
    let loader = document.getElementById('fullscreen-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'fullscreen-loader';
        loader.className = 'loading-backdrop';
        loader.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text" id="loader-text">${message}</div>
                <div class="loading-subtext" id="loader-subtext">${subtext}</div>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        // Update existing loader text
        const textElement = document.getElementById('loader-text');
        const subtextElement = document.getElementById('loader-subtext');
        if (textElement) {
            textElement.textContent = message;
        }
        if (subtextElement) {
            subtextElement.textContent = subtext;
        }
    }
    
    // Show the loader
    loader.classList.add('show');
    
    // Disable scrolling on body
    document.body.style.overflow = 'hidden';
}

function hideFullScreenLoader() {
    const loader = document.getElementById('fullscreen-loader');
    if (loader) {
        loader.classList.remove('show');
    }
    
    // Re-enable scrolling on body
    document.body.style.overflow = '';
}

// Make inline reply functions available globally for onclick handlers
window.toggleInlineReply = toggleInlineReply;
window.submitInlineReply = submitInlineReply;
window.submitInlineReplyAndResolve = submitInlineReplyAndResolve;
window.resolveThread = resolveThread;
window.resolveInlineThread = resolveInlineThread;
window.cancelInlineReply = cancelInlineReply;
