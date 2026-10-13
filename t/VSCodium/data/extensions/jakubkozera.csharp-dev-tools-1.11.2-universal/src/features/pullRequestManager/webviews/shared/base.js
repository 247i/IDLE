// Shared base functionality for pull request webviews

class BasePullRequestWebview {
    constructor() {
        this.vscode = acquireVsCodeApi();
        this.currentPullRequest = null;
        this.currentProvider = null;
        this.uiState = {
            selectedFile: null,
            scrollPosition: { line: 0, column: 0 },
            scrollPositions: {},
            viewMode: 'unified',
            filesLoaded: false,
            diffsLoaded: false
        };
        this.files = [];
        this.commits = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Listen for messages from the extension
        window.addEventListener('message', (event) => this.handleMessage(event));
        
        // Tab switching
        this.setupTabSwitching();
        
        // DOM ready initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }

    onDOMReady() {
        
        this.hideOverlaySpinner();
    }

    setupTabSwitching() {
        // Add click listeners to tab navigation
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('nav-tab')) {
                const tabId = event.target.getAttribute('data-tab');
                if (tabId) {
                    this.switchTab(tabId);
                }
            }
        });
    }

    switchTab(tabId) {
        
        
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });
        
        // Handle tab-specific logic
        this.onTabChanged(tabId);
    }

    onTabChanged(tabId) {
        // Override in provider-specific implementations
        
    }

    handleMessage(event) {
        const message = event.data;
        
        
        switch (message.command) {
            case 'pullRequestData':
                this.handlePullRequestData(message.data);
                break;
            case 'fileContent':
                this.handleFileContent(message.data);
                break;
            case 'error':
                this.handleError(message.data);
                break;
            default:
                // Let provider-specific implementations handle other messages
                this.handleProviderSpecificMessage(message);
                break;
        }
    }

    handlePullRequestData(data) {
        
        
        this.currentPullRequest = data.pullRequest;
        this.currentProvider = data.provider;
        this.files = data.files || [];
        this.commits = data.commits || [];
        
        // Update UI
        this.updateHeader();
        this.updateInfoBar();
        this.updateFilesTab();
        this.updateCommitsTab();
        this.updateTabBadges();
        
        this.hideOverlaySpinner();
    }

    handleFileContent(data) {
        
        // Override in provider-specific implementations
    }

    handleError(data) {
        console.error('Error:', data.message);
        this.showError(data.message, data.details);
        this.hideOverlaySpinner();
    }

    handleProviderSpecificMessage(message) {
        // Override in provider-specific implementations
        
    }

    updateHeader() {
        if (!this.currentPullRequest) {
            return;
        }
        
        const titleElement = document.getElementById('prTitleText');
        if (titleElement) {
            titleElement.textContent = this.currentPullRequest.title;
        }
    }

    updateInfoBar() {
        if (!this.currentPullRequest) {
            return;
        }
        
        const statusBadge = document.getElementById('statusBadge');
        const prIdDisplay = document.getElementById('prIdDisplay');
        const branchInfoDisplay = document.getElementById('branchInfoDisplay');
        
        if (statusBadge) {
            statusBadge.textContent = this.currentPullRequest.state.toUpperCase();
            statusBadge.className = `status-badge status-${this.currentPullRequest.state}`;
        }
        
        if (prIdDisplay) {
            prIdDisplay.textContent = `#${this.currentPullRequest.id}`;
        }
        
        if (branchInfoDisplay) {
            branchInfoDisplay.innerHTML = `
                <strong>${this.currentPullRequest.source_branch}</strong>
                <span style="margin: 0 8px;">→</span>
                <strong>${this.currentPullRequest.target_branch}</strong>
            `;
        }
    }

    updateFilesTab() {
        const fileList = document.getElementById('fileList');
        if (!fileList || !this.files.length) {
            if (fileList) {
                fileList.innerHTML = '<div class="form-help">No files changed</div>';
            }
            return;
        }

        const filesHtml = this.renderFilesList(this.files);
        fileList.innerHTML = filesHtml;
        
        this.uiState.filesLoaded = true;
    }

    updateCommitsTab() {
        const commitsList = document.getElementById('commitsList');
        const commitsCount = document.getElementById('commitsCount');
        
        if (commitsCount) {
            commitsCount.textContent = `${this.commits.length} commits`;
        }
        
        if (!commitsList || !this.commits.length) {
            if (commitsList) {
                commitsList.innerHTML = '<div class="form-help">No commits found</div>';
            }
            return;
        }

        const commitsHtml = this.renderCommitsList(this.commits);
        commitsList.innerHTML = commitsHtml;
    }

    updateTabBadges() {
        const filesBadge = document.getElementById('filesBadge');
        const commitsBadge = document.getElementById('commitsBadge');
        
        if (filesBadge) {
            filesBadge.textContent = this.files.length;
            filesBadge.style.display = this.files.length > 0 ? 'inline-flex' : 'none';
        }
        
        if (commitsBadge) {
            commitsBadge.textContent = this.commits.length;
            commitsBadge.style.display = this.commits.length > 0 ? 'inline-flex' : 'none';
        }
    }

    renderFilesList(files) {
        return `
            <div class="file-tree">
                ${files.map(file => this.renderFileItem(file)).join('')}
            </div>
        `;
    }

    renderFileItem(file) {
        const statusClass = file.status.toLowerCase();
        const statusText = file.status.charAt(0).toUpperCase();
        
        return `
            <div class="file-item ${statusClass}" onclick="selectFile('${file.filename}')">
                <div class="file-icon">
                    ${this.getFileIcon(file.filename)}
                </div>
                <div class="file-name">${file.filename}</div>
                <div class="file-status">${statusText}</div>
                <div class="file-changes">
                    ${file.additions > 0 ? `+${file.additions}` : ''}
                    ${file.deletions > 0 ? `-${file.deletions}` : ''}
                </div>
            </div>
        `;
    }

    renderCommitsList(commits) {
        return `
            <div class="commits-list">
                ${commits.map(commit => this.renderCommitItem(commit)).join('')}
            </div>
        `;
    }

    renderCommitItem(commit) {
        const authorInitials = this.getInitials(commit.author.name);
        const date = new Date(commit.author.date).toLocaleDateString();
        const shortSha = commit.sha.substring(0, 7);
        
        return `
            <div class="commit-item">
                <div class="commit-avatar">
                    ${commit.author.avatar_url ? 
                        `<img src="${commit.author.avatar_url}" alt="${commit.author.name}">` :
                        authorInitials
                    }
                </div>
                <div class="commit-content">
                    <div class="commit-message">${this.escapeHtml(commit.message)}</div>
                    <div class="commit-meta">
                        <span class="commit-author">${this.escapeHtml(commit.author.name)}</span>
                        <span class="commit-sha">${shortSha}</span>
                        <span class="commit-date">${date}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const iconMap = {
            'js': '📄',
            'ts': '📘',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'py': '🐍',
            'java': '☕',
            'cs': '🔷',
            'cpp': '⚡',
            'c': '⚡',
            'go': '🐹',
            'rs': '🦀',
            'php': '🐘',
            'rb': '💎',
            'yml': '⚙️',
            'yaml': '⚙️',
            'xml': '📄',
            'svg': '🖼️',
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🖼️'
        };
        
        return iconMap[ext] || '📄';
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message, details) {
        const errorHtml = `
            <div class="error">
                <strong>Error:</strong> ${this.escapeHtml(message)}
                ${details ? `<br><small>${this.escapeHtml(details)}</small>` : ''}
            </div>
        `;
        
        // Find a good place to show the error
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertAdjacentHTML('afterbegin', errorHtml);
        }
    }

    hideOverlaySpinner() {
        const spinner = document.getElementById('globalOverlaySpinner');
        if (spinner) {
            spinner.classList.add('hidden');
            setTimeout(() => {
                if (spinner.parentNode) {
                    spinner.parentNode.removeChild(spinner);
                }
            }, 300);
        }
    }

    sendMessage(command, data) {
        this.vscode.postMessage({ command, data });
    }
}

// Global function for file selection (called from HTML)
function selectFile(filename) {
    if (window.pullRequestWebview) {
        window.pullRequestWebview.selectFile(filename);
    }
}

// Export for use in provider-specific implementations
window.BasePullRequestWebview = BasePullRequestWebview;
