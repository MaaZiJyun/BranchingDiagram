// script.js
let branches = { Main: { y: 100, color: '#add8e6', nodes: [] } };
let connections = [];
const startX = 100;
const nodeRadius = 10;
const gridSpacing = 50;
const ySpacing = 50;
const minNodeX = startX + 100;
let maxNodeX = 1100;
const minBranchY = 100;
const minBranchDistance = 20;
const extensionAmount = 500;
const hoverTolerance = 5;
const svg = document.getElementById('git-svg');
let selectedBranchForNode = null;
let selectedXForNode = null;
let ghostCircle = null;
let ghostBranchLine = null;
let ghostExtension = null;
let ghostLine = null;
let pendingY = null;
let editingLabel = null;
let currentSelectedNode = null;
let selectedConnection = null;
let isDragging = false;
let dragNode = null;
let isAdding = false;
let fromNode = null;
let currentTargetBranch = null;
function getSvgPoint(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function snapToXGrid(x) {
    x = Math.max(minNodeX, Math.min(maxNodeX, x));
    return Math.round((x - minNodeX) / gridSpacing) * gridSpacing + minNodeX;
}
function snapToYGrid(y) {
    y = Math.max(minBranchY, y);
    return Math.round((y - minBranchY) / gridSpacing) * gridSpacing + minBranchY;
}
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
function openAddBranchModal() {
    openModal('addBranchModal');
    removeGhostBranch();
}
function openAddNodeModal(branchName, xPos) {
    selectedBranchForNode = branchName;
    selectedXForNode = xPos;
    openModal('addNodeModal');
    removeGhost();
}
function addBranch() {
    const name = document.getElementById('new-branch-name').value.trim();
    let color = document.getElementById('new-branch-color').value.trim() || getRandomColor();
    if (!name || branches[name]) {
        alert('Invalid or duplicate branch name');
        return;
    }
    const maxY = Object.keys(branches).length > 0 ? Math.max(...Object.values(branches).map(b => b.y)) : minBranchY;
    const y = pendingY ?? (maxY + ySpacing);
    pendingY = null;
    branches[name] = { y, color, nodes: [] };
    drawDiagram();
    closeModal('addBranchModal');
    document.getElementById('new-branch-name').value = '';
    document.getElementById('new-branch-color').value = '';
}
function addNodeFromModal() {
    if (!selectedBranchForNode) return;
    const title = document.getElementById('node-message').value || 'New commit';
    const content = document.getElementById('node-content-new').value || '';
    const branch = branches[selectedBranchForNode];
    const existing = branch.nodes.some(node => node.x === selectedXForNode);
    if (existing) {
        alert('Position already occupied by a node.');
        return;
    }
    if (selectedXForNode > maxNodeX) {
        maxNodeX = selectedXForNode + gridSpacing;
    }
    branch.nodes.push({ x: selectedXForNode, title, content });
    branch.nodes.sort((a, b) => a.x - b.x);
    drawDiagram();
    closeModal('addNodeModal');
    document.getElementById('node-message').value = '';
    document.getElementById('node-content-new').value = '';
    selectedBranchForNode = null;
    selectedXForNode = null;
}
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
function drawDiagram() {
    svg.innerHTML = '';
    const maxY = Object.keys(branches).length > 0 ? Math.max(...Object.values(branches).map(b => b.y)) : minBranchY;
    const svgHeight = maxY + 200;
    const svgWidth = maxNodeX + 100;
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    for (let x = minNodeX; x <= maxNodeX; x += gridSpacing) {
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', x);
        gridLine.setAttribute('y1', 50);
        gridLine.setAttribute('x2', x);
        gridLine.setAttribute('y2', svgHeight);
        gridLine.setAttribute('stroke', '#d3d3d3');
        gridLine.setAttribute('stroke-width', 1);
        svg.appendChild(gridLine);
    }
    for (let y = minBranchY; y <= maxY + ySpacing; y += gridSpacing) {
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', startX + 50);
        gridLine.setAttribute('y1', y);
        gridLine.setAttribute('x2', maxNodeX);
        gridLine.setAttribute('y2', y);
        gridLine.setAttribute('stroke', '#d3d3d3');
        gridLine.setAttribute('stroke-width', 1);
        svg.appendChild(gridLine);
    }
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arrow.setAttribute('x1', 50);
    arrow.setAttribute('y1', 50);
    arrow.setAttribute('x2', maxNodeX + 50);
    arrow.setAttribute('y2', 50);
    arrow.setAttribute('stroke', '#333333');
    arrow.setAttribute('stroke-width', 2);
    arrow.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(arrow);
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('viewBox', '0 -5 10 10');
    marker.setAttribute('refX', 10);
    marker.setAttribute('refY', 0);
    marker.setAttribute('markerWidth', 6);
    marker.setAttribute('markerHeight', 6);
    marker.setAttribute('orient', 'auto');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,-5L10,0L0,5');
    path.setAttribute('fill', '#333333');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);
    const timeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    timeText.setAttribute('x', 50);
    timeText.setAttribute('y', 40);
    timeText.setAttribute('fill', '#333333');
    timeText.textContent = 'TIME →';
    svg.appendChild(timeText);
    const extensionHit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    extensionHit.setAttribute('x', maxNodeX - 50);
    extensionHit.setAttribute('y', 30);
    extensionHit.setAttribute('width', 100);
    extensionHit.setAttribute('height', 40);
    extensionHit.setAttribute('fill', 'transparent');
    extensionHit.addEventListener('mousemove', () => {
        if (!ghostExtension) {
            ghostExtension = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ghostExtension.setAttribute('x1', maxNodeX);
            ghostExtension.setAttribute('y1', 50);
            ghostExtension.setAttribute('x2', maxNodeX + extensionAmount);
            ghostExtension.setAttribute('y2', 50);
            ghostExtension.setAttribute('stroke', '#333333');
            ghostExtension.setAttribute('stroke-width', 2);
            ghostExtension.setAttribute('opacity', 0.5);
            svg.appendChild(ghostExtension);
        }
    });
    extensionHit.addEventListener('mouseleave', () => {
        if (ghostExtension) {
            svg.removeChild(ghostExtension);
            ghostExtension = null;
        }
    });
    extensionHit.addEventListener('click', () => {
        maxNodeX += extensionAmount;
        drawDiagram();
    });
    svg.appendChild(extensionHit);
    connections.forEach((conn, connIndex) => {
        const fromBranch = branches[conn.fromBranch];
        const toBranch = branches[conn.toBranch];
        const fromNode = fromBranch.nodes[conn.fromNodeIndex];
        const toNode = toBranch.nodes[conn.toNodeIndex];
        if (fromNode && toNode) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('id', `conn-${connIndex}`);
            line.setAttribute('x1', fromNode.x);
            line.setAttribute('y1', fromBranch.y);
            line.setAttribute('x2', toNode.x);
            line.setAttribute('y2', toBranch.y);
            line.setAttribute('stroke', '#808080');
            line.setAttribute('stroke-width', 2);
            line.addEventListener('click', () => deleteConnection(connIndex));
            svg.appendChild(line);
        }
    });
    const sortedBranches = Object.entries(branches).sort((a, b) => a[1].y - b[1].y);
    sortedBranches.forEach(([branchName, branch]) => {
        const labelRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelRect.setAttribute('x', startX - 40);
        labelRect.setAttribute('y', branch.y - 15);
        labelRect.setAttribute('width', 80);
        labelRect.setAttribute('height', 30);
        labelRect.setAttribute('fill', branch.color);
        labelRect.setAttribute('rx', 5);
        svg.appendChild(labelRect);
        const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelText.setAttribute('x', startX);
        labelText.setAttribute('y', branch.y + 5);
        labelText.setAttribute('fill', 'black');
        labelText.setAttribute('text-anchor', 'middle');
        labelText.textContent = branchName;
        labelText.addEventListener('dblclick', () => editBranchLabel(branchName, labelText));
        svg.appendChild(labelText);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX + 50);
        line.setAttribute('y1', branch.y);
        line.setAttribute('x2', maxNodeX);
        line.setAttribute('y2', branch.y);
        line.setAttribute('stroke', '#808080');
        line.setAttribute('stroke-width', 1);
        line.setAttribute('stroke-dasharray', '5,5');
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hitArea.setAttribute('x1', startX + 50);
        hitArea.setAttribute('y1', branch.y);
        hitArea.setAttribute('x2', maxNodeX);
        hitArea.setAttribute('y2', branch.y);
        hitArea.setAttribute('stroke', 'transparent');
        hitArea.setAttribute('stroke-width', 20);
        hitArea.addEventListener('mousemove', (e) => {
            let {x: rawX, y: rawY} = getSvgPoint(e);
            let snappedX = snapToXGrid(rawX);
            let snappedY = snapToYGrid(rawY);
            if (Math.abs(rawX - snappedX) > hoverTolerance || Math.abs(rawY - snappedY) > hoverTolerance || snappedX < minNodeX || snappedX > maxNodeX) {
                removeGhost();
                return;
            }
            const occupied = branch.nodes.some(node => node.x === snappedX);
            if (occupied) {
                removeGhost();
                return;
            }
            if (!ghostCircle) {
                ghostCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                ghostCircle.setAttribute('r', nodeRadius);
                ghostCircle.setAttribute('fill', branch.color);
                ghostCircle.setAttribute('opacity', 0.5);
                svg.appendChild(ghostCircle);
            }
            ghostCircle.setAttribute('cx', snappedX);
            ghostCircle.setAttribute('cy', branch.y);
        });
        hitArea.addEventListener('mouseleave', removeGhost);
        hitArea.addEventListener('click', (e) => {
            let {x: rawX, y: rawY} = getSvgPoint(e);
            let snappedX = snapToXGrid(rawX);
            let snappedY = snapToYGrid(rawY);
            if (Math.abs(rawX - snappedX) > hoverTolerance || Math.abs(rawY - snappedY) > hoverTolerance) return;
            const occupied = branch.nodes.some(node => node.x === snappedX);
            if (!occupied && snappedX >= minNodeX && snappedX <= maxNodeX) {
                openAddNodeModal(branchName, snappedX);
            }
            e.stopPropagation();
        });
        svg.appendChild(line);
        svg.appendChild(hitArea);
        branch.nodes.forEach((node, index) => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'node-group');
            group.addEventListener('mouseenter', () => {
                if (isAdding || isDragging) return;
                const minus = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                minus.setAttribute('x', node.x - 20);
                minus.setAttribute('y', branch.y + 5);
                minus.setAttribute('fill', 'red');
                minus.setAttribute('font-size', '20');
                minus.setAttribute('class', 'node-icon');
                minus.textContent = '-';
                minus.addEventListener('click', (e) => {
                    branches[branchName].nodes.splice(index, 1);
                    connections = connections.filter(conn => !(conn.fromBranch === branchName && conn.fromNodeIndex === index) && !(conn.toBranch === branchName && conn.toNodeIndex === index));
                    connections.forEach(conn => {
                        if (conn.fromBranch === branchName && conn.fromNodeIndex > index) conn.fromNodeIndex--;
                        if (conn.toBranch === branchName && conn.toNodeIndex > index) conn.toNodeIndex--;
                    });
                    drawDiagram();
                    e.stopPropagation();
                });
                group.appendChild(minus);
                const plus = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                plus.setAttribute('x', node.x + 20);
                plus.setAttribute('y', branch.y + 5);
                plus.setAttribute('fill', 'green');
                plus.setAttribute('font-size', '20');
                plus.setAttribute('class', 'node-icon');
                plus.textContent = '+';
                plus.addEventListener('click', (e) => {
                    isAdding = true;
                    fromNode = {branchName, index, x: node.x, y: branch.y};
                    const icons = group.querySelectorAll('.node-icon');
                    icons.forEach(icon => group.removeChild(icon));
                    e.stopPropagation();
                });
                group.appendChild(plus);
            });
            group.addEventListener('mouseleave', () => {
                const icons = group.querySelectorAll('.node-icon');
                icons.forEach(icon => group.removeChild(icon));
            });
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('id', `node-circle-${branchName.replace(/ /g, '_')}-${index}`);
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', branch.y);
            circle.setAttribute('r', nodeRadius);
            circle.setAttribute('fill', branch.color);
            circle.addEventListener('mousedown', (e) => {
                isDragging = true;
                const currentX = branch.nodes[index].x;
                let leftX = minNodeX - gridSpacing;
                let rightX = maxNodeX + gridSpacing;
                branch.nodes.forEach((n, i) => {
                    if (i !== index) {
                        if (n.x < currentX) leftX = Math.max(leftX, n.x);
                        else if (n.x > currentX) rightX = Math.min(rightX, n.x);
                    }
                });
                const minDragX = leftX + gridSpacing;
                const maxDragX = rightX - gridSpacing;
                dragNode = {
                    branchName,
                    nodeIndex: index,
                    node: branch.nodes[index],
                    minDragX,
                    maxDragX,
                    startX: currentX
                };
                e.stopPropagation();
            });
            circle.addEventListener('dblclick', (e) => {
                showSidebar(branchName, index);
                e.stopPropagation();
            });
            group.appendChild(circle);
            const nodeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            nodeText.setAttribute('id', `node-text-${branchName.replace(/ /g, '_')}-${index}`);
            nodeText.setAttribute('x', node.x);
            nodeText.setAttribute('y', branch.y + 25);
            nodeText.setAttribute('fill', '#333333');
            nodeText.setAttribute('text-anchor', 'middle');
            nodeText.textContent = (node.title || 'Untitled').substring(0, 10) + '...';
            group.appendChild(nodeText);
            svg.appendChild(group);
        });
    });
}
function editBranchLabel(oldName, textElement) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.style.position = 'absolute';
    input.style.left = textElement.getBoundingClientRect().left + 'px';
    input.style.top = textElement.getBoundingClientRect().top + 'px';
    input.style.width = '80px';
    input.style.textAlign = 'center';
    document.body.appendChild(input);
    input.focus();
    input.addEventListener('blur', () => {
        const newName = input.value.trim();
        if (newName && newName !== oldName && !branches[newName]) {
            branches[newName] = branches[oldName];
            delete branches[oldName];
            connections.forEach(conn => {
                if (conn.fromBranch === oldName) conn.from
