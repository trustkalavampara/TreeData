/**
 * TREE CONFIGURATION
 * Replace this URL with your "Current Web App URL" from the Google Apps Script Deploy menu.
 */
const GAS_URL = "https://script.google.com/macros/s/AKfycbzpGnygs5D7ujnWzSi19R7TZOVrJusPaFsDHvkcd8PCMpUt7PLf2t5GSeUFQyp_pcfsLQ/exec";

// Global storage for the flat node list
let allNodesGlobal = []; 

// Initialize on page load
window.onload = fetchTree;

/**
 * 1. DATA LOADING
 * Fetches the flat JSON array from Google Sheets and triggers the render.
 */
async function fetchTree() {
    const container = document.getElementById('tree-container');
    container.innerHTML = "<div style='padding:20px; color:#666;'>🌳 Loading Tree Data...</div>";

    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        allNodesGlobal = data; 
        
        container.innerHTML = "";
        const treeRoot = buildTree(data);
        
        if (treeRoot) {
            container.appendChild(renderTree(treeRoot));

            // This ensures that if the checkbox is "Unchecked", 
            // the new tree we just built immediately hides its images.
            updateImageVisibility();
            
        } else {
            container.innerHTML = "<div style='color:red;'>No root node found. Please check your sheet.</div>";
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        container.innerHTML = "<div style='color:red;'>Error loading tree. Ensure your Web App is deployed and GAS_URL is correct.</div>";
    }
}

/**
 * 2. TREE LOGIC
 * Converts a flat array into a nested parent-child object.
 */
function buildTree(nodes) {
    const map = {};
    let root = null;

    nodes.forEach(node => {
        map[String(node.Node_ID)] = { ...node, children: [] };
    });

    nodes.forEach(node => {
        const parentId = String(node.Parent_ID);
        if (node.Parent_ID == 0 || !map[parentId]) {
            if (!root) root = map[String(node.Node_ID)];
        } else {
            map[parentId].children.push(map[String(node.Node_ID)]);
        }
    });
    return root;
}

/**
 * 3. RENDER LOGIC
 * Layout: [Toggle] [ [Image(45px)] [ID + Content] ]
 */
function renderTree(node) {
    if (!node) return document.createTextNode("");

    const li = document.createElement('li');
    const hasChildren = node.children && node.children.length > 0;
    
    // 1. Toggle Button ([+] / [-])
    const toggle = document.createElement('span');
    toggle.className = "toggle-btn";
    if (hasChildren) {
        toggle.innerText = "[-] "; 
        toggle.onclick = (e) => {
            e.stopPropagation();
            const isCollapsed = li.classList.toggle('collapsed');
            toggle.innerText = isCollapsed ? "[+] " : "[-] ";
        };
    } else {
        toggle.innerHTML = "&nbsp;&nbsp;&nbsp;"; 
        toggle.style.cursor = "default";
    }
    li.appendChild(toggle);

    // 2. Node Container (Flexbox Row Layout)
    const nodeWrapper = document.createElement('div');
    nodeWrapper.className = "node-container";
    
    // Apply Compact Flexbox styles
    nodeWrapper.style.display = "inline-flex";
    nodeWrapper.style.flexDirection = "row";
    nodeWrapper.style.alignItems = "center";
    nodeWrapper.style.gap = "10px";
    nodeWrapper.style.padding = "4px 8px";
    nodeWrapper.style.verticalAlign = "middle";
    nodeWrapper.style.borderRadius = "6px";

    // Image Logic (Fixed 45px Square + Referrer fix)
    let imageHTML = "";
    if (node.Image_URL && node.Image_URL.length > 10 && node.Image_URL !== "null") {
        imageHTML = `
            <img src="${node.Image_URL}" 
                 referrerpolicy="no-referrer"
                 alt="node-img" 
                 class="node-image"
                 style="width: 64px; height: 64px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; flex-shrink: 0;"
                 onerror="this.style.display='none'">`;
    } else {
      imageHTML = `<div class="node-placeholder" style="width: 64px; height: 64px; background: #f5f5f5; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #ddd; font-size: 8px; border: 1px dashed #ccc;">No Img</div>`;
    }

    // Combine Image and Text
    nodeWrapper.innerHTML = `
        ${imageHTML}
            <div style="display: flex; flex-direction: column; text-align: left; justify-content: center;">
                <div style="font-size: 0.7rem; color: #999; font-weight: bold; margin-bottom: 2px;">#${node.Node_ID}</div>
                <div style="font-size: 0.9rem; color: #333; line-height: 1.2; font-weight: 500;">${node.Content}</div>
            </div>
    `;
    
    nodeWrapper.onclick = (e) => {
        e.stopPropagation();
        selectNode(node.Node_ID, nodeWrapper);
    };
    li.appendChild(nodeWrapper);

    // 3. Recursive Children Rendering
    if (hasChildren) {
        const ul = document.createElement('ul');
        node.children.forEach(child => {
            ul.appendChild(renderTree(child));
        });
        li.appendChild(ul);
    }
    return li;
}

/**
 * GLOBAL IMAGE TOGGLE
 * Shows or hides all images in the tree instantly without re-fetching data.
 */
function updateImageVisibility() {
    const isChecked = document.getElementById('imageToggle').checked;
    const container = document.getElementById('tree-container');
    
    if (isChecked) {
        container.classList.remove('hide-images');
    } else {
        container.classList.add('hide-images');
    }
}

/**
 * 4. FORM SUBMISSION
 */
async function addNode() {
    const parentId = document.getElementById('parentId').value;
    const content = document.getElementById('nodeContent').value.trim();
    const phone = document.getElementById('nodePhone').value;
    const description = document.getElementById('nodeDescription').value;
    const fileInput = document.getElementById('nodeImage'); 
    
    if (!content) return alert("Please enter a Title.");
    if (!parentId) return alert("Please select a parent node from the tree first.");

    let base64Image = "";
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 5 * 1024 * 1024) return alert("File too large. Max 5MB allowed.");
        try {
            base64Image = await toBase64(file);
        } catch (err) {
            return alert("Failed to process image file.");
        }
    }

    // Modal Confirmation
    const pathPreview = document.getElementById('hierarchy-path').innerHTML;
    document.getElementById('modal-path-preview').innerHTML = pathPreview;
    document.getElementById('modal-phone-preview').innerText = phone ? `📞 Phone: ${phone}` : "";
    document.getElementById('modal-desc-preview').innerText = description ? `📝 Note: ${description}` : "";
    document.querySelector('.modal-details').style.display = (phone || description) ? 'block' : 'none';

    const modal = document.getElementById('custom-modal');
    modal.style.display = 'flex';

    const confirmed = await new Promise((resolve) => {
        document.getElementById('confirm-yes').onclick = () => { modal.style.display = 'none'; resolve(true); };
        document.getElementById('confirm-no').onclick = () => { modal.style.display = 'none'; resolve(false); };
    });

    if (!confirmed) return;

    const payload = { 
        Parent_ID: parentId, 
        Content: content, 
        Phone: phone, 
        Description: description,
        Image_Base64: base64Image 
    };

    try {
        const response = await fetch(GAS_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        const result = await response.json();

        if (result.status === "success") {
            document.getElementById('nodeContent').value = "";
            document.getElementById('nodePhone').value = "";
            document.getElementById('nodeDescription').value = "";
            document.getElementById('nodeImage').value = ""; 
            document.getElementById('parentId').value = "";
            document.getElementById('parent-tile-text').innerText = "None Selected";
            document.getElementById('hierarchy-path').innerText = "Select a node...";
            fetchTree();
        } else {
            alert("Server Error: " + result.message);
        }
    } catch (err) {
        alert("Submission failed. Check your Deployment.");
    }
}

/**
 * UTILITY FUNCTIONS
 */
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function selectNode(id, element) {
    document.querySelectorAll('.node-container').forEach(el => el.classList.remove('node-active'));
    element.classList.add('node-active');

    const selectedNode = allNodesGlobal.find(n => String(n.Node_ID) === String(id));
    
    if (selectedNode) {
        document.getElementById('parentId').value = id;
        document.getElementById('parent-tile-text').innerText = selectedNode.Content;
        const path = getPath(id);
        document.getElementById('hierarchy-path').innerText = path.join(" > ");
        updateLivePath();
    }
}

function getPath(targetId) {
    let path = [];
    let currentId = targetId;
    while (currentId != 0) {
        const node = allNodesGlobal.find(n => String(n.Node_ID) === String(currentId));
        if (node) {
            path.unshift(node.Content);
            currentId = node.Parent_ID;
        } else {
            break;
        }
    }
    return path;
}

function toggleAll(expand) {
    document.querySelectorAll('#tree-container li').forEach(li => {
        const btn = li.querySelector('.toggle-btn');
        const hasUl = li.querySelector('ul');
        if (hasUl && btn) {
            if (expand) {
                li.classList.remove('collapsed');
                btn.innerText = "[-] ";
            } else {
                li.classList.add('collapsed');
                btn.innerText = "[+] ";
            }
        }
    });
}

function updateLivePath() {
    const parentId = document.getElementById('parentId').value;
    const currentInput = document.getElementById('nodeContent').value.trim();
    const pathDisplay = document.getElementById('hierarchy-path');

    if (!parentId) {
        pathDisplay.innerText = "Select a node...";
        return;
    }

    const basePaths = getPath(parentId);
    const basePathString = basePaths.join(" > ");

    if (currentInput.length > 0) {
        pathDisplay.innerHTML = `${basePathString} > <span style="color: #28a745; text-decoration: underline;">${currentInput}</span>`;
    } else {
        pathDisplay.innerText = basePathString;
    }
}
