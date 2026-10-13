// Color Convertor JavaScript
(function() {
    const vscode = acquireVsCodeApi();
    
    // Color state
    let currentColor = {
        h: 210,
        s: 96,
        l: 52,
        a: 1
    };
    
    let isDragging = false;
    let dragType = null;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeColorPicker();
        setupEventListeners();
        updateAllFormats();
    });
    
    function initializeColorPicker() {
        drawSaturationCanvas();
        updateHandlePositions();
    }
    
    function setupEventListeners() {
        // Clear button
        document.getElementById('clearBtn').addEventListener('click', clearAll);
        
        // Color picker interactions
        setupSaturationPicker();
        setupHueSlider();
        setupAlphaSlider();
        
        // Format inputs
        setupFormatInputs();
        
        // Copy buttons
        setupCopyButtons();
        
        // Mouse events for dragging
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseleave', handleMouseUp);
    }
    
    function setupSaturationPicker() {
        const picker = document.getElementById('saturationPicker');
        const canvas = document.getElementById('saturationCanvas');
        
        picker.addEventListener('mousedown', function(e) {
            isDragging = true;
            dragType = 'saturation';
            handleSaturationClick(e);
        });
        
        function handleSaturationClick(e) {
            const rect = picker.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            
            const s = (x / rect.width) * 100;
            const v = 100 - (y / rect.height) * 100;
            
            // Convert HSV to HSL
            const hsl = hsvToHsl(currentColor.h, s, v);
            currentColor.s = hsl.s;
            currentColor.l = hsl.l;
            
            updateAllFormats();
            updateHandlePositions();
            drawSaturationCanvas();
        }
    }
    
    function setupHueSlider() {
        const slider = document.getElementById('hueSlider');
        
        slider.addEventListener('mousedown', function(e) {
            isDragging = true;
            dragType = 'hue';
            handleHueClick(e);
        });
        
        function handleHueClick(e) {
            const rect = slider.getBoundingClientRect();
            const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            const hue = (y / rect.height) * 360;
            
            currentColor.h = hue;
            
            updateAllFormats();
            updateHandlePositions();
            drawSaturationCanvas();
        }
    }
    
    function setupAlphaSlider() {
        const slider = document.getElementById('alphaSlider');
        
        slider.addEventListener('mousedown', function(e) {
            isDragging = true;
            dragType = 'alpha';
            handleAlphaClick(e);
        });
        
        function handleAlphaClick(e) {
            const rect = slider.getBoundingClientRect();
            const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            const alpha = 1 - (y / rect.height);
            
            currentColor.a = Math.max(0, Math.min(1, alpha));
            
            updateAllFormats();
            updateHandlePositions();
            updateAlphaSliderBackground();
        }
    }
    
    function handleMouseMove(e) {
        if (!isDragging) return;
        
        switch (dragType) {
            case 'saturation':
                setupSaturationPicker().handleSaturationClick?.(e) || handleSaturationMove(e);
                break;
            case 'hue':
                setupHueSlider().handleHueClick?.(e) || handleHueMove(e);
                break;
            case 'alpha':
                setupAlphaSlider().handleAlphaClick?.(e) || handleAlphaMove(e);
                break;
        }
    }
    
    function handleSaturationMove(e) {
        const picker = document.getElementById('saturationPicker');
        const rect = picker.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        
        const s = (x / rect.width) * 100;
        const v = 100 - (y / rect.height) * 100;
        
        const hsl = hsvToHsl(currentColor.h, s, v);
        currentColor.s = hsl.s;
        currentColor.l = hsl.l;
        
        updateAllFormats();
        updateHandlePositions();
    }
    
    function handleHueMove(e) {
        const slider = document.getElementById('hueSlider');
        const rect = slider.getBoundingClientRect();
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const hue = (y / rect.height) * 360;
        
        currentColor.h = hue;
        
        updateAllFormats();
        updateHandlePositions();
        drawSaturationCanvas();
    }
    
    function handleAlphaMove(e) {
        const slider = document.getElementById('alphaSlider');
        const rect = slider.getBoundingClientRect();
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const alpha = 1 - (y / rect.height);
        
        currentColor.a = Math.max(0, Math.min(1, alpha));
        
        updateAllFormats();
        updateHandlePositions();
        updateAlphaSliderBackground();
    }
    
    function handleMouseUp() {
        isDragging = false;
        dragType = null;
    }
    
    function setupFormatInputs() {
        const inputs = ['hexInput', 'rgbInput', 'hslInput', 'hwbInput', 'cmykInput', 'lchInput', 'nameInput'];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', function() {
                    handleFormatInput(inputId, this.value);
                });
                
                input.addEventListener('focus', function() {
                    this.select();
                });
            }
        });
    }
    
    function setupCopyButtons() {
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', function() {
                const format = this.getAttribute('data-format');
                copyToClipboard(format, this);
            });
        });
    }
    
    function handleFormatInput(inputId, value) {
        try {
            const format = inputId.replace('Input', '');
            let newColor = null;
            
            switch (format) {
                case 'hex':
                    newColor = parseHex(value);
                    break;
                case 'rgb':
                    newColor = parseRgb(value);
                    break;
                case 'hsl':
                    newColor = parseHsl(value);
                    break;
                case 'hwb':
                    newColor = parseHwb(value);
                    break;
                case 'cmyk':
                    newColor = parseCmyk(value);
                    break;
                case 'lch':
                    newColor = parseLch(value);
                    break;
                case 'name':
                    newColor = parseName(value);
                    break;
            }
            
            if (newColor) {
                currentColor = newColor;
                updateAllFormats();
                updateHandlePositions();
                drawSaturationCanvas();
                updateAlphaSliderBackground();
                clearError(inputId);
            }
        } catch (error) {
            showError(inputId, 'Invalid format');
        }
    }
    
    // Color parsing functions
    function parseHex(hex) {
        if (!hex.startsWith('#')) hex = '#' + hex;
        
        const match = hex.match(/^#([0-9a-f]{3,8})$/i);
        if (!match) throw new Error('Invalid hex');
        
        let colors = match[1];
        
        // Expand shorthand
        if (colors.length === 3) {
            colors = colors[0] + colors[0] + colors[1] + colors[1] + colors[2] + colors[2];
        } else if (colors.length === 4) {
            colors = colors[0] + colors[0] + colors[1] + colors[1] + colors[2] + colors[2] + colors[3] + colors[3];
        }
        
        const r = parseInt(colors.substr(0, 2), 16) / 255;
        const g = parseInt(colors.substr(2, 2), 16) / 255;
        const b = parseInt(colors.substr(4, 2), 16) / 255;
        const a = colors.length === 8 ? parseInt(colors.substr(6, 2), 16) / 255 : 1;
        
        return rgbToHsl(r * 255, g * 255, b * 255, a);
    }
    
    function parseRgb(rgb) {
        const match = rgb.match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/);
        if (!match) throw new Error('Invalid RGB');
        
        const r = parseFloat(match[1]);
        const g = parseFloat(match[2]);
        const b = parseFloat(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;
        
        return rgbToHsl(r, g, b, a);
    }
    
    function parseHsl(hsl) {
        const match = hsl.match(/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/);
        if (!match) throw new Error('Invalid HSL');
        
        return {
            h: parseFloat(match[1]),
            s: parseFloat(match[2]),
            l: parseFloat(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1
        };
    }
    
    function parseHwb(hwb) {
        const match = hwb.match(/hwb\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*\)/);
        if (!match) throw new Error('Invalid HWB');
        
        const h = parseFloat(match[1]);
        const w = parseFloat(match[2]) / 100;
        const bl = parseFloat(match[3]) / 100;
        const a = match[4] ? parseFloat(match[4]) : 1;
        
        // Convert HWB to RGB then to HSL
        const rgb = hwbToRgb(h, w, bl);
        return rgbToHsl(rgb.r * 255, rgb.g * 255, rgb.b * 255, a);
    }
    
    function parseCmyk(cmyk) {
        const match = cmyk.match(/device-cmyk\(\s*(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*\)/);
        if (!match) throw new Error('Invalid CMYK');
        
        const c = parseFloat(match[1]) / 100;
        const m = parseFloat(match[2]) / 100;
        const y = parseFloat(match[3]) / 100;
        const k = parseFloat(match[4]) / 100;
        const a = match[5] ? parseFloat(match[5]) : 1;
        
        // Convert CMYK to RGB then to HSL
        const rgb = cmykToRgb(c, m, y, k);
        return rgbToHsl(rgb.r * 255, rgb.g * 255, rgb.b * 255, a);
    }
    
    function parseLch(lch) {
        // Simplified LCH parsing - would need proper implementation
        throw new Error('LCH parsing not fully implemented');
    }
    
    function parseName(name) {
        // Basic color names
        const colorNames = {
            'red': { h: 0, s: 100, l: 50, a: 1 },
            'green': { h: 120, s: 100, l: 50, a: 1 },
            'blue': { h: 240, s: 100, l: 50, a: 1 },
            'yellow': { h: 60, s: 100, l: 50, a: 1 },
            'cyan': { h: 180, s: 100, l: 50, a: 1 },
            'magenta': { h: 300, s: 100, l: 50, a: 1 },
            'white': { h: 0, s: 0, l: 100, a: 1 },
            'black': { h: 0, s: 0, l: 0, a: 1 },
            'gray': { h: 0, s: 0, l: 50, a: 1 },
            'orange': { h: 30, s: 100, l: 50, a: 1 },
            'purple': { h: 270, s: 100, l: 50, a: 1 },
            'pink': { h: 330, s: 100, l: 75, a: 1 },
            'brown': { h: 30, s: 75, l: 25, a: 1 }
        };
        
        const color = colorNames[name.toLowerCase()];
        if (!color) throw new Error('Unknown color name');
        
        return color;
    }
    
    // Color conversion functions
    function hslToRgb(h, s, l, a = 1) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a
        };
    }
    
    function rgbToHsl(r, g, b, a = 1) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
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
            l: Math.round(l * 100),
            a
        };
    }
    
    function hsvToHsl(h, s, v) {
        s /= 100;
        v /= 100;
        
        const l = v * (1 - s / 2);
        const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
        
        return {
            h,
            s: Math.round(sl * 100),
            l: Math.round(l * 100)
        };
    }
    
    function hslToHsv(h, s, l) {
        s /= 100;
        l /= 100;
        
        const v = l + s * Math.min(l, 1 - l);
        const sv = v === 0 ? 0 : 2 * (1 - l / v);
        
        return {
            h,
            s: Math.round(sv * 100),
            v: Math.round(v * 100)
        };
    }
    
    function hwbToRgb(h, w, b) {
        // Simplified HWB to RGB conversion
        const hsv = { h, s: 100, v: 100 - b * 100 };
        const hsl = hsvToHsl(hsv.h, hsv.s, hsv.v);
        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
        return { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };
    }
    
    function cmykToRgb(c, m, y, k) {
        const r = 255 * (1 - c) * (1 - k);
        const g = 255 * (1 - m) * (1 - k);
        const b = 255 * (1 - y) * (1 - k);
        
        return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    }
    
    function rgbToCmyk(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const k = 1 - Math.max(r, Math.max(g, b));
        const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
        const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
        const y = k === 1 ? 0 : (1 - b - k) / (1 - k);
        
        return {
            c: Math.round(c * 100),
            m: Math.round(m * 100),
            y: Math.round(y * 100),
            k: Math.round(k * 100)
        };
    }
    
    function updateAllFormats() {
        const rgb = hslToRgb(currentColor.h, currentColor.s, currentColor.l, currentColor.a);
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
        const hsv = hslToHsv(currentColor.h, currentColor.s, currentColor.l);
        
        // Update format inputs
        document.getElementById('hexInput').value = rgbToHex(rgb.r, rgb.g, rgb.b, rgb.a);
        document.getElementById('rgbInput').value = formatRgb(rgb);
        document.getElementById('hslInput').value = formatHsl(currentColor);
        document.getElementById('hwbInput').value = formatHwb(currentColor.h, hsv.s, 100 - hsv.v);
        document.getElementById('cmykInput').value = formatCmyk(cmyk);
        document.getElementById('lchInput').value = 'lch(50% 50 200)'; // Placeholder
        
        // Update color name if available
        updateColorName(rgb);
        
        // Update color preview
        updateColorPreview();
    }
    
    function rgbToHex(r, g, b, a = 1) {
        const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
        const hex = '#' + toHex(r) + toHex(g) + toHex(b);
        return a < 1 ? hex + toHex(a * 255) : hex;
    }
    
    function formatRgb(rgb) {
        if (rgb.a < 1) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a.toFixed(2)})`;
        }
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
    
    function formatHsl(hsl) {
        if (hsl.a < 1) {
            return `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, ${hsl.a.toFixed(2)})`;
        }
        return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
    }
    
    function formatHwb(h, w, b) {
        return `hwb(${Math.round(h)} ${Math.round(w)}% ${Math.round(b)}%)`;
    }
    
    function formatCmyk(cmyk) {
        return `device-cmyk(${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%)`;
    }
    
    function updateColorName(rgb) {
        const colorNames = {
            '255,0,0': 'red',
            '0,255,0': 'green', 
            '0,0,255': 'blue',
            '255,255,0': 'yellow',
            '0,255,255': 'cyan',
            '255,0,255': 'magenta',
            '255,255,255': 'white',
            '0,0,0': 'black',
            '128,128,128': 'gray',
            '255,165,0': 'orange',
            '128,0,128': 'purple',
            '255,192,203': 'pink',
            '165,42,42': 'brown'
        };
        
        const key = `${rgb.r},${rgb.g},${rgb.b}`;
        const exactName = colorNames[key];
        
        const nameRow = document.getElementById('nameRow');
        const nameInput = document.getElementById('nameInput');
        const nameBadge = document.getElementById('nameBadge');
        
        if (exactName) {
            nameRow.style.display = 'flex';
            nameInput.value = exactName;
            nameBadge.style.display = 'none';
        } else {
            // Find closest color name
            const closestName = findClosestColorName(rgb);
            if (closestName) {
                nameRow.style.display = 'flex';
                nameInput.value = closestName;
                nameBadge.style.display = 'block';
                nameBadge.textContent = 'APPROX';
            } else {
                nameRow.style.display = 'none';
            }
        }
    }
    
    function findClosestColorName(targetRgb) {
        const namedColors = {
            red: [255, 0, 0],
            green: [0, 255, 0],
            blue: [0, 0, 255],
            yellow: [255, 255, 0],
            cyan: [0, 255, 255],
            magenta: [255, 0, 255],
            white: [255, 255, 255],
            black: [0, 0, 0],
            gray: [128, 128, 128],
            orange: [255, 165, 0],
            purple: [128, 0, 128],
            pink: [255, 192, 203],
            brown: [165, 42, 42]
        };
        
        let closestName = null;
        let minDistance = Infinity;
        
        for (const [name, rgb] of Object.entries(namedColors)) {
            const distance = Math.sqrt(
                Math.pow(targetRgb.r - rgb[0], 2) +
                Math.pow(targetRgb.g - rgb[1], 2) +
                Math.pow(targetRgb.b - rgb[2], 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestName = name;
            }
        }
        
        return minDistance < 100 ? closestName : null;
    }
    
    function updateColorPreview() {
        const rgb = hslToRgb(currentColor.h, currentColor.s, currentColor.l, currentColor.a);
        const colorString = currentColor.a < 1 
            ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentColor.a})`
            : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            
        const swatch = document.getElementById('colorSwatch');
        swatch.style.backgroundColor = colorString;
        swatch.classList.add('updating');
        
        setTimeout(() => swatch.classList.remove('updating'), 300);
    }
    
    function drawSaturationCanvas() {
        const canvas = document.getElementById('saturationCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Create gradient from pure hue to white (horizontal)
        const saturationGradient = ctx.createLinearGradient(0, 0, width, 0);
        saturationGradient.addColorStop(0, `hsl(${currentColor.h}, 0%, 100%)`);
        saturationGradient.addColorStop(1, `hsl(${currentColor.h}, 100%, 50%)`);
        
        // Fill with saturation gradient
        ctx.fillStyle = saturationGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Create gradient from transparent to black (vertical)
        const lightnessGradient = ctx.createLinearGradient(0, 0, 0, height);
        lightnessGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        lightnessGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        
        // Apply lightness gradient
        ctx.fillStyle = lightnessGradient;
        ctx.fillRect(0, 0, width, height);
    }
    
    function updateHandlePositions() {
        // Update saturation handle
        const hsv = hslToHsv(currentColor.h, currentColor.s, currentColor.l);
        const saturationHandle = document.getElementById('saturationHandle');
        const saturationPicker = document.getElementById('saturationPicker');
        const satRect = saturationPicker.getBoundingClientRect();
        
        const x = (hsv.s / 100) * 200; // Canvas width is 200
        const y = ((100 - hsv.v) / 100) * 150; // Canvas height is 150
        
        saturationHandle.style.left = x + 'px';
        saturationHandle.style.top = y + 'px';
        
        // Update hue handle
        const hueHandle = document.getElementById('hueHandle');
        const hueY = (currentColor.h / 360) * 150;
        hueHandle.style.top = hueY + 'px';
        
        // Update alpha handle
        const alphaHandle = document.getElementById('alphaHandle');
        const alphaY = (1 - currentColor.a) * 150;
        alphaHandle.style.top = alphaY + 'px';
    }
    
    function updateAlphaSliderBackground() {
        const alphaSlider = document.getElementById('alphaSlider');
        const rgb = hslToRgb(currentColor.h, currentColor.s, currentColor.l);
        const colorStop = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        
        alphaSlider.style.background = `
            linear-gradient(to bottom, ${colorStop} 0%, transparent 100%),
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%)
        `;
        alphaSlider.style.backgroundSize = 'auto, 8px 8px, 8px 8px, 8px 8px, 8px 8px';
        alphaSlider.style.backgroundPosition = '0 0, 0 0, 0 4px, 4px -4px, -4px 0px';
    }
    
    function copyToClipboard(format, button) {
        let value = '';
        
        switch (format) {
            case 'hex':
                value = document.getElementById('hexInput').value;
                break;
            case 'rgb':
                value = document.getElementById('rgbInput').value;
                break;
            case 'hsl':
                value = document.getElementById('hslInput').value;
                break;
            case 'hwb':
                value = document.getElementById('hwbInput').value;
                break;
            case 'cmyk':
                value = document.getElementById('cmykInput').value;
                break;
            case 'lch':
                value = document.getElementById('lchInput').value;
                break;
            case 'name':
                value = document.getElementById('nameInput').value;
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
        currentColor = { h: 210, s: 96, l: 52, a: 1 };
        updateAllFormats();
        updateHandlePositions();
        drawSaturationCanvas();
        updateAlphaSliderBackground();
    }
    
    function showError(inputId, message) {
        const input = document.getElementById(inputId);
        const row = input.closest('.format-row');
        row.classList.add('has-error');
        
        let errorEl = row.querySelector('.error-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            row.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }
    
    function clearError(inputId) {
        const input = document.getElementById(inputId);
        const row = input.closest('.format-row');
        row.classList.remove('has-error');
        
        const errorEl = row.querySelector('.error-message');
        if (errorEl) {
            errorEl.remove();
        }
    }
})();
