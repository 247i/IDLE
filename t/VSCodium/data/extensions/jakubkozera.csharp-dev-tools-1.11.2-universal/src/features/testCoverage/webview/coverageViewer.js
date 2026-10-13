// Coverage data display and visualization
let coverageData = null;
let expandedPackages = new Set();
let hotspotsCurrentPage = 1;
let hotspotsPerPage = 5;
let allHotspots = [];
let hiddenProjects = new Set(); // Track which projects are hidden from chart

/**
 * Get project icon HTML from icon paths
 */
function getProjectIconHtml(iconPaths) {
    if (iconPaths && iconPaths.light && iconPaths.dark) {
        return `
            <img src="${iconPaths.light}" alt="project icon" class="project-icon-light" style="width: 16px; height: 16px;" />
            <img src="${iconPaths.dark}" alt="project icon" class="project-icon-dark" style="width: 16px; height: 16px;" />
        `;
    }
    // Fallback: no icon
    return '';
}

function displayCoverageData(data) {
    coverageData = data;
    
    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    // Update summary cards
    updateSummaryCards(data);
    
    // Create charts
    createCharts(data);
    
    // Display hot spots
    displayHotSpots(data);
    
    // Display coverage table
    displayCoverageTable(data);
}

function updateSummaryCards(data) {
    const lineCoveragePercent = (data.lineRate * 100).toFixed(1);
    const branchCoveragePercent = (data.branchRate * 100).toFixed(1);
    
    // Calculate method coverage
    let totalMethods = 0;
    let coveredMethods = 0;
    let fullyCoveredMethods = 0;
    
    data.packages.forEach(pkg => {
        pkg.classes.forEach(cls => {
            cls.methods.forEach(method => {
                totalMethods++;
                const methodHasHits = method.lines.some(line => line.hits > 0);
                const methodFullyCovered = method.lines.every(line => line.hits > 0);
                
                if (methodHasHits) {
                    coveredMethods++;
                }
                if (methodFullyCovered) {
                    fullyCoveredMethods++;
                }
            });
        });
    });
    
    const methodCoveragePercent = totalMethods > 0 ? ((coveredMethods / totalMethods) * 100).toFixed(1) : 0;
    const methodRate = totalMethods > 0 ? coveredMethods / totalMethods : 0;
    
    // Update Line Coverage
    document.getElementById('lineCoverage').textContent = `${lineCoveragePercent}%`;
    document.getElementById('lineDetails').textContent = `${data.linesCovered}/${data.linesValid}`;
    document.getElementById('coveredLines').textContent = data.linesCovered;
    document.getElementById('totalLines').textContent = data.linesValid;
    document.getElementById('linePercent').textContent = `${lineCoveragePercent}%`;
    
    // Update Branch Coverage
    document.getElementById('branchCoverage').textContent = `${branchCoveragePercent}%`;
    document.getElementById('branchDetails').textContent = `${data.branchesCovered}/${data.branchesValid}`;
    document.getElementById('coveredBranches').textContent = data.branchesCovered;
    document.getElementById('totalBranches').textContent = data.branchesValid;
    document.getElementById('branchPercent').textContent = `${branchCoveragePercent}%`;
    
    // Update Method Coverage
    document.getElementById('methodCoverage').textContent = `${methodCoveragePercent}%`;
    document.getElementById('methodDetails').textContent = `${coveredMethods}/${totalMethods}`;
    document.getElementById('coveredMethods').textContent = coveredMethods;
    document.getElementById('fullyCoveredMethods').textContent = fullyCoveredMethods;
    document.getElementById('totalMethods').textContent = totalMethods;
    
    // Draw circular progress indicators
    drawCircularProgress('lineCircle', data.lineRate);
    drawCircularProgress('branchCircle', data.branchRate);
    drawCircularProgress('methodCircle', methodRate);
    
    // Apply color coding
    applyCoverageColor('lineCoverage', data.lineRate);
    applyCoverageColor('branchCoverage', data.branchRate);
    applyCoverageColor('methodCoverage', methodRate);
}

function drawCircularProgress(canvasId, rate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 60;
    const lineWidth = 12;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--vscode-editorWidget-background') || '#2d3139';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    
    // Draw progress arc
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (2 * Math.PI * rate);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    
    // Color based on coverage percentage
    const percentage = rate * 100;
    let color;
    if (percentage >= 80) {
        color = getComputedStyle(document.documentElement).getPropertyValue('--color-success') || '#4ade80'; // green
    } else if (percentage >= 60) {
        color = getComputedStyle(document.documentElement).getPropertyValue('--color-warning') || '#d4a373'; // orange
    } else {
        color = getComputedStyle(document.documentElement).getPropertyValue('--color-error') || '#ef4444'; // red
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function applyCoverageColor(elementId, rate) {
    const element = document.getElementById(elementId);
    const percentage = rate * 100;
    
    element.classList.remove('coverage-good', 'coverage-medium', 'coverage-poor');
    
    if (percentage >= 80) {
        element.classList.add('coverage-good');
    } else if (percentage >= 60) {
        element.classList.add('coverage-medium');
    } else {
        element.classList.add('coverage-poor');
    }
}

function createCharts(data) {
    // Calculate stats for each package
    const packageData = data.packages.map(pkg => {
        // Calculate method coverage for this package
        let totalMethods = 0;
        let coveredMethods = 0;
        
        pkg.classes.forEach(cls => {
            cls.methods.forEach(method => {
                totalMethods++;
                if (method.lines.some(line => line.hits > 0)) {
                    coveredMethods++;
                }
            });
        });
        
        const methodCoverage = totalMethods > 0 ? ((coveredMethods / totalMethods) * 100).toFixed(1) : 0;
        
        return {
            name: pkg.name.split('.').pop(),
            fullName: pkg.name,
            projectType: pkg.projectType || 'csharp',
            iconPaths: pkg.iconPaths || null,
            lineCoverage: (pkg.lineRate * 100).toFixed(1),
            branchCoverage: (pkg.branchRate * 100).toFixed(1),
            methodCoverage: methodCoverage,
            linesCovered: pkg.classes.reduce((sum, cls) => sum + cls.lines.filter(l => l.hits > 0).length, 0),
            linesValid: pkg.classes.reduce((sum, cls) => sum + cls.lines.length, 0),
            branchesCovered: pkg.branchesCovered || 0,
            branchesValid: pkg.branchesValid || 0,
            methodsCovered: coveredMethods,
            methodsTotal: totalMethods
        };
    });
    
    // Create project visibility controls
    createProjectVisibilityControls(packageData);
    
    // Create Chart.js bar chart
    createBarChart('packageChart', packageData);
}

let packageChartInstance = null;

function createProjectVisibilityControls(packageData) {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) {
        return;
    }
    
    // Remove existing controls if present
    const existing = chartContainer.querySelector('.project-visibility-controls');
    if (existing) {
        existing.remove();
    }
    
    // Create controls container
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'project-visibility-controls';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'visibility-header';
    header.innerHTML = `
        <span class="visibility-label">Show/Hide Projects:</span>
        <div class="visibility-actions">
            <button class="visibility-btn" id="showAllProjects">Show All</button>
            <button class="visibility-btn" id="hideAllProjects">Hide All</button>
        </div>
    `;
    controlsDiv.appendChild(header);
    
    // Create checkboxes container
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'project-checkboxes';
    
    packageData.forEach(pkg => {
        const checkbox = document.createElement('label');
        checkbox.className = 'project-checkbox';
        const isHidden = hiddenProjects.has(pkg.fullName);
        const iconHtml = getProjectIconHtml(pkg.iconPaths);
        
        checkbox.innerHTML = `
            <input type="checkbox" 
                   value="${escapeHtml(pkg.fullName)}" 
                   ${!isHidden ? 'checked' : ''}>
            ${iconHtml}
            <span class="project-checkbox-label" title="${escapeHtml(pkg.fullName)}">${escapeHtml(pkg.fullName)}</span>
        `;
        
        const input = checkbox.querySelector('input');
        input.addEventListener('change', () => {
            if (input.checked) {
                hiddenProjects.delete(pkg.fullName);
            } else {
                hiddenProjects.add(pkg.fullName);
            }
            updateChart();
        });
        
        checkboxContainer.appendChild(checkbox);
    });
    
    controlsDiv.appendChild(checkboxContainer);
    
    // Insert after the canvas
    const canvas = chartContainer.querySelector('canvas');
    canvas.parentNode.insertBefore(controlsDiv, canvas.nextSibling);
    
    // Add event listeners for show/hide all buttons
    document.getElementById('showAllProjects')?.addEventListener('click', () => {
        hiddenProjects.clear();
        checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
        updateChart();
    });
    
    document.getElementById('hideAllProjects')?.addEventListener('click', () => {
        packageData.forEach(pkg => hiddenProjects.add(pkg.fullName));
        checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        updateChart();
    });
}

function updateChart() {
    if (coverageData) {
        createCharts(coverageData);
    }
}

function createBarChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (packageChartInstance) {
        packageChartInstance.destroy();
    }
    
    // Filter data based on hidden projects
    const visibleData = data.filter(item => !hiddenProjects.has(item.fullName));
    
    // If no projects are visible, show a message
    if (visibleData.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#a0a0a0';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No projects selected. Please select at least one project to display.', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Prepare data for Chart.js
    const labels = visibleData.map(item => item.fullName);
    const lineCoverageData = visibleData.map(item => parseFloat(item.lineCoverage));
    const branchCoverageData = visibleData.map(item => parseFloat(item.branchCoverage));
    const methodCoverageData = visibleData.map(item => parseFloat(item.methodCoverage));
    
    // Create Chart.js chart
    packageChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Line Coverage',
                    data: lineCoverageData,
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-success') + 'cc' || 'rgba(78, 201, 176, 0.8)',
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-success') || 'rgba(78, 201, 176, 1)',
                    borderWidth: 0,
                    packageData: visibleData // Store full data for tooltips
                },
                {
                    label: 'Branch Coverage',
                    data: branchCoverageData,
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-warning') + 'cc' || 'rgba(206, 145, 120, 0.8)',
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-warning') || 'rgba(206, 145, 120, 1)',
                    borderWidth: 0,
                    packageData: visibleData
                },
                {
                    label: 'Method Coverage',
                    data: methodCoverageData,
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-info') + 'cc' || 'rgba(139, 92, 246, 0.8)',
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-info') || 'rgba(139, 92, 246, 1)',
                    borderWidth: 0,
                    packageData: visibleData
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#a0a0a0',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--vscode-panel-border') + '1a' || 'rgba(128, 128, 128, 0.1)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#a0a0a0',
                        font: {
                            size: 11
                        },
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                        padding: 20 // Add padding for icon space
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#ffffff',
                        usePointStyle: true,
                        pointStyle: 'rect',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    enabled: false, // Disable default tooltip
                    external: function(context) {
                        // Custom tooltip
                        const tooltipEl = getOrCreateTooltip();
                        
                        // Hide if no tooltip
                        const tooltipModel = context.tooltip;
                        if (tooltipModel.opacity === 0) {
                            tooltipEl.style.display = 'none';
                            return;
                        }
                        
                        // Set content
                        if (tooltipModel.body) {
                            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
                            const packageInfo = visibleData[dataIndex];
                            const iconHtml = getProjectIconHtml(packageInfo.iconPaths);
                            
                            tooltipEl.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    ${iconHtml}
                                    <strong>${packageInfo.fullName}</strong>
                                </div>
                                <div style="margin-left: ${iconHtml ? '24px' : '0'};">
                                    <div>Line: ${packageInfo.lineCoverage}% (${packageInfo.linesCovered}/${packageInfo.linesValid})</div>
                                    <div>Branch: ${packageInfo.branchCoverage}% (${packageInfo.branchesCovered}/${packageInfo.branchesValid})</div>
                                    <div>Method: ${packageInfo.methodCoverage}% (${packageInfo.methodsCovered}/${packageInfo.methodsTotal})</div>
                                </div>
                            `;
                        }
                        
                        const position = context.chart.canvas.getBoundingClientRect();
                        
                        // Display, position, and set styles
                        tooltipEl.style.display = 'block';
                        tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 10 + 'px';
                        tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 10 + 'px';
                    }
                }
            },
            barPercentage: 0.7,
            categoryPercentage: 0.8
        }
    });
}

function getOrCreateTooltip() {
    let tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.background = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary') || '#252526';
        tooltip.style.border = '1px solid ' + (getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#454545');
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '1000';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

/**
 * Add HTML icon overlays to Chart.js x-axis labels
 */


function createPieChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 300 * 2;
    ctx.scale(2, 2);
    
    const width = canvas.offsetWidth;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate total
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
        return;
    }
    
    // Draw slices
    let currentAngle = -Math.PI / 2;
    
    data.forEach(item => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        
        ctx.fillStyle = item.color;
        ctx.fill();
        
        // Draw label with better visibility
        if (sliceAngle > 0.1) { // Only show if slice is big enough
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const percentage = ((item.value / total) * 100).toFixed(1);
            ctx.fillText(`${percentage}%`, labelX, labelY);
        }
        
        currentAngle += sliceAngle;
    });
    
    // Draw legend
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#fff';
    let legendY = 20;
    data.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(20, legendY, 15, 15);
        ctx.fillStyle = textColor;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.name}: ${item.value}`, 40, legendY + 12);
        legendY += 25;
    });
}

function displayHotSpots(data) {
    const hotspots = calculateHotSpots(data);
    allHotspots = hotspots;
    hotspotsCurrentPage = 1;
    
    renderHotspotsPage();
    setupHotspotsPagination();
}

function renderHotspotsPage() {
    const container = document.getElementById('hotspots');
    const paginationDiv = document.getElementById('hotspotsPagination');
    
    if (allHotspots.length === 0) {
        container.innerHTML = '<div class="no-data">No risk hotspots found - good job!</div>';
        paginationDiv.style.display = 'none';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(allHotspots.length / hotspotsPerPage);
    const startIndex = (hotspotsCurrentPage - 1) * hotspotsPerPage;
    const endIndex = Math.min(startIndex + hotspotsPerPage, allHotspots.length);
    const pageHotspots = allHotspots.slice(startIndex, endIndex);
    
    // Create table header
    let html = `
        <table class="hotspots-table">
            <thead>
                <tr>
                    <th class="text-left">Class</th>
                    <th class="text-right">Methods</th>
                    <th class="text-right">Complexity</th>
                    <th class="text-right">Line Coverage</th>
                    <th class="text-right">Branch Coverage</th>
                    <th class="text-right">CRAP Index</th>
                    <th class="text-right">Risk</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add rows for each hotspot on current page
    pageHotspots.forEach(hotspot => {
        const risk = getRiskLevel(hotspot.crapIndex);
        const lineCoverage = (hotspot.lineRate * 100).toFixed(1);
        const branchCoverage = (hotspot.branchRate * 100).toFixed(1);
        
        html += `
            <tr class="hotspot-row" data-filepath="${escapeHtml(hotspot.filePath)}" data-linenumber="${hotspot.lineNumber}">
                <td class="text-left hotspot-name">
                    <div class="class-info">
                        <div class="class-name-display">${escapeHtml(hotspot.displayName)}</div>
                        <div class="package-info">${escapeHtml(hotspot.packageName)}</div>
                    </div>
                </td>
                <td class="text-right">${hotspot.methodCount}</td>
                <td class="text-right">${hotspot.complexity}</td>
                <td class="text-right">
                    <span class="coverage-badge coverage-${getCoverageLevel(lineCoverage)}">${lineCoverage}%</span>
                    <span class="coverage-details">(${hotspot.linesCovered}/${hotspot.linesValid})</span>
                </td>
                <td class="text-right">
                    <span class="coverage-badge coverage-${getCoverageLevel(branchCoverage)}">${branchCoverage}%</span>
                    <span class="coverage-details">(${hotspot.branchesCovered}/${hotspot.branchesValid})</span>
                </td>
                <td class="text-right">
                    <strong>${hotspot.crapIndex.toFixed(2)}</strong>
                </td>
                <td class="text-right">
                    <span class="risk-badge risk-${risk.level}">${risk.label}</span>
                </td>
                <td class="text-center">
                    <button class="btn-create-test" data-filepath="${escapeHtml(hotspot.filePath)}" title="Create tests for this class">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 8.04l-12.122 12.124a2.857 2.857 0 1 1 -4.041 -4.04l12.122 -12.124" />
                            <path d="M7 13h8" />
                            <path d="M19 15l1.5 1.6a2 2 0 1 1 -3 0l1.5 -1.6z" />
                            <path d="M15 3l6 6" />
                        </svg>
                        Create Test
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Add click event listeners to hotspot rows
    const hotspotRows = container.querySelectorAll('.hotspot-row');
    hotspotRows.forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't navigate if clicking on the create test button
            if (e.target.closest('.btn-create-test')) {
                return;
            }
            const filePath = row.getAttribute('data-filepath');
            const lineNumber = parseInt(row.getAttribute('data-linenumber'), 10);
            if (filePath && lineNumber) {
                openMethod(filePath, lineNumber);
            }
        });
    });
    
    // Add click event listeners to create test buttons
    const createTestButtons = container.querySelectorAll('.btn-create-test');
    createTestButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row click
            const filePath = button.getAttribute('data-filepath');
            if (filePath) {
                vscode.postMessage({
                    type: 'createTest',
                    filePath: filePath
                });
            }
        });
    });
    
    // Update pagination info
    const paginationInfo = document.getElementById('hotspotsPaginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Page ${hotspotsCurrentPage} of ${totalPages} (${allHotspots.length} total)`;
    }
    
    // Show/hide pagination
    if (totalPages > 1) {
        paginationDiv.style.display = 'flex';
        
        // Enable/disable buttons
        const prevBtn = document.getElementById('hotspotsPrevBtn');
        const nextBtn = document.getElementById('hotspotsNextBtn');
        
        if (prevBtn) {
            prevBtn.disabled = hotspotsCurrentPage === 1;
        }
        if (nextBtn) {
            nextBtn.disabled = hotspotsCurrentPage === totalPages;
        }
    } else {
        paginationDiv.style.display = 'none';
    }
}

function setupHotspotsPagination() {
    const prevBtn = document.getElementById('hotspotsPrevBtn');
    const nextBtn = document.getElementById('hotspotsNextBtn');
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (hotspotsCurrentPage > 1) {
                hotspotsCurrentPage--;
                renderHotspotsPage();
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            const totalPages = Math.ceil(allHotspots.length / hotspotsPerPage);
            if (hotspotsCurrentPage < totalPages) {
                hotspotsCurrentPage++;
                renderHotspotsPage();
            }
        };
    }
}

function getCoverageLevel(percentage) {
    if (percentage >= 80) {
        return 'good';
    }
    if (percentage >= 60) {
        return 'medium';
    }
    return 'poor';
}

function isPropertyAccessor(methodName) {
    // Property accessors in C# coverage reports are named as get_PropertyName or set_PropertyName
    return methodName.startsWith('get_') || methodName.startsWith('set_');
}

function calculateHotSpots(data) {
    const allClasses = [];
    
    data.packages.forEach(pkg => {
        pkg.classes.forEach(cls => {
            // Class complexity is already calculated excluding property accessors in TypeScript
            // Use the pre-calculated complexity value from the backend
            const complexity = cls.complexity || 0;
            
            // Count only real methods (non-property accessors)
            let realMethodCount = 0;
            if (cls.methods) {
                cls.methods.forEach(method => {
                    if (!isPropertyAccessor(method.name)) {
                        realMethodCount++;
                    }
                });
            }
            
            // Skip classes with no real methods (e.g., pure data entities with only properties)
            // These have complexity of 0 and shouldn't appear in risk hotspots
            if (complexity === 0) {
                return;
            }
            
            // Calculate average coverage for the class (0.0 to 1.0)
            const avgCoverage = (cls.lineRate + cls.branchRate) / 2;
            
            // Skip classes with excellent coverage (>= 90%)
            // Well-tested classes are not risky, even if complex
            if (avgCoverage >= 0.90) {
                return;
            }
            
            // CRAP (Change Risk Anti-Patterns) Index Formula:
            // CRAP = complexity^2 * (1 - coverage)^3 + complexity
            // Higher values indicate higher risk
            const crapIndex = Math.pow(complexity, 2) * Math.pow(1 - avgCoverage, 3) + complexity;
            
            // Only include classes with CRAP > 5 (threshold for concerning complexity)
            if (crapIndex > 5) {
                // Get the first line number from the class's lines
                const lineNumber = cls.lines && cls.lines.length > 0 
                    ? Math.min(...cls.lines.map(l => l.number))
                    : 0;
                
                allClasses.push({
                    name: cls.name,
                    displayName: cls.name.split('.').pop(),
                    packageName: pkg.name,
                    complexity: complexity,
                    lineRate: cls.lineRate,
                    branchRate: cls.branchRate,
                    linesCovered: cls.linesCovered,
                    linesValid: cls.linesValid,
                    branchesCovered: cls.branchesCovered,
                    branchesValid: cls.branchesValid,
                    crapIndex,
                    filePath: cls.filename || '',
                    lineNumber,
                    methodCount: realMethodCount
                });
            }
        });
    });
    
    // Sort by CRAP index (highest risk first) and return top 20
    return allClasses.sort((a, b) => b.crapIndex - a.crapIndex).slice(0, 20);
}

function getRiskLevel(crapIndex) {
    // CRAP index thresholds:
    // > 30: Critical - very high risk, needs immediate attention
    // > 15: High - high risk, should be refactored soon
    // > 10: Medium - moderate risk, consider refactoring
    // > 5: Low - acceptable but monitor
    if (crapIndex > 30) {
        return { label: 'Critical', level: 'critical' };
    }
    if (crapIndex > 15) {
        return { label: 'High', level: 'high' };
    }
    if (crapIndex > 10) {
        return { label: 'Medium', level: 'medium' };
    }
    return { label: 'Low', level: 'low' };
}

function displayCoverageTable(data) {
    const tbody = document.getElementById('coverageTableBody');
    const searchBox = document.getElementById('searchBox');
    const expandAllBtn = document.getElementById('expandAll');
    const collapseAllBtn = document.getElementById('collapseAll');
    
    function createProgressBar(percentage) {
        const covered = Math.min(percentage, 100);
        const uncovered = 100 - covered;
        return `
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-covered" style="width: ${covered}%"></div>
                    <div class="progress-uncovered" style="width: ${uncovered}%"></div>
                </div>
                <span class="progress-text">${percentage.toFixed(1)}%</span>
            </div>
        `;
    }
    
    function renderTable(filter = '') {
        const filterLower = filter.toLowerCase();
        
        tbody.innerHTML = data.packages.map(pkg => {
            // Check if package or any of its classes match the filter
            const packageMatches = !filter || pkg.name.toLowerCase().includes(filterLower);
            const classMatches = pkg.classes.some(cls => cls.name.toLowerCase().includes(filterLower));
            
            if (!packageMatches && !classMatches) {
                return '';
            }
            
            const totalLines = pkg.classes.reduce((sum, cls) => sum + cls.lines.length, 0);
            const coveredLines = pkg.classes.reduce((sum, cls) => 
                sum + cls.lines.filter(l => l.hits > 0).length, 0);
            const uncoveredLines = totalLines - coveredLines;
            const linePercent = pkg.lineRate * 100;
            const branchPercent = pkg.branchRate * 100;
            
            const isExpanded = expandedPackages.has(pkg.name);
            const chevronSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon ${isExpanded ? 'expanded' : ''}"><path d="M6 9l6 6l6 -6" /></svg>`;
            const projectIconHtml = getProjectIconHtml(pkg.iconPaths);
            
            const packageRow = `
                <tr class="package-row" data-package-name="${escapeHtml(pkg.name)}">
                    <td class="text-left package-name">
                        <span class="expand-icon">${chevronSvg}</span>
                        <span class="project-icon">${projectIconHtml}</span>
                        ${escapeHtml(pkg.name)}
                    </td>
                    <td class="text-right number">${coveredLines}</td>
                    <td class="text-right number">${uncoveredLines}</td>
                    <td class="text-right number">${totalLines}</td>
                    <td class="text-right">${createProgressBar(linePercent)}</td>
                    <td class="text-right">${createProgressBar(branchPercent)}</td>
                </tr>
            `;
            
            const classRows = pkg.classes.map(cls => {
                const classMatches = !filter || cls.name.toLowerCase().includes(filterLower);
                if (!packageMatches && !classMatches) {
                    return '';
                }
                
                const clsCoveredLines = cls.lines.filter(l => l.hits > 0).length;
                const clsUncoveredLines = cls.lines.length - clsCoveredLines;
                const clsLinePercent = cls.lineRate * 100;
                const clsBranchPercent = cls.branchRate * 100;
                
                const display = isExpanded ? '' : 'none';
                const firstLineNumber = cls.lines && cls.lines.length > 0 ? Math.min(...cls.lines.map(l => l.number)) : 0;
                
                return `
                    <tr class="class-row" id="class-${escapeHtml(pkg.name)}-${escapeHtml(cls.name)}" style="display: ${display};" data-filepath="${escapeHtml(cls.filename)}" data-linenumber="${firstLineNumber}">
                        <td class="text-left class-name">${escapeHtml(cls.name.split('.').pop())}</td>
                        <td class="text-right number">${clsCoveredLines}</td>
                        <td class="text-right number">${clsUncoveredLines}</td>
                        <td class="text-right number">${cls.lines.length}</td>
                        <td class="text-right">${createProgressBar(clsLinePercent)}</td>
                        <td class="text-right">${createProgressBar(clsBranchPercent)}</td>
                    </tr>
                `;
            }).join('');
            
            return packageRow + classRows;
        }).join('');
        
        // Add event listeners after rendering
        setTimeout(() => {
            // Add click listeners to package rows
            const packageRows = tbody.querySelectorAll('.package-row');
            packageRows.forEach(row => {
                row.addEventListener('click', () => {
                    const packageName = row.getAttribute('data-package-name');
                    if (packageName) {
                        togglePackage(packageName);
                    }
                });
            });
            
            // Add click listeners to class rows
            const classRows = tbody.querySelectorAll('.class-row');
            classRows.forEach(row => {
                row.addEventListener('click', () => {
                    const filePath = row.getAttribute('data-filepath');
                    const lineNumber = parseInt(row.getAttribute('data-linenumber'), 10);
                    if (filePath && lineNumber) {
                        openMethod(filePath, lineNumber);
                    }
                });
            });
        }, 0);
    }
    
    // Initial render
    renderTable();
    
    // Search functionality
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            renderTable(e.target.value);
        });
    }
    
    // Expand all button
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', () => {
            data.packages.forEach(pkg => {
                expandedPackages.add(pkg.name);
            });
            renderTable(searchBox ? searchBox.value : '');
        });
    }
    
    // Collapse all button
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', () => {
            expandedPackages.clear();
            renderTable(searchBox ? searchBox.value : '');
        });
    }
    
    // Store render function for toggle use
    window.renderCoverageTable = renderTable;
}

function togglePackage(packageName) {
    const isExpanded = expandedPackages.has(packageName);
    
    if (isExpanded) {
        expandedPackages.delete(packageName);
    } else {
        expandedPackages.add(packageName);
    }
    
    // Re-render table if function exists
    if (window.renderCoverageTable) {
        const searchBox = document.getElementById('searchBox');
        window.renderCoverageTable(searchBox ? searchBox.value : '');
    }
}

function getCoverageClass(rate) {
    const percentage = rate * 100;
    if (percentage >= 80) {
        return 'coverage-good';
    }
    if (percentage >= 60) {
        return 'coverage-medium';
    }
    return 'coverage-poor';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function openMethod(filePath, lineNumber) {
    if (filePath && lineNumber > 0) {
        vscode.postMessage({
            type: 'openFile',
            filePath: filePath,
            lineNumber: lineNumber
        });
    }
}
