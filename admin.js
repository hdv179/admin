let groupCounter = 0;

// --- UTILS & HELPERS ---
const toB64 = str => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
const fromB64 = str => decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

function showStatus(text, type) {
    const msg = document.getElementById('status-msg');
    msg.innerText = text;
    msg.className = `status-msg ${type}`;
}

// --- KHỞI TẠO VÀ SỰ KIỆN CHÍNH ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tải cấu hình
    document.getElementById('gh-token').value = localStorage.getItem('hdv179_gh_token') || '';
    document.getElementById('gh-repo').value = localStorage.getItem('hdv179_gh_repo') || 'hdv179/wap';

    resetForm();

    // 2. Tải danh mục ban đầu
    const searchCat = document.getElementById('search-category');
    if (searchCat.value) fetchCategoryItems(searchCat.value);

    // 3. Gắn sự kiện tĩnh
    document.getElementById('btn-save-config').addEventListener('click', saveConfig);
    searchCat.addEventListener('change', (e) => fetchCategoryItems(e.target.value));
    document.getElementById('btn-add-text').addEventListener('click', () => addBlock('text'));
    document.getElementById('btn-add-image').addEventListener('click', () => addBlock('image'));
    document.getElementById('btn-add-group').addEventListener('click', () => addDownloadGroup());
    document.getElementById('builder-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-delete-item').addEventListener('click', deleteItem);

    // 4. Ủy quyền sự kiện động (Event Delegation)
    document.addEventListener('click', handleDynamicClicks);
    document.addEventListener('change', handleDynamicUploads);
});

function saveConfig() {
    localStorage.setItem('hdv179_gh_token', document.getElementById('gh-token').value.trim());
    localStorage.setItem('hdv179_gh_repo', document.getElementById('gh-repo').value.trim());
    alert('Đã lưu cấu hình API!');
    fetchCategoryItems(document.getElementById('search-category').value);
}

function resetForm() {
    document.getElementById('blocks-container').innerHTML = '';
    document.getElementById('dl-groups-container').innerHTML = '';
    addBlock('text');
    addDownloadGroup();
}

// --- TẠO CÁC NỘI DUNG ĐỘNG ---
function addBlock(type, val = '', caption = '') {
    const div = document.createElement('div');
    div.className = 'wap-card content-block-item';
    div.dataset.type = type;
    const uid = 'img-' + Date.now();

    div.innerHTML = type === 'text' ? `
        <div style="display:flex; justify-content:space-between;"><strong>📝 Đoạn Văn</strong><button type="button" class="btn btn-danger btn-remove">Xóa</button></div>
        <textarea class="form-control block-val" rows="3">${val}</textarea>
    ` : `
        <div style="display:flex; justify-content:space-between;"><strong>🖼️ Ảnh Minh Họa</strong><button type="button" class="btn btn-danger btn-remove">Xóa</button></div>
        <div class="upload-box" style="display:flex; gap:3px;">
            <input type="text" class="form-control block-val" id="${uid}-input" placeholder="assets/images/..." value="${val}" style="flex:1;">
            <input type="file" id="${uid}-file" class="upload-file-input" data-uid="${uid}" data-folder="assets/images" data-is-image="true" style="display:none;">
            <button type="button" class="btn btn-upload btn-trigger-file" data-target="${uid}-file">📤 Up</button>
        </div>
        <input type="text" class="form-control block-caption" placeholder="Chú thích ảnh" value="${caption}" style="margin-top:2px;">
    `;
    document.getElementById('blocks-container').appendChild(div);
}

function addDownloadGroup(title = '', files = []) {
    groupCounter++;
    const groupDiv = document.createElement('div');
    groupDiv.className = 'wap-card dl-group-item';
    const gId = `dl-files-${groupCounter}`;

    groupDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <strong style="color:var(--primary-main,#007bff)">Khối File #${groupCounter}</strong>
            <button type="button" class="btn btn-danger btn-remove">Xóa Khối</button>
        </div>
        <input type="text" class="form-control group-title" placeholder="Tiêu đề khối" value="${title}" style="margin-bottom:3px;">
        <div id="${gId}"></div>
        <button type="button" class="btn btn-secondary btn-block btn-add-file" data-gid="${gId}">+ Thêm File</button>
    `;
    document.getElementById('dl-groups-container').appendChild(groupDiv);

    if (files.length) files.forEach(f => addFileRow(gId, f.label, f.url, f.screen, f.os));
    else addFileRow(gId);
}

function addFileRow(gId, label = '', url = '', screenVal = 'Multi', osVal = 's40') {
    const container = document.getElementById(gId);
    if (!container) return;
    const uid = 'file-' + Date.now() + Math.random().toString(36).substr(2, 3);
    const screens = ['Multi', '128x128', '128x160', '176x208', '176x220', '240x320', '320x240', '360x640'];

    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.cssText = 'border-bottom:1px dashed #ccc; padding-bottom:4px; margin-bottom:4px; display:flex; flex-direction:column; gap:3px;';
    row.innerHTML = `
        <div style="display:flex; gap:3px;">
            <input type="text" class="form-control file-label" placeholder="Tên File (.JAR)" value="${label}" style="flex:1;">
            <input type="text" class="form-control custom-file-name" id="${uid}-custom" placeholder="Tên tệp tùy chọn" style="flex:1;">
        </div>
        <div style="display:flex; gap:3px;">
            <select id="${uid}-screen" class="form-control file-screen" style="flex:1;">
                ${screens.map(s => `<option value="${s}" ${screenVal === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select id="${uid}-os" class="form-control file-os" style="flex:1;">
                <option value="s40" ${osVal === 's40' ? 'selected' : ''}>s40</option>
                <option value="s60" ${osVal === 's60' ? 'selected' : ''}>s60</option>
                <option value="android" ${osVal === 'android' ? 'selected' : ''}>Android</option>
            </select>
        </div>
        <div class="upload-box" style="display:flex; gap:3px;">
            <input type="text" class="form-control file-url" id="${uid}-input" placeholder="assets/files/..." value="${url}" style="flex:1;">
            <input type="file" id="${uid}-file" class="upload-file-input" data-uid="${uid}" data-folder="assets/files" data-is-image="false" style="display:none;">
            <button type="button" class="btn btn-upload btn-trigger-file" data-target="${uid}-file">📤 Up</button>
            <button type="button" class="btn btn-danger btn-remove-row">X</button>
        </div>
    `;
    container.appendChild(row);
}

// --- XỬ LÝ SỰ KIỆN ĐỘNG ---
function handleDynamicClicks(e) {
    const t = e.target;
    if (t.classList.contains('btn-remove')) t.closest('.content-block-item, .dl-group-item')?.remove();
    if (t.classList.contains('btn-remove-row')) t.closest('.file-row')?.remove();
    if (t.classList.contains('btn-add-file')) addFileRow(t.dataset.gid);
    if (t.classList.contains('btn-trigger-file')) document.getElementById(t.dataset.target)?.click();
    if (t.classList.contains('btn-load-item')) loadItemData(t.dataset.id);
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

// --- GITHUB API API OPERATIONS ---
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
            <div style="padding: 3px 0; border-bottom: 1px dashed #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                <span>🔹 <b>${item.id}</b> - ${item.title ? item.title.replace(/"/g, '&quot;') : ''}</span>
                <button type="button" class="btn btn-secondary btn-load-item" data-id="${item.id}" style="font-size: 9px; padding: 1px 6px;">Sửa / Tải</button>
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
        (d.blocks || [{type:'text'}]).forEach(b => addBlock(b.type, b.value, b.caption));

        document.getElementById('dl-groups-container').innerHTML = '';
        groupCounter = 0;
        (d.downloads || [{}]).forEach(g => addDownloadGroup(g.groupTitle, g.files));

        showStatus(`✅ Đã nạp bài viết [${id}]!`, 'success');
        document.getElementById('builder-form').scrollIntoView({ behavior: 'smooth' });
    } catch (err) { showStatus(`❌ ${err.message}`, 'error'); }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const token = document.getElementById('gh-token').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    const category = document.getElementById('game-category').value;
    const itemId = document.getElementById('game-id').value.trim();

    if (!token || !repo) return showStatus('Thiếu Token hoặc Repo!', 'error');
    showStatus('⏳ Đang lưu bài viết...', 'success');

    let thumbUrl = '';
    const blocks = [];
    document.querySelectorAll('.content-block-item').forEach(el => {
        const val = el.querySelector('.block-val').value.trim();
        if (val) {
            const type = el.dataset.type;
            blocks.push({ type, value: val, caption: el.querySelector('.block-caption')?.value.trim() });
            if (type === 'image' && !thumbUrl) thumbUrl = val;
        }
    });

    const downloads = [];
    document.querySelectorAll('.dl-group-item').forEach(gEl => {
        const files = [];
        gEl.querySelectorAll('.file-row').forEach(fRow => {
            const l = fRow.querySelector('.file-label').value.trim();
            const u = fRow.querySelector('.file-url').value.trim();
            if (l && u) files.push({ label: l, url: u, screen: fRow.querySelector('.file-screen').value, os: fRow.querySelector('.file-os').value });
        });
        if (files.length) downloads.push({ groupTitle: gEl.querySelector('.group-title').value.trim() || 'DOWNLOAD', files });
    });

    const itemPayload = {
        id: itemId, title: document.getElementById('game-title').value.trim(),
        vendor: document.getElementById('game-vendor').value.trim(), category,
        screen: document.getElementById('game-screen').value.trim(),
        version: document.getElementById('game-version').value.trim(),
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

async function deleteItem() {
    const token = document.getElementById('gh-token').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    const itemId = document.getElementById('game-id').value.trim();
    const category = document.getElementById('game-category').value;

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
