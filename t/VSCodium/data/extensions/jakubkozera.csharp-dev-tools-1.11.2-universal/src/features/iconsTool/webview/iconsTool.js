let allIcons = [];
let filteredIcons = [];
let selectedIcon = null;
let currentSize = 45;
let currentStroke = 1.5;
let currentPage = 1;
let iconsPerPage = 40;
let totalPages = 1;
let loadedIcons = new Map(); // Cache for loaded SVG content
let pinnedIcons = new Set(); // Store pinned icon names
let isLoadingRemaining = false; // Flag to prevent multiple concurrent loads
let allIconsLoaded = false; // Flag to track if all icons are loaded
let nextLoadIndex = 0; // Track which icon index to load next

function focusSearchInput() {
    // Focus the search input field
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.focus();
    }
}

function handleKeyboardShortcuts(event) {
    // Handle Ctrl+L to focus search input
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        focusSearchInput();
        return;
    }
    
    // Handle left/right arrow keys for pagination (only when search input is not focused)
    const searchInput = document.getElementById('search-input');
    const isSearchInputFocused = document.activeElement === searchInput;
    
    if (!isSearchInputFocused) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (currentPage > 1) {
                goToPage(currentPage - 1);
            }
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            if (currentPage < totalPages) {
                goToPage(currentPage + 1);
            }
        }
    }
}

function init() {
    // Use the icons data passed from the extension
    allIcons = window.iconsData || [];
    
    // Count initial icons that have been fully loaded
    const initialIconsCount = allIcons.filter(icon => icon.isInitial).length;
    nextLoadIndex = initialIconsCount;
    
    // Load pinned icons from extension storage
    vscode.postMessage({
        command: 'loadPinnedIcons'
    });
    
    filteredIcons = [...allIcons];
    
    updatePagination();
    renderIcons();
    updateStats();
    setupEventListeners();
    
    // Add loading status indicator
    addLoadingStatusIndicator();
    
    // Focus the search input automatically when the page loads
    focusSearchInput();
    
    // Start lazy loading remaining icons after initial render
    setTimeout(() => {
        startLazyLoadingRemainingIcons();
    }, 100);
}

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const sizeSlider = document.getElementById('size-slider');
    const strokeSlider = document.getElementById('stroke-slider');
    const copySvgBtn = document.getElementById('copy-svg-btn');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const downloadBtn = document.getElementById('download-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    searchInput.addEventListener('input', handleSearch);
    sizeSlider.addEventListener('input', handleSizeChange);
    strokeSlider.addEventListener('input', handleStrokeChange);
    copySvgBtn.addEventListener('click', copySvg);
    copyCodeBtn.addEventListener('click', copySvg);
    downloadBtn.addEventListener('click', downloadSvg);
    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

    // Add keyboard shortcut for Ctrl+L to focus search input
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'iconLoaded':
                handleIconLoaded(message.iconName, message.iconContent);
                break;
            case 'pinnedIconsLoaded':
                handlePinnedIconsLoaded(message.pinnedIcons);
                break;
            case 'remainingIconsLoaded':
                handleRemainingIconsLoaded(message);
                break;
        }
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    if (!query) {
        filteredIcons = [...allIcons];
    } else {
        const nameMatches = [];
        const tagMatches = [];
        
        allIcons.forEach(iconData => {
            const nameMatch = iconData.name.toLowerCase().includes(query);
            const tagsMatch = iconData.tags && iconData.tags.some(tag => 
                tag.toLowerCase().includes(query)
            );
            
            if (nameMatch) {
                nameMatches.push(iconData);
            } else if (tagsMatch) {
                tagMatches.push(iconData);
            }
        });
        
        // Prioritize name matches first, then tag matches
        filteredIcons = [...nameMatches, ...tagMatches];
    }
    
    currentPage = 1; // Reset to first page on search
    updatePagination();
    renderIcons();
    updateStats();
}

function handleSizeChange(e) {
    currentSize = parseInt(e.target.value);
    document.getElementById('size-value').textContent = `${currentSize}px`;
    updateIconSizes();
    if (selectedIcon) {
        updateSelectedPreview();
        updateSvgCode();
    }
}

function handleStrokeChange(e) {
    currentStroke = parseFloat(e.target.value);
    document.getElementById('stroke-value').textContent = currentStroke;
    updateIconStrokes();
    if (selectedIcon) {
        updateSelectedPreview();
        updateSvgCode();
    }
}

function updateIconSizes() {
    const iconSvgs = document.querySelectorAll('.icon-svg svg');
    iconSvgs.forEach(svg => {
        svg.setAttribute('width', currentSize);
        svg.setAttribute('height', currentSize);
    });
}

function updateIconStrokes() {
    const iconSvgs = document.querySelectorAll('.icon-svg svg');
    iconSvgs.forEach(svg => {
        svg.setAttribute('stroke-width', currentStroke);
    });
}

function updatePagination() {
    totalPages = Math.ceil(filteredIcons.length / iconsPerPage);
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const paginationNumbers = document.getElementById('pagination-numbers');
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    // Generate page numbers
    paginationNumbers.innerHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        const btn = createPageButton(1);
        paginationNumbers.appendChild(btn);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationNumbers.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const btn = createPageButton(i);
        paginationNumbers.appendChild(btn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationNumbers.appendChild(ellipsis);
        }
        const btn = createPageButton(totalPages);
        paginationNumbers.appendChild(btn);
    }
}

function createPageButton(pageNumber) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn';
    btn.textContent = pageNumber;
    btn.addEventListener('click', () => goToPage(pageNumber));
    
    if (pageNumber === currentPage) {
        btn.classList.add('active');
    }
    
    return btn;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) {
        return;
    }
    currentPage = page;
    updatePagination();
    renderIcons();
}

function renderIcons() {
    const grid = document.getElementById('icons-grid');
    
    if (filteredIcons.length === 0) {
        grid.innerHTML = '<div class="no-results">No icons found</div>';
        return;
    }
    
    const searchInput = document.getElementById('search-input');
    const hasSearchFilter = searchInput.value.trim() !== '';
    
    let pageIcons;
    
    if (hasSearchFilter) {
        // Normal pagination when searching
        const startIndex = (currentPage - 1) * iconsPerPage;
        const endIndex = Math.min(startIndex + iconsPerPage, filteredIcons.length);
        pageIcons = filteredIcons.slice(startIndex, endIndex);
    } else {
        // When no search filter, always show pinned icons + regular pagination
        const startIndex = (currentPage - 1) * iconsPerPage;
        const endIndex = Math.min(startIndex + iconsPerPage, filteredIcons.length);
        
        // Get pinned icons that should always be visible
        const allPinnedIcons = filteredIcons.filter(iconData => pinnedIcons.has(iconData.name));
        
        // Get regular page icons (excluding already shown pinned icons)
        const regularPageIcons = filteredIcons.slice(startIndex, endIndex);
        
        // If we're on page 1, pinned icons are already included in the sort order
        if (currentPage === 1) {
            pageIcons = regularPageIcons;
        } else {
            // For other pages, add pinned icons + regular icons, but limit total to iconsPerPage
            const unpinnedPageIcons = regularPageIcons.filter(iconData => !pinnedIcons.has(iconData.name));
            const availableSlots = iconsPerPage - allPinnedIcons.length;
            
            if (availableSlots > 0) {
                pageIcons = [...allPinnedIcons, ...unpinnedPageIcons.slice(0, availableSlots)];
            } else {
                // If pinned icons exceed page size, just show pinned icons
                pageIcons = allPinnedIcons.slice(0, iconsPerPage);
            }
        }
    }
    
    grid.innerHTML = pageIcons.map(iconData => {
        const isPinned = pinnedIcons.has(iconData.name);
        
        return `
            <div class="icon-item ${isPinned ? 'pinned' : ''}" data-icon="${iconData.name}">
                <button class="pin-button ${isPinned ? 'pinned' : ''}" data-icon="${iconData.name}" title="${isPinned ? 'Unpin' : 'Pin'} icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" />
                        <path d="M9 15l-4.5 4.5" />
                        <path d="M14.5 4l5.5 5.5" />
                    </svg>
                </button>
                <div class="icon-svg" id="icon-${iconData.name}">
                    <div style="width: ${currentSize}px; height: ${currentSize}px; display: flex; align-items: center; justify-content: center; color: var(--vscode-descriptionForeground);">
                        ⏳
                    </div>
                </div>
                <div class="icon-name">${iconData.name}</div>
            </div>
        `;
    }).join('');

    // Load icons for current page
    pageIcons.forEach(iconData => {
        loadIcon(iconData.name);
    });

    // Add click listeners for icon selection
    document.querySelectorAll('.icon-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't select icon if pin button was clicked
            if (!e.target.closest('.pin-button')) {
                selectIcon(item.dataset.icon);
            }
        });
    });

    // Add click listeners for pin buttons
    document.querySelectorAll('.pin-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent icon selection
            toggleIconPin(button.dataset.icon);
        });
    });
}

function loadIcon(iconName) {
    if (loadedIcons.has(iconName)) {
        // Icon already loaded, display it
        displayIcon(iconName, loadedIcons.get(iconName));
    } else {
        // Request icon from extension
        vscode.postMessage({
            command: 'loadIcon',
            iconName: iconName
        });
    }
}

function handleIconLoaded(iconName, iconContent) {
    loadedIcons.set(iconName, iconContent);
    displayIcon(iconName, iconContent);
}

function displayIcon(iconName, iconContent) {
    const iconElement = document.getElementById(`icon-${iconName}`);
    if (iconElement) {
        // Update the SVG with current size and stroke
        const updatedSvg = iconContent
            .replace(/width="[^"]*"/, `width="${currentSize}"`)
            .replace(/height="[^"]*"/, `height="${currentSize}"`)
            .replace(/stroke-width="[^"]*"/, `stroke-width="${currentStroke}"`);
        
        iconElement.innerHTML = updatedSvg;
    }
}

function selectIcon(iconName) {
    document.querySelectorAll('.icon-item').forEach(item => {
        item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`[data-icon="${iconName}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    selectedIcon = iconName;
    updateSelectedPreview();
    updateSvgCode();
    showActionButtons();
}

function updateSelectedPreview() {
    const preview = document.getElementById('selected-icon-preview');
    
    if (loadedIcons.has(selectedIcon)) {
        const iconContent = loadedIcons.get(selectedIcon);
        const updatedSvg = iconContent
            .replace(/width="[^"]*"/, `width="${currentSize}"`)
            .replace(/height="[^"]*"/, `height="${currentSize}"`)
            .replace(/stroke-width="[^"]*"/, `stroke-width="${currentStroke}"`);
        
        preview.innerHTML = `
            <div class="preview-content">
                <div class="icon-svg">${updatedSvg}</div>
                <div class="preview-name">${selectedIcon}</div>
            </div>
        `;
    } else {
        // Load the icon if not already loaded
        loadIcon(selectedIcon);
        preview.innerHTML = `
            <div class="preview-content">
                <div class="icon-svg">
                    <div style="width: ${currentSize}px; height: ${currentSize}px; display: flex; align-items: center; justify-content: center; color: var(--vscode-descriptionForeground);">
                        ⏳
                    </div>
                </div>
                <div class="preview-name">${selectedIcon}</div>
            </div>
        `;
    }
}

function updateSvgCode() {
    const codeContent = document.getElementById('svg-code');
    
    if (loadedIcons.has(selectedIcon)) {
        const iconContent = loadedIcons.get(selectedIcon);
        const updatedSvg = iconContent
            .replace(/width="[^"]*"/, `width="${currentSize}"`)
            .replace(/height="[^"]*"/, `height="${currentSize}"`)
            .replace(/stroke-width="[^"]*"/, `stroke-width="${currentStroke}"`);
        
        // Format the SVG code for better readability
        const formattedSvg = updatedSvg
            .replace(/></g, '>\n<')
            .replace(/\s+/g, ' ')
            .trim();
        
        codeContent.textContent = formattedSvg;
    } else {
        codeContent.innerHTML = '<div class="empty-state">Loading SVG code...</div>';
    }
}

function showActionButtons() {
    document.getElementById('action-buttons').style.display = 'flex';
}

function updateStats() {
    const stats = document.getElementById('stats');
    const total = allIcons.length;
    const filtered = filteredIcons.length;
    
    // Always show final count, don't show loading progress
    if (filtered === total) {
        stats.textContent = `${total} icons`;
    } else {
        stats.textContent = `${filtered} of ${total} icons`;
    }
}

function copySvg() {
    if (!selectedIcon || !loadedIcons.has(selectedIcon)) {
        return;
    }
    
    const iconContent = loadedIcons.get(selectedIcon);
    const updatedSvg = iconContent
        .replace(/width="[^"]*"/, `width="${currentSize}"`)
        .replace(/height="[^"]*"/, `height="${currentSize}"`)
        .replace(/stroke-width="[^"]*"/, `stroke-width="${currentStroke}"`);
    
    navigator.clipboard.writeText(updatedSvg).then(() => {
        showNotification('SVG copied to clipboard');
    });
}

function downloadSvg() {
    if (!selectedIcon || !loadedIcons.has(selectedIcon)) {
        return;
    }
    
    const iconContent = loadedIcons.get(selectedIcon);
    const updatedSvg = iconContent
        .replace(/width="[^"]*"/, `width="${currentSize}"`)
        .replace(/height="[^"]*"/, `height="${currentSize}"`)
        .replace(/stroke-width="[^"]*"/, `stroke-width="${currentStroke}"`);
    
    // Send download request to extension
    vscode.postMessage({
        command: 'downloadIcon',
        iconName: selectedIcon,
        iconContent: updatedSvg
    });
    
    showNotification('Download started...');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 2000);
}

function handlePinnedIconsLoaded(pinned) {
    pinnedIcons = new Set(pinned || []);
    applySortingByPinStatus();
    renderIcons();
}

function toggleIconPin(iconName) {
    if (!iconName) {
        return;
    }
    
    if (pinnedIcons.has(iconName)) {
        pinnedIcons.delete(iconName);
    } else {
        pinnedIcons.add(iconName);
    }
    
    // Save to extension storage
    vscode.postMessage({
        command: 'savePinnedIcons',
        pinnedIcons: Array.from(pinnedIcons)
    });
    
    applySortingByPinStatus();
    renderIcons();
}

function applySortingByPinStatus() {
    // Only apply pin sorting when there's no search filter
    const searchInput = document.getElementById('search-input');
    if (searchInput.value.trim() === '') {
        const pinned = [];
        const unpinned = [];
        
        allIcons.forEach(iconData => {
            if (pinnedIcons.has(iconData.name)) {
                pinned.push(iconData);
            } else {
                unpinned.push(iconData);
            }
        });
        
        filteredIcons = [...pinned, ...unpinned];
        currentPage = 1;
        updatePagination();
    }
}

function addLoadingStatusIndicator() {
    // Don't show loading status indicator
    return;
}

function updateLoadingStatusIndicator() {
    // Don't update loading status indicator
    return;
}

function removeLoadingStatusIndicator() {
    const loadingStatus = document.getElementById('loading-status');
    if (loadingStatus) {
        loadingStatus.remove();
    }
}

function startLazyLoadingRemainingIcons() {
    if (isLoadingRemaining || allIconsLoaded || nextLoadIndex >= allIcons.length) {
        allIconsLoaded = true;
        return;
    }
    
    isLoadingRemaining = true;
    
    vscode.postMessage({
        command: 'loadRemainingIcons',
        startIndex: nextLoadIndex
    });
}

function handleRemainingIconsLoaded(message) {
    const { icons, startIndex, endIndex, totalFiles, hasMore } = message;
    
    // Update the existing icons with the loaded tag data
    icons.forEach((loadedIcon, index) => {
        const actualIndex = startIndex + index;
        if (actualIndex < allIcons.length) {
            // Find the icon by name (since order might be different due to pinned sorting)
            const existingIcon = allIcons.find(icon => icon.name === loadedIcon.name);
            if (existingIcon) {
                existingIcon.tags = loadedIcon.tags;
                existingIcon.isInitial = true; // Mark as loaded
            }
        }
    });
    
    nextLoadIndex = endIndex;
    
    // Update filtered icons if no search is active
    const searchInput = document.getElementById('search-input');
    if (!searchInput.value.trim()) {
        filteredIcons = [...allIcons];
        applySortingByPinStatus();
        updatePagination();
        updateStats();
    }
    
    isLoadingRemaining = false;
    
    if (hasMore && nextLoadIndex < allIcons.length) {
        // Continue loading remaining icons after a short delay
        setTimeout(() => {
            startLazyLoadingRemainingIcons();
        }, 50);
    } else {
        allIconsLoaded = true;
        console.log('All icons loaded successfully');
        
        // Update stats to show final count
        updateStats();
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
