// RunSettings Panel Script

(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // State management
    let currentState = {
        hasRunSettings: false,
        detectedFiles: [],
        selectedPath: null,
        selectedName: null,
        selectedDisplayName: null
    };

    // DOM elements
    const noRunSettingsSection = document.getElementById('noRunSettingsSection');
    const singleRunSettingsSection = document.getElementById('singleRunSettingsSection');
    const multipleRunSettingsSection = document.getElementById('multipleRunSettingsSection');
    
    const refreshBtn = document.getElementById('refreshBtn');
    const singleOpenBtn = document.getElementById('singleOpenBtn');
    const multipleOpenBtn = document.getElementById('multipleOpenBtn');
    
    const singleRunSettingsName = document.getElementById('singleRunSettingsName');
    const singleRunSettingsDescription = document.getElementById('singleRunSettingsDescription');
    
    const runSettingsDropdown = document.getElementById('runSettingsDropdown');

    // Initialize the panel
    function initialize() {

        
        // Set up event listeners
        refreshBtn.addEventListener('click', onRefresh);
        singleOpenBtn.addEventListener('click', onOpenSingleFile);
        multipleOpenBtn.addEventListener('click', onOpenSelectedFile);
        runSettingsDropdown.addEventListener('change', onDropdownChange);
        
        // Request initial state
        vscode.postMessage({ 
            command: 'getState' 
        });
        

    }

    // Handle refresh button click
    function onRefresh() {

        
        vscode.postMessage({
            command: 'refresh'
        });
    }

    // Handle open single file button click
    function onOpenSingleFile() {
        if (currentState.selectedPath) {

            
            vscode.postMessage({
                command: 'openFile',
                filePath: currentState.selectedPath
            });
        }
    }

    // Handle open selected file button click
    function onOpenSelectedFile() {
        if (currentState.selectedPath) {

            
            vscode.postMessage({
                command: 'openFile',
                filePath: currentState.selectedPath
            });
        }
    }

    // Handle dropdown selection change
    function onDropdownChange(event) {
        const selectedPath = event.target.value;

        
        if (selectedPath && selectedPath !== currentState.selectedPath) {
            vscode.postMessage({
                command: 'selectRunSettings',
                runSettingsPath: selectedPath
            });
        }
    }

    // Update the UI based on current state
    function updateUI() {

        
        // Hide all sections first
        noRunSettingsSection.style.display = 'none';
        singleRunSettingsSection.style.display = 'none';
        multipleRunSettingsSection.style.display = 'none';
        
        if (!currentState.hasRunSettings || currentState.detectedFiles.length === 0) {
            // No .runsettings files detected
            noRunSettingsSection.style.display = 'block';
        } else if (currentState.detectedFiles.length === 1) {
            // Single .runsettings file detected
            singleRunSettingsSection.style.display = 'block';
            
            const file = currentState.detectedFiles[0];
            singleRunSettingsName.textContent = file.name;
            singleRunSettingsDescription.textContent = file.description;
        } else {
            // Multiple .runsettings files detected
            multipleRunSettingsSection.style.display = 'block';
            
            // Populate dropdown
            populateDropdown();
        }
    }

    // Populate the dropdown with detected .runsettings files
    function populateDropdown() {
        // Clear existing options
        runSettingsDropdown.innerHTML = '';
        
        // Add options for each detected file
        currentState.detectedFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file.path;
            option.textContent = file.name;
            option.title = file.description;
            
            // Select the currently selected option
            if (file.path === currentState.selectedPath) {
                option.selected = true;
            }
            
            runSettingsDropdown.appendChild(option);
        });
    }

    // Update the state from extension
    function updateState(newState) {

        
        currentState = {
            hasRunSettings: newState.hasRunSettings || false,
            detectedFiles: newState.detectedFiles || [],
            selectedPath: newState.selectedPath || null,
            selectedName: newState.selectedName || null,
            selectedDisplayName: newState.selectedDisplayName || null
        };
        
        updateUI();
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;

        
        switch (message.command) {
            case 'updateState':
                updateState(message.state);
                break;
            case 'showError':
                console.error('RunSettings Panel: Error -', message.error);
                break;
            case 'showSuccess':

                break;
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
