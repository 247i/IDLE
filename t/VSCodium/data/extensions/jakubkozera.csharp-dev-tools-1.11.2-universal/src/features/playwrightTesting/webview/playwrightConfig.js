// Playwright Configuration Panel Script

(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // State management
    let currentState = {
        showBrowser: false,
        enableDebugger: false,
        slowMode: false,
        overrideRunSettings: false,
        hasRunSettingsFile: false,
        runSettingsFileName: null
    };

    // DOM elements
    const overrideSection = document.getElementById('overrideSection');
    const overrideRunSettingsCheckbox = document.getElementById('overrideRunSettingsCheckbox');
    const overrideDescription = document.getElementById('overrideDescription');
    const playwrightSettings = document.getElementById('playwrightSettings');
    const showBrowserCheckbox = document.getElementById('showBrowserCheckbox');
    const enableDebuggerCheckbox = document.getElementById('enableDebuggerCheckbox');
    const slowModeCheckbox = document.getElementById('slowModeCheckbox');

    // Initialize the panel
    function initialize() {

        
        // Set up event listeners
        overrideRunSettingsCheckbox.addEventListener('change', onOverrideRunSettingsToggle);
        showBrowserCheckbox.addEventListener('change', onShowBrowserToggle);
        enableDebuggerCheckbox.addEventListener('change', onEnableDebuggerToggle);
        slowModeCheckbox.addEventListener('change', onSlowModeToggle);
        
        // Request initial state
        vscode.postMessage({ 
            command: 'getState' 
        });
        

    }

    // Handle override runsettings toggle
    function onOverrideRunSettingsToggle(event) {
        const overrideRunSettings = event.target.checked;

        
        // Update local state
        currentState.overrideRunSettings = overrideRunSettings;
        
        // Show/hide Playwright settings based on override state
        updatePlaywrightSettingsVisibility();
        
        // Send update to extension
        vscode.postMessage({
            command: 'updateOverrideRunSettings',
            overrideRunSettings: overrideRunSettings
        });
    }

    // Handle show browser toggle
    function onShowBrowserToggle(event) {
        const showBrowser = event.target.checked;

        
        // Update local state
        currentState.showBrowser = showBrowser;
        
        // Send update to extension
        vscode.postMessage({
            command: 'updateShowBrowser',
            showBrowser: showBrowser
        });
    }

    // Handle enable debugger toggle
    function onEnableDebuggerToggle(event) {
        const enableDebugger = event.target.checked;

        
        // Update local state
        currentState.enableDebugger = enableDebugger;
        
        // Send update to extension
        vscode.postMessage({
            command: 'updateEnableDebugger',
            enableDebugger: enableDebugger
        });
    }

    // Handle slow mode toggle
    function onSlowModeToggle(event) {
        const slowMode = event.target.checked;

        
        // Update local state
        currentState.slowMode = slowMode;
        
        // Send update to extension
        vscode.postMessage({
            command: 'updateSlowMode',
            slowMode: slowMode
        });
    }

    // Update the state from extension
    function updateState(newState) {

        
        // Update checkboxes
        if (typeof newState.showBrowser === 'boolean') {
            currentState.showBrowser = newState.showBrowser;
            showBrowserCheckbox.checked = newState.showBrowser;
        }
        
        if (typeof newState.enableDebugger === 'boolean') {
            currentState.enableDebugger = newState.enableDebugger;
            enableDebuggerCheckbox.checked = newState.enableDebugger;
        }
        
        if (typeof newState.slowMode === 'boolean') {
            currentState.slowMode = newState.slowMode;
            slowModeCheckbox.checked = newState.slowMode;
        }
        
        if (typeof newState.overrideRunSettings === 'boolean') {
            currentState.overrideRunSettings = newState.overrideRunSettings;
            overrideRunSettingsCheckbox.checked = newState.overrideRunSettings;
        }
        
        if (typeof newState.hasRunSettingsFile === 'boolean') {
            currentState.hasRunSettingsFile = newState.hasRunSettingsFile;
        }
        
        if (newState.runSettingsFileName) {
            currentState.runSettingsFileName = newState.runSettingsFileName;
        }
        
        // Update UI
        updateOverrideDescription();
        updateOverrideSectionVisibility();
        updatePlaywrightSettingsVisibility();
    }

    // Update the override description based on detected .runsettings files
    function updateOverrideDescription() {
        if (currentState.hasRunSettingsFile && currentState.runSettingsFileName) {
            overrideDescription.textContent = `Use custom Playwright settings instead of detected ${currentState.runSettingsFileName}`;
        } else {
            overrideDescription.textContent = 'Use custom Playwright settings for test execution';
        }
    }

    // Show/hide the override section based on whether .runsettings files are detected
    function updateOverrideSectionVisibility() {
        if (currentState.hasRunSettingsFile) {
            overrideSection.style.display = 'block';
        } else {
            overrideSection.style.display = 'none';
            // When no .runsettings files, always treat as override enabled
            currentState.overrideRunSettings = true;
        }
    }

    // Show/hide Playwright settings based on override state and .runsettings detection
    function updatePlaywrightSettingsVisibility() {
        // Show Playwright settings when:
        // 1. No .runsettings files detected (always show), OR
        // 2. .runsettings files detected AND override is enabled
        if (!currentState.hasRunSettingsFile || currentState.overrideRunSettings) {
            playwrightSettings.style.display = 'flex';
        } else {
            playwrightSettings.style.display = 'none';
        }
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;

        
        switch (message.command) {
            case 'updateState':
                updateState(message.state);
                break;
            case 'showError':
                console.error('Playwright Config Panel: Error -', message.error);
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
