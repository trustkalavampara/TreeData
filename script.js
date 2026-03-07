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
    
    // Create the container for the node text
    const nodeWrapper = document.createElement('div');
    nodeWrapper.className = "node-container";
    nodeWrapper.innerHTML = `<span class="node-id">[${node.Node_ID}]</span> ${node.Content}`;
    
    // CLICK EVENT: Highlight and update form
    nodeWrapper.onclick = (e) => {
        e.stopPropagation(); // Prevent bubbling
        selectNode(node.Node_ID, nodeWrapper);
    };

    // Create Toggle Button (+/-)
    if (node.children && node.children.length > 0) {
        const toggle = document.createElement('span');
        toggle.className = "toggle-btn";
        toggle.innerText = "[-] ";
        toggle.onclick = (e) => {
            e.stopPropagation();
            const isCollapsed = li.classList.toggle('collapsed');
            toggle.innerText = isCollapsed ? "[+] " : "[-] ";
        };
        li.appendChild(toggle);
    } else {
        const spacer = document.createElement('span');
        spacer.className = "toggle-btn";
        li.appendChild(spacer);
    }

    li.appendChild(nodeWrapper);

    // Recursively add children
    if (node.children && node.children.length > 0) {
        const ul = document.createElement('ul');
        node.children.forEach(child => {
            ul.appendChild(renderTree(child));
        });
        li.appendChild(ul);
    }
    return li;
}

async function addNode() {
    const parentId = document.getElementById('parentId').value;
    const content = document.getElementById('nodeContent').value;

    if (!parentId || !content) return alert("Please fill all fields");

    const payload = { Parent_ID: parentId, Content: content };

    // Use 'no-cors' mode if you face issues, but standard fetch usually works for GAS
    await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    document.getElementById('nodeContent').value = "";
    fetchTree(); // Refresh to show new node
}

function selectNode(id, element) {
    // 1. Highlight UI
    document.querySelectorAll('.node-container').forEach(el => el.classList.remove('node-active'));
    element.classList.add('node-active');

    // 2. Update Read-Only Input
    document.getElementById('parentId').value = id;

    // 3. Display Hierarchy Path
    const path = getPath(id);
    document.getElementById('hierarchy-path').innerText = "Path: " + path.join(" > ");
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
