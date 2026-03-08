const GAS_URL = "https://script.google.com/macros/s/AKfycbzpGnygs5D7ujnWzSi19R7TZOVrJusPaFsDHvkcd8PCMpUt7PLf2t5GSeUFQyp_pcfsLQ/exec";

// Fetch data on load
window.onload = fetchTree;

async function fetchTree() {
    const container = document.getElementById('tree-container');
    container.innerHTML = "Loading...";

    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        allNodesGlobal = data; // Store for path tracing
        
        container.innerHTML = "";
        const treeRoot = buildTree(data);
        container.appendChild(renderTree(treeRoot));
    } catch (err) {
        container.innerHTML = "Error loading tree.";
    }
}

// Logic to transform flat array into nested object
function buildTree(nodes) {
    const map = {};
    let root = null;

    nodes.forEach(node => {
        map[node.Node_ID] = { ...node, children: [] };
    });

    nodes.forEach(node => {
        if (node.Parent_ID == 0 || !map[node.Parent_ID]) {
            root = map[node.Node_ID];
        } else {
            map[node.Parent_ID].children.push(map[node.Node_ID]);
        }
    });
    return root;
}

// Logic to turn nested object into HTML
function renderTree(node) {
    if (!node) return document.createTextNode("");

    const li = document.createElement('li');
    
    // 1. Create the Toggle Button (+/-)
    const hasChildren = node.children && node.children.length > 0;
    const toggle = document.createElement('span');
    toggle.className = "toggle-btn";

    if (hasChildren) {
        toggle.innerText = "[-] "; // Start expanded
        toggle.onclick = (e) => {
            e.stopPropagation();
            const isCollapsed = li.classList.toggle('collapsed');
            toggle.innerText = isCollapsed ? "[+] " : "[-] ";
        };
    } else {
        // No children = No button, just a spacer to keep alignment
        toggle.innerHTML = "&nbsp;&nbsp;&nbsp;"; 
        toggle.style.cursor = "default";
    }
    li.appendChild(toggle);

    // 2. Create the Node Text Container
    const nodeWrapper = document.createElement('div');
    nodeWrapper.className = "node-container";
    nodeWrapper.innerHTML = `<span class="node-id">[${node.Node_ID}]</span> ${node.Content}`;
    
    nodeWrapper.onclick = (e) => {
        e.stopPropagation();
        selectNode(node.Node_ID, nodeWrapper);
    };
    li.appendChild(nodeWrapper);

    // 3. Recursively add children
    if (hasChildren) {
        const ul = document.createElement('ul');
        node.children.forEach(child => {
            ul.appendChild(renderTree(child));
        });
        li.appendChild(ul);
    }

    return li;
}

// Replace your existing addNode function with this one
async function addNode() {
    const parentId = document.getElementById('parentId').value;
    const content = document.getElementById('nodeContent').value.trim();
    const phone = document.getElementById('nodePhone').value;
    const description = document.getElementById('nodeDescription').value;
    const hierarchyPath = document.getElementById('hierarchy-path').innerText;

    if (!content) return alert("Please enter a Title.");
    if (!parentId) return alert("Please select a parent node first.");

    // Prepare Modal Data
    document.getElementById('modal-path-preview').innerText = `${hierarchyPath} > ${content}`;
    document.getElementById('modal-phone-preview').innerText = phone ? `📞 Phone: ${phone}` : "";
    document.getElementById('modal-desc-preview').innerText = description ? `📝 Note: ${description}` : "";

    // Show Modal
    const modal = document.getElementById('custom-modal');
    modal.style.display = 'flex';

    // Wait for button click using a Promise
    const confirmed = await new Promise((resolve) => {
        document.getElementById('confirm-yes').onclick = () => { modal.style.display = 'none'; resolve(true); };
        document.getElementById('confirm-no').onclick = () => { modal.style.display = 'none'; resolve(false); };
    });

    if (!confirmed) return;

    // Proceed with Fetch
    const payload = { Parent_ID: parentId, Content: content, Phone: phone, Description: description };
    const btn = document.querySelector('button[onclick="addNode()"]');
    btn.innerText = "Adding...";
    btn.disabled = true;

    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        document.getElementById('nodeContent').value = "";
        document.getElementById('nodePhone').value = "";
        document.getElementById('nodeDescription').value = "";
        fetchTree();
    } catch (err) {
        alert("Network Error!");
    } finally {
        btn.innerText = "Add to Tree";
        btn.disabled = false;
    }
}

function selectNode(id, element) {
    // 1. Highlight the node in the tree
    document.querySelectorAll('.node-container').forEach(el => el.classList.remove('node-active'));
    element.classList.add('node-active');

    // 2. Find the node data (Force ID to a Number for a clean match)
    const selectedNode = allNodesGlobal.find(n => Number(n.Node_ID) === Number(id));
    
    if (selectedNode) {
        // Update the Hidden Input for the API call
        document.getElementById('parentId').value = id;

        // Update the Visible Tile with the actual Content
        document.getElementById('parent-tile-text').innerText = selectedNode.Content;

        // 3. Update the Bold Hierarchy Path
        const path = getPath(id);
        document.getElementById('hierarchy-path').innerText = path.join(" > ");

        // Trigger the live path update now that a new parent is set
        updateLivePath();
        
        // Optional: Scroll the form into view on mobile
        document.querySelector('.add-node-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        console.error("Node not found in global data for ID:", id);
    }
}

// Recursive helper to find the path from Root to Node
function getPath(targetId) {
    let path = [];
    let currentId = targetId;

    while (currentId != 0) {
        const node = allNodesGlobal.find(n => n.Node_ID == currentId);
        if (node) {
            path.unshift(node.Content); // Add to beginning
            currentId = node.Parent_ID;
        } else {
            break;
        }
    }
    return path;
}


/**
 * Global Expand/Collapse Toggle
 * @param {boolean} expand - True to show all, False to hide all
 */
function toggleAll(expand) {
    const listItems = document.querySelectorAll('#tree-container li');
    
    listItems.forEach(li => {
        const toggleBtn = li.querySelector('.toggle-btn');
        const hasChildren = li.querySelector('ul');

        if (hasChildren && toggleBtn) {
            if (expand) {
                li.classList.remove('collapsed');
                toggleBtn.innerText = "[-] ";
            } else {
                li.classList.add('collapsed');
                toggleBtn.innerText = "[+] ";
            }
        }
    });
}

/**
 * Updates the hierarchy path label in real-time as the user types.
 */
function updateLivePath() {
    const parentId = document.getElementById('parentId').value;
    const currentInput = document.getElementById('nodeContent').value.trim();
    const pathDisplay = document.getElementById('hierarchy-path');

    // If no parent is selected yet
    if (!parentId) {
        pathDisplay.innerText = "Select a node...";
        return;
    }

    // Get the base path of the selected parent
    const basePaths = getPath(parentId);
    const basePathString = basePaths.join(" > ");

    // If the user has started typing, append their text with a different style
    if (currentInput.length > 0) {
        pathDisplay.innerHTML = `${basePathString} > <span style="color: #28a745; text-decoration: underline;">${currentInput}</span>`;
    } else {
        // Otherwise, just show the parent path
        pathDisplay.innerText = basePathString;
    }
}
