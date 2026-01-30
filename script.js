// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let equations = [
        { a: 2, b: 3, c: 6 }, // Equation 1: 2x + 3y = 6
        { a: 1, b: -1, c: 2 } // Equation 2: x - y = 2
    ];
    
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    
    // DOM elements
    const graph = document.getElementById('graph');
    const eq1Input = document.getElementById('eq1');
    const eq2Input = document.getElementById('eq2');
    const downloadBtn = document.getElementById('downloadBtn');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const resetViewBtn = document.getElementById('resetView');
    const swapBtn = document.getElementById('swapBtn');
    const resetBtn = document.getElementById('resetBtn');
    const randomBtn = document.getElementById('randomBtn');
    const intersectionX = document.getElementById('intersectionX');
    const intersectionY = document.getElementById('intersectionY');
    const solutionSteps = document.getElementById('solutionSteps');
    const viewInfo = document.getElementById('viewInfo');
    
    // Sliders and their value displays
    const sliders = {
        a1: document.getElementById('a1'),
        b1: document.getElementById('b1'),
        c1: document.getElementById('c1'),
        a2: document.getElementById('a2'),
        b2: document.getElementById('b2'),
        c2: document.getElementById('c2')
    };
    
    const sliderValues = {
        a1: document.getElementById('a1Value'),
        b1: document.getElementById('b1Value'),
        c1: document.getElementById('c1Value'),
        a2: document.getElementById('a2Value'),
        b2: document.getElementById('b2Value'),
        c2: document.getElementById('c2Value')
    };
    
    // Initialize the graph
    initGraph();
    updateEquationsFromSliders(0);
    updateEquationsFromSliders(1);
    updateGraph();
    
    // Event listeners for equation inputs
    eq1Input.addEventListener('input', function() {
        parseEquationFromInput(0, eq1Input.value);
        updateSlidersFromEquation(0);
        updateGraph();
    });
    
    eq2Input.addEventListener('input', function() {
        parseEquationFromInput(1, eq2Input.value);
        updateSlidersFromEquation(1);
        updateGraph();
    });
    
    // Event listeners for sliders
    Object.keys(sliders).forEach(sliderId => {
        sliders[sliderId].addEventListener('input', function() {
            const eqIndex = sliderId.includes('1') ? 0 : 1;
            const coeff = sliderId[0]; // 'a', 'b', or 'c'
            
            // Update the equation coefficient
            equations[eqIndex][coeff] = parseFloat(this.value);
            
            // Update the slider value display
            sliderValues[sliderId].textContent = this.value;
            
            // Update the equation input
            updateEquationInput(eqIndex);
            
            // Update the graph
            updateGraph();
        });
    });
    
    // Event listeners for buttons
    swapBtn.addEventListener('click', function() {
        // Swap equations
        const temp = equations[0];
        equations[0] = equations[1];
        equations[1] = temp;
        
        // Update inputs and sliders
        updateEquationInput(0);
        updateEquationInput(1);
        updateSlidersFromEquation(0);
        updateSlidersFromEquation(1);
        
        updateGraph();
    });
    
    resetBtn.addEventListener('click', function() {
        // Reset to default equations
        equations = [
            { a: 2, b: 3, c: 6 },
            { a: 1, b: -1, c: 2 }
        ];
        
        // Reset zoom and pan
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        
        // Update inputs and sliders
        updateEquationInput(0);
        updateEquationInput(1);
        updateSlidersFromEquation(0);
        updateSlidersFromEquation(1);
        
        updateGraph();
    });
    
    randomBtn.addEventListener('click', function() {
        // Generate random coefficients between -10 and 10
        equations = [
            {
                a: Math.round((Math.random() * 20 - 10) * 2) / 2,
                b: Math.round((Math.random() * 20 - 10) * 2) / 2,
                c: Math.round((Math.random() * 20 - 10) * 2) / 2
            },
            {
                a: Math.round((Math.random() * 20 - 10) * 2) / 2,
                b: Math.round((Math.random() * 20 - 10) * 2) / 2,
                c: Math.round((Math.random() * 20 - 10) * 2) / 2
            }
        ];
        
        // Update inputs and sliders
        updateEquationInput(0);
        updateEquationInput(1);
        updateSlidersFromEquation(0);
        updateSlidersFromEquation(1);
        
        updateGraph();
    });
    
    // Clear buttons
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).value = '';
        });
    });
    
    // Graph controls
    zoomInBtn.addEventListener('click', function() {
        zoomLevel *= 1.2;
        updateGraph();
    });
    
    zoomOutBtn.addEventListener('click', function() {
        zoomLevel /= 1.2;
        updateGraph();
    });
    
    resetViewBtn.addEventListener('click', function() {
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        updateGraph();
    });
    
    downloadBtn.addEventListener('click', function() {
        downloadGraphAsPNG();
    });
    
    // Graph interaction
    graph.addEventListener('mousedown', startDrag);
    graph.addEventListener('mousemove', drag);
    graph.addEventListener('mouseup', endDrag);
    graph.addEventListener('mouseleave', endDrag);
    
    // Touch events for mobile
    graph.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            startDrag({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        }
    });
    
    graph.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            drag({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        }
    });
    
    graph.addEventListener('touchend', endDrag);
    
    // Mouse wheel zoom
    graph.addEventListener('wheel', function(e) {
        e.preventDefault();
        const rect = graph.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel *= zoomFactor;
        
        // Adjust pan to zoom towards cursor
        panX = x - (x - panX) * zoomFactor;
        panY = y - (y - panY) * zoomFactor;
        
        updateGraph();
    });
    
    // Initialize the SVG graph with grid and axes
    function initGraph() {
        // Set SVG dimensions to fill container
        const rect = graph.getBoundingClientRect();
        graph.setAttribute('width', rect.width);
        graph.setAttribute('height', rect.height);
        
        // Update on window resize
        window.addEventListener('resize', function() {
            const rect = graph.getBoundingClientRect();
            graph.setAttribute('width', rect.width);
            graph.setAttribute('height', rect.height);
            updateGraph();
        });
    }
    
    // Parse equation from input string
    function parseEquationFromInput(index, input) {
        // Default values
        let a = 1, b = 1, c = 0;
        
        try {
            // Remove spaces and convert to lowercase
            let eq = input.toLowerCase().replace(/\s/g, '');
            
            // If empty, set default
            if (eq === '') {
                equations[index] = { a: 1, b: 1, c: 0 };
                return;
            }
            
            // Split by '='
            const sides = eq.split('=');
            if (sides.length !== 2) throw new Error('Invalid equation format');
            
            let left = sides[0];
            const right = parseFloat(sides[1]) || 0;
            
            // Parse x and y coefficients
            const xMatch = left.match(/([-+]?\d*\.?\d*)x/);
            const yMatch = left.match(/([-+]?\d*\.?\d*)y/);
            
            a = xMatch ? parseFloat(xMatch[1] || (xMatch[0].startsWith('-') ? -1 : 1)) : 0;
            b = yMatch ? parseFloat(yMatch[1] || (yMatch[0].startsWith('-') ? -1 : 1)) : 0;
            
            // Handle constant term on left side
            const constantMatch = left.match(/([-+]?\d+\.?\d*)(?!.*[xy])/);
            if (constantMatch) {
                left = left.replace(constantMatch[0], '');
                c = right - parseFloat(constantMatch[0]);
            } else {
                c = right;
            }
            
            // Update equation
            equations[index] = { a, b, c };
        } catch (e) {
            console.error('Error parsing equation:', e);
            // Keep current equation values if parsing fails
        }
    }
    
    // Update equation input field from equation object
    function updateEquationInput(index) {
        const eq = equations[index];
        let eqStr = '';
        
        if (eq.a !== 0) {
            eqStr += (eq.a === 1 ? '' : eq.a === -1 ? '-' : eq.a) + 'x';
        }
        
        if (eq.b !== 0) {
            if (eq.b > 0 && eqStr !== '') eqStr += ' + ';
            else if (eq.b < 0) eqStr += ' - ';
            
            if (Math.abs(eq.b) !== 1) eqStr += Math.abs(eq.b);
            eqStr += 'y';
        }
        
        // If both a and b are 0, show 0
        if (eqStr === '') eqStr = '0';
        
        eqStr += ' = ' + eq.c;
        
        if (index === 0) {
            eq1Input.value = eqStr;
        } else {
            eq2Input.value = eqStr;
        }
    }
    
    // Update sliders from equation object
    function updateSlidersFromEquation(index) {
        const eq = equations[index];
        const prefix = index === 0 ? '' : '2';
        
        sliders['a' + prefix].value = eq.a;
        sliders['b' + prefix].value = eq.b;
        sliders['c' + prefix].value = eq.c;
        
        sliderValues['a' + prefix].textContent = eq.a;
        sliderValues['b' + prefix].textContent = eq.b;
        sliderValues['c' + prefix].textContent = eq.c;
    }
    
    // Update equations from sliders
    function updateEquationsFromSliders(index) {
        const prefix = index === 0 ? '1' : '2';
        equations[index] = {
            a: parseFloat(sliders['a' + prefix].value),
            b: parseFloat(sliders['b' + prefix].value),
            c: parseFloat(sliders['c' + prefix].value)
        };
    }
    
    // Calculate intersection point of two lines
    function calculateIntersection(eq1, eq2) {
        const { a: a1, b: b1, c: c1 } = eq1;
        const { a: a2, b: b2, c: c2 } = eq2;
        
        const determinant = a1 * b2 - a2 * b1;
        
        // Lines are parallel or coincident
        if (Math.abs(determinant) < 1e-10) {
            // Check if they're coincident
            if (Math.abs(a1 * c2 - a2 * c1) < 1e-10 && Math.abs(b1 * c2 - b2 * c1) < 1e-10) {
                return { type: 'coincident', x: null, y: null };
            } else {
                return { type: 'parallel', x: null, y: null };
            }
        }
        
        // Lines intersect at a single point
        const x = (c1 * b2 - c2 * b1) / determinant;
        const y = (a1 * c2 - a2 * c1) / determinant;
        
        return { type: 'intersection', x, y };
    }
    
    // Generate step-by-step solution
    function generateSolutionSteps(eq1, eq2, intersection) {
        const { a: a1, b: b1, c: c1 } = eq1;
        const { a: a2, b: b2, c: c2 } = eq2;
        
        let stepsHTML = '';
        
        if (intersection.type === 'parallel') {
            stepsHTML = `
                <div class="step">
                    <strong>Step 1:</strong> The equations are:<br>
                    ${formatEquation(eq1)}<br>
                    ${formatEquation(eq2)}
                </div>
                <div class="step">
                    <strong>Step 2:</strong> Calculate the determinant:<br>
                    D = a₁b₂ - a₂b₁ = (${a1})(${b2}) - (${a2})(${b1}) = ${a1 * b2 - a2 * b1}
                </div>
                <div class="step">
                    <strong>Step 3:</strong> Since D = 0, the lines are parallel and do not intersect.
                </div>
            `;
        } else if (intersection.type === 'coincident') {
            stepsHTML = `
                <div class="step">
                    <strong>Step 1:</strong> The equations are:<br>
                    ${formatEquation(eq1)}<br>
                    ${formatEquation(eq2)}
                </div>
                <div class="step">
                    <strong>Step 2:</strong> Calculate the determinant:<br>
                    D = a₁b₂ - a₂b₁ = (${a1})(${b2}) - (${a2})(${b1}) = ${a1 * b2 - a2 * b1}
                </div>
                <div class="step">
                    <strong>Step 3:</strong> Since D = 0 and the equations are proportional, the lines are coincident (infinite solutions).
                </div>
            `;
        } else {
            const determinant = a1 * b2 - a2 * b1;
            const xNum = c1 * b2 - c2 * b1;
            const yNum = a1 * c2 - a2 * c1;
            
            stepsHTML = `
                <div class="step">
                    <strong>Step 1:</strong> The equations are:<br>
                    ${formatEquation(eq1)}<br>
                    ${formatEquation(eq2)}
                </div>
                <div class="step">
                    <strong>Step 2:</strong> Calculate the determinant:<br>
                    D = a₁b₂ - a₂b₁ = (${a1})(${b2}) - (${a2})(${b1}) = ${determinant}
                </div>
                <div class="step">
                    <strong>Step 3:</strong> Since D ≠ 0, the lines intersect at a unique point.
                </div>
                <div class="step">
                    <strong>Step 4:</strong> Calculate x-coordinate:<br>
                    x = (c₁b₂ - c₂b₁) / D = (${c1}×${b2} - ${c2}×${b1}) / ${determinant} = ${xNum} / ${determinant} = ${intersection.x.toFixed(3)}
                </div>
                <div class="step">
                    <strong>Step 5:</strong> Calculate y-coordinate:<br>
                    y = (a₁c₂ - a₂c₁) / D = (${a1}×${c2} - ${a2}×${c1}) / ${determinant} = ${yNum} / ${determinant} = ${intersection.y.toFixed(3)}
                </div>
                <div class="step">
                    <strong>Solution:</strong> The lines intersect at (${intersection.x.toFixed(3)}, ${intersection.y.toFixed(3)})
                </div>
            `;
        }
        
        return stepsHTML;
    }
    
    // Format equation object as string
    function formatEquation(eq) {
        let str = '';
        
        if (eq.a !== 0) {
            str += (eq.a === 1 ? '' : eq.a === -1 ? '-' : eq.a) + 'x';
        }
        
        if (eq.b !== 0) {
            if (eq.b > 0 && str !== '') str += ' + ';
            else if (eq.b < 0) str += ' - ';
            
            if (Math.abs(eq.b) !== 1) str += Math.abs(eq.b);
            str += 'y';
        }
        
        // If both a and b are 0, show 0
        if (str === '') str = '0';
        
        str += ' = ' + eq.c;
        
        return str;
    }
    
    // Calculate line points for drawing
    function calculateLinePoints(eq, graphWidth, graphHeight) {
        const { a, b, c } = eq;
        const points = [];
        
        // Calculate visible area based on zoom and pan
        const visibleWidth = graphWidth / zoomLevel;
        const visibleHeight = graphHeight / zoomLevel;
        
        const minX = -visibleWidth / 2 + panX / zoomLevel;
        const maxX = visibleWidth / 2 + panX / zoomLevel;
        const minY = -visibleHeight / 2 + panY / zoomLevel;
        const maxY = visibleHeight / 2 + panY / zoomLevel;
        
        // If B is not zero, we can express y in terms of x
        if (Math.abs(b) > 1e-10) {
            // Calculate y for x = minX and x = maxX
            const y1 = (c - a * minX) / b;
            const y2 = (c - a * maxX) / b;
            
            // Check if these points are within the visible y-range
            if (y1 >= minY && y1 <= maxY) {
                points.push({ x: minX, y: y1 });
            }
            
            if (y2 >= minY && y2 <= maxY && points.length < 2) {
                points.push({ x: maxX, y: y2 });
            }
            
            // If we still need more points, calculate x for y = minY and y = maxY
            if (points.length < 2 && Math.abs(a) > 1e-10) {
                const x1 = (c - b * minY) / a;
                const x2 = (c - b * maxY) / a;
                
                if (x1 >= minX && x1 <= maxX && !points.some(p => Math.abs(p.x - x1) < 0.1)) {
                    points.push({ x: x1, y: minY });
                }
                
                if (points.length < 2 && x2 >= minX && x2 <= maxX && !points.some(p => Math.abs(p.x - x2) < 0.1)) {
                    points.push({ x: x2, y: maxY });
                }
            }
        } else if (Math.abs(a) > 1e-10) {
            // Vertical line (or nearly vertical)
            const x = c / a;
            
            // Add two points on the vertical line
            points.push({ x: x, y: minY });
            points.push({ x: x, y: maxY });
        }
        
        // If we couldn't find two points, use the center of the visible area
        if (points.length < 2) {
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            if (points.length === 0) {
                points.push({ x: centerX, y: centerY });
                points.push({ x: centerX + 1, y: centerY });
            } else if (points.length === 1) {
                points.push({ x: points[0].x + 1, y: points[0].y });
            }
        }
        
        return points;
    }
    
    // Update the graph visualization
    function updateGraph() {
        // Clear the graph
        graph.innerHTML = '';
        
        // Get graph dimensions
        const width = graph.getBoundingClientRect().width;
        const height = graph.getBoundingClientRect().height;
        
        // Calculate visible area
        const visibleWidth = width / zoomLevel;
        const visibleHeight = height / zoomLevel;
        
        const minX = -visibleWidth / 2 + panX / zoomLevel;
        const maxX = visibleWidth / 2 + panX / zoomLevel;
        const minY = -visibleHeight / 2 + panY / zoomLevel;
        const maxY = visibleHeight / 2 + panY / zoomLevel;
        
        // Update view info
        viewInfo.textContent = `View: x:[${minX.toFixed(1)}, ${maxX.toFixed(1)}], y:[${minY.toFixed(1)}, ${maxY.toFixed(1)}]`;
        
        // Create a group for the grid
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('id', 'grid');
        
        // Draw grid lines
        const gridSize = 10 * zoomLevel;
        const gridStartX = Math.floor(minX / gridSize) * gridSize;
        const gridEndX = Math.ceil(maxX / gridSize) * gridSize;
        const gridStartY = Math.floor(minY / gridSize) * gridSize;
        const gridEndY = Math.ceil(maxY / gridSize) * gridSize;
        
        // Vertical grid lines
        for (let x = gridStartX; x <= gridEndX; x += gridSize) {
            const svgX = ((x - minX) / (maxX - minX)) * width;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', svgX);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', svgX);
            line.setAttribute('y2', height);
            line.setAttribute('stroke', x === 0 ? '#888' : '#e0e0e0');
            line.setAttribute('stroke-width', x === 0 ? '2' : '1');
            gridGroup.appendChild(line);
            
            // Add x-axis labels
            if (x !== 0 && Math.abs(x) < 100) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', svgX);
                text.setAttribute('y', height - 5);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '12px');
                text.setAttribute('fill', '#666');
                text.textContent = Math.round(x);
                gridGroup.appendChild(text);
            }
        }
        
        // Horizontal grid lines
        for (let y = gridStartY; y <= gridEndY; y += gridSize) {
            const svgY = height - ((y - minY) / (maxY - minY)) * height;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', svgY);
            line.setAttribute('x2', width);
            line.setAttribute('y2', svgY);
            line.setAttribute('stroke', y === 0 ? '#888' : '#e0e0e0');
            line.setAttribute('stroke-width', y === 0 ? '2' : '1');
            gridGroup.appendChild(line);
            
            // Add y-axis labels
            if (y !== 0 && Math.abs(y) < 100) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', 5);
                text.setAttribute('y', svgY - 5);
                text.setAttribute('text-anchor', 'start');
                text.setAttribute('font-size', '12px');
                text.setAttribute('fill', '#666');
                text.textContent = Math.round(y);
                gridGroup.appendChild(text);
            }
        }
        
        // Add origin label
        if (minX <= 0 && maxX >= 0 && minY <= 0 && maxY >= 0) {
            const originX = ((0 - minX) / (maxX - minX)) * width;
            const originY = height - ((0 - minY) / (maxY - minY)) * height;
            
            const originText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            originText.setAttribute('x', originX + 8);
            originText.setAttribute('y', originY - 8);
            originText.setAttribute('text-anchor', 'start');
            originText.setAttribute('font-size', '14px');
            originText.setAttribute('font-weight', 'bold');
            originText.setAttribute('fill', '#333');
            originText.textContent = '(0,0)';
            gridGroup.appendChild(originText);
        }
        
        graph.appendChild(gridGroup);
        
        // Calculate and draw lines
        const lineColors = ['#e74c3c', '#3498db'];
        
        for (let i = 0; i < equations.length; i++) {
            const eq = equations[i];
            const points = calculateLinePoints(eq, width, height);
            
            if (points.length >= 2) {
                // Convert points to SVG coordinates
                const svgPoints = points.map(p => ({
                    x: ((p.x - minX) / (maxX - minX)) * width,
                    y: height - ((p.y - minY) / (maxY - minY)) * height
                }));
                
                // Draw line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', svgPoints[0].x);
                line.setAttribute('y1', svgPoints[0].y);
                line.setAttribute('x2', svgPoints[1].x);
                line.setAttribute('y2', svgPoints[1].y);
                line.setAttribute('stroke', lineColors[i]);
                line.setAttribute('stroke-width', '3');
                line.setAttribute('stroke-linecap', 'round');
                graph.appendChild(line);
                
                // Draw points on the line
                for (let j = 0; j < Math.min(points.length, 2); j++) {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', svgPoints[j].x);
                    circle.setAttribute('cy', svgPoints[j].y);
                    circle.setAttribute('r', '6');
                    circle.setAttribute('fill', lineColors[i]);
                    circle.setAttribute('stroke', 'white');
                    circle.setAttribute('stroke-width', '2');
                    graph.appendChild(circle);
                    
                    // Add point label
                    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    label.setAttribute('x', svgPoints[j].x + 10);
                    label.setAttribute('y', svgPoints[j].y - 10);
                    label.setAttribute('text-anchor', 'start');
                    label.setAttribute('font-size', '12px');
                    label.setAttribute('font-weight', 'bold');
                    label.setAttribute('fill', lineColors[i]);
                    label.textContent = `(${points[j].x.toFixed(1)}, ${points[j].y.toFixed(1)})`;
                    graph.appendChild(label);
                }
                
                // Add equation label on the line
                const midX = (svgPoints[0].x + svgPoints[1].x) / 2;
                const midY = (svgPoints[0].y + svgPoints[1].y) / 2;
                
                const eqLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                eqLabel.setAttribute('x', midX + 15);
                eqLabel.setAttribute('y', midY - 15);
                eqLabel.setAttribute('text-anchor', 'start');
                eqLabel.setAttribute('font-size', '14px');
                eqLabel.setAttribute('font-weight', 'bold');
                eqLabel.setAttribute('fill', lineColors[i]);
                eqLabel.textContent = `Line ${i+1}: ${formatEquation(eq)}`;
                graph.appendChild(eqLabel);
                
                // Update points info box
                const pointsBox = document.getElementById(`line${i+1}Points`);
                if (pointsBox) {
                    pointsBox.innerHTML = `<h4>Line ${i+1} Points</h4>`;
                    points.forEach((p, idx) => {
                        const pElem = document.createElement('p');
                        pElem.textContent = `Point ${idx+1}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
                        pointsBox.appendChild(pElem);
                    });
                }
            }
        }
        
        // Calculate and display intersection
        const intersection = calculateIntersection(equations[0], equations[1]);
        
        // Update intersection display
        const intersectionType = document.getElementById('intersectionType');
        
        if (intersection.type === 'intersection') {
            intersectionX.textContent = intersection.x.toFixed(3);
            intersectionY.textContent = intersection.y.toFixed(3);
            
            intersectionType.innerHTML = '<i class="fas fa-check-circle"></i> Unique Solution';
            intersectionType.style.backgroundColor = '#d5edda';
            intersectionType.style.color = '#155724';
            
            // Draw intersection point on graph
            if (intersection.x >= minX && intersection.x <= maxX && 
                intersection.y >= minY && intersection.y <= maxY) {
                
                const intX = ((intersection.x - minX) / (maxX - minX)) * width;
                const intY = height - ((intersection.y - minY) / (maxY - minY)) * height;
                
                const intCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                intCircle.setAttribute('cx', intX);
                intCircle.setAttribute('cy', intY);
                intCircle.setAttribute('r', '8');
                intCircle.setAttribute('fill', '#27ae60');
                intCircle.setAttribute('stroke', 'white');
                intCircle.setAttribute('stroke-width', '3');
                graph.appendChild(intCircle);
                
                // Add intersection label
                const intLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                intLabel.setAttribute('x', intX + 15);
                intLabel.setAttribute('y', intY - 15);
                intLabel.setAttribute('text-anchor', 'start');
                intLabel.setAttribute('font-size', '14px');
                intLabel.setAttribute('font-weight', 'bold');
                intLabel.setAttribute('fill', '#27ae60');
                intLabel.textContent = `Intersection: (${intersection.x.toFixed(2)}, ${intersection.y.toFixed(2)})`;
                graph.appendChild(intLabel);
            }
        } else if (intersection.type === 'parallel') {
            intersectionX.textContent = 'N/A';
            intersectionY.textContent = 'N/A';
            
            intersectionType.innerHTML = '<i class="fas fa-times-circle"></i> No Solution (Parallel Lines)';
            intersectionType.style.backgroundColor = '#f8d7da';
            intersectionType.style.color = '#721c24';
        } else {
            intersectionX.textContent = '∞';
            intersectionY.textContent = '∞';
            
            intersectionType.innerHTML = '<i class="fas fa-infinity"></i> Infinite Solutions (Coincident Lines)';
            intersectionType.style.backgroundColor = '#fff3cd';
            intersectionType.style.color = '#856404';
        }
        
        // Update solution steps
        solutionSteps.innerHTML = generateSolutionSteps(equations[0], equations[1], intersection);
    }
    
    // Drag and pan functionality
    function startDrag(e) {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        graph.style.cursor = 'grabbing';
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        
        panX += dx;
        panY -= dy; // Invert Y axis for natural panning
        
        lastX = e.clientX;
        lastY = e.clientY;
        
        updateGraph();
    }
    
    function endDrag() {
        isDragging = false;
        graph.style.cursor = 'default';
    }
    
    // Download graph as PNG
    function downloadGraphAsPNG() {
        const svg = graph;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to match SVG
        canvas.width = svg.getBoundingClientRect().width;
        canvas.height = svg.getBoundingClientRect().height;
        
        // Create an image from SVG
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = function() {
            // Draw the image on canvas
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            
            // Create a download link
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.getElementById('downloadLink');
            downloadLink.href = pngUrl;
            downloadLink.download = 'linear-equation-graph.png';
            downloadLink.click();
        };
        
        img.src = url;
    }
});