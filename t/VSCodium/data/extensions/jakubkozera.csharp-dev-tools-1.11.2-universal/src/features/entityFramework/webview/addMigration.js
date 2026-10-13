const vscode = acquireVsCodeApi();

const migrationNameInput = document.getElementById('migrationName');
const dbContextInput = document.getElementById('dbContextClass');
const migrationsFolderInput = document.getElementById('migrationsFolder');
const commandPreview = document.getElementById('commandPreview');
const cancelButton = document.getElementById('cancelButton');
const runButton = document.getElementById('runButton');

// Custom select elements
const startupProjectSelect = document.getElementById('startupProjectSelect');
const migrationsProjectSelect = document.getElementById('migrationsProjectSelect');

let currentCommand = '';
let workingDirectory = '';
let allProjects = [];
let selectedStartupProject = '';
let selectedMigrationsProject = '';

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
            }
            break;
        case 'projectsData':
            allProjects = message.projects;
            workingDirectory = message.solutionDir;
            populateProjectDropdowns(message.projects);
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
    if (preferences.migrationsFolder) {
        
        migrationsFolderInput.value = preferences.migrationsFolder;
    }
}

function populateProjectDropdowns(projects) {
    // Filter projects for migrations dropdown (exclude test projects)
    const migrationsProjects = projects.filter(p => !p.isTestProject);
    
    // Filter projects for startup dropdown (only executable projects)
    const startupProjects = projects.filter(p => p.isExecutable && !p.isTestProject);
    
    populateCustomSelect('migrationsProjectSelect', migrationsProjects, 'Select project containing DbContext...');
    populateCustomSelect('startupProjectSelect', startupProjects, 'Select startup project...');
}

function populateCustomSelect(selectId, projects, placeholder) {
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    const trigger = selectElement.querySelector('.custom-select-trigger');
    const nameSpan = trigger.querySelector('.project-name');
    const iconDiv = trigger.querySelector('.project-icon');
    
    // Clear existing options
    optionsContainer.innerHTML = '';
    
    // Add placeholder option
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
    
    // Add project options
    projects.forEach(project => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = project.relativePath;
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'project-icon';
        const iconUrl = project.iconPaths?.dark || project.iconPaths?.light || '';
        if (iconUrl) {
            iconDiv.style.backgroundImage = 'url(' + iconUrl + ')';
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'project-name';
        nameSpan.textContent = project.name;
        
        option.appendChild(iconDiv);
        option.appendChild(nameSpan);
        optionsContainer.appendChild(option);
    });
    
    // Reset to placeholder
    nameSpan.textContent = placeholder;
    nameSpan.className = 'project-name placeholder-text';
    iconDiv.style.backgroundImage = '';
    
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
    const nameSpan = trigger.querySelector('.project-name');
    const iconDiv = trigger.querySelector('.project-icon');
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // Remove selected class from all options
    optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    optionElement.classList.add('selected');
    
    // Update trigger display
    const optionIcon = optionElement.querySelector('.project-icon');
    const optionName = optionElement.querySelector('.project-name');
    
    iconDiv.style.backgroundImage = optionIcon.style.backgroundImage;
    nameSpan.textContent = optionName.textContent;
    nameSpan.className = optionName.className;
    
    // Store selected value
    const value = optionElement.dataset.value;
    if (selectId === 'startupProjectSelect') {
        selectedStartupProject = value;
    } else if (selectId === 'migrationsProjectSelect') {
        selectedMigrationsProject = value;
    }
    
    // Close dropdown
    selectElement.classList.remove('open');
}

function setCustomSelectValue(selectId, value) {
    
    const selectElement = document.getElementById(selectId);
    const optionsContainer = selectElement.querySelector('.custom-select-options');
    
    // First try direct match
    let option = optionsContainer.querySelector('[data-value="' + value + '"]');
    
    // If not found, try to find by project name or partial path match
    if (!option) {
        
        
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

// Close dropdowns when clicking outside
document.addEventListener('click', closeAllCustomSelects);

function displayGeneratedCommand(command) {
    currentCommand = command;
    commandPreview.textContent = command;
    runButton.disabled = false;
}

function generateCommand() {
    if (!migrationNameInput.value.trim()) {
        commandPreview.textContent = 'Migration name is required.';
        runButton.disabled = true;
        return;
    }
    
    const data = {
        migrationName: migrationNameInput.value.trim(),
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
    
    if (!migrationNameInput.value.trim()) {
        return;
    }
    
    vscode.postMessage({
        type: 'executeCommand',
        data: {
            migrationName: migrationNameInput.value.trim(),
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
[migrationNameInput, dbContextInput, migrationsFolderInput].forEach(element => {
    element.addEventListener('input', generateCommand);
    element.addEventListener('change', generateCommand);
});

// Initial command generation
setTimeout(generateCommand, 500);
