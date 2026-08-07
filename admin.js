let groupCounter = 0;
let draggedBlock = null;
let draggedGroup = null;

// --- UTILS & HELPERS ---
const getEl = id => document.getElementById(id);
const toB64 = str => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
const fromB64 = str => decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function showStatus(text, type = 'success') {
    const msg = getEl('status-msg');
    if (msg) {
        msg.innerText = text;
        msg.className = `status-msg ${type}`;
    }
}

// --- KHỞI TẠO VÀ SỰ KIỆN CHÍNH ---
document.addEventListener('DOMContentLoaded', () => {
    getEl('gh-token').value = localStorage.getItem('hdv179_gh_token') || '';
    getEl('gh-repo').value = localStorage.getItem('hdv179_gh_repo') || 'hdv179/wap';

    resetForm();

    const searchCat = getEl('search-category');
    if (searchCat?.value) fetchCategoryItems(searchCat.value);

    getEl('btn-save-config')?.addEventListener('click', saveConfig);
    searchCat?.addEventListener('change', (e) => fetchCategoryItems(e.target.value));
    getEl('btn-add-text')?.addEventListener('click', () => addBlock('text'));
    getEl('btn-add-image')?.addEventListener('click', () => addBlock('image'));
    getEl('btn-add-group')?.addEventListener('click', () => addDownloadGroup());
    getEl('builder-form')?.addEventListener('submit', handleFormSubmit);
    getEl('btn-delete-item')?.addEventListener('click', deleteItem);

    document.addEventListener('click', handleDynamicClicks);
    document.addEventListener('change', handleDynamicUploads);

    const blocksContainer = getEl('blocks-container');
    blocksContainer?.addEventListener('dragstart', handleBlockDragStart);
    blocksContainer?.addEventListener('dragover', handleBlockDragOver);
    blocksContainer?.addEventListener('drop', handleBlockDrop);
    blocksContainer?.addEventListener('dragend', handleBlockDragEnd);

    const groupsContainer = getEl('dl-groups-container');
    groupsContainer?.addEventListener('dragstart', handleGroupDragStart);
    groupsContainer?.addEventListener('dragover', handleGroupDragOver);
    groupsContainer?.addEventListener('drop', handleGroupDrop);
    groupsContainer?.addEventListener('dragend', handleGroupDragEnd);
});

function saveConfig() {
    localStorage.setItem('hdv179_gh_token', getEl('gh-token').value.trim());
    localStorage.setItem('hdv179_gh_repo', getEl('gh-repo').value.trim());
    alert('Đã lưu cấu hình API!');
    fetchCategoryItems(getEl('search-category').value);
}

function resetForm() {
    getEl('game-id').value = '';
    getEl('game-category').value = 'gameloft';
    getEl('game-title').value = '';
    getEl('game-vendor').value = '';
    getEl('game-screen').value = 'Multi screen';
    getEl('game-version').value = '1.0';
    getEl('blocks-container').innerHTML = '';
    getEl('dl-groups-container').innerHTML = '';
    groupCounter = 0;
    addBlock('text');
    addDownloadGroup();
}

// --- TẠO CÁC NỘI DUNG ĐỘNG ---
function addBlock(type, val = '', caption = '') {
    const div = document.createElement('div');
    div.className = 'wap-card content-block-item';
    div.dataset.type = type;
    div.draggable = true;
    const uid = 'img-' + Date.now();

    div.innerHTML = type === 'text' ? `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>📝 Đoạn Văn</strong>
            <div style="display:flex; align-items:center; gap:4px;">
                <span class="drag-handle" title="Kéo để sắp xếp">⋮⋮</span>
                <button type="button" class="btn btn-danger btn-remove">Xóa</button>
            </div>
        </div>
        <textarea class="form-control block-val" rows="3">${escapeHtml(val)}</textarea>
    ` : `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>🖼️ Ảnh Minh Họa</strong>
            <div style="display:flex; align-items:center; gap:4px;">
                <span class="drag-handle" title="Kéo để sắp xếp">⋮⋮</span>
                <button type="button" class="btn btn-danger btn-remove">Xóa</button>
            </div>
        </div>
        <div class="upload-box" style="display:flex; gap:3px;">
            <input type="text" class="form-control block-val" id="${uid}-input" placeholder="assets/images/..." value="${escapeHtml(val)}" style="flex:1;">
            <input type="file" id="${uid}-file" class="upload-file-input" data-uid="${uid}" data-folder="assets/images" data-is-image="true" style="display:none;">
            <button type="button" class="btn btn-upload btn-trigger-file" data-target="${uid}-file">📤 Up</button>
        </div>
        <input type="text" class="form-control block-caption" placeholder="Chú thích ảnh" value="${escapeHtml(caption)}" style="margin-top:2px;">
    `;
    getEl('blocks-container').appendChild(div);
}

function addDownloadGroup(title = '', files = []) {
    groupCounter++;
    const groupDiv = document.createElement('div');
    groupDiv.className = 'wap-card dl-group-item';
    groupDiv.style.cssText = 'width: 100%; box-sizing: border-box; text-align: left;';
    groupDiv.draggable = true;
    const gId = `dl-files-${groupCounter}`;

    groupDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:2px; align-items:center;">
            <strong style="color:var(--primary-main,#007bff)">Khối File #${groupCounter}</strong>
            <div style="display:flex; align-items:center; gap:4px;">
                <span class="drag-handle" title="Kéo để sắp xếp">⋮⋮</span>
                <button type="button" class="btn btn-danger btn-remove">Xóa Khối</button>
            </div>
        </div>
        <input type="text" class="form-control group-title" placeholder="Tiêu đề khối" value="${escapeHtml(title)}" style="margin-bottom:3px; width:100%; box-sizing:border-box;">
        <div id="${gId}" style="width:100%;"></div>
        <button type="button" class="btn btn-secondary btn-block btn-add-file" data-gid="${gId}">+ Thêm File</button>
    `;
    getEl('dl-groups-container').appendChild(groupDiv);

    if (files.length) files.forEach(f => addFileRow(gId, f.label, f.url, f.screen, f.os));
    else addFileRow(gId);
}

function addFileRow(gId, label = '', url = '', screenVal = 'Multi', osVal = 's40') {
    const container = getEl(gId);
    if (!container) return;
    const uid = 'file-' + Date.now() + Math.random().toString(36).substr(2, 3);
    const screens = ['Multi', '128x128', '128x160', '176x208', '176x220', '240x320', '320x240', '360x640'];

    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.cssText = 'border-bottom:1px dashed #ccc; padding-bottom:6px; margin-bottom:6px; display:flex; flex-direction:column; gap:4px; width:100%; box-sizing:border-box; text-align:left;';
    
    row.innerHTML = `
        <div style="display:flex; gap:4px; width:100%;">
            <input type="text" class="form-control file-label" placeholder="Tên hiển thị (.JAR)" value="${escapeHtml(label)}" style="flex:1; min-width:0; width:100%; box-sizing:border-box;">
            <input type="text" class="form-control custom-file-name" id="${uid}-custom" placeholder="Tên tệp tùy chọn" style="flex:1; min-width:0; width:100%; box-sizing:border-box;">
        </div>
        <div style="display:flex; gap:4px; width:100%;">
            <select id="${uid}-screen" class="form-control file-screen" style="flex:1; min-width:0; width:100%; box-sizing:border-box;">
                ${screens.map(s => `<option value="${s}" ${screenVal === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select id="${uid}-os" class="form-control file-os" style="flex:1; min-width:0; width:100%; box-sizing:border-box;">
                <option value="s40" ${osVal === 's40' ? 'selected' : ''}>s40</option>
                <option value="s60" ${osVal === 's60' ? 'selected' : ''}>s60</option>
                <option value="android" ${osVal === 'android' ? 'selected' : ''}>Android</option>
            </select>
        </div>
        <div class="upload-box" style="display:flex; gap:4px; width:100%;">
            <input type="text" class="form-control file-url" id="${uid}-input" placeholder="assets/files/..." value="${escapeHtml(url)}" style="flex:1; min-width:0; width:100%; box-sizing:border-box;">
            <input type="file" id="${uid}-file" class="upload-file-input" data-uid="${uid}" data-folder="assets/files" data-is-image="false" style="display:none;">
            <button type="button" class="btn btn-upload btn-trigger-file" data-target="${uid}-file">📤 Up</button>
            <button type="button" class="btn btn-danger btn-remove-row">X</button>
        </div>
    `;
    container.appendChild(row);
}

// --- XỬ LÝ SỰ KIỆN ĐỘNG ---
function handleBlockDragStart(e) {
    const item = e.target.closest('.content-block-item');
    if (!item) return;
    draggedBlock = item;
    item.classList.add('dragging');
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    }
}

function handleBlockDragOver(e) {
    const item = e.target.closest('.content-block-item');
    if (!item || !draggedBlock || item === draggedBlock) return;
    e.preventDefault();
    const rect = item.getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    const container = getEl('blocks-container');
    container.insertBefore(draggedBlock, isAfter ? item.nextSibling : item);
}

function handleBlockDrop(e) {
    e.preventDefault();
    if (!draggedBlock) return;
    draggedBlock.classList.remove('dragging');
    draggedBlock = null;
}

function handleBlockDragEnd() {
    document.querySelectorAll('.content-block-item.dragging').forEach(el => el.classList.remove('dragging'));
    draggedBlock = null;
}

function handleGroupDragStart(e) {
    const item = e.target.closest('.dl-group-item');
    if (!item) return;
    draggedGroup = item;
    item.classList.add('dragging');
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    }
}

function handleGroupDragOver(e) {
    const item = e.target.closest('.dl-group-item');
    if (!item || !draggedGroup || item === draggedGroup) return;
    e.preventDefault();
    const rect = item.getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    const container = getEl('dl-groups-container');
    container.insertBefore(draggedGroup, isAfter ? item.nextSibling : item);
}

function handleGroupDrop(e) {
    e.preventDefault();
    if (!draggedGroup) return;
    draggedGroup.classList.remove('dragging');
    draggedGroup = null;
}

function handleGroupDragEnd() {
    document.querySelectorAll('.dl-group-item.dragging').forEach(el => el.classList.remove('dragging'));
    draggedGroup = null;
}

function handleDynamicClicks(e) {
    const t = e.target;
    if (t.classList.contains('btn-remove')) t.closest('.content-block-item, .dl-group-item')?.remove();
    if (t.classList.contains('btn-remove-row')) t.closest('.file-row')?.remove();
    if (t.classList.contains('btn-add-file')) addFileRow(t.dataset.gid);
    if (t.classList.contains('btn-trigger-file')) document.getElementById(t.dataset.target)?.click();
    if (t.classList.contains('btn-load-item')) loadItemData(t.dataset.id);
    if (t.classList.contains('btn-delete-item-list')) deleteItemFromList(t.dataset.id, t.dataset.category);
}

function handleDynamicUploads(e) {
    if (e.target.classList.contains('upload-file-input')) {
        const input = e.target;
        const file = input.files[0];
        if (!file) return;

        const uid = input.dataset.uid;
        const isImage = input.dataset.isImage === 'true';
        const folderPath = input.dataset.folder;
        const custom = document.getElementById(`${uid}-custom`)?.value.trim();
        const screen = document.getElementById(`${uid}-screen`)?.value || '';
        const os = document.getElementById(`${uid}-os`)?.value || '';
        const id = document.getElementById('game-id').value.trim() || 'file';

        const baseName = isImage ? `${id}_${Date.now()}` : `${custom || id}_${screen}_${os}_${Date.now()}`;
        uploadToGitHub(file, folderPath, baseName, document.getElementById(`${uid}-input`));
    }
}

// --- GITHUB API OPERATIONS ---
async function fetchCategoryItems(cat) {
    const container = document.getElementById('category-items-list');
    if (!cat) return container.innerHTML = '';
    container.innerHTML = '🔄 Đang tải danh sách bài viết...';

    const token = document.getElementById('gh-token').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    if (!repo) return container.innerHTML = '<div style="color:#cc0000;">Chưa cấu hình Repo!</div>';

    try {
        const headers = token ? { 'Authorization': `token ${token}` } : {};
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/index/${cat}.json?v=${Date.now()}`, { headers });
        if (res.status === 404) return container.innerHTML = '<div style="color:#666;">Danh mục này chưa có bài viết nào.</div>';
        if (!res.ok) throw new Error((await res.json()).message);

        const items = JSON.parse(fromB64((await res.json()).content));
        if (!items.length) return container.innerHTML = '<div style="color:#666;">Danh mục trống.</div>';

        container.innerHTML = items.map(item => `
            <div style="padding: 3px 0; border-bottom: 1px dashed #e0e0e0; display: flex; justify-content: space-between; align-items: center; gap: 4px;">
                <span style="flex: 1;">🔹 <b>${item.id}</b> - ${item.title ? item.title.replace(/"/g, '&quot;') : ''}</span>
                <div style="display:flex; gap:2px;">
                    <button type="button" class="btn btn-secondary btn-load-item" data-id="${item.id}" style="font-size: 9px; padding: 1px 6px;">Sửa</button>
                    <button type="button" class="btn btn-danger btn-delete-item-list" data-id="${item.id}" data-category="${cat}" style="font-size: 9px; padding: 1px 6px;">Xóa</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div style="color:#cc0000;">Lỗi: ${err.message}</div>`;
    }
}

async function uploadToGitHub(file, folderPath, baseName, targetInput) {
    const token = document.getElementById('gh-token').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    if (!token || !repo) return alert('Thiếu Token hoặc Repo!');

    const filePath = `${folderPath}/${baseName}.${file.name.split('.').pop()}`;
    showStatus(`⏳ Đang tải file ${file.name}...`, 'success');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Upload: ${filePath}`, content: e.target.result.split(',')[1] })
            });
            if (!res.ok) throw new Error((await res.json()).message);
            targetInput.value = filePath;
            showStatus(`✅ Đã Upload: ${filePath}`, 'success');
        } catch (err) { showStatus(`❌ Lỗi Upload: ${err.message}`, 'error'); }
    };
    reader.readAsDataURL(file);
}

async function loadItemData(id) {
    if (!id) return alert('Không tìm thấy Mã ID!');
    showStatus(`⏳ Đang tải bài [${id}]...`, 'success');
    resetForm();

    const token = document.getElementById('gh-token').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();

    try {
        const headers = token ? { 'Authorization': `token ${token}` } : {};
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/items/${id}.json?v=${Date.now()}`, { headers });
        if (!res.ok) throw new Error('Bài viết chưa có dữ liệu');

        const d = JSON.parse(fromB64((await res.json()).content));
        document.getElementById('game-id').value = d.id || '';
        document.getElementById('game-category').value = d.category || 'gameloft';
        document.getElementById('game-title').value = d.title || '';
        document.getElementById('game-vendor').value = d.vendor || '';
        document.getElementById('game-screen').value = d.screen || 'Multi screen';
        document.getElementById('game-version').value = d.version || '1.0';

        document.getElementById('blocks-container').innerHTML = '';
        document.getElementById('dl-groups-container').innerHTML = '';
        groupCounter = 0;
        (d.blocks || [{type:'text'}]).forEach(b => addBlock(b.type, b.value, b.caption));
        (d.downloads || [{}]).forEach(g => addDownloadGroup(g.groupTitle, g.files));

        showStatus(`✅ Đã nạp bài viết [${id}]!`, 'success');
        document.getElementById('builder-form').scrollIntoView({ behavior: 'smooth' });
    } catch (err) { showStatus(`❌ ${err.message}`, 'error'); }
}

function collectBlocks() {
    const blocks = [];
    document.querySelectorAll('.content-block-item').forEach(el => {
        const val = el.querySelector('.block-val')?.value.trim();
        if (!val) return;
        blocks.push({ type: el.dataset.type, value: val, caption: el.querySelector('.block-caption')?.value.trim() });
    });
    return blocks;
}

function collectDownloads() {
    const downloads = [];
    document.querySelectorAll('.dl-group-item').forEach(gEl => {
        const files = [];
        gEl.querySelectorAll('.file-row').forEach(fRow => {
            const label = fRow.querySelector('.file-label')?.value.trim();
            const url = fRow.querySelector('.file-url')?.value.trim();
            if (label && url) files.push({ label, url, screen: fRow.querySelector('.file-screen')?.value, os: fRow.querySelector('.file-os')?.value });
        });
        if (files.length) downloads.push({ groupTitle: gEl.querySelector('.group-title')?.value.trim() || 'DOWNLOAD', files });
    });
    return downloads;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const token = getEl('gh-token').value.trim();
    const repo = getEl('gh-repo').value.trim();
    const category = getEl('game-category').value;
    const itemId = getEl('game-id').value.trim();

    if (!token || !repo) return showStatus('Thiếu Token hoặc Repo!', 'error');
    showStatus('⏳ Đang lưu bài viết...', 'success');

    const blocks = collectBlocks();
    const downloads = collectDownloads();
    const thumbUrl = blocks.find(b => b.type === 'image')?.value || '';

    const itemPayload = {
        id: itemId, title: getEl('game-title').value.trim(),
        vendor: getEl('game-vendor').value.trim(), category,
        screen: getEl('game-screen').value.trim(),
        version: getEl('game-version').value.trim(),
        date: new Date().toLocaleDateString('vi-VN'), blocks, downloads
    };

    try {
        const headers = { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' };
        
        // 1. Lưu item file
        const itemUrl = `https://api.github.com/repos/${repo}/contents/data/items/${itemId}.json`;
        let itemSha = null;
        const iCheck = await fetch(itemUrl, { headers: { 'Authorization': `token ${token}` } });
        if (iCheck.ok) itemSha = (await iCheck.json()).sha;

        await fetch(itemUrl, {
            method: 'PUT', headers,
            body: JSON.stringify({ message: `Save item: ${itemId}`, content: toB64(JSON.stringify(itemPayload, null, 2)), sha: itemSha })
        });

        // 2. Cập nhật Index
        const idxUrl = `https://api.github.com/repos/${repo}/contents/data/index/${category}.json`;
        let idxItems = [], idxSha = null;
        const idxCheck = await fetch(idxUrl, { headers: { 'Authorization': `token ${token}` } });
        if (idxCheck.ok) {
            const d = await idxCheck.json();
            idxSha = d.sha;
            idxItems = JSON.parse(fromB64(d.content));
        }

        idxItems = idxItems.filter(i => i.id !== itemId);
        idxItems.unshift({ id: itemId, title: itemPayload.title, vendor: itemPayload.vendor, screen: itemPayload.screen, thumb: thumbUrl });

        await fetch(idxUrl, {
            method: 'PUT', headers,
            body: JSON.stringify({ message: `Update index: ${category}`, content: toB64(JSON.stringify(idxItems, null, 2)), sha: idxSha })
        });

        showStatus('🎉 Lưu thành công!', 'success');
        fetchCategoryItems(category);
    } catch (err) { showStatus(`❌ Lỗi: ${err.message}`, 'error'); }
}

async function deleteItemFromList(itemId, category) {
    const token = getEl('gh-token').value.trim();
    const repo = getEl('gh-repo').value.trim();

    if (!itemId || !confirm(`Xóa bài viết [${itemId}]?`)) return;
    showStatus(`⏳ Đang xóa [${itemId}]...`, 'error');

    try {
        const headers = { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' };
        const itemUrl = `https://api.github.com/repos/${repo}/contents/data/items/${itemId}.json`;
        const iCheck = await fetch(itemUrl, { headers: { 'Authorization': `token ${token}` } });

        if (iCheck.ok) {
            await fetch(itemUrl, {
                method: 'DELETE', headers,
                body: JSON.stringify({ message: `Delete: ${itemId}`, sha: (await iCheck.json()).sha })
            });
        }

        const idxUrl = `https://api.github.com/repos/${repo}/contents/data/index/${category}.json`;
        const idxCheck = await fetch(idxUrl, { headers: { 'Authorization': `token ${token}` } });
        if (idxCheck.ok) {
            const d = await idxCheck.json();
            const idxItems = JSON.parse(fromB64(d.content)).filter(i => i.id !== itemId);
            await fetch(idxUrl, {
                method: 'PUT', headers,
                body: JSON.stringify({ message: `Remove ${itemId}`, content: toB64(JSON.stringify(idxItems, null, 2)), sha: d.sha })
            });
        }

        showStatus(`🗑️ Đã xóa bài viết [${itemId}]!`, 'success');
        fetchCategoryItems(category);
    } catch (err) { showStatus(`❌ Lỗi xóa: ${err.message}`, 'error'); }
}

async function deleteItem() {
    const token = getEl('gh-token').value.trim();
    const repo = getEl('gh-repo').value.trim();
    const itemId = getEl('game-id').value.trim();
    const category = getEl('game-category').value;

    if (!itemId || !confirm(`Xóa bài viết [${itemId}]?`)) return;
    showStatus(`⏳ Đang xóa [${itemId}]...`, 'error');

    try {
        const headers = { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' };
        const itemUrl = `https://api.github.com/repos/${repo}/contents/data/items/${itemId}.json`;
        const iCheck = await fetch(itemUrl, { headers: { 'Authorization': `token ${token}` } });
        
        if (iCheck.ok) {
            await fetch(itemUrl, {
                method: 'DELETE', headers,
                body: JSON.stringify({ message: `Delete: ${itemId}`, sha: (await iCheck.json()).sha })
            });
        }

        const idxUrl = `https://api.github.com/repos/${repo}/contents/data/index/${category}.json`;
        const idxCheck = await fetch(idxUrl, { headers: { 'Authorization': `token ${token}` } });
        if (idxCheck.ok) {
            const d = await idxCheck.json();
            const idxItems = JSON.parse(fromB64(d.content)).filter(i => i.id !== itemId);
            await fetch(idxUrl, {
                method: 'PUT', headers,
                body: JSON.stringify({ message: `Remove ${itemId}`, content: toB64(JSON.stringify(idxItems, null, 2)), sha: d.sha })
            });
        }

        showStatus(`🗑️ Đã xóa bài viết [${itemId}]!`, 'success');
        resetForm();
        fetchCategoryItems(category);
    } catch (err) { showStatus(`❌ Lỗi xóa: ${err.message}`, 'error'); }
}
