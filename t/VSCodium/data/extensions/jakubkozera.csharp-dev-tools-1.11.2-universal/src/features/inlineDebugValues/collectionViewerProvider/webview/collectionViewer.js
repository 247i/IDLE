// Collection Viewer JavaScript - Custom Data Table

(function() {
    'use strict';
    
    const vscode = acquireVsCodeApi();
    let currentData = [];
    let filteredData = [];
    let currentVariableName = '';
    let sortConfig = { column: null, direction: 'asc' };
    let columnFilters = new Map(); // Now stores both values and conditions
    let currentFilterColumn = null;
    let currentFilterColumnType = null;

    // DOM elements
    let searchInput;
    let exportBtn;
    let refreshBtn;
    let titleElement;
    let itemCountElement;
    let filteredCountElement;
    let tableContainer;
    let dataTable;
    let tableHead;
    let tableBody;
    let emptyState;
    let columnFilterModal;
    let filterModalTitle;
    let closeFilterModal;
    let filterSearch;
    let selectAll;
    let filterValues;
    let applyFilter;
    let clearFilter;
    
    // Advanced filter elements
    let filterTypeRadios;
    let valuesFilter;
    let conditionsFilter;
    let logicOperator;
    let filterConditions;
    let addConditionBtn;
    
    // LINQ elements
    let linqEditor;
    let monacoEditor;
    let executeLinqBtn;

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        setupEventListeners();
        
        // Let the extension know we're ready
        vscode.postMessage({ type: 'ready' });
    });

    function initializeElements() {
        searchInput = document.getElementById('searchInput');
        exportBtn = document.getElementById('exportBtn');
        refreshBtn = document.getElementById('refreshBtn');
        titleElement = document.getElementById('title');
        itemCountElement = document.getElementById('itemCount');
        filteredCountElement = document.getElementById('filteredCount');
        tableContainer = document.getElementById('tableContainer');
        dataTable = document.getElementById('dataTable');
        tableHead = document.getElementById('tableHead');
        tableBody = document.getElementById('tableBody');
        emptyState = document.getElementById('emptyState');
        
        // Modal elements
        columnFilterModal = document.getElementById('columnFilterModal');
        filterModalTitle = document.getElementById('filterModalTitle');
        closeFilterModal = document.getElementById('closeFilterModal');
        filterSearch = document.getElementById('filterSearch');
        selectAll = document.getElementById('selectAll');
        filterValues = document.getElementById('filterValues');
        applyFilter = document.getElementById('applyFilter');
        clearFilter = document.getElementById('clearFilter');
        
        // Advanced filter elements
        filterTypeRadios = document.getElementsByName('filterType');
        valuesFilter = document.getElementById('valuesFilter');
        conditionsFilter = document.getElementById('conditionsFilter');
        logicOperator = document.getElementById('logicOperator');
        filterConditions = document.getElementById('filterConditions');
        addConditionBtn = document.getElementById('addCondition');
        
        // LINQ elements
        linqEditor = document.getElementById('linq-editor');
        executeLinqBtn = document.getElementById('executeLinqBtn');
        
        // Initialize Monaco Editor
        initializeMonacoEditor();
        
        // Debug log to check if elements are found
        console.log('Filter elements initialized:', {
            filterConditions: !!filterConditions,
            logicOperator: !!logicOperator,
            columnFilterModal: !!columnFilterModal,
            filterModalTitle: !!filterModalTitle,
            conditionsFilter: !!conditionsFilter,
            valuesFilter: !!valuesFilter,
            addConditionBtn: !!addConditionBtn
        });
        
        // More detailed debug info
        console.log('DOM element search results:', {
            'filterConditions': document.getElementById('filterConditions'),
            'logicOperator': document.getElementById('logicOperator'),
            'conditionsFilter': document.getElementById('conditionsFilter')
        });
    }

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

    function initializeMonacoEditor() {
        // Wait for Monaco loader to be available
        const initMonaco = () => {
            if (typeof window.require !== 'undefined') {
                window.require.config({ 
                    paths: { 'vs': 'https://unpkg.com/monaco-editor@0.45.0/min/vs' },
                    'vs/nls': { 
                        availableLanguages: { '*': '' }, // Use default English
                        locale: 'en'
                    }
                });
                
                // Configure Monaco environment for webview with proper worker support
                self.MonacoEnvironment = {
                    getWorkerUrl: function (moduleId, label) {
                        if (label === 'json') {
                            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                                self.MonacoEnvironment = {
                                    baseUrl: 'https://unpkg.com/monaco-editor@0.45.0/min/'
                                };
                                importScripts('https://unpkg.com/monaco-editor@0.45.0/min/vs/language/json/json.worker.js');`
                            )}`;
                        }
                        if (label === 'css' || label === 'scss' || label === 'less') {
                            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                                self.MonacoEnvironment = {
                                    baseUrl: 'https://unpkg.com/monaco-editor@0.45.0/min/'
                                };
                                importScripts('https://unpkg.com/monaco-editor@0.45.0/min/vs/language/css/css.worker.js');`
                            )}`;
                        }
                        if (label === 'html' || label === 'handlebars' || label === 'razor') {
                            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                                self.MonacoEnvironment = {
                                    baseUrl: 'https://unpkg.com/monaco-editor@0.45.0/min/'
                                };
                                importScripts('https://unpkg.com/monaco-editor@0.45.0/min/vs/language/html/html.worker.js');`
                            )}`;
                        }
                        if (label === 'typescript' || label === 'javascript') {
                            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                                self.MonacoEnvironment = {
                                    baseUrl: 'https://unpkg.com/monaco-editor@0.45.0/min/'
                                };
                                importScripts('https://unpkg.com/monaco-editor@0.45.0/min/vs/language/typescript/ts.worker.js');`
                            )}`;
                        }
                        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                            self.MonacoEnvironment = {
                                baseUrl: 'https://unpkg.com/monaco-editor@0.45.0/min/'
                            };
                            importScripts('https://unpkg.com/monaco-editor@0.45.0/min/vs/editor/editor.worker.js');`
                        )}`;
                    }
                };
                
                window.require(['vs/editor/editor.main'], function () {
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

                        monacoEditor = monaco.editor.create(linqEditor, {
                            value: '',
                            language: 'csharp',
                            theme: getMonacoTheme(),
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            lineNumbers: 'off',
                            glyphMargin: false,
                            folding: false,
                            lineDecorationsWidth: 0,
                            lineNumbersMinChars: 0,
                            renderLineHighlight: 'none',
                            scrollbar: { 
                                vertical: 'hidden',
                                horizontal: 'hidden'
                            },
                            overviewRulerLanes: 0,
                            hideCursorInOverviewRuler: true,
                            overviewRulerBorder: false,
                            fontSize: 13,
                            fontFamily: 'Consolas, "Courier New", monospace',
                            wordWrap: 'on',
                            contextmenu: true,
                            selectOnLineNumbers: false,
                            automaticLayout: true,
                            padding: {
                                top: 8,
                                bottom: 8,
                                left: 12,
                                right: 12
                            },
                            suggest: {
                                showMethods: true,
                                showKeywords: true,
                                showSnippets: true,
                                showTypes: true,
                                showProperties: true,
                                showVariables: true,
                                showWords: true,
                                insertMode: 'insert',
                                filterGraceful: true,
                                snippetsPreventQuickSuggestions: false
                            },
                            quickSuggestions: {
                                other: true,
                                comments: false,
                                strings: false
                            },
                            suggestOnTriggerCharacters: true,
                            acceptSuggestionOnEnter: 'on',
                            tabCompletion: 'on',
                            fixedOverflowWidgets: true, // This helps with suggestion positioning
                            renderValidationDecorations: 'off', // Remove error decorations
                            renderLineHighlightOnlyWhenFocus: true,
                            hideCursorInOverviewRuler: true,
                            matchBrackets: 'never', // Remove bracket matching highlights
                            occurrencesHighlight: false, // Remove occurrence highlights
                            selectionHighlight: false, // Remove selection highlights
                            guides: {
                                indentation: false
                            }
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

                        // Handle placeholder visibility
                        const placeholder = document.getElementById('linq-placeholder');
                        
                        function updatePlaceholder() {
                            const value = monacoEditor.getValue();
                            if (placeholder) {
                                placeholder.classList.toggle('hidden', value.length > 0);
                            }
                        }

                        // Update placeholder on content change
                        monacoEditor.onDidChangeModelContent(updatePlaceholder);
                        
                        // Initial placeholder update
                        updatePlaceholder();

                        // Focus handling
                        monacoEditor.onDidFocusEditorWidget(() => {
                            if (placeholder) {
                                placeholder.style.opacity = '0.5';
                            }
                        });

                        monacoEditor.onDidBlurEditorWidget(() => {
                            if (placeholder) {
                                placeholder.style.opacity = '1';
                            }
                        });

                        // Add keyboard shortcuts
                        monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
                            executeLinqQuery();
                        });

                        monacoEditor.addCommand(monaco.KeyCode.Enter, function() {
                            executeLinqQuery();
                        });

                        // Register additional C# completions for LINQ
                        monaco.languages.registerCompletionItemProvider('csharp', {
                            provideCompletionItems: (model, position) => {
                                const suggestions = [
                                    {
                                        label: 'Where',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Where(${1:x} => ${2:condition})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Filters a sequence of values based on a predicate'
                                    },
                                    {
                                        label: 'Select',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Select(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Projects each element of a sequence into a new form'
                                    },
                                    {
                                        label: 'OrderBy',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'OrderBy(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Sorts the elements of a sequence in ascending order'
                                    },
                                    {
                                        label: 'OrderByDescending',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'OrderByDescending(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Sorts the elements of a sequence in descending order'
                                    },
                                    {
                                        label: 'GroupBy',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'GroupBy(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Groups the elements of a sequence according to a specified key'
                                    },
                                    {
                                        label: 'Take',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Take(${1:count})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Returns a specified number of contiguous elements from the start'
                                    },
                                    {
                                        label: 'Skip',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Skip(${1:count})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Bypasses a specified number of elements and returns the remaining elements'
                                    },
                                    {
                                        label: 'First',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'First()',
                                        documentation: 'Returns the first element of a sequence'
                                    },
                                    {
                                        label: 'FirstOrDefault',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'FirstOrDefault()',
                                        documentation: 'Returns the first element of a sequence, or a default value if no element is found'
                                    },
                                    {
                                        label: 'Any',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Any(${1:x} => ${2:condition})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Determines whether any element of a sequence satisfies a condition'
                                    },
                                    {
                                        label: 'All',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'All(${1:x} => ${2:condition})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Determines whether all elements of a sequence satisfy a condition'
                                    },
                                    {
                                        label: 'Count',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Count()',
                                        documentation: 'Returns the number of elements in a sequence'
                                    },
                                    {
                                        label: 'Sum',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Sum(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Computes the sum of a sequence of numeric values'
                                    },
                                    {
                                        label: 'Average',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Average(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Computes the average of a sequence of numeric values'
                                    },
                                    {
                                        label: 'Min',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Min(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Returns the minimum value in a sequence'
                                    },
                                    {
                                        label: 'Max',
                                        kind: monaco.languages.CompletionItemKind.Method,
                                        insertText: 'Max(${1:x} => ${2:x.Property})',
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        documentation: 'Returns the maximum value in a sequence'
                                    },
                                    {
                                        label: 'data',
                                        kind: monaco.languages.CompletionItemKind.Variable,
                                        insertText: 'data',
                                        documentation: 'The current collection data'
                                    }
                                ];
                                
                                return { suggestions: suggestions };
                            }
                        });

                        console.log('Monaco Editor initialized successfully with IntelliSense support');
                        
                        // Force suggestions to appear outside the editor container and fix styling
                        setTimeout(() => {
                            if (monacoEditor && monacoEditor.getContainerDomNode) {
                                const editorContainer = monacoEditor.getContainerDomNode();
                                if (editorContainer) {
                                    editorContainer.style.overflow = 'visible';
                                    editorContainer.style.zIndex = '1000';
                                    editorContainer.style.backgroundColor = 'var(--vscode-input-background)';
                                    
                                    // Remove any internal borders or styling
                                    const editorElements = editorContainer.querySelectorAll('.monaco-editor, .margin, .monaco-editor-background');
                                    editorElements.forEach(element => {
                                        element.style.backgroundColor = 'var(--vscode-input-background)';
                                        element.style.border = 'none';
                                        element.style.boxShadow = 'none';
                                    });
                                    
                                    // Ensure view-lines has transparent background
                                    const viewLines = editorContainer.querySelector('.view-lines');
                                    if (viewLines) {
                                        viewLines.style.backgroundColor = 'transparent';
                                    }
                                }
                            }
                        }, 100);
                    } catch (error) {
                        console.error('Failed to initialize Monaco Editor:', error);
                        // Fallback to a simple textarea if Monaco fails
                        createFallbackEditor();
                    }
                });
            } else {
                // If require is not available, retry after a short delay
                setTimeout(initMonaco, 100);
            }
        };

        // Start initialization
        initMonaco();
    }

    function createFallbackEditor() {
        // Create a simple textarea fallback if Monaco fails to load
        const textarea = document.createElement('textarea');
        textarea.id = 'linq-fallback';
        textarea.className = 'linq-fallback';
        textarea.placeholder = 'Enter LINQ expression (e.g., data.Where(x => x.Age > 25))';
        textarea.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            outline: none;
            resize: none;
            background: transparent;
            color: inherit;
            font-family: Consolas, "Courier New", monospace;
            font-size: 13px;
            padding: 8px 12px;
        `;
        
        // Add keyboard event handling
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                executeLinqQuery();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                executeLinqQuery();
            }
        });
        
        linqEditor.innerHTML = '';
        linqEditor.appendChild(textarea);
        
        // Update the getValue function to work with textarea
        monacoEditor = {
            getValue: () => textarea.value,
            setValue: (value) => { textarea.value = value; },
            focus: () => textarea.focus()
        };
        
        console.log('Fallback editor created');
    }

    function setupEventListeners() {
        // Global search functionality
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                performGlobalSearch(e.target.value);
            });
        }

        // Export button
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                exportToCsv();
            });
        }

        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                refreshTable();
            });
        }

        // LINQ execution
        if (executeLinqBtn) {
            executeLinqBtn.addEventListener('click', function() {
                executeLinqQuery();
            });
        }

        // Monaco Editor keypress handling will be set up in the initialization function
        // No need for direct event listener here since Monaco Editor handles keyboard events differently

        // Modal event listeners
        if (closeFilterModal) {
            closeFilterModal.addEventListener('click', closeModal);
        }

        if (columnFilterModal) {
            columnFilterModal.addEventListener('click', function(e) {
                if (e.target === columnFilterModal) {
                    closeModal();
                }
            });
        }

        if (filterSearch) {
            filterSearch.addEventListener('input', function(e) {
                filterModalValues(e.target.value);
            });
        }

        if (selectAll) {
            selectAll.addEventListener('change', function(e) {
                toggleAllFilterValues(e.target.checked);
            });
        }

        if (applyFilter) {
            applyFilter.addEventListener('click', applyColumnFilter);
        }

        if (clearFilter) {
            clearFilter.addEventListener('click', clearColumnFilter);
        }
        
        // Advanced filter event listeners
        if (filterTypeRadios) {
            Array.from(filterTypeRadios).forEach(radio => {
                radio.addEventListener('change', function() {
                    toggleFilterType(this.value);
                });
            });
        }
        
        if (addConditionBtn) {
            addConditionBtn.addEventListener('click', addFilterCondition);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }

    // Listen for messages from the extension
    window.addEventListener('message', function(event) {
        const message = event.data;
        
        switch (message.type) {
            case 'showCollection':
                showCollection(message.variableName, message.data, message.variableType);
                break;
            case 'linqResult':
                handleLinqResult(message);
                break;
        }
    });

    function showCollection(variableName, data, variableType) {
        currentData = data || [];
        filteredData = [...currentData];
        currentVariableName = variableName; // Store for LINQ queries
        
        // Update title
        if (titleElement) {
            titleElement.textContent = `Collection: ${variableName}`;
        }

        if (!currentData || currentData.length === 0) {
            showEmptyState();
            return;
        }

        hideEmptyState();
        buildTable();
        updateItemCount();
    }

    function buildTable() {
        if (!currentData || currentData.length === 0) {
            return;
        }

        // Get all unique column headers
        const headers = getColumnHeaders(currentData);
        
        // Build table header
        buildTableHeader(headers);
        
        // Build table body
        buildTableBody(filteredData, headers);
    }

    function getColumnHeaders(data) {
        const headers = new Set();
        data.forEach(item => {
            if (item && typeof item === 'object') {
                Object.keys(item).forEach(key => headers.add(key));
            }
        });
        return Array.from(headers).sort();
    }

    // Helper function to clean header display names by removing type information
    function getCleanHeaderName(header) {
        return header.replace(/\s*\[.*?\]\s*$/, '');
    }

    function buildTableHeader(headers) {
        tableHead.innerHTML = '';
        const row = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            
            const headerContent = document.createElement('div');
            headerContent.className = 'header-content';
            
            const headerText = document.createElement('span');
            headerText.className = 'header-text';
            headerText.textContent = getCleanHeaderName(header);
            
            const headerControls = document.createElement('div');
            headerControls.className = 'header-controls';
            
            // Sort indicator
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sort-indicator icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg>`;
            const sortIndicator = tempContainer.firstChild;
            // Filter button
            const filterBtn = document.createElement('button');
            filterBtn.className = 'filter-btn';
            filterBtn.setAttribute('title', 'Filter column');
            filterBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-filter"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z" /></svg>';
            
            // Update sort indicator if this column is sorted
            if (sortConfig.column === header) {
                sortIndicator.classList.add('active');
                if (sortConfig.direction === 'desc') {
                    sortIndicator.classList.add('desc');
                }
            }

            // Update filter button if this column is filtered
            if (columnFilters.has(header)) {
                filterBtn.classList.add('active');
            }
            
            headerControls.appendChild(sortIndicator);
            headerControls.appendChild(filterBtn);
            
            headerContent.appendChild(headerText);
            headerContent.appendChild(headerControls);
            th.appendChild(headerContent);
            
            // Event listeners
            th.addEventListener('click', function(e) {
                // Check if the click is on the filter button or its children
                const filterButton = e.target.closest('.filter-btn');
                if (filterButton) {
                    e.stopPropagation();
                    openColumnFilter(header);
                } else {
                    sortByColumn(header);
                }
            });
            
            row.appendChild(th);
        });
        
        tableHead.appendChild(row);
    }

    function buildTableBody(data, headers) {
        tableBody.innerHTML = '';
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            headers.forEach(header => {
                const td = document.createElement('td');
                const value = item[header];
                
                td.innerHTML = formatCellValue(value);
                td.className = getCellClass(value);
                td.title = getTooltipText(value);
                
                // Double-click to copy
                td.addEventListener('dblclick', function() {
                    copyValueToClipboard(value);
                });
                
                row.appendChild(td);
            });
            
            tableBody.appendChild(row);
        });
    }

    function formatCellValue(value) {
        if (value === null || value === undefined) {
            return '<span class="cell-null">null</span>';
        }
        
        if (typeof value === 'string') {
            const escaped = escapeHtml(value);
            return `<span class="cell-string">"${escaped}"</span>`;
        }
        
        if (typeof value === 'number') {
            return `<span class="cell-number">${value}</span>`;
        }
        
        if (typeof value === 'boolean') {
            return `<span class="cell-boolean">${value}</span>`;
        }
        
        if (value instanceof Date) {
            return `<span class="cell-date">${value.toISOString()}</span>`;
        }
        
        if (Array.isArray(value)) {
            return `<span class="cell-array">[Array(${value.length})]</span>`;
        }
        
        if (typeof value === 'object') {
            return `<span class="cell-object">[Object]</span>`;
        }
        
        return escapeHtml(String(value));
    }

    function getCellClass(value) {
        if (value === null || value === undefined) {
            return 'cell-null';
        }
        
        if (typeof value === 'string') {
            return 'cell-string';
        }
        
        if (typeof value === 'number') {
            return 'cell-number';
        }
        
        if (typeof value === 'boolean') {
            return 'cell-boolean';
        }
        
        if (value instanceof Date) {
            return 'cell-date';
        }
        
        if (Array.isArray(value)) {
            return 'cell-array';
        }
        
        if (typeof value === 'object') {
            return 'cell-object';
        }
        
        return '';
    }

    function getTooltipText(value) {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        if (typeof value === 'string') {
            return value;
        }
        
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch (e) {
                return '[Object]';
            }
        }
        
        return String(value);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function sortByColumn(column) {
        if (sortConfig.column === column) {
            // Toggle direction
            sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New column
            sortConfig.column = column;
            sortConfig.direction = 'asc';
        }
        
        // Sort the filtered data
        filteredData.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            
            // Handle null/undefined
            if ((aVal === null || aVal === undefined) && (bVal === null || bVal === undefined)) {
                return 0;
            }
            if (aVal === null || aVal === undefined) {
                return 1;
            }
            if (bVal === null || bVal === undefined) {
                return -1;
            }
            
            // Compare values
            let result;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                result = aVal.localeCompare(bVal);
            } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                result = aVal - bVal;
            } else {
                result = String(aVal).localeCompare(String(bVal));
            }
            
            return sortConfig.direction === 'desc' ? -result : result;
        });
        
        // Rebuild table
        buildTable();
    }

    function performGlobalSearch(searchTerm) {
        if (!searchTerm) {
            filteredData = applyColumnFilters(currentData);
        } else {
            const searchLower = searchTerm.toLowerCase();
            const dataToFilter = applyColumnFilters(currentData);
            
            filteredData = dataToFilter.filter(item => {
                return Object.values(item).some(value => {
                    if (value === null || value === undefined) {
                        return false;
                    }
                    return String(value).toLowerCase().includes(searchLower);
                });
            });
        }
        
        buildTableBody(filteredData, getColumnHeaders(currentData));
        updateItemCount();
    }

    function openColumnFilter(column) {
        // Safety check for required DOM elements
        if (!columnFilterModal || !filterModalTitle) {
            console.error('Filter modal elements not found in DOM');
            return;
        }
        
        currentFilterColumn = column;
        currentFilterColumnType = detectColumnType(column);
        filterModalTitle.textContent = `Filter: ${getCleanHeaderName(column)} (${currentFilterColumnType})`;
        
        // Reset filter type to values by default
        const valuesRadio = document.querySelector('input[name="filterType"][value="values"]');
        if (valuesRadio) {
            valuesRadio.checked = true;
            toggleFilterType('values');
        }
        
        // Setup values filter
        setupValuesFilter(column);
        
        // Setup conditions filter
        setupConditionsFilter(column);
        
        // Show modal
        columnFilterModal.classList.add('visible');
    }
    
    function detectColumnType(column) {
        const sample = currentData.find(item => item[column] !== null && item[column] !== undefined);
        if (!sample) {
            return 'string';
        }
        
        const value = sample[column];
        if (typeof value === 'number') {
            return 'number';
        }
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        if (value instanceof Date) {
            return 'date';
        }
        return 'string';
    }
    
    function setupValuesFilter(column) {
        // Get unique values for this column (existing logic)
        const values = new Set();
        currentData.forEach(item => {
            const value = item[column];
            values.add(value === null || value === undefined ? 'null' : String(value));
        });
        
        const sortedValues = Array.from(values).sort();
        const existingFilter = columnFilters.get(column);
        let selectedValues = new Set(sortedValues);
        
        if (existingFilter && existingFilter.type === 'values') {
            selectedValues = existingFilter.values;
        }
        
        // Populate filter values
        filterValues.innerHTML = '';
        sortedValues.forEach(value => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = value;
            checkbox.checked = selectedValues.has(value);
            
            const span = document.createElement('span');
            span.textContent = value;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            filterValues.appendChild(label);
        });
        
        // Update select all checkbox
        const allChecked = sortedValues.every(value => selectedValues.has(value));
        selectAll.checked = allChecked;
        
        // Clear filter search
        filterSearch.value = '';
    }
    
    function setupConditionsFilter(column) {
        // Safety check for DOM elements
        if (!filterConditions || !logicOperator) {
            console.error('Filter condition elements not found in DOM');
            console.log('Current DOM state:', {
                'filterConditions': document.getElementById('filterConditions'),
                'logicOperator': document.getElementById('logicOperator'),
                'conditionsFilter element exists': !!document.getElementById('conditionsFilter'),
                'modal is visible': columnFilterModal && columnFilterModal.classList.contains('visible')
            });
            
            // Try to re-query the elements
            const recheckFilterConditions = document.getElementById('filterConditions');
            const recheckLogicOperator = document.getElementById('logicOperator');
            
            if (recheckFilterConditions && recheckLogicOperator) {
                console.log('Elements found on recheck, updating references...');
                filterConditions = recheckFilterConditions;
                logicOperator = recheckLogicOperator;
            } else {
                console.error('Elements still not found on recheck');
                return;
            }
        }
        
        const existingFilter = columnFilters.get(column);
        
        // Clear existing conditions
        filterConditions.innerHTML = '';
        
        if (existingFilter && existingFilter.type === 'conditions') {
            // Restore existing conditions
            logicOperator.value = existingFilter.operator || 'AND';
            existingFilter.conditions.forEach(condition => {
                addFilterConditionRow(condition.operator, condition.value);
            });
        } else {
            // Add initial condition
            addFilterConditionRow();
        }
    }
    
    function toggleFilterType(type) {
        if (type === 'values') {
            valuesFilter.style.display = 'block';
            conditionsFilter.style.display = 'none';
        } else {
            valuesFilter.style.display = 'none';
            conditionsFilter.style.display = 'block';
        }
    }
    
    function addFilterCondition() {
        addFilterConditionRow();
    }
    
    function addFilterConditionRow(operator = '', value = '') {
        // Safety check for required DOM elements
        if (!filterConditions) {
            console.error('filterConditions element not found in DOM');
            return;
        }
        
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'filter-condition';
        
        // Operator select
        const operatorSelect = document.createElement('select');
        operatorSelect.className = 'condition-operator';
        
        const operators = getOperatorsForType(currentFilterColumnType);
        operators.forEach(op => {
            const option = document.createElement('option');
            option.value = op.value;
            option.textContent = op.label;
            if (op.value === operator) {
                option.selected = true;
            }
            operatorSelect.appendChild(option);
        });
        
        // Value input
        const valueInput = document.createElement('input');
        valueInput.className = 'condition-value';
        
        if (currentFilterColumnType === 'boolean') {
            // Create select for boolean values
            const select = document.createElement('select');
            select.className = 'condition-value';
            const trueOption = document.createElement('option');
            trueOption.value = 'true';
            trueOption.textContent = 'True';
            const falseOption = document.createElement('option');
            falseOption.value = 'false';
            falseOption.textContent = 'False';
            select.appendChild(trueOption);
            select.appendChild(falseOption);
            if (value) {
                select.value = value;
            }
            conditionDiv.appendChild(operatorSelect);
            conditionDiv.appendChild(select);
        } else {
            valueInput.type = getInputTypeForColumnType(currentFilterColumnType);
            valueInput.placeholder = currentFilterColumnType === 'number' ? 'Enter number...' : 
                                   currentFilterColumnType === 'date' ? 'Select date...' : 'Enter value...';
            valueInput.value = value;
            conditionDiv.appendChild(operatorSelect);
            conditionDiv.appendChild(valueInput);
        }
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-condition';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', function() {
            conditionDiv.remove();
        });
        conditionDiv.appendChild(removeBtn);
        
        filterConditions.appendChild(conditionDiv);
    }
    
    function getOperatorsForType(type) {
        switch (type) {
            case 'number':
                return [
                    { value: 'eq', label: 'Equals' },
                    { value: 'ne', label: 'Not Equals' },
                    { value: 'gt', label: 'Greater Than' },
                    { value: 'gte', label: 'Greater Than or Equal' },
                    { value: 'lt', label: 'Less Than' },
                    { value: 'lte', label: 'Less Than or Equal' },
                    { value: 'between', label: 'Between' },
                    { value: 'null', label: 'Is Null' },
                    { value: 'notnull', label: 'Is Not Null' }
                ];
            case 'string':
                return [
                    { value: 'eq', label: 'Equals' },
                    { value: 'ne', label: 'Not Equals' },
                    { value: 'contains', label: 'Contains' },
                    { value: 'notcontains', label: 'Does Not Contain' },
                    { value: 'startswith', label: 'Starts With' },
                    { value: 'endswith', label: 'Ends With' },
                    { value: 'empty', label: 'Is Empty' },
                    { value: 'notempty', label: 'Is Not Empty' },
                    { value: 'null', label: 'Is Null' },
                    { value: 'notnull', label: 'Is Not Null' }
                ];
            case 'boolean':
                return [
                    { value: 'eq', label: 'Equals' },
                    { value: 'ne', label: 'Not Equals' },
                    { value: 'null', label: 'Is Null' },
                    { value: 'notnull', label: 'Is Not Null' }
                ];
            case 'date':
                return [
                    { value: 'eq', label: 'Equals' },
                    { value: 'ne', label: 'Not Equals' },
                    { value: 'gt', label: 'After' },
                    { value: 'gte', label: 'On or After' },
                    { value: 'lt', label: 'Before' },
                    { value: 'lte', label: 'On or Before' },
                    { value: 'between', label: 'Between' },
                    { value: 'null', label: 'Is Null' },
                    { value: 'notnull', label: 'Is Not Null' }
                ];
            default:
                return [
                    { value: 'eq', label: 'Equals' },
                    { value: 'ne', label: 'Not Equals' },
                    { value: 'contains', label: 'Contains' }
                ];
        }
    }
    
    function getInputTypeForColumnType(type) {
        switch (type) {
            case 'number':
                return 'number';
            case 'date':
                return 'datetime-local';
            case 'boolean':
                return 'text';
            default:
                return 'text';
        }
    }

    function closeModal() {
        columnFilterModal.classList.remove('visible');
        currentFilterColumn = null;
    }

    function filterModalValues(searchTerm) {
        const options = filterValues.querySelectorAll('.filter-option');
        const searchLower = searchTerm.toLowerCase();
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(searchLower) ? 'flex' : 'none';
        });
    }

    function toggleAllFilterValues(checked) {
        const checkboxes = filterValues.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.closest('.filter-option').style.display !== 'none') {
                checkbox.checked = checked;
            }
        });
    }

    function applyColumnFilter() {
        if (!currentFilterColumn) {
            return;
        }
        
        const selectedFilterType = document.querySelector('input[name="filterType"]:checked').value;
        
        if (selectedFilterType === 'values') {
            applyValuesFilter();
        } else {
            applyConditionsFilter();
        }
        
        closeModal();
    }
    
    function applyValuesFilter() {
        const checkboxes = filterValues.querySelectorAll('input[type="checkbox"]:checked');
        const selectedValues = new Set();
        
        checkboxes.forEach(checkbox => {
            selectedValues.add(checkbox.value);
        });
        
        if (selectedValues.size === 0) {
            columnFilters.delete(currentFilterColumn);
        } else {
            columnFilters.set(currentFilterColumn, {
                type: 'values',
                values: selectedValues
            });
        }
        
        applyAllFilters();
    }
    
    function applyConditionsFilter() {
        const conditionRows = filterConditions.querySelectorAll('.filter-condition');
        const conditions = [];
        
        conditionRows.forEach(row => {
            const operator = row.querySelector('.condition-operator').value;
            const valueElement = row.querySelector('.condition-value');
            const value = valueElement.value;
            
            if (operator && (value !== '' || ['null', 'notnull', 'empty', 'notempty'].includes(operator))) {
                conditions.push({ operator, value });
            }
        });
        
        if (conditions.length === 0) {
            columnFilters.delete(currentFilterColumn);
        } else {
            columnFilters.set(currentFilterColumn, {
                type: 'conditions',
                operator: logicOperator.value,
                conditions: conditions
            });
        }
        
        applyAllFilters();
    }

    function clearColumnFilter() {
        if (currentFilterColumn) {
            columnFilters.delete(currentFilterColumn);
            applyAllFilters();
        }
        closeModal();
    }

    function applyColumnFilters(data) {
        if (columnFilters.size === 0) {
            return [...data];
        }
        
        return data.filter(item => {
            return Array.from(columnFilters.entries()).every(([column, filter]) => {
                if (filter.type === 'values') {
                    return applyValuesFilterToItem(item, column, filter.values);
                } else {
                    return applyConditionsFilterToItem(item, column, filter);
                }
            });
        });
    }
    
    function applyValuesFilterToItem(item, column, allowedValues) {
        const value = item[column];
        const stringValue = value === null || value === undefined ? 'null' : String(value);
        return allowedValues.has(stringValue);
    }
    
    function applyConditionsFilterToItem(item, column, filter) {
        const value = item[column];
        const { operator: logicOp, conditions } = filter;
        
        const results = conditions.map(condition => {
            return evaluateCondition(value, condition.operator, condition.value);
        });
        
        if (logicOp === 'OR') {
            return results.some(result => result);
        } else {
            return results.every(result => result);
        }
    }
    
    function evaluateCondition(itemValue, operator, conditionValue) {
        switch (operator) {
            case 'eq':
                return String(itemValue) === String(conditionValue);
            case 'ne':
                return String(itemValue) !== String(conditionValue);
            case 'gt':
                return Number(itemValue) > Number(conditionValue);
            case 'gte':
                return Number(itemValue) >= Number(conditionValue);
            case 'lt':
                return Number(itemValue) < Number(conditionValue);
            case 'lte':
                return Number(itemValue) <= Number(conditionValue);
            case 'contains':
                return String(itemValue).toLowerCase().includes(String(conditionValue).toLowerCase());
            case 'notcontains':
                return !String(itemValue).toLowerCase().includes(String(conditionValue).toLowerCase());
            case 'startswith':
                return String(itemValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());
            case 'endswith':
                return String(itemValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());
            case 'empty':
                return itemValue === '' || itemValue === null || itemValue === undefined;
            case 'notempty':
                return itemValue !== '' && itemValue !== null && itemValue !== undefined;
            case 'null':
                return itemValue === null || itemValue === undefined;
            case 'notnull':
                return itemValue !== null && itemValue !== undefined;
            case 'between':
                // For between, conditionValue should be "min,max"
                const [min, max] = String(conditionValue).split(',').map(v => Number(v.trim()));
                return Number(itemValue) >= min && Number(itemValue) <= max;
            default:
                return true;
        }
    }

    function applyAllFilters() {
        // First apply column filters
        let data = applyColumnFilters(currentData);
        
        // Then apply global search if active
        const searchTerm = searchInput.value;
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            data = data.filter(item => {
                return Object.values(item).some(value => {
                    if (value === null || value === undefined) {
                        return false;
                    }
                    return String(value).toLowerCase().includes(searchLower);
                });
            });
        }
        
        filteredData = data;
        buildTable();
        updateItemCount();
    }

    function exportToCsv() {
        if (!filteredData || filteredData.length === 0) {
            vscode.postMessage({
                type: 'showWarning',
                message: 'No data to export'
            });
            return;
        }

        vscode.postMessage({
            type: 'exportCsv',
            data: filteredData
        });
    }

    function refreshTable() {
        // Reset filters and sorting
        columnFilters.clear();
        sortConfig = { column: null, direction: 'asc' };
        filteredData = [...currentData];
        searchInput.value = '';
        
        buildTable();
        updateItemCount();
    }

    function copyValueToClipboard(value) {
        let textValue = '';
        
        if (value === null || value === undefined) {
            textValue = 'null';
        } else if (typeof value === 'string') {
            textValue = value;
        } else if (typeof value === 'object') {
            try {
                textValue = JSON.stringify(value, null, 2);
            } catch (e) {
                textValue = '[Object]';
            }
        } else {
            textValue = String(value);
        }
        
        vscode.postMessage({
            type: 'copyValue',
            value: textValue
        });
    }

    function updateItemCount() {
        if (itemCountElement && currentData) {
            const totalCount = currentData.length;
            const filteredCount = filteredData.length;
            
            itemCountElement.textContent = `${totalCount} item${totalCount !== 1 ? 's' : ''}`;
            
            if (filteredCountElement) {
                if (filteredCount < totalCount) {
                    filteredCountElement.textContent = `(${filteredCount} shown)`;
                    filteredCountElement.style.display = 'inline';
                } else {
                    filteredCountElement.style.display = 'none';
                }
            }
        }
    }

    function showEmptyState() {
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        if (emptyState) {
            emptyState.classList.add('visible');
        }
        if (itemCountElement) {
            itemCountElement.textContent = '0 items';
        }
        if (filteredCountElement) {
            filteredCountElement.style.display = 'none';
        }
    }

    function hideEmptyState() {
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
        if (emptyState) {
            emptyState.classList.remove('visible');
        }
    }

    function executeLinqQuery() {
        if (!monacoEditor) {
            vscode.postMessage({
                type: 'showWarning',
                message: 'Editor not initialized'
            });
            return;
        }

        const expression = monacoEditor.getValue().trim();
        if (!expression) {
            vscode.postMessage({
                type: 'showWarning',
                message: 'Please enter a LINQ expression'
            });
            return;
        }

        // Show loading state - store original content and replace with loading icon
        executeLinqBtn.disabled = true;
        executeLinqBtn.setAttribute('data-original-content', executeLinqBtn.innerHTML);
        executeLinqBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-loading"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a9 9 0 1 0 9 9" /></svg>';
        executeLinqBtn.title = 'Executing LINQ Query...';
        
        // Send message to extension
        vscode.postMessage({
            type: 'executeLinq',
            expression: expression,
            variableName: currentVariableName || 'data'
        });
    }

    function handleLinqResult(message) {
        // Reset button state - restore original icon content
        executeLinqBtn.disabled = false;
        const originalContent = executeLinqBtn.getAttribute('data-original-content');
        if (originalContent) {
            executeLinqBtn.innerHTML = originalContent;
            executeLinqBtn.removeAttribute('data-original-content');
        }
        executeLinqBtn.title = 'Execute LINQ Query';
        
        if (message.success) {
            // Update the table with the new data
            if (Array.isArray(message.result)) {
                currentData = message.result;
                filteredData = [...currentData];
                buildTable();
                updateItemCount();
                
                // Show success message
                titleElement.textContent = `LINQ Result: ${message.expression}`;
                vscode.postMessage({
                    type: 'showInfo',
                    message: `LINQ query executed successfully! Found ${message.result.length} items.`
                });
            } else {
                // Single value result
                vscode.postMessage({
                    type: 'showInfo',
                    message: `Result: ${message.result}`
                });
            }
        } else {
            vscode.postMessage({
                type: 'showError',
                message: `Error: ${message.error}`
            });
        }
    }

})();
