const vscode = acquireVsCodeApi();

const dbContextInput = document.getElementById('dbContextClass');
const migrationsFolderInput = document.getElementById('migrationsFolder');
const commandPreview = document.getElementById('commandPreview');
const cancelButton = document.getElementById('cancelButton');
const runButton = document.getElementById('runButton');

// Custom select elements
const startupProjectSelect = document.getElementById('startupProjectSelect');
const migrationsProjectSelect = document.getElementById('migrationsProjectSelect');
const targetMigrationSelect = document.getElementById('targetMigrationSelect');

let currentCommand = '';
let workingDirectory = '';
let allProjects = [];
let allMigrations = [];
let selectedStartupProject = '';
let selectedMigrationsProject = '';
let selectedTargetMigration = '';

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
        case 'initialData':
            
            allProjects = message.projects;
            workingDirectory = message.solutionDir;
            populateProjectDropdowns(message.projects);
            if (message.preferences) {
                
                // Use setTimeout to ensure dropdowns are fully initialized before loading preferences
                setTimeout(() => {
                    loadSavedPreferences(message.preferences);
                }, 100);
            } else {
                
            }
            break;
        case 'projectsData':
            allProjects = message.projects;
            workingDirectory = message.solutionDir;
            populateProjectDropdowns(message.projects);
            break;
        case 'migrationsData':
            
            allMigrations = message.migrations;
            populateMigrationsDropdown(message.migrations);
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
        // Load migrations for this project
        setTimeout(() => {
            requestMigrations(preferences.migrationsProject, preferences.migrationsFolder || 'Migrations');
        }, 100);
    }
    if (preferences.dbContextClass) {
        
        dbContextInput.value = preferences.dbContextClass;
    }
    if (preferences.migrationsFolder) {
        
        migrationsFolderInput.value = preferences.migrationsFolder;
    }
    if (preferences.targetMigration) {
        
        // Set after migrations are loaded
        setTimeout(() => {
            setCustomSelectValue('targetMigrationSelect', preferences.targetMigration);
        }, 200);
    }
}

function populateProjectDropdowns(projects) {
    // Filter projects for migrations dropdown (exclude test projects)
    const migrationsProjects = projects.filter(p => !p.isTestProject);
    
    // Filter projects for startup dropdown (only executable projects)
    const startupProjects = projects.filter(p => p.isExecutable && !p.isTestProject);
    
    populateCustomSelect('migrationsProjectSelect', migrationsProjects, 'Select project containing DbContext...', false);
    populateCustomSelect('startupProjectSelect', startupProjects, 'Select startup project...', false);
}

function populateMigrationsDropdown(migrations) {
    
    populateCustomSelect('targetMigrationSelect', migrations, 'Select target migration...', true);
}

function populateCustomSelect(selectId, items, placeholder, isMigration = false) {
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    const trigger = selectElement.querySelector('.custom-select-trigger');
    const nameSpan = trigger.querySelector(isMigration ? '.migration-name' : '.project-name');
    const iconDiv = trigger.querySelector(isMigration ? '.migration-icon' : '.project-icon');
    
    // Clear existing options
    optionsContainer.innerHTML = '';
    
    // Add placeholder option
    const placeholderOption = document.createElement('div');
    placeholderOption.className = 'custom-select-option';
    placeholderOption.dataset.value = '';
    
    const placeholderIconDiv = document.createElement('div');
    placeholderIconDiv.className = isMigration ? 'migration-icon' : 'project-icon';
    if (isMigration) {
        placeholderIconDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 9a3 3 0 0 0 -3 -3h-.5a3.5 3.5 0 0 0 -3.5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h.5a3 3 0 0 0 3 -3"/>
                <path d="M16 7l-1 10"/>
                <path d="M20 7l-1 10"/>
                <path d="M14 10h7.5"/>
                <path d="M21 14h-7.5"/>
            </svg>`;
    }
    
    const placeholderSpan = document.createElement('span');
    placeholderSpan.className = (isMigration ? 'migration-name' : 'project-name') + ' placeholder-text';
    placeholderSpan.textContent = placeholder;
    
    placeholderOption.appendChild(placeholderIconDiv);
    placeholderOption.appendChild(placeholderSpan);
    optionsContainer.appendChild(placeholderOption);
    
    // Add items
    items.forEach(item => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        
        if (isMigration) {
            option.dataset.value = item.fileName === '0' ? '0' : item.name;
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'migration-icon';
            iconDiv.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 9a3 3 0 0 0 -3 -3h-.5a3.5 3.5 0 0 0 -3.5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h.5a3 3 0 0 0 3 -3"/>
                    <path d="M16 7l-1 10"/>
                    <path d="M20 7l-1 10"/>
                    <path d="M14 10h7.5"/>
                    <path d="M21 14h-7.5"/>
                </svg>`;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'migration-name';
            nameSpan.textContent = item.name;
            
            // Special styling for rollback option
            if (item.fileName === '0') {
                option.classList.add('rollback-option');
                iconDiv.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 9a3 3 0 0 0 -3 -3h-.5a3.5 3.5 0 0 0 -3.5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h.5a3 3 0 0 0 3 -3"/>
                        <path d="M16 7l-1 10"/>
                        <path d="M20 7l-1 10"/>
                        <path d="M14 10h7.5"/>
                        <path d="M21 14h-7.5"/>
                    </svg>`;
            }
            
            option.appendChild(iconDiv);
            option.appendChild(nameSpan);
        } else {
            // Project
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
        }
        
        optionsContainer.appendChild(option);
    });
    
    // Reset to placeholder
    nameSpan.textContent = placeholder;
    nameSpan.className = (isMigration ? 'migration-name' : 'project-name') + ' placeholder-text';
    if (isMigration) {
        iconDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 9a3 3 0 0 0 -3 -3h-.5a3.5 3.5 0 0 0 -3.5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h.5a3 3 0 0 0 3 -3"/>
                <path d="M16 7l-1 10"/>
                <path d="M20 7l-1 10"/>
                <path d="M14 10h7.5"/>
                <path d="M21 14h-7.5"/>
            </svg>`;
    } else {
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
    const isMigration = selectId === 'targetMigrationSelect';
    const nameSpan = trigger.querySelector(isMigration ? '.migration-name' : '.project-name');
    const iconDiv = trigger.querySelector(isMigration ? '.migration-icon' : '.project-icon');
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // Remove selected class from all options
    optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    optionElement.classList.add('selected');
    
    // Update trigger display
    const optionIcon = optionElement.querySelector(isMigration ? '.migration-icon' : '.project-icon');
    const optionName = optionElement.querySelector(isMigration ? '.migration-name' : '.project-name');
    
    if (isMigration) {
        iconDiv.innerHTML = optionIcon.innerHTML;
    } else {
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
            requestMigrations(value, migrationsFolderInput.value || 'Migrations');
        }
    } else if (selectId === 'targetMigrationSelect') {
        selectedTargetMigration = value;
    }
    
    // Close dropdown
    selectElement.classList.remove('open');
    
    // Generate command preview
    generateCommand();
}

function setCustomSelectValue(selectId, value) {
    
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    if (!optionsContainer) {
        
        return;
    }
    
    
    
    // First try direct match
    let option = optionsContainer.querySelector('[data-value="' + value + '"]');
    
    
    // If not found, try to find by project name or partial path match
    if (!option && selectId !== 'targetMigrationSelect') {
        
        
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
                
            } else {
                
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

// Close dropdowns when clicking outside
document.addEventListener('click', closeAllCustomSelects);

function requestMigrations(projectPath, migrationsFolder) {
    if (!projectPath) {
        
        return;
    }
    
    
    
    vscode.postMessage({
        type: 'getMigrations',
        data: {
            migrationsProject: projectPath,
            migrationsFolder: migrationsFolder || 'Migrations'
        }
    });
}

function displayGeneratedCommand(command) {
    currentCommand = command;
    commandPreview.textContent = command;
    runButton.disabled = false;
}

function generateCommand() {
    const data = {
        targetMigration: selectedTargetMigration,
        migrationsProject: selectedMigrationsProject,
        startupProject: selectedStartupProject,
        dbContextClass: dbContextInput.value.trim(),
        migrationsFolder: migrationsFolderInput.value.trim()
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
            targetMigration: selectedTargetMigration,
            startupProject: selectedStartupProject,
            migrationsProject: selectedMigrationsProject,
            dbContextClass: dbContextInput.value.trim(),
            migrationsFolder: migrationsFolderInput.value.trim()
        }
    });
}

function cancelCommand() {
    vscode.postMessage({
        type: 'cancel'
    });
}

// Event listeners
cancelButton.addEventListener('click', cancelCommand);
runButton.addEventListener('click', executeCommand);

// Auto-generate preview when fields change
dbContextInput.addEventListener('input', generateCommand);
dbContextInput.addEventListener('change', generateCommand);

// Reload migrations when migrations folder changes
migrationsFolderInput.addEventListener('input', () => {
    if (selectedMigrationsProject) {
        requestMigrations(selectedMigrationsProject, migrationsFolderInput.value || 'Migrations');
    }
});
migrationsFolderInput.addEventListener('change', () => {
    if (selectedMigrationsProject) {
        requestMigrations(selectedMigrationsProject, migrationsFolderInput.value || 'Migrations');
    }
    generateCommand();
});

// Initial command generation
setTimeout(generateCommand, 500);
