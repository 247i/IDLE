// Color Palette Generator JavaScript
(function() {
    const vscode = acquireVsCodeApi();
    
    // State
    let baseColor = '#0f85fa';
    let colorSteps = 12;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        setupEventListeners();
        generateAllPalettes();
    });
    
    function setupEventListeners() {
        // Clear button
        document.getElementById('clearBtn').addEventListener('click', clearAll);
        
        // Base color controls
        document.getElementById('baseColorPicker').addEventListener('input', handleColorChange);
        document.getElementById('baseColorText').addEventListener('input', handleColorTextChange);
        
        // Color steps slider
        const stepsSlider = document.getElementById('colorSteps');
        stepsSlider.addEventListener('input', function() {
            colorSteps = parseInt(this.value);
            document.getElementById('stepsValue').textContent = colorSteps;
            generateAllPalettes();
        });
    }
    
    function handleColorChange(event) {
        baseColor = event.target.value;
        document.getElementById('baseColorText').value = baseColor;
        generateAllPalettes();
    }
    
    function handleColorTextChange(event) {
        const value = event.target.value.trim();
        if (isValidColor(value)) {
            baseColor = value;
            document.getElementById('baseColorPicker').value = baseColor;
            generateAllPalettes();
        }
    }
    
    function isValidColor(color) {
        if (!color) {
            return false;
        }
        
        // Test hex colors
        if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
            return true;
        }
        
        // Test named colors and other formats
        const testEl = document.createElement('div');
        testEl.style.color = color;
        return testEl.style.color !== '';
    }
    
    function generateAllPalettes() {
        const paletteSection = document.getElementById('paletteSection');
        paletteSection.innerHTML = '';
        
        // Generate different types of palettes
        const paletteTypes = [
            { name: 'Monochromatic', generator: generateMonochromaticPalette },
            { name: 'Analogous', generator: generateAnalogousPalette },
            { name: 'Complementary', generator: generateComplementaryPalette },
            { name: 'Triadic', generator: generateTriadicPalette },
            { name: 'Tetradic', generator: generateTetradicPalette },
            { name: 'Split Complementary', generator: generateSplitComplementaryPalette }
        ];
        
        paletteTypes.forEach((paletteType, index) => {
            setTimeout(() => {
                const colors = paletteType.generator(baseColor, colorSteps);
                renderPalette(paletteType.name, colors);
            }, index * 100); // Stagger the generation for smooth animation
        });
    }
    
    function generateMonochromaticPalette(baseColor, steps) {
        const hsl = hexToHsl(baseColor);
        const colors = [];
        
        // Generate variations by changing lightness and saturation
        for (let i = 0; i < steps; i++) {
            const lightness = 10 + (i / (steps - 1)) * 80; // 10% to 90%
            const saturation = Math.max(20, hsl.s - (i * 10)); // Decrease saturation slightly
            
            colors.push({
                hex: hslToHex(hsl.h, saturation, lightness),
                name: `L${Math.round(lightness)}`
            });
        }
        
        return colors;
    }
    
    function generateAnalogousPalette(baseColor, steps) {
        const hsl = hexToHsl(baseColor);
        const colors = [];
        const hueRange = 60; // 60 degrees on each side
        
        for (let i = 0; i < steps; i++) {
            const hueOffset = (i / (steps - 1) - 0.5) * hueRange;
            const newHue = (hsl.h + hueOffset + 360) % 360;
            
            // Vary lightness slightly for more interest
            const lightness = Math.max(20, Math.min(80, hsl.l + (Math.random() - 0.5) * 20));
            
            colors.push({
                hex: hslToHex(newHue, hsl.s, lightness),
                name: `H${Math.round(newHue)}`
            });
        }
        
        return colors;
    }
    
    function generateComplementaryPalette(baseColor, steps) {
        const hsl = hexToHsl(baseColor);
        const colors = [];
        const complementaryHue = (hsl.h + 180) % 360;
        
        const halfSteps = Math.floor(steps / 2);
        
        // First half: variations of base color
        for (let i = 0; i < halfSteps; i++) {
            const lightness = 20 + (i / (halfSteps - 1)) * 60;
            colors.push({
                hex: hslToHex(hsl.h, hsl.s, lightness),
                name: `Base ${i + 1}`
            });
        }
        
        // Second half: variations of complementary color
        for (let i = 0; i < steps - halfSteps; i++) {
            const lightness = 20 + (i / (steps - halfSteps - 1)) * 60;
            colors.push({
                hex: hslToHex(complementaryHue, hsl.s, lightness),
                name: `Comp ${i + 1}`
            });
        }
        
        return colors;
    }
    
    function generateTriadicPalette(baseColor, steps) {
        const hsl = hexToHsl(baseColor);
        const colors = [];
        const triadicHues = [hsl.h, (hsl.h + 120) % 360, (hsl.h + 240) % 360];
        
        const stepsPerHue = Math.floor(steps / 3);
        const remainder = steps % 3;
        
        triadicHues.forEach((hue, hueIndex) => {
            const stepsForThisHue = stepsPerHue + (hueIndex < remainder ? 1 : 0);
            
            for (let i = 0; i < stepsForThisHue; i++) {
                const lightness = 25 + (i / Math.max(1, stepsForThisHue - 1)) * 50;
                const saturation = Math.max(40, hsl.s - (i * 15));
                
                colors.push({
                    hex: hslToHex(hue, saturation, lightness),
                    name: `T${hueIndex + 1}-${i + 1}`
                });
            }
        });
        
        return colors.slice(0, steps);
    }
    
    function generateTetradicPalette(baseColor, steps) {
        const hsl = hexToHsl(baseColor);
        const colors = [];
        const tetradicHues = [hsl.h, (hsl.h + 90) % 360, (hsl.h + 180) % 360, (hsl.h + 270) % 360];
        
        const stepsPerHue = Math.floor(steps / 4);
        const remainder = steps % 4;
        
        tetradicHues.forEach((hue, hueIndex) => {
            const stepsForThisHue = stepsPerHue + (hueIndex < remainder ? 1 : 0);
            
            for (let i = 0; i < stepsForThisHue; i++) {
                const lightness = 30 + (i / Math.max(1, stepsForThisHue - 1)) * 40;
                const saturation = Math.max(50, hsl.s - (i * 10));
                
                colors.push({
                    hex: hslToHex(hue, saturation, lightness),
                    name: `Q${hueIndex + 1}-${i + 1}`
                });
            }
        });
        
        return colors.slice(0, steps);
    }
    
    function generateSplitComplementaryPalette(baseColor, steps) {
        const hsl = hexToHsl(baseColor);
        const colors = [];
        const complementaryHue = (hsl.h + 180) % 360;
        const splitHues = [hsl.h, (complementaryHue - 30 + 360) % 360, (complementaryHue + 30) % 360];
        
        const stepsPerHue = Math.floor(steps / 3);
        const remainder = steps % 3;
        
        splitHues.forEach((hue, hueIndex) => {
            const stepsForThisHue = stepsPerHue + (hueIndex < remainder ? 1 : 0);
            
            for (let i = 0; i < stepsForThisHue; i++) {
                const lightness = 25 + (i / Math.max(1, stepsForThisHue - 1)) * 50;
                const saturation = hueIndex === 0 ? hsl.s : Math.max(60, hsl.s - (i * 5));
                
                colors.push({
                    hex: hslToHex(hue, saturation, lightness),
                    name: `SC${hueIndex + 1}-${i + 1}`
                });
            }
        });
        
        return colors.slice(0, steps);
    }
    
    function renderPalette(title, colors) {
        const paletteSection = document.getElementById('paletteSection');
        
        const paletteDiv = document.createElement('div');
        paletteDiv.className = 'palette-category';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'palette-title';
        titleDiv.textContent = title;
        
        const gridDiv = document.createElement('div');
        gridDiv.className = 'color-grid';
        
        colors.forEach((color, index) => {
            const swatchDiv = document.createElement('div');
            swatchDiv.className = 'color-swatch fade-in';
            swatchDiv.style.animationDelay = `${index * 0.05}s`;
            
            const innerDiv = document.createElement('div');
            innerDiv.className = 'color-swatch-inner';
            innerDiv.style.backgroundColor = color.hex;
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'color-info';
            
            const hexDiv = document.createElement('div');
            hexDiv.className = 'color-hex';
            hexDiv.textContent = color.hex;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'color-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'color-action-btn';
            copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                </svg>
            `;
            copyBtn.title = 'Copy to clipboard';
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyColor(color.hex, copyBtn);
            });
            
            actionsDiv.appendChild(copyBtn);
            infoDiv.appendChild(hexDiv);
            infoDiv.appendChild(actionsDiv);
            
            swatchDiv.appendChild(innerDiv);
            swatchDiv.appendChild(infoDiv);
            
            // Make the whole swatch clickable to copy
            swatchDiv.addEventListener('click', () => {
                copyColor(color.hex, copyBtn);
            });
            
            gridDiv.appendChild(swatchDiv);
        });
        
        paletteDiv.appendChild(titleDiv);
        paletteDiv.appendChild(gridDiv);
        paletteSection.appendChild(paletteDiv);
    }
    
    function copyColor(color, button) {
        vscode.postMessage({
            command: 'copyToClipboard',
            value: color
        });
        
        // Visual feedback
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 2000);
    }
    
    // Color conversion functions
    function hexToHsl(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse RGB values
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }
    
    function hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) {
                t += 1;
            }
            if (t > 1) {
                t -= 1;
            }
            if (t < 1/6) {
                return p + (q - p) * 6 * t;
            }
            if (t < 1/2) {
                return q;
            }
            if (t < 2/3) {
                return p + (q - p) * (2/3 - t) * 6;
            }
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
    
    function clearAll() {
        baseColor = '#0f85fa';
        colorSteps = 12;
        
        document.getElementById('baseColorPicker').value = baseColor;
        document.getElementById('baseColorText').value = baseColor;
        document.getElementById('colorSteps').value = colorSteps;
        document.getElementById('stepsValue').textContent = colorSteps;
        
        generateAllPalettes();
    }
    
    function trackAction(action, data = {}) {
        vscode.postMessage({
            command: 'trackAction',
            action: action,
            data: data
        });
    }
})();
