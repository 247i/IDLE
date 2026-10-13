const vscode = acquireVsCodeApi();

const dbContextInput = document.getElementById('dbContextClass');
const outputFileInput = document.getElementById('outputFile');
const idempotentCheckbox = document.getElementById('idempotent');
const noTransactionsCheckbox = document.getElementById('noTransactions');
const commandPreview = document.getElementById('commandPreview');
const cancelButton = document.getElementById('cancelButton');
const runButton = document.getElementById('runButton');

// Custom select elements
const startupProjectSelect = document.getElementById('startupProjectSelect');
const migrationsProjectSelect = document.getElementById('migrationsProjectSelect');
const fromMigrationSelect = document.getElementById('fromMigrationSelect');
const toMigrationSelect = document.getElementById('toMigrationSelect');

let currentCommand = '';
let workingDirectory = '';
let allProjects = [];
let allMigrations = [];
let selectedStartupProject = '';
let selectedMigrationsProject = '';
let selectedFromMigration = '';
let selectedToMigration = '';

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'initialData':
            allProjects = message.projects;
            workingDirectory = message.solutionDir;
            populateProjectDropdowns(message.projects);
            if (message.preferences) {
                setTimeout(() => {
                    loadSavedPreferences(message.preferences);
                }, 100);
            }
            break;
        case 'projectsData':
            allProjects = message.projects;
            workingDirectory = message.solutionDir;
            populateProjectDropdowns(message.projects);
            break;
        case 'migrationsData':
            allMigrations = message.migrations;
            populateMigrationDropdowns(message.migrations);
            break;
        case 'savedPreferences':
            loadSavedPreferences(message.preferences);
            break;
        case 'generatedCommand':
            displayGeneratedCommand(message.command);
            break;
    }
});

function loadSavedPreferences(preferences) {
    
    
    if (preferences.startupProject) {
        setCustomSelectValue('startupProjectSelect', preferences.startupProject);
    }
    if (preferences.migrationsProject) {
        setCustomSelectValue('migrationsProjectSelect', preferences.migrationsProject);
    }
    if (preferences.dbContextClass) {
        dbContextInput.value = preferences.dbContextClass;
    }
    if (preferences.fromMigration) {
        setCustomSelectValue('fromMigrationSelect', preferences.fromMigration);
    }
    if (preferences.toMigration) {
        setCustomSelectValue('toMigrationSelect', preferences.toMigration);
    }
    if (preferences.outputFile) {
        outputFileInput.value = preferences.outputFile;
    }
    if (preferences.idempotent !== undefined) {
        idempotentCheckbox.checked = preferences.idempotent;
    }
    if (preferences.noTransactions !== undefined) {
        noTransactionsCheckbox.checked = preferences.noTransactions;
    }
}

function populateProjectDropdowns(projects) {
    // Filter projects for migrations dropdown (exclude test projects)
    const migrationsProjects = projects.filter(p => !p.isTestProject);
    
    // Filter projects for startup dropdown (only executable projects)
    const startupProjects = projects.filter(p => p.isExecutable && !p.isTestProject);
    
    populateCustomSelect('migrationsProjectSelect', migrationsProjects, 'Select project containing DbContext...', true);
    populateCustomSelect('startupProjectSelect', startupProjects, 'Select startup project...', true);
}

function populateMigrationDropdowns(migrations) {
    populateCustomSelect('fromMigrationSelect', migrations, 'Select starting migration (optional)...', false);
    populateCustomSelect('toMigrationSelect', migrations, 'Select target migration (optional)...', false);
}

function populateCustomSelect(selectId, items, placeholder, isProject) {
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    const trigger = selectElement.querySelector('.custom-select-trigger');
    const nameSpan = trigger.querySelector(isProject ? '.project-name' : '.migration-name');
    const iconDiv = trigger.querySelector(isProject ? '.project-icon' : '.migration-icon');
    
    // Clear existing options (except the default ones for migrations)
    if (isProject) {
        optionsContainer.innerHTML = '';
    } else {
        // Keep the first default option for migrations
        const defaultOption = optionsContainer.querySelector('.custom-select-option');
        optionsContainer.innerHTML = '';
        if (defaultOption) {
            optionsContainer.appendChild(defaultOption);
        }
    }
    
    // Add placeholder option for projects
    if (isProject) {
        const placeholderOption = document.createElement('div');
        placeholderOption.className = 'custom-select-option';
        placeholderOption.dataset.value = '';
        
        const placeholderIconDiv = document.createElement('div');
        placeholderIconDiv.className = 'project-icon';
        
        const placeholderSpan = document.createElement('span');
        placeholderSpan.className = 'project-name placeholder-text';
        placeholderSpan.textContent = placeholder;
        
        placeholderOption.appendChild(placeholderIconDiv);
        placeholderOption.appendChild(placeholderSpan);
        optionsContainer.appendChild(placeholderOption);
    }
    
    // Add items
    items.forEach(item => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        
        if (isProject) {
            option.dataset.value = item.relativePath;
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'project-icon';
            const iconUrl = item.iconPaths?.dark || item.iconPaths?.light || '';
            if (iconUrl) {
                iconDiv.style.backgroundImage = 'url(' + iconUrl + ')';
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'project-name';
            nameSpan.textContent = item.name;
            
            option.appendChild(iconDiv);
            option.appendChild(nameSpan);
        } else {
            option.dataset.value = item.name;
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'migration-icon';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'migration-name';
            nameSpan.textContent = item.name;
            
            option.appendChild(iconDiv);
            option.appendChild(nameSpan);
        }
        
        optionsContainer.appendChild(option);
    });
    
    // Reset to placeholder
    if (nameSpan) {
        nameSpan.textContent = placeholder;
        nameSpan.className = (isProject ? 'project-name' : 'migration-name') + ' placeholder-text';
    }
    if (iconDiv && isProject) {
        iconDiv.style.backgroundImage = '';
    }
    
    // Setup event handlers
    setupCustomSelectHandlers(selectId);
}

function setupCustomSelectHandlers(selectId) {
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
            selectCustomOption(selectId, option);
        }
    });
}

function selectCustomOption(selectId, optionElement) {
    const selectElement = document.getElementById(selectId);
    const trigger = selectElement.querySelector('.custom-select-trigger');
    const nameSpan = trigger.querySelector('.project-name, .migration-name');
    const iconDiv = trigger.querySelector('.project-icon, .migration-icon');
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // Remove selected class from all options
    optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    optionElement.classList.add('selected');
    
    // Update trigger display
    const optionIcon = optionElement.querySelector('.project-icon, .migration-icon');
    const optionName = optionElement.querySelector('.project-name, .migration-name');
    
    if (iconDiv && optionIcon) {
        iconDiv.style.backgroundImage = optionIcon.style.backgroundImage;
    }
    nameSpan.textContent = optionName.textContent;
    nameSpan.className = optionName.className;
    
    // Store selected value
    const value = optionElement.dataset.value;
    if (selectId === 'startupProjectSelect') {
        selectedStartupProject = value;
    } else if (selectId === 'migrationsProjectSelect') {
        selectedMigrationsProject = value;
        // Load migrations when migrations project changes
        if (value) {
            loadMigrations();
        }
    } else if (selectId === 'fromMigrationSelect') {
        selectedFromMigration = value;
    } else if (selectId === 'toMigrationSelect') {
        selectedToMigration = value;
    }
    
    // Close dropdown
    selectElement.classList.remove('open');
    
    // Regenerate command
    generateCommand();
}

function setCustomSelectValue(selectId, value) {
    
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // First try direct match
    let option = optionsContainer.querySelector('[data-value="' + value + '"]');
    
    // If not found, try to find by project name or partial path match
    if (!option && (selectId === 'startupProjectSelect' || selectId === 'migrationsProjectSelect')) {
        
        
        // Try to find by project name (extract from full path)
        const projectName = value.split('\\').pop()?.split('/').pop(); // Get filename from path
        if (projectName) {
            const allOptions = Array.from(optionsContainer.querySelectorAll('[data-value]'));
            option = allOptions.find(opt => {
                const optValue = opt.dataset.value;
                const optProjectName = optValue.split('\\').pop()?.split('/').pop();
                return optProjectName === projectName;
            });
            
            if (option) {
                
            }
        }
    }
    
    
    
    if (option) {
        selectCustomOption(selectId, option);
    } else {
        
        
    }
}

function closeAllCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        select.classList.remove('open');
    });
}

function loadMigrations() {
    if (selectedMigrationsProject) {
        vscode.postMessage({
            type: 'getMigrations',
            data: {
                migrationsProject: selectedMigrationsProject,
                migrationsFolder: 'Migrations'
            }
        });
    }
}

function displayGeneratedCommand(command) {
    currentCommand = command;
    commandPreview.textContent = command;
    runButton.disabled = false;
}

function generateCommand() {
    const data = {
        migrationsProject: selectedMigrationsProject,
        startupProject: selectedStartupProject,
        dbContextClass: dbContextInput.value.trim(),
        fromMigration: selectedFromMigration,
        toMigration: selectedToMigration,
        outputFile: outputFileInput.value.trim(),
        idempotent: idempotentCheckbox.checked,
        noTransactions: noTransactionsCheckbox.checked
    };
    
    vscode.postMessage({
        type: 'generateCommand',
        data: data
    });
}

function executeCommand() {
    if (!currentCommand) {
        return;
    }
    
    vscode.postMessage({
        type: 'executeCommand',
        data: {
            startupProject: selectedStartupProject,
            migrationsProject: selectedMigrationsProject,
            dbContextClass: dbContextInput.value.trim(),
            fromMigration: selectedFromMigration,
            toMigration: selectedToMigration,
            outputFile: outputFileInput.value.trim(),
            idempotent: idempotentCheckbox.checked,
            noTransactions: noTransactionsCheckbox.checked
        }
    });
}

function cancelCommand() {
    vscode.postMessage({
        type: 'cancel'
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', closeAllCustomSelects);

// Event listeners
cancelButton.addEventListener('click', cancelCommand);
runButton.addEventListener('click', executeCommand);

// Auto-generate preview when fields change
[dbContextInput, outputFileInput, idempotentCheckbox, noTransactionsCheckbox].forEach(element => {
    element.addEventListener('input', generateCommand);
    element.addEventListener('change', generateCommand);
});

// Initial command generation
setTimeout(generateCommand, 500);
