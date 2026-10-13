// Cubic Bezier JavaScript for VS Code Extension
(function() {
    const vscode = acquireVsCodeApi();
    
    let currentBezier = { x1: 0.69, y1: 0.41, x2: 0.42, y2: 1.00 };
    let isDragging = false;
    let activePoint = null;
    let animationDuration = 2.0;

    const presets = {
        linear: { x1: 0.00, y1: 0.00, x2: 1.00, y2: 1.00 },
        ease: { x1: 0.25, y1: 0.10, x2: 0.25, y2: 1.00 },
        'ease-in': { x1: 0.42, y1: 0.00, x2: 1.00, y2: 1.00 },
        'ease-out': { x1: 0.00, y1: 0.00, x2: 0.58, y2: 1.00 },
        'ease-in-out': { x1: 0.42, y1: 0.00, x2: 0.58, y2: 1.00 },
        custom: { x1: 0.69, y1: 0.41, x2: 0.42, y2: 1.00 }
    };

    function init() {
        setupEventListeners();
        updateCurve();
        startAnimation();
    }

    function setupEventListeners() {
        // Input fields
        document.getElementById('x1-input').addEventListener('input', handleInputChange);
        document.getElementById('y1-input').addEventListener('input', handleInputChange);
        document.getElementById('x2-input').addEventListener('input', handleInputChange);
        document.getElementById('y2-input').addEventListener('input', handleInputChange);

        // Custom spinner buttons
        document.querySelectorAll('.spinner-btn').forEach(btn => {
            btn.addEventListener('click', handleSpinnerClick);
        });

        // Duration slider
        document.getElementById('duration-slider').addEventListener('input', handleDurationChange);

        // Copy button
        document.getElementById('copy-btn').addEventListener('click', copyToClipboard);

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
        });

        // SVG drag events
        const svg = document.getElementById('curve-svg');
        const point1 = document.getElementById('control-point-1');
        const point2 = document.getElementById('control-point-2');

        point1.addEventListener('mousedown', (e) => startDrag(e, 1));
        point2.addEventListener('mousedown', (e) => startDrag(e, 2));

        svg.addEventListener('mousemove', handleDrag);
        svg.addEventListener('mouseup', endDrag);
        svg.addEventListener('mouseleave', endDrag);

        // Prevent context menu on drag
        svg.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    function handleInputChange() {
        const x1 = parseFloat(document.getElementById('x1-input').value) || 0;
        const y1 = parseFloat(document.getElementById('y1-input').value) || 0;
        const x2 = parseFloat(document.getElementById('x2-input').value) || 0;
        const y2 = parseFloat(document.getElementById('y2-input').value) || 0;

        currentBezier = { x1, y1, x2, y2 };
        updateCurve();
    }

    function handleSpinnerClick(e) {
        e.preventDefault();
        const inputId = e.currentTarget.getAttribute('data-input');
        const direction = e.currentTarget.getAttribute('data-direction');
        const input = document.getElementById(inputId);
        
        if (!input) {
            return;
        }
        
        const step = parseFloat(input.step) || 0.01;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        let currentValue = parseFloat(input.value) || 0;
        
        if (direction === 'up') {
            currentValue += step;
        } else {
            currentValue -= step;
        }
        
        // Apply constraints
        if (!isNaN(min)) {
            currentValue = Math.max(min, currentValue);
        }
        if (!isNaN(max)) {
            currentValue = Math.min(max, currentValue);
        }
        
        // Round to avoid floating point precision issues
        currentValue = Math.round(currentValue * 100) / 100;
        
        input.value = currentValue.toFixed(2);
        
        // Trigger input change event
        input.dispatchEvent(new Event('input'));
    }

    function handleDurationChange(e) {
        animationDuration = parseFloat(e.target.value);
        document.getElementById('duration-value').textContent = `${animationDuration.toFixed(1)}s`;
        updateAnimationDuration();
    }

    function startDrag(e, pointNumber) {
        e.preventDefault();
        isDragging = true;
        activePoint = pointNumber;
        document.getElementById(`control-point-${pointNumber}`).classList.add('dragging');
    }

    function handleDrag(e) {
        if (!isDragging || !activePoint) {
            return;
        }

        const svg = document.getElementById('curve-svg');
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 300;
        const y = ((e.clientY - rect.top) / rect.height) * 300;

        // Convert SVG coordinates to bezier values (0-1 range)
        let bezierX = Math.max(0, Math.min(1, x / 300));
        let bezierY = (300 - y) / 300; // Flip Y axis

        if (activePoint === 1) {
            currentBezier.x1 = bezierX;
            currentBezier.y1 = bezierY;
        } else {
            currentBezier.x2 = bezierX;
            currentBezier.y2 = bezierY;
        }

        updateInputs();
        updateCurve();
    }

    function endDrag() {
        if (isDragging && activePoint) {
            document.getElementById(`control-point-${activePoint}`).classList.remove('dragging');
            isDragging = false;
            activePoint = null;
        }
    }

    function updateInputs() {
        document.getElementById('x1-input').value = currentBezier.x1.toFixed(2);
        document.getElementById('y1-input').value = currentBezier.y1.toFixed(2);
        document.getElementById('x2-input').value = currentBezier.x2.toFixed(2);
        document.getElementById('y2-input').value = currentBezier.y2.toFixed(2);
    }

    function updateCurve() {
        const { x1, y1, x2, y2 } = currentBezier;

        // Convert bezier values to SVG coordinates
        const svgX1 = x1 * 300;
        const svgY1 = 300 - (y1 * 300);
        const svgX2 = x2 * 300;
        const svgY2 = 300 - (y2 * 300);

        // Update control points
        document.getElementById('control-point-1').setAttribute('cx', svgX1);
        document.getElementById('control-point-1').setAttribute('cy', svgY1);
        document.getElementById('control-point-2').setAttribute('cx', svgX2);
        document.getElementById('control-point-2').setAttribute('cy', svgY2);

        // Update control lines
        document.getElementById('control-line-1').setAttribute('x2', svgX1);
        document.getElementById('control-line-1').setAttribute('y2', svgY1);
        document.getElementById('control-line-2').setAttribute('x1', svgX2);
        document.getElementById('control-line-2').setAttribute('y1', svgY2);

        // Update curve path
        const pathData = `M 0,300 C ${svgX1},${svgY1} ${svgX2},${svgY2} 300,0`;
        document.getElementById('curve-path').setAttribute('d', pathData);

        // Update CSS output
        const cssValue = `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
        document.getElementById('css-output').textContent = cssValue;

        // Update CSS custom properties
        document.documentElement.style.setProperty('--timing-function', cssValue);
        
        // Restart animation with new timing function
        if (window.restartAnimation) {
            window.restartAnimation();
        }
    }

    function updateAnimationDuration() {
        document.documentElement.style.setProperty('--animation-duration', `${animationDuration}s`);
        
        // Restart animation with new duration
        if (window.restartAnimation) {
            window.restartAnimation();
        }
    }

    function applyPreset(presetName) {
        if (presets[presetName]) {
            currentBezier = { ...presets[presetName] };
            updateInputs();
            updateCurve();
        }
    }

    function copyToClipboard() {
        const cssValue = document.getElementById('css-output').textContent;
        
        vscode.postMessage({
            command: 'copyToClipboard',
            value: cssValue
        });
        
        showNotification('Copied to clipboard');
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 2000);
    }

    function startAnimation() {
        const preview = document.getElementById('animation-preview');
        
        // Start the animation immediately
        preview.classList.add('animating');
        
        // Function to restart animation when curve or duration changes
        window.restartAnimation = function() {
            preview.classList.remove('animating');
            // Force reflow
            preview.offsetHeight;
            preview.classList.add('animating');
        };
    }

    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
