/**
 * SharedDropdown - Reusable dropdown component for webviews
 * 
 * A lightweight, VSCode-themed custom dropdown component with animations and per-instance state management.
 * Provides a consistent dropdown experience across all webviews in the extension.
 * 
 * @example
 * const projectDropdown = new SharedDropdown({
 *   containerId: 'projectSelectContainer',
 *   placeholder: 'Select project...',
 *   items: [
 *     { value: '', label: 'All Projects' },
 *     { value: 'path/to/project.csproj', label: 'MyProject' }
 *   ],
 *   onChange: (value, label) => {
 *     console.log('Selected:', value, label);
 *   },
 *   initialValue: ''
 * });
 */

/**
 * SharedDropdown component class
 */
class SharedDropdown {
  /**
   * Creates a new dropdown instance
   * @param {Object} config - Configuration object
   * @param {string} config.containerId - ID of the container element (must exist in DOM)
   * @param {string} config.placeholder - Placeholder text shown when no selection
   * @param {Array<{value: string, label: string}>} config.items - Array of dropdown items
   * @param {Function} config.onChange - Callback fired when selection changes (value, label) => void
   * @param {string} [config.initialValue] - Initial selected value (optional)
   * @param {boolean} [config.allowClear=false] - Whether to allow clearing the selection (optional)
   * @param {boolean} [config.enableSearch=false] - Whether to enable search/filter functionality (optional)
   */
  constructor(config) {
    // Validate required config
    if (!config.containerId) {
      throw new Error('SharedDropdown: containerId is required');
    }
    if (!config.placeholder) {
      throw new Error('SharedDropdown: placeholder is required');
    }

    this.config = {
      allowClear: false,
      enableSearch: false,
      ...config
    };

    // Get container element
    this.container = document.getElementById(config.containerId);
    if (!this.container) {
      throw new Error(`SharedDropdown: Container element with id "${config.containerId}" not found`);
    }

    // Store instance state
    this.currentValue = config.initialValue || '';
    this.currentLabel = config.placeholder;
    this.items = config.items || [];
    this.allItems = [...(config.items || [])]; // Keep original items for filtering
    this.isOpen = false;
    this.enabled = true;
    this.searchQuery = '';
    this.highlightedIndex = -1; // For keyboard navigation

    // Create DOM structure
    this._createDOM();

    // Bind event handlers
    this._bindEvents();

    // Register this instance
    SharedDropdown._instances.push(this);

    // Set initial value if provided
    if (config.initialValue !== undefined && config.initialValue !== '') {
      this.setValue(config.initialValue);
    }
  }

  /**
   * Creates the dropdown DOM structure
   * @private
   */
  _createDOM() {
    // Clear container
    this.container.innerHTML = '';
    this.container.className = 'custom-select';

    // Create trigger element
    this.trigger = document.createElement('div');
    this.trigger.className = 'select-selected';
    this.trigger.tabIndex = 0; // Make focusable for keyboard navigation
    this.trigger.setAttribute('role', 'combobox');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    this.trigger.innerHTML = `
      <span>${this._escapeHtml(this.currentLabel)}</span>
      <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9l6 6l6 -6" />
      </svg>
    `;

    // Create dropdown items container
    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'select-items';

    // Create search input if enabled
    if (this.config.enableSearch) {
      this.searchWrapper = document.createElement('div');
      this.searchWrapper.className = 'select-search-wrapper';
      
      this.searchInput = document.createElement('input');
      this.searchInput.type = 'text';
      this.searchInput.className = 'select-search-input';
      this.searchInput.placeholder = 'Search...';
      
      const searchIcon = document.createElement('div');
      searchIcon.className = 'select-search-icon';
      searchIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
          <path d="M21 21l-6 -6" />
        </svg>
      `;
      
      this.searchWrapper.appendChild(this.searchInput);
      this.searchWrapper.appendChild(searchIcon);
      this.itemsContainer.appendChild(this.searchWrapper);
    }

    // Create hidden input to store value
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = 'hidden';
    this.hiddenInput.value = this.currentValue;

    // Append to container
    this.container.appendChild(this.trigger);
    this.container.appendChild(this.hiddenInput);
    
    // Append items container to body for proper fixed positioning
    document.body.appendChild(this.itemsContainer);

    // Populate items
    this._populateItems();
  }

  /**
   * Populates dropdown items
   * @private
   */
  _populateItems() {
    // Remove only item divs, preserve search wrapper
    const itemDivs = this.itemsContainer.querySelectorAll('.select-item');
    itemDivs.forEach(div => div.remove());

    this.items.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'select-item';
      itemDiv.textContent = item.label;
      itemDiv.dataset.value = item.value;

      // Mark as selected if it matches current value
      if (item.value === this.currentValue) {
        itemDiv.classList.add('same-as-selected');
      }

      // Add click handler
      itemDiv.addEventListener('click', (e) => {
        this._handleItemClick(item.value, item.label, e);
      });

      this.itemsContainer.appendChild(itemDiv);
    });
  }

  /**
   * Binds event handlers
   * @private
   */
  _bindEvents() {
    // Toggle dropdown on trigger click
    this._triggerClickHandler = (e) => {
      e.stopPropagation();
      if (!this.enabled) {
        return;
      }

      // Close all other dropdowns
      this._closeOtherDropdowns();

      // Toggle this dropdown
      this.isOpen = !this.isOpen;
      this._updateOpenState();
    };
    this.trigger.addEventListener('click', this._triggerClickHandler);

    // Close dropdown when clicking outside
    this._documentClickHandler = (e) => {
      if (this.container && !this.container.contains(e.target) && 
          this.itemsContainer && !this.itemsContainer.contains(e.target) && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('click', this._documentClickHandler);

    // Search input handler
    if (this.config.enableSearch && this.searchInput) {
      this._searchInputHandler = (e) => {
        e.stopPropagation();
        this.searchQuery = e.target.value;
        this._filterItems();
        this.highlightedIndex = -1; // Reset highlight on search
      };
      this.searchInput.addEventListener('input', this._searchInputHandler);
      
      // Prevent closing dropdown when clicking search input
      this._searchClickHandler = (e) => {
        e.stopPropagation();
      };
      this.searchInput.addEventListener('click', this._searchClickHandler);
      
      // Keyboard navigation for search input
      this._searchKeydownHandler = (e) => {
        this._handleKeyboardNavigation(e);
      };
      this.searchInput.addEventListener('keydown', this._searchKeydownHandler);
    }
    
    // Keyboard navigation for trigger
    this._triggerKeydownHandler = (e) => {
      if (!this.enabled) return;
      
      // Open dropdown on Enter or Space when closed
      if ((e.key === 'Enter' || e.key === ' ') && !this.isOpen) {
        e.preventDefault();
        this.open();
      } else if (this.isOpen) {
        this._handleKeyboardNavigation(e);
      }
    };
    this.trigger.addEventListener('keydown', this._triggerKeydownHandler);
  }

  /**
   * Handles keyboard navigation
   * @private
   */
  _handleKeyboardNavigation(e) {
    if (!this.isOpen) return;
    
    const itemElements = Array.from(this.itemsContainer.querySelectorAll('.select-item'));
    const visibleItems = this.items;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, visibleItems.length - 1);
        this._updateHighlight();
        this._scrollToHighlighted();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this._updateHighlight();
        this._scrollToHighlighted();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (visibleItems.length === 1) {
          // Auto-select if only one item visible
          this._handleItemClick(visibleItems[0].value, visibleItems[0].label, e);
        } else if (this.highlightedIndex >= 0 && this.highlightedIndex < visibleItems.length) {
          // Select highlighted item
          const selectedItem = visibleItems[this.highlightedIndex];
          this._handleItemClick(selectedItem.value, selectedItem.label, e);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
        
      case 'Home':
        e.preventDefault();
        this.highlightedIndex = 0;
        this._updateHighlight();
        this._scrollToHighlighted();
        break;
        
      case 'End':
        e.preventDefault();
        this.highlightedIndex = visibleItems.length - 1;
        this._updateHighlight();
        this._scrollToHighlighted();
        break;
    }
  }

  /**
   * Updates visual highlight on items
   * @private
   */
  _updateHighlight() {
    const itemElements = this.itemsContainer.querySelectorAll('.select-item');
    itemElements.forEach((el, index) => {
      if (index === this.highlightedIndex) {
        el.classList.add('select-item-highlighted');
      } else {
        el.classList.remove('select-item-highlighted');
      }
    });
  }

  /**
   * Scrolls to highlighted item
   * @private
   */
  _scrollToHighlighted() {
    if (this.highlightedIndex < 0) return;
    
    const itemElements = this.itemsContainer.querySelectorAll('.select-item');
    const highlightedElement = itemElements[this.highlightedIndex];
    
    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }

  /**
   * Handles item click
   * @private
   */
  _handleItemClick(value, label, event) {
    event.stopPropagation();

    if (!this.enabled) {
      return;
    }

    // Update value and label
    this.currentValue = value;
    this.currentLabel = label;

    // Update hidden input
    this.hiddenInput.value = value;

    // Update trigger text
    const span = this.trigger.querySelector('span');
    if (span) {
      span.textContent = label;
    }

    // Update selected styling
    const items = this.itemsContainer.querySelectorAll('.select-item');
    items.forEach(item => {
      item.classList.remove('same-as-selected');
      if (item.dataset.value === value) {
        item.classList.add('same-as-selected');
      }
    });

    // Close dropdown
    this.close();

    // Trigger change event on hidden input
    const changeEvent = new Event('change', { bubbles: true });
    this.hiddenInput.dispatchEvent(changeEvent);

    // Call onChange callback if provided
    if (this.config.onChange) {
      this.config.onChange(value, label);
    }
  }

  /**
   * Filters items based on search query
   * @private
   */
  _filterItems() {
    const query = this.searchQuery.toLowerCase();
    
    if (!query) {
      // Show all items when no search query
      this.items = [...this.allItems];
    } else {
      // Filter items case-insensitive
      this.items = this.allItems.filter(item => 
        item.label.toLowerCase().includes(query)
      );
    }
    
    this._populateItems();
  }

  /**
   * Updates the open state styling
   * @private
   */
  _updateOpenState() {
    if (this.isOpen) {
      // Position dropdown below trigger
      const triggerRect = this.trigger.getBoundingClientRect();
      this.itemsContainer.style.top = `${triggerRect.bottom + 4}px`;
      this.itemsContainer.style.left = `${triggerRect.left}px`;
      this.itemsContainer.style.minWidth = `${triggerRect.width}px`;
      this.itemsContainer.style.width = 'auto';
      
      this.itemsContainer.classList.add('select-show');
      this.trigger.classList.add('select-arrow-active');
      this.trigger.setAttribute('aria-expanded', 'true');
      
      // Reset highlighted index
      this.highlightedIndex = -1;
      
      // Focus search input if enabled
      if (this.config.enableSearch && this.searchInput) {
        setTimeout(() => {
          this.searchInput.focus();
        }, 50);
      }
    } else {
      this.itemsContainer.classList.remove('select-show');
      this.trigger.classList.remove('select-arrow-active');
      this.trigger.setAttribute('aria-expanded', 'false');
      
      // Reset highlight and search when closing
      this.highlightedIndex = -1;
      if (this.config.enableSearch && this.searchInput) {
        this.searchQuery = '';
        this.searchInput.value = '';
        this.items = [...this.allItems];
        this._populateItems();
      }
    }
  }

  /**
   * Closes all other dropdown instances
   * @private
   */
  _closeOtherDropdowns() {
    SharedDropdown._instances.forEach(instance => {
      if (instance !== this && instance.isOpen) {
        instance.close();
      }
    });
  }

  /**
   * Escapes HTML to prevent XSS
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API methods

  /**
   * Sets the dropdown value
   * @param {string} value - The value to set
   * @returns {boolean} True if value was found and set, false otherwise
   */
  setValue(value) {
    const item = this.items.find(i => i.value === value);
    if (item) {
      this.currentValue = value;
      this.currentLabel = item.label;
      this.hiddenInput.value = value;

      // Update trigger text
      const span = this.trigger.querySelector('span');
      if (span) {
        span.textContent = item.label;
      }

      // Update selected styling
      const items = this.itemsContainer.querySelectorAll('.select-item');
      items.forEach(itemDiv => {
        itemDiv.classList.remove('same-as-selected');
        if (itemDiv.dataset.value === value) {
          itemDiv.classList.add('same-as-selected');
        }
      });

      return true;
    }
    return false;
  }

  /**
   * Gets the current dropdown value
   * @returns {string} Current value
   */
  getValue() {
    return this.currentValue;
  }

  /**
   * Gets the current dropdown label
   * @returns {string} Current label
   */
  getLabel() {
    return this.currentLabel;
  }

  /**
   * Updates the dropdown items
   * @param {Array<{value: string, label: string}>} items - New items array
   */
  updateItems(items) {
    this.items = items || [];
    this.allItems = [...this.items];
    
    // Reset search
    if (this.config.enableSearch && this.searchInput) {
      this.searchQuery = '';
      this.searchInput.value = '';
    }
    
    this._populateItems();

    // Revalidate current value
    const currentItem = this.items.find(i => i.value === this.currentValue);
    if (!currentItem && this.items.length > 0) {
      // Current value no longer exists, reset to first item or placeholder
      this.setValue(this.items[0].value);
    }
  }

  /**
   * Opens the dropdown
   */
  open() {
    if (!this.enabled || this.isOpen) {
      return;
    }

    this._closeOtherDropdowns();
    this.isOpen = true;
    this._updateOpenState();
  }

  /**
   * Closes the dropdown
   */
  close() {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this._updateOpenState();
  }

  /**
   * Enables the dropdown
   */
  enable() {
    this.enabled = true;
    this.trigger.style.opacity = '1';
    this.trigger.style.cursor = 'pointer';
  }

  /**
   * Disables the dropdown
   */
  disable() {
    this.enabled = false;
    this.trigger.style.opacity = '0.5';
    this.trigger.style.cursor = 'not-allowed';
    this.close();
  }

  /**
   * Gets the hidden input element (for accessing in existing code)
   * @returns {HTMLInputElement} The hidden input element
   */
  getHiddenInput() {
    return this.hiddenInput;
  }

  /**
   * Destroys the dropdown instance and cleans up
   */
  destroy() {
    // Remove from instances registry
    const index = SharedDropdown._instances.indexOf(this);
    if (index > -1) {
      SharedDropdown._instances.splice(index, 1);
    }

    // Remove event listeners
    if (this.trigger && this._triggerClickHandler) {
      this.trigger.removeEventListener('click', this._triggerClickHandler);
    }
    if (this.trigger && this._triggerKeydownHandler) {
      this.trigger.removeEventListener('keydown', this._triggerKeydownHandler);
    }
    if (this._documentClickHandler) {
      document.removeEventListener('click', this._documentClickHandler);
    }
    if (this.searchInput && this._searchInputHandler) {
      this.searchInput.removeEventListener('input', this._searchInputHandler);
    }
    if (this.searchInput && this._searchClickHandler) {
      this.searchInput.removeEventListener('click', this._searchClickHandler);
    }
    if (this.searchInput && this._searchKeydownHandler) {
      this.searchInput.removeEventListener('keydown', this._searchKeydownHandler);
    }

    // Remove items container from body
    if (this.itemsContainer && this.itemsContainer.parentNode) {
      this.itemsContainer.parentNode.removeChild(this.itemsContainer);
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Clear references
    this.container = null;
    this.trigger = null;
    this.itemsContainer = null;
    this.hiddenInput = null;
    this.items = [];
    this._triggerClickHandler = null;
    this._documentClickHandler = null;
  }
}

// Initialize static registry to track all dropdown instances for global close behavior
SharedDropdown._instances = [];

// Export for use in webviews
if (typeof window !== 'undefined') {
  window.SharedDropdown = SharedDropdown;
}
