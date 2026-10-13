const vscode = acquireVsCodeApi();

let templates = [];
let selectedTemplate = null;
let sdkVersions = [];
let defaultNamespace = '';
let recentTemplates = [];

document.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ command: 'getTemplates' });

    document.getElementById('searchBox').addEventListener('input', (e) => {
        filterTemplates(e.target.value);
    });

    document.getElementById('createBtn').addEventListener('click', createItem);
    document.getElementById('cancelBtn').addEventListener('click', () => {
        vscode.postMessage({ command: 'cancel' });
    });
});

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'setTemplates':
            templates = message.templates;
            sdkVersions = message.sdkVersions || [];
            defaultNamespace = message.defaultNamespace || '';
            recentTemplates = message.recentTemplates || [];
            renderTemplates(templates);
            renderRecentTemplates();
            break;
        case 'error':
            console.error(message.message);
            break;
    }
});

function renderRecentTemplates() {
    const container = document.getElementById('recentItemsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!recentTemplates || recentTemplates.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    container.innerHTML = `
        <h2 class="recent-title">Recent Items</h2>
        <div class="recent-grid"></div>
    `;
    
    const grid = container.querySelector('.recent-grid');

    recentTemplates.forEach(template => {
        const tile = document.createElement('div');
        tile.className = 'recent-tile';
        
        // Create initials for icon if no icon available
        const initials = template.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        
        tile.innerHTML = `
            <div class="recent-remove" title="Remove from recent">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
                </svg>
            </div>
            <div class="recent-icon">${initials}</div>
            <div class="recent-name">${template.name}</div>
        `;
        
        const removeBtn = tile.querySelector('.recent-remove');
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeRecentTemplate(template);
        };

        tile.onclick = () => selectTemplate(template, null);
        grid.appendChild(tile);
    });
}

function removeRecentTemplate(template) {
    vscode.postMessage({
        command: 'removeRecentTemplate',
        data: {
            templateShortName: template.shortName
        }
    });
}

function renderTemplates(templatesToRender) {
    const list = document.getElementById('templateList');
    list.innerHTML = '';

    // Group templates
    const csharpTemplates = [];
    const otherTemplates = [];

    templatesToRender.forEach(template => {
        if (template.language === 'C#' || (template.language && template.language.includes('C#'))) {
            csharpTemplates.push(template);
        } else {
            otherTemplates.push(template);
        }
    });

    // Sort templates alphabetically within groups
    csharpTemplates.sort((a, b) => a.name.localeCompare(b.name));
    otherTemplates.sort((a, b) => a.name.localeCompare(b.name));

    // Helper to create list items
    const createItem = (template) => {
        const li = document.createElement('li');
        li.className = 'template-item';
        li.textContent = template.name;
        li.onclick = () => selectTemplate(template, li);
        return li;
    };

    // Render C# templates
    if (csharpTemplates.length > 0) {
        csharpTemplates.forEach(template => {
            list.appendChild(createItem(template));
        });
    }

    // Render Other templates with a separator/header if needed
    if (otherTemplates.length > 0) {
        if (csharpTemplates.length > 0) {
            const separator = document.createElement('li');
            separator.className = 'template-separator';
            separator.textContent = 'Others';
            separator.style.padding = '8px 20px';
            separator.style.fontWeight = 'bold';
            separator.style.color = 'var(--vscode-descriptionForeground)';
            separator.style.backgroundColor = 'var(--vscode-sideBarSectionHeader-background)';
            separator.style.borderTop = '1px solid var(--vscode-widget-border)';
            separator.style.borderBottom = '1px solid var(--vscode-widget-border)';
            separator.style.marginTop = '10px';
            list.appendChild(separator);
        }

        otherTemplates.forEach(template => {
            list.appendChild(createItem(template));
        });
    }
}

function filterTemplates(query) {
    const filtered = templates.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase()) || 
        t.shortName.toLowerCase().includes(query.toLowerCase())
    );
    renderTemplates(filtered);
}

const fixedNameTemplates = [
    'gitignore',
    'globaljson',
    'nugetconfig',
    'tool-manifest',
    'webconfig',
    'editorconfig',
    'buildprops',
    'buildtargets',
    'packagesprops',
    'gitattributes',
    'viewimports',
    'viewstart'
];

function selectTemplate(template, element) {
    selectedTemplate = template;
    
    // Update UI selection
    document.querySelectorAll('.template-item').forEach(el => el.classList.remove('selected'));
    if (element) {
        element.classList.add('selected');
    } else {
        // Try to find the element in the list and select it
        const listItems = document.querySelectorAll('.template-item');
        for (const item of listItems) {
            if (item.textContent === template.name) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }
    }

    // Show details
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('recentItemsContainer').classList.add('hidden');
    document.getElementById('templateDetails').classList.remove('hidden');

    document.getElementById('templateName').textContent = template.name;
    document.getElementById('templateDescription').textContent = template.description || '';

    // Toggle name field visibility
    const nameContainer = document.getElementById('nameContainer');
    if (fixedNameTemplates.includes(template.shortName)) {
        nameContainer.classList.add('hidden');
    } else {
        nameContainer.classList.remove('hidden');
    }

    // Render parameters
    renderParameters(template);
}

function renderParameters(template) {
    const container = document.getElementById('parametersContainer');
    container.innerHTML = '';

    // Get parameters for default framework or first available
    // Note: In the manager we grouped parameters by framework.
    // For simplicity, we'll take the first available set of parameters or 'default'
    
    let params = [];
    if (template.parameters) {
        // Try to find 'default' or take the first key
        const keys = Object.keys(template.parameters);
        if (keys.includes('default')) {
            params = template.parameters['default'];
        } else if (keys.length > 0) {
            params = template.parameters[keys[0]];
        }
    }

    const excludedParams = ['framework', 'name', 'output', 'language', 'type'];

    params.forEach(param => {
        if (excludedParams.includes(param.name.toLowerCase())) {
            return; 
        }

        const div = document.createElement('div');
        div.className = 'form-group';

        const label = document.createElement('label');
        let labelText = param.description || param.name;
        // Capitalize first letter if it's lowercase
        if (labelText && labelText.length > 0) {
            labelText = labelText.charAt(0).toUpperCase() + labelText.slice(1);
        }
        label.textContent = labelText;
        label.htmlFor = `param-${param.name}`;
        
        let input;
        
        // Special handling for global.json sdkVersion
        const isGlobalJson = template.shortName.toLowerCase() === 'globaljson';
        const isSdkVersionParam = param.name.toLowerCase() === 'sdkversion';

        if (isGlobalJson && isSdkVersionParam && sdkVersions.length > 0) {
            div.appendChild(label);
            input = document.createElement('select');
            sdkVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                input.appendChild(option);
            });
            // Select the latest version by default (last one usually if sorted ascending)
            if (sdkVersions.length > 0) {
                input.value = sdkVersions[sdkVersions.length - 1];
            }
        }
        else if (param.choices && param.choices.length > 0) {
            div.appendChild(label);
            input = document.createElement('select');
            param.choices.forEach(choice => {
                const option = document.createElement('option');
                option.value = choice;
                option.textContent = choice;
                input.appendChild(option);
            });
        } else if (param.type === 'bool' || param.type === 'boolean') {
             // Use checkbox for boolean
             div.className = 'form-group checkbox-group';
             
             input = document.createElement('input');
             input.type = 'checkbox';
             
             if (param.defaultValue === 'true') {
                 input.checked = true;
             }
             
             div.appendChild(input);
             div.appendChild(label);
             
        } else {
            div.appendChild(label);
            input = document.createElement('input');
            input.type = 'text';
            
            // Pre-fill namespace if available
            if (param.name.toLowerCase() === 'namespace' && defaultNamespace) {
                input.value = defaultNamespace;
            } else if (param.defaultValue) {
                input.value = param.defaultValue;
            }
        }

        input.id = `param-${param.name}`;
        input.dataset.paramName = param.name;
        if (param.type !== 'bool' && param.type !== 'boolean') {
             div.appendChild(input);
        }

        container.appendChild(div);
    });
}

function createItem() {
    if (!selectedTemplate) {
        return;
    }

    const nameInput = document.getElementById('itemName');
    const nameContainer = document.getElementById('nameContainer');
    let name = nameInput.value;

    // Validate name only if visible
    if (!nameContainer.classList.contains('hidden') && !name) {
        // Show error (simple alert for now, or better UI)
        // You might want to add visual feedback here
        nameInput.style.borderColor = 'var(--vscode-inputValidation-errorBorder)';
        return;
    } else {
        nameInput.style.borderColor = '';
    }

    // If hidden, don't send name (or send empty)
    if (nameContainer.classList.contains('hidden')) {
        name = '';
    }

    const parameters = {};
    document.querySelectorAll('#parametersContainer input, #parametersContainer select').forEach(input => {
        let paramName = input.dataset.paramName;
        
        // Convert PascalCase to kebab-case for CLI options (e.g. SdkVersion -> sdk-version)
        // This is required because dotnet new expects kebab-case options
        paramName = paramName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

        if (input.type === 'checkbox') {
             parameters[paramName] = input.checked ? 'true' : 'false';
        } else {
             parameters[paramName] = input.value;
        }
    });

    vscode.postMessage({
        command: 'createItem',
        data: {
            templateShortName: selectedTemplate.shortName,
            name: name,
            parameters: parameters
        }
    });
}