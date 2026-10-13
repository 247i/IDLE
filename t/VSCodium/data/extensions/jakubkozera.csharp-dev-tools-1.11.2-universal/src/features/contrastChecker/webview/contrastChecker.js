// Contrast Checker JavaScript Implementation
(function() {
    const vscode = acquireVsCodeApi();
    
    // WCAG contrast ratio calculation utilities
    const contrastUtils = {
        // Convert hex to RGB
        hexToRgb(hex) {
            const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            return match ? {
                r: parseInt(match[1], 16),
                g: parseInt(match[2], 16),
                b: parseInt(match[3], 16)
            } : null;
        },
        
        // Convert RGB to hex
        rgbToHex(r, g, b) {
            const toHex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        },
        
        // Calculate relative luminance (WCAG formula)
        getLuminance(r, g, b) {
            const [rs, gs, bs] = [r, g, b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        },
        
        // Calculate contrast ratio between two colors
        getContrastRatio(color1, color2) {
            const rgb1 = this.hexToRgb(color1);
            const rgb2 = this.hexToRgb(color2);
            
            if (!rgb1 || !rgb2) { return 0; }
            
            const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
            const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
            
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            
            return (brightest + 0.05) / (darkest + 0.05);
        },
        
        // Check WCAG compliance levels
        checkCompliance(ratio) {
            return {
                aaLarge: ratio >= 3,      // AA for large text (18pt+ or 14pt+ bold)
                aaSmall: ratio >= 4.5,    // AA for normal text
                aaaLarge: ratio >= 4.5,   // AAA for large text
                aaaSmall: ratio >= 7      // AAA for normal text
            };
        }
    };
    
    // State management
    let backgroundColor = '#ffffff';
    let textColor = '#000000';
    let currentRatio = 21;
    
    // DOM elements
    const foregroundPicker = document.getElementById('foregroundPicker');
    const foregroundText = document.getElementById('foregroundText');
    const backgroundPicker = document.getElementById('backgroundPicker');
    const backgroundText = document.getElementById('backgroundText');
    const contrastPreview = document.getElementById('contrastPreview');
    const contrastRatio = document.getElementById('contrastRatio');
    const swapBtn = document.getElementById('swapBtn');
    
    // Initialize the checker
    function init() {
        setupEventListeners();
        updateColors();
        checkContrast();
    }
    
    function setupEventListeners() {
        // Foreground color inputs
        foregroundPicker.addEventListener('input', (e) => {
            textColor = e.target.value;
            foregroundText.value = textColor;
            updateColors();
            checkContrast();
        });
        
        foregroundText.addEventListener('input', (e) => {
            const color = e.target.value;
            if (isValidColor(color)) {
                textColor = color;
                foregroundPicker.value = textColor;
                updateColors();
                checkContrast();
            }
        });
        
        foregroundText.addEventListener('blur', (e) => {
            if (!isValidColor(e.target.value)) {
                e.target.value = textColor;
            }
        });
        
        // Background color inputs
        backgroundPicker.addEventListener('input', (e) => {
            backgroundColor = e.target.value;
            backgroundText.value = backgroundColor;
            updateColors();
            checkContrast();
        });
        
        backgroundText.addEventListener('input', (e) => {
            const color = e.target.value;
            if (isValidColor(color)) {
                backgroundColor = color;
                backgroundPicker.value = backgroundColor;
                updateColors();
                checkContrast();
            }
        });
        
        backgroundText.addEventListener('blur', (e) => {
            if (!isValidColor(e.target.value)) {
                e.target.value = backgroundColor;
            }
        });
        
        // Swap button
        if (swapBtn) {
            swapBtn.addEventListener('click', swapColors);
        }
        
        // Copy ratio functionality
        if (contrastRatio) {
            contrastRatio.addEventListener('click', () => {
                navigator.clipboard.writeText(currentRatio.toFixed(2)).then(() => {
                    vscode.postMessage({
                        command: 'showInfo',
                        message: `Contrast ratio ${currentRatio.toFixed(2)} copied to clipboard`
                    });
                });
            });
        }
    }
    
    function updateColors() {
        // Update preview section
        const previewContent = contrastPreview.querySelector('.preview-content');
        if (previewContent) {
            previewContent.style.backgroundColor = backgroundColor;
            previewContent.style.color = textColor;
        }
    }
    
    function checkContrast() {
        currentRatio = contrastUtils.getContrastRatio(backgroundColor, textColor);
        const compliance = contrastUtils.checkCompliance(currentRatio);
        
        // Update ratio display
        if (contrastRatio) {
            contrastRatio.textContent = `${currentRatio.toFixed(1)}:1`;
        }
        
        // Update WCAG compliance status
        const statusMap = [
            { id: 'wcagAaNormal', key: 'aaSmall', requirement: '4.5:1' },
            { id: 'wcagAaLarge', key: 'aaLarge', requirement: '3:1' },
            { id: 'wcagAaaNormal', key: 'aaaSmall', requirement: '7:1' },
            { id: 'wcagAaaLarge', key: 'aaaLarge', requirement: '4.5:1' }
        ];
        
        statusMap.forEach(({ id, key, requirement }) => {
            const element = document.getElementById(id);
            if (element) {
                const passes = compliance[key];
                const icon = element.querySelector('.status-icon');
                
                element.className = `status ${passes ? 'pass' : 'fail'}`;
                
                if (passes) {
                    element.innerHTML = `
                        <svg class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                        Pass (${requirement})
                    `;
                } else {
                    element.innerHTML = `
                        <svg class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                        Fail (${requirement})
                    `;
                }
            }
        });
    }
    
    function swapColors() {
        [backgroundColor, textColor] = [textColor, backgroundColor];
        
        foregroundPicker.value = textColor;
        foregroundText.value = textColor;
        backgroundPicker.value = backgroundColor;
        backgroundText.value = backgroundColor;
        
        updateColors();
        checkContrast();
    }
    
    function isValidColor(color) {
        const s = new Option().style;
        s.color = color;
        return s.color !== '';
    }
    
    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'setColors':
                if (message.backgroundColor) {
                    backgroundColor = message.backgroundColor;
                    backgroundPicker.value = backgroundColor;
                    backgroundText.value = backgroundColor;
                }
                if (message.textColor) {
                    textColor = message.textColor;
                    foregroundPicker.value = textColor;
                    foregroundText.value = textColor;
                }
                updateColors();
                checkContrast();
                break;
        }
    });
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
