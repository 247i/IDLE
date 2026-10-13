// Azure DevOps-specific pull request webview implementation

class AzureDevOpsPullRequestWebview extends BasePullRequestWebview {
    constructor() {
        super();
        this.provider = 'azuredevops';
        
    }

    handleProviderSpecificMessage(message) {
        switch (message.command) {
            case 'azurePolicies':
                this.handleAzurePolicies(message.data);
                break;
            case 'azureWorkItems':
                this.handleAzureWorkItems(message.data);
                break;
            case 'azureActivity':
                this.handleAzureActivity(message.data);
                break;
            default:
                
                break;
        }
    }

    handleAzurePolicies(policies) {
        
        this.updatePoliciesStatus(policies);
    }

    handleAzureWorkItems(workItems) {
        
        this.updateWorkItemsDisplay(workItems);
    }

    handleAzureActivity(activity) {
        
        this.updateActivityFeed(activity);
    }

    updateInfoBar() {
        super.updateInfoBar();
        
        if (!this.currentPullRequest) {
            return;
        }

        // Update Azure DevOps-specific elements
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.className = `status-badge azure-status status-${this.currentPullRequest.state}`;
        }

        // Add Azure DevOps-specific merge info
        const branchInfoDisplay = document.getElementById('branchInfoDisplay');
        if (branchInfoDisplay) {
            branchInfoDisplay.innerHTML = `
                <span>Merge</span>
                <strong>${this.escapeHtml(this.currentPullRequest.source_branch)}</strong>
                <span>into</span>
                <strong>${this.escapeHtml(this.currentPullRequest.target_branch)}</strong>
            `;
        }
    }

    updatePoliciesStatus(policies) {
        const azurePolicies = document.getElementById('azurePolicies');
        if (!azurePolicies || !policies || policies.length === 0) {
            return;
        }

        const policiesHtml = policies.map(policy => {
            const statusClass = this.getPolicyStatusClass(policy.status);
            return `
                <div class="azure-policy-status ${statusClass}">
                    ${this.getPolicyStatusIcon(policy.status)}
                    <span>${this.escapeHtml(policy.displayName)}</span>
                </div>
            `;
        }).join('');

        azurePolicies.innerHTML = policiesHtml;
    }

    getPolicyStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'approved':
                return 'approved';
            case 'rejected':
                return 'rejected';
            case 'waiting':
            case 'pending':
                return 'waiting';
            default:
                return 'waiting';
        }
    }

    getPolicyStatusIcon(status) {
        switch (status.toLowerCase()) {
            case 'approved':
                return '✓';
            case 'rejected':
                return '✗';
            case 'waiting':
            case 'pending':
                return '⏳';
            default:
                return '○';
        }
    }

    renderCommitItem(commit) {
        const authorInitials = this.getInitials(commit.author.name);
        const date = new Date(commit.author.date).toLocaleDateString();
        const shortSha = commit.sha.substring(0, 7);
        
        return `
            <div class="commit-item">
                <div class="commit-avatar">
                    ${commit.author.avatar_url ? 
                        `<img src="${commit.author.avatar_url}" alt="${this.escapeHtml(commit.author.name)}">` :
                        authorInitials
                    }
                </div>
                <div class="commit-content">
                    <div class="commit-message">${this.escapeHtml(commit.message)}</div>
                    <div class="commit-meta">
                        <span class="commit-author">${this.escapeHtml(commit.author.name)}</span>
                        <span>committed on</span>
                        <span class="commit-date">${date}</span>
                    </div>
                    <div class="commit-actions">
                        <span class="commit-sha" onclick="copyToClipboard('${commit.sha}')" title="Copy commit ID">
                            ${shortSha}
                        </span>
                        <a href="${commit.url}" class="commit-link" title="View commit in Azure DevOps">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    renderFileItem(file) {
        const statusClass = file.status.toLowerCase();
        const statusText = this.getAzureFileStatusText(file.status);
        const changesText = this.getAzureChangesText(file);
        
        return `
            <div class="file-item ${statusClass}" onclick="selectFile('${file.filename}')">
                <div class="file-icon">
                    ${this.getFileIcon(file.filename)}
                </div>
                <div class="file-name">${this.escapeHtml(file.filename)}</div>
                <div class="file-status">${statusText}</div>
                <div class="file-changes">${changesText}</div>
            </div>
        `;
    }

    getAzureFileStatusText(status) {
        switch (status.toLowerCase()) {
            case 'added':
                return 'Add';
            case 'modified':
                return 'Edit';
            case 'deleted':
                return 'Delete';
            case 'renamed':
                return 'Rename';
            default:
                return 'Change';
        }
    }

    getAzureChangesText(file) {
        const parts = [];
        if (file.additions > 0) {
            parts.push(`+${file.additions}`);
        }
        if (file.deletions > 0) {
            parts.push(`-${file.deletions}`);
        }
        return parts.join(' ');
    }

    selectFile(filename) {
        
        
        // Update visual selection
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = Array.from(document.querySelectorAll('.file-item'))
            .find(item => item.textContent.includes(filename));
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Store selection state
        this.uiState.selectedFile = filename;
        
        // Request file content from extension
        this.sendMessage('requestFileContent', { filename });
        
        // Show loading state
        const diffPreview = document.getElementById('diffPreview');
        if (diffPreview) {
            diffPreview.innerHTML = `
                <div class="loading">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading file diff...</div>
                        <div class="loading-subtext">${this.escapeHtml(filename)}</div>
                    </div>
                </div>
            `;
        }
    }

    handleFileContent(data) {
        
        
        const diffPreview = document.getElementById('diffPreview');
        if (!diffPreview) {
            return;
        }

        if (data.patch) {
            // Show diff content
            diffPreview.innerHTML = `
                <div class="azure-diff-header">
                    <h4>${this.escapeHtml(data.filename)}</h4>
                    <div class="azure-diff-controls">
                        <button class="btn btn-secondary azure-btn" onclick="openFileInEditor('${data.filename}')">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            Open in editor
                        </button>
                        <button class="btn btn-secondary azure-btn" onclick="downloadFile('${data.filename}')">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
                <div class="azure-diff-content">
                    <pre class="azure-diff-patch">${this.escapeHtml(data.patch)}</pre>
                </div>
            `;
        } else {
            // Show file content (for new files)
            diffPreview.innerHTML = `
                <div class="azure-diff-header">
                    <h4>${this.escapeHtml(data.filename)}</h4>
                    <div class="azure-diff-controls">
                        <button class="btn btn-secondary azure-btn" onclick="openFileInEditor('${data.filename}')">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            Open in editor
                        </button>
                    </div>
                </div>
                <div class="azure-file-content">
                    <pre class="azure-file-source">${this.escapeHtml(data.content)}</pre>
                </div>
            `;
        }
    }

    updateActivityFeed(activities) {
        const azureActivity = document.getElementById('azureActivity');
        if (!azureActivity || !activities || activities.length === 0) {
            return;
        }

        const activitiesHtml = activities.map(activity => {
            return this.renderActivityItem(activity);
        }).join('');

        azureActivity.innerHTML = `
            <div class="azure-activity-feed">
                <h3>Activity</h3>
                ${activitiesHtml}
            </div>
        `;
    }

    renderActivityItem(activity) {
        const authorInitials = this.getInitials(activity.author.name);
        const date = new Date(activity.date).toLocaleString();
        
        return `
            <div class="azure-activity-item">
                <div class="activity-avatar">
                    ${activity.author.avatar_url ? 
                        `<img src="${activity.author.avatar_url}" alt="${this.escapeHtml(activity.author.name)}">` :
                        authorInitials
                    }
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-author">${this.escapeHtml(activity.author.name)}</span>
                        <span class="activity-action">${this.escapeHtml(activity.action)}</span>
                        <span class="activity-date">${date}</span>
                    </div>
                    ${activity.description ? `<div class="activity-description">${this.escapeHtml(activity.description)}</div>` : ''}
                </div>
            </div>
        `;
    }

    onTabChanged(tabId) {
        super.onTabChanged(tabId);
        
        // Azure DevOps-specific tab handling
        if (tabId === 'files') {
            // Request files if not loaded
            if (!this.uiState.filesLoaded) {
                this.sendMessage('requestFiles');
            }
        } else if (tabId === 'commits') {
            // Request commits if not loaded
            if (this.commits.length === 0) {
                this.sendMessage('requestCommits');
            }
        }
    }
}

// Global functions for Azure DevOps-specific actions
function toggleFilesSidebar() {
    const sidebar = document.getElementById('filesSidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            
            // Could show a toast notification here
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    }
}

function openFileInEditor(filename) {
    if (window.pullRequestWebview) {
        window.pullRequestWebview.sendMessage('openFileInEditor', { filename });
    }
}

function downloadFile(filename) {
    if (window.pullRequestWebview) {
        window.pullRequestWebview.sendMessage('downloadFile', { filename });
    }
}

// Initialize Azure DevOps webview
document.addEventListener('DOMContentLoaded', function() {
    window.pullRequestWebview = new AzureDevOpsPullRequestWebview();
    
});
