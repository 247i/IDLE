class GradientMaker {
    constructor() {
        this.stops = [
            { color: '#00bfff', position: 0 },
            { color: '#3f5efb', position: 100 }
        ];
        this.angle = 90;
        this.type = 'linear';
        this.activeStop = 0;
        this.currentTab = 'css';
        this.isDragging = false;
        
        // Cache VS Code API instance
        this.vscode = null;
        if (window.acquireVsCodeApi) {
            this.vscode = window.acquireVsCodeApi();
        }
        
        this.initializeElements();
        this.bindEvents();
        this.render();
    }

    initializeElements() {
        this.gradientBar = document.getElementById('gradientBar');
        this.gradientPreview = document.getElementById('gradientPreview');
        this.gradientType = document.getElementById('gradientType');
        this.angleCircle = document.getElementById('angleCircle');
        this.angleHandle = document.getElementById('angleHandle');
        this.angleValue = document.getElementById('angleValue');
        this.colorStops = document.getElementById('colorStops');
        this.codeOutput = document.getElementById('codeOutput');
        this.copyBtn = document.getElementById('copyBtn');
    }

    bindEvents() {
        // Gradient bar click to add stops
        this.gradientBar.addEventListener('click', (e) => this.addStop(e));
        
        // Gradient type change
        this.gradientType.addEventListener('change', (e) => {
            this.type = e.target.value;
            this.render();
        });

        // Angle control
        this.angleCircle.addEventListener('mousedown', (e) => this.startAngleDrag(e));

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTab = e.target.dataset.tab;
                this.updateOutput();
            });
        });

        // Copy button
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    addStop(e) {
        if (this.isDragging) {
            return; // Don't add stops while dragging
        }
        
        const rect = this.gradientBar.getBoundingClientRect();
        const position = ((e.clientX - rect.left) / rect.width) * 100;
        const color = this.interpolateColor(position);
        
        this.stops.push({ color, position });
        this.stops.sort((a, b) => a.position - b.position);
        this.activeStop = this.stops.findIndex(stop => stop.position === position);
        this.render();
    }

    interpolateColor(position) {
        // Find the two closest stops
        let before = this.stops[0];
        let after = this.stops[this.stops.length - 1];
        
        for (let i = 0; i < this.stops.length - 1; i++) {
            if (this.stops[i].position <= position && this.stops[i + 1].position >= position) {
                before = this.stops[i];
                after = this.stops[i + 1];
                break;
            }
        }

        if (before.position === after.position) {
            return before.color;
        }

        const ratio = (position - before.position) / (after.position - before.position);
        return this.blendColors(before.color, after.color, ratio);
    }

    blendColors(color1, color2, ratio) {
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    startAngleDrag(e) {
        e.preventDefault();
        const rect = this.angleCircle.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseMoveHandler = (e) => {
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            this.angle = ((angle * 180 / Math.PI) + 90 + 360) % 360;
            this.render();
        };

        const mouseUpHandler = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    render() {
        this.renderGradientBar();
        this.renderPreview();
        this.renderColorStops();
        this.renderAngle();
        this.updateOutput();
    }

    renderGradientBar() {
        const gradient = this.generateCSS();
        this.gradientBar.style.background = gradient;
        
        // Clear existing stops
        this.gradientBar.querySelectorAll('.color-stop').forEach(stop => stop.remove());
        
        // Add color stops
        this.stops.forEach((stop, index) => {
            const stopElement = document.createElement('div');
            stopElement.className = `color-stop ${index === this.activeStop ? 'active' : ''}`;
            stopElement.style.left = `${stop.position}%`;
            stopElement.style.backgroundColor = stop.color;
            
            stopElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activeStop = index;
                this.render();
            });

            // Add drag functionality
            stopElement.addEventListener('mousedown', (e) => {
                if (e.button !== 0) {
                    return; // Only left mouse button
                }
                e.preventDefault();
                e.stopPropagation();
                
                this.activeStop = index;
                this.isDragging = true;
                stopElement.classList.add('dragging');
                
                const rect = this.gradientBar.getBoundingClientRect();
                
                const mouseMoveHandler = (e) => {
                    const newPosition = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                    this.stops[index].position = newPosition;
                    this.renderGradientBar();
                    this.renderPreview();
                    this.renderColorStops();
                    this.updateOutput();
                };
                
                const mouseUpHandler = () => {
                    this.isDragging = false;
                    stopElement.classList.remove('dragging');
                    this.stops.sort((a, b) => a.position - b.position);
                    this.activeStop = this.stops.findIndex(stop => stop.position === this.stops[index].position);
                    this.render();
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                };
                
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            });
            
            this.gradientBar.appendChild(stopElement);
        });
    }

    renderPreview() {
        const gradient = this.generateCSS();
        this.gradientPreview.style.background = gradient;
    }

    renderColorStops() {
        this.colorStops.innerHTML = '';
        
        this.stops.forEach((stop, index) => {
            const stopElement = document.createElement('div');
            stopElement.className = 'color-stop-item';
            
            stopElement.innerHTML = `
                <div class="color-preview" style="background-color: ${stop.color}"></div>
                <input type="text" class="color-hex" value="${stop.color}">
                <div class="number-input-container">
                    <input type="number" class="number-input" value="${Math.round(stop.position)}" min="0" max="100">
                    <div class="number-controls">
                        <button class="number-btn up" type="button">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 9l6 6l6 -6" />
                            </svg>
                        </button>
                        <button class="number-btn down" type="button">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 9l6 6l6 -6" />
                            </svg>
                        </button>
                    </div>
                </div>
                ${this.stops.length > 2 ? `<button class="delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6l-12 12" />
                        <path d="M6 6l12 12" />
                    </svg>
                </button>` : ''}
            `;
            
            const colorInput = stopElement.querySelector('.color-hex');
            const positionInput = stopElement.querySelector('.number-input');
            const colorPreview = stopElement.querySelector('.color-preview');
            const deleteBtn = stopElement.querySelector('.delete-btn');
            const upBtn = stopElement.querySelector('.number-btn.up');
            const downBtn = stopElement.querySelector('.number-btn.down');
            
            colorInput.addEventListener('input', (e) => {
                this.stops[index].color = e.target.value;
                this.render();
            });
            
            positionInput.addEventListener('input', (e) => {
                this.stops[index].position = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                this.stops.sort((a, b) => a.position - b.position);
                this.render();
            });

            upBtn.addEventListener('click', () => {
                const newValue = Math.min(100, this.stops[index].position + 1);
                this.stops[index].position = newValue;
                this.stops.sort((a, b) => a.position - b.position);
                this.render();
            });

            downBtn.addEventListener('click', () => {
                const newValue = Math.max(0, this.stops[index].position - 1);
                this.stops[index].position = newValue;
                this.stops.sort((a, b) => a.position - b.position);
                this.render();
            });
            
            colorPreview.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = stop.color;
                input.addEventListener('change', (e) => {
                    this.stops[index].color = e.target.value;
                    this.render();
                });
                input.click();
            });
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.stops.splice(index, 1);
                    this.activeStop = Math.min(this.activeStop, this.stops.length - 1);
                    this.render();
                });
            }
            
            this.colorStops.appendChild(stopElement);
        });
    }

    renderAngle() {
        const radians = (this.angle - 90) * Math.PI / 180;
        const x = Math.cos(radians) * 32 + 32;
        const y = Math.sin(radians) * 32 + 32;
        
        this.angleHandle.style.left = `${x}px`;
        this.angleHandle.style.top = `${y}px`;
        this.angleValue.textContent = `${Math.round(this.angle)}°`;
    }

    generateCSS() {
        const stopStrings = this.stops.map(stop => `${stop.color} ${stop.position}%`).join(', ');
        
        switch (this.type) {
            case 'linear':
                return `linear-gradient(${this.angle}deg, ${stopStrings})`;
            case 'radial':
                return `radial-gradient(circle, ${stopStrings})`;
            case 'conic':
                return `conic-gradient(from ${this.angle}deg, ${stopStrings})`;
            default:
                return `linear-gradient(${this.angle}deg, ${stopStrings})`;
        }
    }

    updateOutput() {
        const css = this.generateCSS();
        
        if (this.currentTab === 'css') {
            this.codeOutput.textContent = `background: ${css};`;
        } else if (this.currentTab === 'hex') {
            const hexValues = this.stops.map(stop => stop.color).join(', ');
            this.codeOutput.textContent = hexValues;
        }
    }

    async copyToClipboard() {
        const text = this.codeOutput.textContent;
        
        // Send message to extension to copy to clipboard
        if (this.vscode) {
            this.vscode.postMessage({
                command: 'copyToClipboard',
                value: text
            });
        } else {
            // Fallback for demo
            try {
                await navigator.clipboard.writeText(text);
                this.copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    this.copyBtn.textContent = 'Copy to Clipboard';
                }, 2000);
            } catch (error) {
                console.warn('Could not copy to clipboard:', error);
            }
        }
        
        this.copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            this.copyBtn.textContent = 'Copy to Clipboard';
        }, 2000);
    }

    trackAction(action, data = {}) {
        if (this.vscode) {
            this.vscode.postMessage({
                command: 'trackAction',
                action: action,
                data: data
            });
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new GradientMaker();
});
