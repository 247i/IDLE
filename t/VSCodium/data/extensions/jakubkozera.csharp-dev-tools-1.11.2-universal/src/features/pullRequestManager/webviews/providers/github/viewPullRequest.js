// GitHub-specific pull request webview implementation

class GitHubPullRequestWebview extends BasePullRequestWebview {
    constructor() {
        super();
        this.provider = 'github';
        
    }

    handleProviderSpecificMessage(message) {
        switch (message.command) {
            case 'githubChecks':
                this.handleGitHubChecks(message.data);
                break;
            case 'githubReviews':
                this.handleGitHubReviews(message.data);
                break;
            case 'pullRequestThreadsLoaded':
                this.handleGitHubTimeline(message.data);
                break;
            default:
                
                break;
        }
    }

    handleGitHubChecks(checks) {
        
        this.updateChecksStatus(checks);
    }

    handleGitHubReviews(reviews) {
        
        // Store review comments with inline context for later use
        if (reviews.reviewComments && reviews.reviewComments.length > 0) {
            
            // Group review comments by thread hierarchy using in_reply_to_id
            const commentThreads = this.groupReviewCommentsByThread(reviews.reviewComments);
            
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
            
            
            
            
            // Update inline comments if we have a current file open
            if (window.monacoDiffEditor && window.currentFile) {
                
                window.updateInlineComments(window.currentFile.fileName);
            }
        }
        
        this.updateReviewsDisplay(reviews);
    }

    updateReviewsDisplay(reviews) {
        
        
        // Find the timeline container
        let timelineContainer = document.getElementById('githubTimelineItems');
        if (!timelineContainer) {
            timelineContainer = document.getElementById('historyTimeline');
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
            const commentThreads = this.groupReviewCommentsByThread(reviews.reviewComments);
            
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
            const itemElement = this.renderReviewItem(item);
            if (itemElement) {
                timelineContainer.appendChild(itemElement);
            }
        });
        
        
    }

    renderReviewItem(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'timeline-item';
        itemDiv.setAttribute('data-id', item.id);
        
        if (item.type === 'review') {
            return this.renderReviewSummary(item);
        } else if (item.type === 'review_comments_thread') {
            return this.renderReviewCommentsThread(item);
        }
        
        return null;
    }

    renderReviewSummary(review) {
        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'timeline-item review-summary';
        reviewDiv.setAttribute('data-id', review.id);
        
        const author = review.author;
        const authorName = author.displayName || author.name || author.login || 'Unknown';
        const reviewDate = this.formatDate(new Date(review.created_at));
        
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
            avatarHtml = `<img src="${author.avatar_url}" alt="${this.escapeHtml(authorName)}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 12px;">`;
        } else {
            const initials = this.getAuthorInitials(authorName);
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
                        <strong style="color: var(--vscode-foreground);">${this.escapeHtml(authorName)}</strong>
                        <span class="review-state ${stateClass}" style="display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                            ${stateIcon} ${review.state.replace('_', ' ')}
                        </span>
                        <span style="color: var(--vscode-descriptionForeground); font-size: 12px;">${reviewDate}</span>
                    </div>
                    ${review.body ? `<div style="color: var(--vscode-foreground); margin-top: 8px;">${this.renderMarkdown(review.body)}</div>` : ''}
                </div>
            </div>
        `;
        
        return reviewDiv;
    }

    renderReviewCommentsThread(thread) {
        const threadDiv = document.createElement('div');
        threadDiv.className = 'timeline-item review-comments-thread';
        threadDiv.setAttribute('data-id', thread.id);
        
        const mainComment = thread.mainComment;
        const author = mainComment.user;
        const authorName = author.displayName || author.name || author.login || 'Unknown';
        const commentDate = this.formatDate(new Date(mainComment.created_at));
        
        let avatarHtml = '';
        if (author.avatar_url) {
            avatarHtml = `<img src="${author.avatar_url}" alt="${this.escapeHtml(authorName)}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 12px;">`;
        } else {
            const initials = this.getAuthorInitials(authorName);
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
            const commentCreatedAt = this.formatDate(new Date(comment.created_at));
            
            let commentAvatarHtml = '';
            if (index > 0) { // Show author for replies
                if (commentAuthor.avatar_url) {
                    commentAvatarHtml = `<img src="${commentAuthor.avatar_url}" alt="${this.escapeHtml(commentAuthorName)}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">`;
                } else {
                    const commentInitials = this.getAuthorInitials(commentAuthorName);
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
                            <strong style="color: var(--vscode-foreground);">${this.escapeHtml(commentAuthorName)}</strong>
                            <span style="color: var(--vscode-descriptionForeground); font-size: 12px; margin-left: auto;">${commentCreatedAt}</span>
                        </div>
                    ` : ''}
                    <div style="color: var(--vscode-foreground); ${index > 0 ? 'margin-left: 32px;' : ''}">${this.renderMarkdown(comment.body)}</div>
                </div>
            `;
        });
        
        threadDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; padding: 16px;">
                ${avatarHtml}
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <strong style="color: var(--vscode-foreground);">${this.escapeHtml(authorName)}</strong>
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

    getAuthorInitials(name) {
        if (!name) { return 'U'; }
        return name.split(' ').map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
    }

    formatDate(date) {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    renderMarkdown(text) {
        if (!text) { return ''; }
        // Basic markdown rendering - can be enhanced
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: var(--vscode-textCodeBlock-background); padding: 1px 3px; border-radius: 3px;">$1</code>')
            .replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    groupReviewCommentsByThread(reviewComments) {
        
        
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

    handleGitHubTimeline(timelineData) {
        
        
        
        this.updateGitHubTimeline(timelineData);
    }

    updateGitHubTimeline(timelineData) {
        // Store threads globally for use in Monaco editor inline comments
        if (timelineData && timelineData.value) {
            window.allThreads = timelineData.value;
            
            
            // Log threads with threadContext for debugging
            const threadsWithContext = timelineData.value.filter(thread => thread.threadContext);
            
            threadsWithContext.forEach(thread => {
                
            });
        }
        
        // Try GitHub-specific container first, then fall back to shared container
        let timelineContainer = document.getElementById('githubTimelineItems');
        if (!timelineContainer) {
            timelineContainer = document.getElementById('historyTimeline');
        }
        
        if (!timelineContainer) {
            console.warn('Timeline container not found! Tried both githubTimelineItems and historyTimeline');
            return;
        }
        
        

        // GitHub API returns different structures, handle both comments and issue events
        let timelineItems = [];
        
        if (timelineData.value && Array.isArray(timelineData.value)) {
            // Azure DevOps format (converted to GitHub-like structure)
            timelineItems = timelineData.value;
            
        } else if (Array.isArray(timelineData)) {
            // Direct GitHub format
            timelineItems = timelineData;
            
        }

        
        
        if (!timelineItems || timelineItems.length === 0) {
            timelineContainer.innerHTML = '<div class="form-help">No comments or activity yet.</div>';
            return;
        }

        // Debug first item structure
        if (timelineItems.length > 0) {
            
            
            
        }

        const timelineHtml = timelineItems.map(item => {
            return this.renderGitHubTimelineItem(item);
        }).join('');

        timelineContainer.innerHTML = timelineHtml;
        
        // Update inline comments in the current file if Monaco editor is active
        if (window.monacoDiffEditor && window.currentFile) {
            
            window.updateInlineComments(window.currentFile.fileName);
        } else {
            
        }
        
        // Force a refresh of avatar images that might have failed to load
        setTimeout(() => {
            const avatarImages = timelineContainer.querySelectorAll('.thread-avatar img, .github-timeline-avatar img');
            avatarImages.forEach(img => {
                img.onerror = () => {
                    
                    const avatar = img.parentElement;
                    const authorName = img.alt || 'Unknown';
                    const initials = this.getInitials(authorName);
                    avatar.innerHTML = initials;
                };
            });
        }, 100);
    }

    renderGitHubTimelineItem(item) {
        
        
        // Handle different author formats from GitHub API
        let author;
        if (item.author && typeof item.author === 'object') {
            author = item.author;
            
        } else if (item.user && typeof item.user === 'object') {
            author = item.user;
            
        } else if (item.author && typeof item.author === 'string') {
            author = {
                login: item.author,
                name: item.author,
                avatar_url: `https://github.com/${item.author}.png`
            };
            
        } else if (item.user && typeof item.user === 'string') {
            author = {
                login: item.user,
                name: item.user,
                avatar_url: `https://github.com/${item.user}.png`
            };
            
        } else {
            author = {
                login: 'unknown',
                name: 'Unknown',
                avatar_url: null
            };
            
        }
        
        const authorName = author.login || author.name || 'Unknown';
        const authorInitials = this.getInitials(authorName);
        const date = new Date(item.created_at || item.publishedDate || item.lastUpdatedDate).toLocaleString();
        
        
        
        
        // Handle different types of timeline items
        let content = '';
        let action = '';
        
        if (item.body || item.content) {
            // Comment
            action = 'commented';
            content = `<div class="thread-body github-timeline-body">${this.escapeHtml(item.body || item.content)}</div>`;
        } else if (item.event) {
            // GitHub event (like 'opened', 'closed', 'merged', etc.)
            action = item.event;
            if (item.commit_id) {
                content = `<div class="thread-body github-timeline-body">Commit: ${item.commit_id.substring(0, 7)}</div>`;
            }
        } else if (item.commentType) {
            // Azure DevOps thread converted to GitHub format
            action = 'commented';
            const comments = item.comments || [];
            if (comments.length > 0) {
                const comment = comments[0];
                content = `<div class="thread-body github-timeline-body">${this.escapeHtml(comment.content)}</div>`;
            }
        } else {
            action = 'updated';
        }
        
        const htmlResult = `
            <div class="thread-item github-timeline-item">
                <div class="thread-avatar github-timeline-avatar">
                    ${author.avatar_url ? 
                        `<img src="${author.avatar_url}" alt="${this.escapeHtml(authorName)}">` :
                        authorInitials
                    }
                </div>
                <div class="thread-content github-timeline-content">
                    <div class="thread-header github-timeline-header">
                        <span class="thread-author github-timeline-author">${this.escapeHtml(authorName)}</span>
                        <span class="thread-action github-timeline-action">${this.escapeHtml(action)}</span>
                        <span class="thread-date github-timeline-date">${date}</span>
                    </div>
                    ${content}
                </div>
            </div>
        `;
        
        
        return htmlResult;
    }

    updateInfoBar() {
        super.updateInfoBar();
        
        if (!this.currentPullRequest) {
            return;
        }

        // Update GitHub-specific elements
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.className = `status-badge github-status status-${this.currentPullRequest.state}`;
        }

        // Add GitHub-specific merge info
        const branchInfoDisplay = document.getElementById('branchInfoDisplay');
        if (branchInfoDisplay) {
            branchInfoDisplay.innerHTML = `
                <span>${this.escapeHtml(this.currentPullRequest.author.login || this.currentPullRequest.author.name)} wants to merge commits into</span>
                <strong>${this.escapeHtml(this.currentPullRequest.target_branch)}</strong>
                <span>from</span>
                <strong>${this.escapeHtml(this.currentPullRequest.source_branch)}</strong>
            `;
        }
    }

    updateChecksStatus(checks) {
        const githubChecks = document.getElementById('githubChecks');
        if (!githubChecks || !checks || checks.length === 0) {
            return;
        }

        const checksHtml = checks.map(check => {
            const statusClass = this.getCheckStatusClass(check.status);
            return `
                <div class="github-check-status ${statusClass}">
                    ${this.getCheckStatusIcon(check.status)}
                    <span>${this.escapeHtml(check.name)}</span>
                </div>
            `;
        }).join('');

        githubChecks.innerHTML = checksHtml;
    }

    getCheckStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'success':
            case 'completed':
                return 'success';
            case 'failure':
            case 'failed':
                return 'failure';
            case 'pending':
            case 'in_progress':
                return 'pending';
            default:
                return 'pending';
        }
    }

    getCheckStatusIcon(status) {
        switch (status.toLowerCase()) {
            case 'success':
            case 'completed':
                return '✓';
            case 'failure':
            case 'failed':
                return '✗';
            case 'pending':
            case 'in_progress':
                return '⟳';
            default:
                return '○';
        }
    }

    renderCommitItem(commit) {
        const authorInitials = this.getInitials(commit.author.name);
        const date = new Date(commit.author.date).toLocaleDateString();
        const shortSha = commit.sha.substring(0, 7);
        const verifiedBadge = commit.verified ? 
            '<span class="commit-verified" title="Verified">✓</span>' : '';
        
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
                        committed
                        <span class="commit-date">${date}</span>
                        ${verifiedBadge}
                    </div>
                    <div class="commit-actions">
                        <span class="commit-sha" onclick="copyToClipboard('${commit.sha}')" title="Copy full SHA">
                            ${shortSha}
                        </span>
                        <a href="${commit.url}" class="commit-link" title="View commit on GitHub">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    renderFileItem(file) {
        const statusClass = file.status.toLowerCase();
        const statusText = this.getGitHubFileStatusText(file.status);
        const changesText = this.getGitHubChangesText(file);
        
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

    getGitHubFileStatusText(status) {
        switch (status.toLowerCase()) {
            case 'added':
                return 'A';
            case 'modified':
                return 'M';
            case 'deleted':
                return 'D';
            case 'renamed':
                return 'R';
            default:
                return '?';
        }
    }

    getGitHubChangesText(file) {
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
                <div class="github-diff-header">
                    <h4>${this.escapeHtml(data.filename)}</h4>
                    <div class="github-diff-controls">
                        <button class="btn btn-secondary github-btn" onclick="openFileInEditor('${data.filename}')">
                            Open in editor
                        </button>
                    </div>
                </div>
                <div class="github-diff-content">
                    <pre class="github-diff-patch">${this.escapeHtml(data.patch)}</pre>
                </div>
            `;
        } else {
            // Show file content (for new files)
            diffPreview.innerHTML = `
                <div class="github-diff-header">
                    <h4>${this.escapeHtml(data.filename)}</h4>
                    <div class="github-diff-controls">
                        <button class="btn btn-secondary github-btn" onclick="openFileInEditor('${data.filename}')">
                            Open in editor
                        </button>
                    </div>
                </div>
                <div class="github-file-content">
                    <pre class="github-file-source">${this.escapeHtml(data.content)}</pre>
                </div>
            `;
        }
    }

    onTabChanged(tabId) {
        super.onTabChanged(tabId);
        
        // GitHub-specific tab handling
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
        } else if (tabId === 'overview') {
            // Load timeline/comments when overview tab is selected
            this.sendMessage({
                command: 'loadPullRequestThreads',
                pullRequestId: this.currentPullRequestId
            });
        }
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // GitHub-specific event listeners
        const githubCommentInput = document.getElementById('githubCommentInput');
        const githubCommentSubmitBtn = document.getElementById('githubCommentSubmitBtn');
        
        if (githubCommentInput && githubCommentSubmitBtn) {
            // Show/hide submit button based on content
            githubCommentInput.addEventListener('input', () => {
                const hasContent = githubCommentInput.value.trim().length > 0;
                githubCommentSubmitBtn.style.display = hasContent ? 'inline-flex' : 'none';
            });
            
            // Handle enter key (Ctrl+Enter to submit)
            githubCommentInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.submitGitHubComment();
                }
                
                // Show submit button if there's content
                setTimeout(() => {
                    const hasContent = githubCommentInput.value.trim().length > 0;
                    githubCommentSubmitBtn.style.display = hasContent ? 'inline-flex' : 'none';
                }, 0);
            });
            
            // Submit button click
            githubCommentSubmitBtn.addEventListener('click', () => {
                this.submitGitHubComment();
            });
        }
    }

    // Test method to manually trigger timeline rendering with sample data
    testTimelineRendering() {
        
        const sampleData = {
            value: [
                {
                    id: 123,
                    author: {
                        name: 'jakubkozera',
                        login: 'jakubkozera',
                        avatar_url: 'https://github.com/jakubkozera.png'
                    },
                    user: {
                        name: 'jakubkozera',
                        login: 'jakubkozera',
                        avatar_url: 'https://github.com/jakubkozera.png'
                    },
                    created_at: '2025-07-25T11:07:32.000Z',
                    body: 'Test comment',
                    content: 'Test comment',
                    commentType: 'text'
                }
            ]
        };
        
        this.updateGitHubTimeline(sampleData);
    }

    submitGitHubComment() {
        const githubCommentInput = document.getElementById('githubCommentInput');
        const githubCommentSubmitBtn = document.getElementById('githubCommentSubmitBtn');
        
        if (!githubCommentInput || !githubCommentSubmitBtn) {
            return;
        }
        
        const comment = githubCommentInput.value.trim();
        if (!comment) {
            return;
        }
        
        // Disable input during submission
        githubCommentInput.disabled = true;
        githubCommentSubmitBtn.disabled = true;
        githubCommentSubmitBtn.textContent = 'Submitting...';
        
        // Send comment to backend
        this.sendMessage({
            command: 'addComment',
            pullRequestId: this.currentPullRequestId,
            comment: comment
        });
        
        // Clear and reset form
        setTimeout(() => {
            githubCommentInput.value = '';
            githubCommentInput.disabled = false;
            githubCommentSubmitBtn.disabled = false;
            githubCommentSubmitBtn.textContent = 'Comment';
            githubCommentSubmitBtn.style.display = 'none';
            
            // Reload timeline to show new comment
            this.sendMessage({
                command: 'loadPullRequestThreads',
                pullRequestId: this.currentPullRequestId
            });
        }, 1000);
    }
}

// Global functions for GitHub-specific actions
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

// Global test function for debugging
function testGitHubTimeline() {
    
    if (window.pullRequestWebview) {
        window.pullRequestWebview.testTimelineRendering();
    } else {
        console.error('GitHub webview not initialized');
    }
}

// Initialize GitHub webview
document.addEventListener('DOMContentLoaded', function() {
    
    
    // Check if required elements exist
    const timelineContainer = document.getElementById('githubTimelineItems');
    
    
    if (!timelineContainer) {
        console.error('Timeline container not found! HTML structure may be incorrect.');
        return;
    }
    
    try {
        window.pullRequestWebview = new GitHubPullRequestWebview();
        
        
        // Send a test message to ensure communication works
        window.pullRequestWebview.sendMessage({
            command: 'test',
            message: 'GitHub webview initialized'
        });
        
    } catch (error) {
        console.error('Error initializing GitHub webview:', error);
    }
});
