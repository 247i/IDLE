const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const outputContainer = document.getElementById('outputContainer');
    const countInput = document.getElementById('countInput');
    const uppercaseCheckbox = document.getElementById('uppercaseCheckbox');
    const bracesCheckbox = document.getElementById('bracesCheckbox');
    const hyphensCheckbox = document.getElementById('hyphensCheckbox');

    // Load state
    const state = vscode.getState() || {
        count: 1,
        uppercase: false,
        braces: false,
        hyphens: true
    };

    countInput.value = state.count;
    uppercaseCheckbox.checked = state.uppercase;
    bracesCheckbox.checked = state.braces;
    hyphensCheckbox.checked = state.hyphens;

    function generateUUID() {
        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return uuid;
    }

    function formatUUID(uuid) {
        let formatted = uuid;
        
        if (!hyphensCheckbox.checked) {
            formatted = formatted.replace(/-/g, '');
        }
        
        if (uppercaseCheckbox.checked) {
            formatted = formatted.toUpperCase();
        }
        
        if (bracesCheckbox.checked) {
            formatted = `{${formatted}}`;
        }
        
        return formatted;
    }

    function generate() {
        const count = parseInt(countInput.value) || 1;
        const uuids = [];
        
        for (let i = 0; i < count; i++) {
            uuids.push(formatUUID(generateUUID()));
        }
        
        const text = uuids.join('\n');
        
        // Append or replace? Let's append for now, or maybe replace is better for a generator tool.
        // Usually generators replace content or add to top.
        // Let's replace for simplicity, user can copy what they need.
        outputContainer.textContent = text;
        
        vscode.postMessage({ command: 'track', action: 'generate' });
        saveState();
    }

    function saveState() {
        vscode.setState({
            count: parseInt(countInput.value),
            uppercase: uppercaseCheckbox.checked,
            braces: bracesCheckbox.checked,
            hyphens: hyphensCheckbox.checked
        });
    }

    generateBtn.addEventListener('click', generate);
    
    copyBtn.addEventListener('click', () => {
        const text = outputContainer.textContent;
        if (text) {
            navigator.clipboard.writeText(text);
            vscode.postMessage({ command: 'track', action: 'copy' });
            
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    });

    clearBtn.addEventListener('click', () => {
        outputContainer.textContent = '';
        vscode.postMessage({ command: 'track', action: 'clear' });
    });

    // Generate on load
    generate();
});
