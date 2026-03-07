const GAS_URL = "https://script.google.com/macros/s/AKfycbzpGnygs5D7ujnWzSi19R7TZOVrJusPaFsDHvkcd8PCMpUt7PLf2t5GSeUFQyp_pcfsLQ/exec";

// Fetch data on load
window.onload = fetchTree;

async function fetchTree() {
    const container = document.getElementById('tree-container');
    container.innerHTML = "Loading...";

    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        
        container.innerHTML = ""; // Clear loader
        const treeRoot = buildTree(data);
        container.appendChild(renderTree(treeRoot));
    } catch (err) {
        container.innerHTML = "Error loading tree. Make sure your GAS URL is correct and deployed to 'Anyone'.";
        console.error(err);
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
    if (!node) return document.createTextNode("No data");

    const li = document.createElement('li');
    li.innerHTML = `<span class="node-id">[${node.Node_ID}]</span> ${node.Content}`;

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
