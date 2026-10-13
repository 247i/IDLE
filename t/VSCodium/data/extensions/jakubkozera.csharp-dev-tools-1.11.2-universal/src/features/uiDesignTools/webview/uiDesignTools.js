// UI Design Tools WebView JavaScript
(function() {
    const vscode = acquireVsCodeApi();
    let currentTool = window.toolType;

    // Initialize the tool when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeTool();
        setupEventListeners();
    });

    function setupEventListeners() {
        // Clear button
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearAll);
    }
}

    function initializeTool() {
        const mainContainer = document.getElementById('mainContainer');
        
        switch (currentTool) {
            case 'colorConvertor':
                renderColorConvertor(mainContainer);
                break;
            case 'colorPalette':
                renderColorPalette(mainContainer);
                break;
            case 'gradientMaker':
                renderGradientMaker(mainContainer);
                break;
            case 'cubicBezier':
                renderCubicBezier(mainContainer);
                break;
            case 'contrastChecker':
                renderContrastChecker(mainContainer);
                break;
            case 'colorMixer':
                renderColorMixer(mainContainer);
                break;
            default:
                mainContainer.innerHTML = '<p>Unknown tool type: ' + currentTool + '</p>';
        }
    }

    function renderColorConvertor(container) {
        container.innerHTML = `
            <div class="tool-section">
                <div class="section-title">Color Convertor</div>
                <div class="section-description">
                    Convert colors between different formats: HEX, RGB, HSL, and more.
                </div>
                
                <div class="flex items-center gap-4 mb-2">
                    <div class="color-swatch" id="colorSwatch">
                        <div class="color-swatch-inner" id="colorSwatchInner" style="background-color: #3399ff;"></div>
                    </div>
                    <div class="flex-column" style="flex: 1;">
                        <div class="color-picker" id="colorPicker" style="background-color: hsl(210, 100%, 50%);">
                            <div class="color-picker-handle" id="colorHandle" style="left: 100%; top: 0%;"></div>
                        </div>
                    </div>
                </div>

                <div class="slider-container">
                    <div class="form-label">Hue</div>
                    <div class="slider hue-slider" id="hueSlider">
                        <div class="slider-handle" id="hueHandle" style="left: 60%;"></div>
                    </div>
                </div>

                <div class="slider-container">
                    <div class="form-label">Alpha</div>
                    <div class="slider alpha-slider" id="alphaSlider">
                        <div class="slider-handle" id="alphaHandle" style="left: 100%;"></div>
                    </div>
                </div>

                <div class="result-display">
                    <div class="color-format">
                        <div class="format-label">HEX</div>
                        <div class="format-value">
                            <input class="format-text" id="hexValue" value="#3399ff" readonly>
                            <button class="icon-button copy-button" data-format="hex">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="color-format">
                        <div class="format-label">RGB</div>
                        <div class="format-value">
                            <input class="format-text" id="rgbValue" value="rgb(51, 153, 255)" readonly>
                            <button class="icon-button copy-button" data-format="rgb">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="color-format">
                        <div class="format-label">HSL</div>
                        <div class="format-value">
                            <input class="format-text" id="hslValue" value="hsl(210, 100%, 60%)" readonly>
                            <button class="icon-button copy-button" data-format="hsl">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupColorConvertorEvents();
    }

    function renderColorPalette(container) {
        container.innerHTML = `
            <div class="tool-section">
                <div class="section-title">Color Palette Generator</div>
                <div class="section-description">
                    Generate beautiful color palettes from a base color using various harmony rules.
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="baseColor">Base Color</label>
                    <div class="flex items-center gap-2">
                        <input type="color" class="form-input" id="baseColorPicker" value="#3399ff" style="width: 60px; height: 40px; padding: 4px;">
                        <input type="text" class="form-input" id="baseColorText" value="#3399ff" style="flex: 1;">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="harmonyType">Harmony Type</label>
                    <select class="form-select" id="harmonyType">
                        <option value="monochromatic">Monochromatic</option>
                        <option value="analogous">Analogous</option>
                        <option value="complementary">Complementary</option>
                        <option value="triadic">Triadic</option>
                        <option value="tetradic">Tetradic</option>
                        <option value="splitComplementary">Split Complementary</option>
                    </select>
                </div>

                <div id="paletteResults" class="palette-grid">
                    <!-- Palette colors will be generated here -->
                </div>
            </div>
        `;

        setupColorPaletteEvents();
        generatePalette();
    }

    function renderGradientMaker(container) {
        container.innerHTML = `
            <div class="tool-section">
                <div class="section-title">Gradient Maker</div>
                <div class="section-description">
                    Create beautiful CSS gradients with multiple color stops and direction controls.
                </div>
                
                <div class="gradient-preview" id="gradientPreview"></div>
                
                <div class="flex gap-4 mb-2">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="gradientType">Type</label>
                        <select class="form-select" id="gradientType">
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="gradientAngle">Direction/Angle</label>
                        <input type="range" class="form-input" id="gradientAngle" min="0" max="360" value="90">
                        <span id="angleValue" class="format-label">90°</span>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Color Stops</label>
                    <div id="colorStops">
                        <div class="flex items-center gap-2 mb-2" data-stop="0">
                            <input type="color" class="form-input" style="width: 50px; height: 30px; padding: 4px;" value="#ff6b6b">
                            <input type="number" class="form-input" style="width: 80px;" value="0" min="0" max="100">
                            <span class="format-label">%</span>
                            <button class="icon-button" onclick="removeColorStop(0)">×</button>
                        </div>
                        <div class="flex items-center gap-2 mb-2" data-stop="1">
                            <input type="color" class="form-input" style="width: 50px; height: 30px; padding: 4px;" value="#4ecdc4">
                            <input type="number" class="form-input" style="width: 80px;" value="100" min="0" max="100">
                            <span class="format-label">%</span>
                            <button class="icon-button" onclick="removeColorStop(1)">×</button>
                        </div>
                    </div>
                    <button class="secondary-button" id="addColorStop">Add Color Stop</button>
                </div>

                <div class="result-display">
                    <div class="color-format">
                        <div class="format-label">CSS Code</div>
                        <div class="format-value">
                            <textarea class="format-text" id="gradientCSS" rows="3" readonly>background: linear-gradient(90deg, #ff6b6b 0%, #4ecdc4 100%);</textarea>
                            <button class="icon-button copy-button" data-format="gradient">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupGradientMakerEvents();
        updateGradient();
    }

    function renderContrastChecker(container) {
        container.innerHTML = `
            <div class="tool-section">
                <div class="section-title">Contrast Checker</div>
                <div class="section-description">
                    Check color contrast ratios for accessibility compliance with WCAG guidelines.
                </div>
                
                <div class="flex gap-4 mb-2">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="backgroundColor">Background Color</label>
                        <div class="flex items-center gap-2">
                            <input type="color" class="form-input" id="backgroundColorPicker" value="#ffffff" style="width: 60px; height: 40px; padding: 4px;">
                            <input type="text" class="form-input" id="backgroundColorText" value="#ffffff" style="flex: 1;">
                        </div>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="textColor">Text Color</label>
                        <div class="flex items-center gap-2">
                            <input type="color" class="form-input" id="textColorPicker" value="#000000" style="width: 60px; height: 40px; padding: 4px;">
                            <input type="text" class="form-input" id="textColorText" value="#000000" style="flex: 1;">
                        </div>
                    </div>
                </div>

                <div class="contrast-preview" id="contrastPreview" style="background-color: #ffffff; color: #000000;">
                    The quick brown fox jumps over the lazy dog. This is a sample text to demonstrate contrast.
                </div>

                <div class="contrast-ratio" id="contrastRatio">21.00:1</div>

                <div class="wcag-compliance">
                    <div class="wcag-result">
                        <div class="wcag-level">WCAG AA</div>
                        <div class="wcag-status wcag-pass" id="wcagAAStatus">PASS</div>
                        <div class="format-label">Normal: 4.5:1 | Large: 3:1</div>
                    </div>
                    <div class="wcag-result">
                        <div class="wcag-level">WCAG AAA</div>
                        <div class="wcag-status wcag-pass" id="wcagAAAStatus">PASS</div>
                        <div class="format-label">Normal: 7:1 | Large: 4.5:1</div>
                    </div>
                </div>
            </div>
        `;

        setupContrastCheckerEvents();
        updateContrast();
    }

    function renderCubicBezier(container) {
        container.innerHTML = `
            <div class="tool-section">
                <div class="section-title">Cubic Bezier</div>
                <div class="section-description">
                    Create and visualize cubic bezier curves for CSS animations and transitions.
                </div>
                
                <canvas class="bezier-canvas" id="bezierCanvas" width="400" height="200"></canvas>
                
                <div class="bezier-controls">
                    <div class="bezier-input">
                        <label class="form-label">P1 X</label>
                        <input type="number" class="form-input" id="p1x" value="0.25" step="0.01" min="0" max="1">
                    </div>
                    <div class="bezier-input">
                        <label class="form-label">P1 Y</label>
                        <input type="number" class="form-input" id="p1y" value="0.1" step="0.01" min="0" max="1">
                    </div>
                    <div class="bezier-input">
                        <label class="form-label">P2 X</label>
                        <input type="number" class="form-input" id="p2x" value="0.25" step="0.01" min="0" max="1">
                    </div>
                    <div class="bezier-input">
                        <label class="form-label">P2 Y</label>
                        <input type="number" class="form-input" id="p2y" value="1" step="0.01" min="0" max="1">
                    </div>
                </div>

                <div class="result-display">
                    <div class="color-format">
                        <div class="format-label">CSS Cubic Bezier</div>
                        <div class="format-value">
                            <input class="format-text" id="bezierCSS" value="cubic-bezier(0.25, 0.1, 0.25, 1)" readonly>
                            <button class="icon-button copy-button" data-format="bezier">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Animation Preview</label>
                    <div style="height: 60px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; position: relative; overflow: hidden;">
                        <div id="animationBox" style="width: 30px; height: 30px; background: var(--vscode-button-background); position: absolute; top: 15px; left: 0; border-radius: 4px; transition: transform 2s;"></div>
                    </div>
                    <button class="secondary-button mt-2" id="playAnimation">Play Animation</button>
                </div>
            </div>
        `;

        setupCubicBezierEvents();
        drawBezierCurve();
    }

    function renderColorMixer(container) {
        container.innerHTML = `
            <div class="tool-section">
                <div class="section-title">Color Mixer</div>
                <div class="section-description">
                    Mix two or more colors together to create new color combinations.
                </div>
                
                <div class="flex gap-4 mb-2">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="color1">Color 1</label>
                        <div class="flex items-center gap-2">
                            <input type="color" class="form-input" id="color1Picker" value="#ff6b6b" style="width: 60px; height: 40px; padding: 4px;">
                            <input type="text" class="form-input" id="color1Text" value="#ff6b6b" style="flex: 1;">
                        </div>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="color2">Color 2</label>
                        <div class="flex items-center gap-2">
                            <input type="color" class="form-input" id="color2Picker" value="#4ecdc4" style="width: 60px; height: 40px; padding: 4px;">
                            <input type="text" class="form-input" id="color2Text" value="#4ecdc4" style="flex: 1;">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Mix Ratio</label>
                    <input type="range" class="form-input" id="mixRatio" min="0" max="100" value="50">
                    <div class="flex justify-between">
                        <span class="format-label">Color 1</span>
                        <span class="format-label" id="ratioValue">50% - 50%</span>
                        <span class="format-label">Color 2</span>
                    </div>
                </div>

                <div class="color-swatch" id="mixedColorSwatch" style="width: 100%; height: 80px; margin: 16px 0;">
                    <div class="color-swatch-inner" id="mixedColorInner"></div>
                </div>

                <div class="result-display">
                    <div class="color-format">
                        <div class="format-label">Mixed Color (HEX)</div>
                        <div class="format-value">
                            <input class="format-text" id="mixedHex" readonly>
                            <button class="icon-button copy-button" data-format="mixed">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupColorMixerEvents();
        mixColors();
    }

    // Color Convertor Events
    function setupColorConvertorEvents() {
        // Setup color picker interactions
        const colorPicker = document.getElementById('colorPicker');
        const hueSlider = document.getElementById('hueSlider');
        const alphaSlider = document.getElementById('alphaSlider');

        if (colorPicker) {
            colorPicker.addEventListener('click', handleColorPickerClick);
        }

        if (hueSlider) {
            hueSlider.addEventListener('click', handleHueSliderClick);
        }

        if (alphaSlider) {
            alphaSlider.addEventListener('click', handleAlphaSliderClick);
        }

        setupCopyButtons();
    }

    // Color Palette Events
    function setupColorPaletteEvents() {
        const baseColorPicker = document.getElementById('baseColorPicker');
        const baseColorText = document.getElementById('baseColorText');
        const harmonyType = document.getElementById('harmonyType');

        if (baseColorPicker) {
            baseColorPicker.addEventListener('input', updateBaseColorFromPicker);
        }

        if (baseColorText) {
            baseColorText.addEventListener('input', updateBaseColorFromText);
        }

        if (harmonyType) {
            harmonyType.addEventListener('change', generatePalette);
        }

        setupCopyButtons();
    }

    // Gradient Maker Events
    function setupGradientMakerEvents() {
        const gradientType = document.getElementById('gradientType');
        const gradientAngle = document.getElementById('gradientAngle');
        const addColorStop = document.getElementById('addColorStop');

        if (gradientType) {
            gradientType.addEventListener('change', updateGradient);
        }

        if (gradientAngle) {
            gradientAngle.addEventListener('input', function() {
                document.getElementById('angleValue').textContent = this.value + '°';
                updateGradient();
            });
        }

        if (addColorStop) {
            addColorStop.addEventListener('click', addNewColorStop);
        }

        // Setup color stop events
        document.getElementById('colorStops').addEventListener('input', updateGradient);

        setupCopyButtons();
    }

    // Contrast Checker Events
    function setupContrastCheckerEvents() {
        const backgroundColorPicker = document.getElementById('backgroundColorPicker');
        const backgroundColorText = document.getElementById('backgroundColorText');
        const textColorPicker = document.getElementById('textColorPicker');
        const textColorText = document.getElementById('textColorText');

        [backgroundColorPicker, backgroundColorText, textColorPicker, textColorText].forEach(element => {
            if (element) {
                element.addEventListener('input', updateContrast);
            }
        });

        setupCopyButtons();
    }

    // Cubic Bezier Events
    function setupCubicBezierEvents() {
        const inputs = ['p1x', 'p1y', 'p2x', 'p2y'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', function() {
                    drawBezierCurve();
                    updateBezierCSS();
                });
            }
        });

        const playButton = document.getElementById('playAnimation');
        if (playButton) {
            playButton.addEventListener('click', playBezierAnimation);
        }

        setupCopyButtons();
    }

    // Color Mixer Events
    function setupColorMixerEvents() {
        const color1Picker = document.getElementById('color1Picker');
        const color1Text = document.getElementById('color1Text');
        const color2Picker = document.getElementById('color2Picker');
        const color2Text = document.getElementById('color2Text');
        const mixRatio = document.getElementById('mixRatio');

        [color1Picker, color1Text, color2Picker, color2Text, mixRatio].forEach(element => {
            if (element) {
                element.addEventListener('input', mixColors);
            }
        });

        setupCopyButtons();
    }

    // Common copy button setup
    function setupCopyButtons() {
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', function() {
                const format = this.getAttribute('data-format');
                copyToClipboard(format, this);
            });
        });
    }

    // Implementation functions (simplified for demo)
    function generatePalette() {
        // Implementation would generate colors based on harmony type
    }

    function updateGradient() {
        // Implementation would update gradient preview
    }

    function updateContrast() {
        // Implementation would calculate and display contrast ratio
    }

    function drawBezierCurve() {
        // Implementation would draw the bezier curve on canvas
    }

    function mixColors() {
        // Implementation would mix the colors
    }

    function copyToClipboard(format, button) {
        let value = '';
        
        switch (format) {
            case 'hex':
                value = document.getElementById('hexValue').value;
                break;
            case 'rgb':
                value = document.getElementById('rgbValue').value;
                break;
            case 'hsl':
                value = document.getElementById('hslValue').value;
                break;
            case 'gradient':
                value = document.getElementById('gradientCSS').value;
                break;
            case 'bezier':
                value = document.getElementById('bezierCSS').value;
                break;
            case 'mixed':
                value = document.getElementById('mixedHex').value;
                break;
        }

        if (value) {
            vscode.postMessage({
                command: 'copyToClipboard',
                value: value
            });

            // Visual feedback
            button.classList.add('copied');
            setTimeout(() => button.classList.remove('copied'), 2000);
        }
    }

    function clearAll() {
        // Reset all inputs to default values
        
        // Reload the tool to reset state
        initializeTool();
    }

    function trackAction(action, data = {}) {
        vscode.postMessage({
            command: 'trackAction',
            action: action,
            data: data
        });
    }

    // Simplified event handlers (would need full implementation)
    function handleColorPickerClick(e) {
        // Handle color picker interaction
    }

    function handleHueSliderClick(e) {
        // Handle hue slider changes
    }

    function handleAlphaSliderClick(e) {
        // Handle alpha slider changes
    }

    function updateBaseColorFromPicker() {
        // Handle base color changes from picker
    }

    function updateBaseColorFromText() {
        // Handle base color changes from text input
    }

    function addNewColorStop() {
        // Add new gradient color stop
    }

    function removeColorStop(index) {
        // Remove gradient color stop
    }

    function updateBezierCSS() {
        // Update bezier curve CSS output
    }

    function playBezierAnimation() {
        // Play the bezier animation preview
    }

})();
