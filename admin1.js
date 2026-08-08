/**
 * admin.js - WAP Site Admin Panel (GitHub REST API Engine)
 * Đã tích hợp: Base64 UTF-8, CRUD JSON, Tải tệp, Xóa file thừa trên GitHub, Screen & OS Metadata.
 */

// ==========================================
// 1. HELPER FUNCTIONS & BASE64 UTF-8
// ==========================================

const getEl = (id) => document.getElementById(id);

// Mã hóa chuỗi UTF-8 sang Base64 chuẩn
function toB64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
        String.fromCharCode('0x' + p1)
    ));
}

// Giải mã Base64 sang chuỗi UTF-8
function fromB64(str) {
    return decodeURIComponent(atob(str).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
}

// Hiển thị thông báo trạng thái
function showStatus(message, type = 'info') {
    const statusBox = getEl('status-box');
    if (!statusBox) return;
    
    statusBox.innerText = message;
    statusBox.className = `status-msg status-${type}`;
    statusBox.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => { statusBox.style.display = 'none'; }, 4000);
    }
}

// ==========================================
// 2. GITHUB REST API CORE FUNCTIONS
// ==========================================

// Lấy nội dung file JSON từ GitHub
async function getGitHubFile(filePath) {
    const token = getEl('gh-token').value.trim();
    const repo = getEl('gh-repo').value.trim();
    if (!token || !repo) throw new Error('Vui lòng nhập đầy đủ GitHub Token và Repo!');

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(filePath)}`, {
        headers: { 'Authorization': `token ${token}` }
    });

    if (!res.ok) {
        if (res.status === 404) return null; // File chưa tồn tại
        const err = await res.json();
        throw new Error(err.message || 'Lỗi khi lấy dữ liệu từ GitHub');
    }

    const data = await res.json();
    const jsonString = fromB64(data.content.replace(/\s/g, ''));
    return { sha: data.sha, content: JSON.parse(jsonString) };
}

// Lưu hoặc cập nhật file JSON lên GitHub
async function saveGitHubFile(filePath, jsonContent, sha = null, commitMsg = 'Update data') {
    const token = getEl('gh-token').value.trim();
    const repo = getEl('gh-repo').value.trim();
    if (!token || !repo) throw new Error('Thiếu Token hoặc Repo!');

    const bodyData = {
        message: commitMsg,
        content: toB64(JSON.stringify(jsonContent, null, 2))
    };
    if (sha) bodyData.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(filePath)}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi khi lưu dữ liệu lên GitHub');
    }

    return await res.json();
}

// Xóa một file bất kỳ trên GitHub Repository
async function deleteFromGitHub(filePath) {
    const token = getEl('gh-token').value.trim();
    const repo = getEl('gh-repo').value.trim();
    
    // Bỏ qua nếu thiếu cấu hình hoặc là URL ngoài (http/https)
    if (!token || !repo || !filePath) return false;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return false;

    try {
        const encodedPath = encodeURI(filePath);
        // Bước 1: Lấy SHA của file
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${encodedPath}`, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (!getRes.ok) return false;
        const fileData = await getRes.json();

        // Bước 2: Gọi lệnh DELETE
        const delRes = await fetch(`https://api.github.com/repos/${repo}/contents/${encodedPath}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `[Auto-Clean] Delete file: ${filePath}`,
                sha: fileData.sha
            })
        });

        return delRes.ok;
    } catch (err) {
        console.error(`Xảy ra lỗi khi xóa file ${filePath}:`, err);
        return false;
    }
}

// Tải file phương tiện (Ảnh / File Game) lên GitHub
async function uploadToGitHub(file, folderPath, baseName, targetInput) {
    const token = getEl('gh-token').value.trim();
    const repo = getEl('gh-repo').value.trim();
    if (!token || !repo) return alert('Thiếu Token hoặc Repo!');

    const ext = file.name.split('.').pop();
    const safeBaseName = (baseName || 'file_' + Date.now()).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filePath = `${folderPath}/${safeBaseName}.${ext}`;

    showStatus(`⏳ Đang tải file ${file.name} lên GitHub...`, 'info');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const base64Content = e.target.result.split(',')[1];
            
            // Lấy SHA nếu file đã tồn tại để ghi đè
            let sha = null;
            try {
                const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(filePath)}`, {
                    headers: { 'Authorization': `token ${token}` }
                });
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    sha = checkData.sha;
                }
            } catch (_) {}

            const bodyData = {
                message: `Upload media file: ${filePath}`,
                content: base64Content
            };
            if (sha) bodyData.sha = sha;

            const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(filePath)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }

            if (targetInput) targetInput.value = filePath;
            showStatus(`✅ Đã Upload thành công: ${filePath}`, 'success');
        } catch (err) {
            showStatus(`❌ Lỗi Upload: ${err.message}`, 'error');
        }
    };
    reader.readAsDataURL(file);
}

// ==========================================
// 3. Quản lý UI DOWNLOAD FILES (Screen & OS)
// ==========================================

// Tạo HTML giao diện cho mỗi block file tải
function createDownloadItemHTML(data = {}) {
    return `
    <div class="dl-item-box" style="border: 1px dashed #ccc; padding: 10px; margin-bottom: 10px; background: #f9f9f9;">
        <div style="margin-bottom: 5px;">
            <input type="text" class="dl-label" placeholder="Nhãn/Tên phiên bản (VD: v1.0 Mod Money)" value="${data.label || ''}" style="width: 100%;">
        </div>
        <div style="margin-bottom: 5px;">
            <input type="text" class="dl-url" placeholder="Đường dẫn file (URL hoặc Path)" value="${data.url || ''}" style="width: 70%;">
            <input type="file" class="dl-file-upload" style="width: 25%;">
        </div>
        <div style="display: flex; gap: 5px;">
            <input type="text" class="dl-screen" placeholder="Màn hình (240x320, All)" value="${data.screen || ''}" style="flex: 1;">
            <input type="text" class="dl-os" placeholder="Hệ điều hành (Java, Android, Symbian)" value="${data.os || ''}" style="flex: 1;">
            <input type="text" class="dl-size" placeholder="Dung lượng (1.2 MB)" value="${data.size || ''}" style="flex: 1;">
        </div>
        <button type="button" class="btn-remove-dl" style="color: red; margin-top: 5px; cursor: pointer;">🗑️ Xóa file này</button>
    </div>`;
}

// Thêm khung nhập file mới vào danh sách
function addDownloadItem(data = {}) {
    const container = getEl('download-list-container');
    if (container) {
        container.insertAdjacentHTML('beforeend', createDownloadItemHTML(data));
    }
}

// Trích xuất dữ liệu file tải về thành Mảng Object JSON
function getDownloadFilesData() {
    const boxes = document.querySelectorAll('.dl-item-box');
    const downloadsList = [];

    boxes.forEach(box => {
        const url = box.querySelector('.dl-url').value.trim();
        if (url) {
            downloadsList.push({
                label: box.querySelector('.dl-label').value.trim() || 'Download',
                url: url,
                screen: box.querySelector('.dl-screen').value.trim() || 'All Screen',
                os: box.querySelector('.dl-os').value.trim() || 'Java',
                size: box.querySelector('.dl-size').value.trim() || 'N/A'
            });
        }
    });

    return downloadsList;
}

// ==========================================
// 4. QUẢN LÝ BÀI VIẾT (CRUD & XÓA FILE THỪA)
// ==========================================

// Tải bài viết từ JSON để chỉnh sửa
async function loadArticleToForm(itemId, category) {
    try {
        showStatus('⏳ Đang tải thông tin bài viết...', 'info');
        const jsonPath = `data/${category}.json`;
        const fileObj = await getGitHubFile(jsonPath);

        if (!fileObj) throw new Error('Không tìm thấy danh mục!');

        const article = fileObj.content.find(item => item.id === itemId);
        if (!article) throw new Error('Không tìm thấy bài viết!');

        // Đổ dữ liệu vào Form
        getEl('item-id').value = article.id;
        getEl('old-category').value = category; // Lưu vết danh mục cũ
        getEl('item-category').value = category;
        getEl('item-title').value = article.title || '';
        getEl('item-thumb').value = article.thumb || '';
        getEl('item-desc').value = article.description || '';

        // Reset & Đổ lại danh sách file download
        const dlContainer = getEl('download-list-container');
        dlContainer.innerHTML = '';
        if (Array.isArray(article.downloads) && article.downloads.length > 0) {
            article.downloads.forEach(dl => addDownloadItem(dl));
        } else {
            addDownloadItem(); // Mặc định 1 ô rỗng
        }

        showStatus('✅ Đã nạp dữ liệu bài viết thành công!', 'success');
    } catch (err) {
        showStatus(`❌ Lỗi nạp bài viết: ${err.message}`, 'error');
    }
}

// Lưu / Cập nhật Bài viết vào JSON
async function handleFormSubmit(e) {
    e.preventDefault();

    const id = getEl('item-id').value.trim() || 'item_' + Date.now();
    const currentCategory = getEl('item-category').value.trim();
    const oldCategory = getEl('old-category').value.trim();

    const articleData = {
        id: id,
        title: getEl('item-title').value.trim(),
        thumb: getEl('item-thumb').value.trim(),
        description: getEl('item-desc').value.trim(),
        downloads: getDownloadFilesData(),
        updatedAt: new Date().toISOString()
    };

    try {
        showStatus('⏳ Đang lưu bài viết lên GitHub...', 'info');

        // Xử lý Chuyển danh mục (Nếu bài viết đổi sang danh mục khác)
        if (oldCategory && oldCategory !== currentCategory) {
            await removeArticleFromCategoryJSON(id, oldCategory);
        }

        // Đọc danh mục hiện tại
        const jsonPath = `data/${currentCategory}.json`;
        let fileObj = await getGitHubFile(jsonPath);
        let listData = fileObj ? fileObj.content : [];
        let sha = fileObj ? fileObj.sha : null;

        // Cập nhật hoặc chèn mới
        const existingIndex = listData.findIndex(item => item.id === id);
        if (existingIndex >= 0) {
            listData[existingIndex] = articleData;
        } else {
            listData.unshift(articleData); // Đưa lên đầu danh sách
        }

        // Lưu file JSON danh mục
        await saveGitHubFile(jsonPath, listData, sha, `Update article: ${id}`);
        showStatus('✅ Đã lưu bài viết thành công!', 'success');

        // Reset Form
        getEl('admin-form').reset();
        getEl('download-list-container').innerHTML = '';
        addDownloadItem();
    } catch (err) {
        showStatus(`❌ Lỗi khi lưu bài viết: ${err.message}`, 'error');
    }
}

// Xóa bài viết khỏi JSON
async function removeArticleFromCategoryJSON(itemId, category) {
    const jsonPath = `data/${category}.json`;
    const fileObj = await getGitHubFile(jsonPath);
    if (!fileObj) return null;

    const listData = fileObj.content.filter(item => item.id !== itemId);
    await saveGitHubFile(jsonPath, listData, fileObj.sha, `Remove article: ${itemId}`);
    return fileObj.content.find(item => item.id === itemId);
}

// Xóa bài viết VÀ Xóa sạch toàn bộ File thừa trên GitHub Storage
async function deleteArticleAndFiles(itemId, category) {
    if (!confirm(`⚠️ Bạn có chắc muốn xóa bài viết [${itemId}] và TOÀN BỘ tệp đính kèm trên GitHub?`)) return;

    try {
        showStatus('⏳ Đang xóa bài viết và dọn dẹp tệp tin...', 'info');

        // 1. Rút bài viết khỏi file JSON
        const jsonPath = `data/${category}.json`;
        const fileObj = await getGitHubFile(jsonPath);
        if (!fileObj) throw new Error('Danh mục không tồn tại!');

        const articleToDelete = fileObj.content.find(item => item.id === itemId);
        const updatedList = fileObj.content.filter(item => item.id !== itemId);

        if (articleToDelete) {
            // 2. Thu thập toàn bộ tệp đính kèm (Ảnh + Files Game)
            const filesToDelete = [];
            if (articleToDelete.thumb) filesToDelete.push(articleToDelete.thumb);
            if (Array.isArray(articleToDelete.downloads)) {
                articleToDelete.downloads.forEach(dl => {
                    if (dl.url) filesToDelete.push(dl.url);
                });
            }

            // 3. Tiến hành xóa từng file khỏi Storage
            for (const filePath of filesToDelete) {
                await deleteFromGitHub(filePath);
            }

            // 4. Cập nhật lại JSON
            await saveGitHubFile(jsonPath, updatedList, fileObj.sha, `Delete article & files: ${itemId}`);
            showStatus('✅ Đã xóa hoàn tất bài viết và toàn bộ file đính kèm!', 'success');
        }
    } catch (err) {
        showStatus(`❌ Lỗi khi xóa: ${err.message}`, 'error');
    }
}

// ==========================================
// 5. KHỞI TẠO VÀ LẮNG NGHE SỰ KIỆN (EVENT DELEGATION)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Khởi tạo sẵn 1 ô nhập file download
    const dlContainer = getEl('download-list-container');
    if (dlContainer && dlContainer.children.length === 0) {
        addDownloadItem();
    }

    // 2. Sự kiện Submit Form
    const adminForm = getEl('admin-form');
    if (adminForm) {
        adminForm.addEventListener('submit', handleFormSubmit);
    }

    // 3. Nút Thêm File Download
    const btnAddDl = getEl('btn-add-download');
    if (btnAddDl) {
        btnAddDl.addEventListener('click', () => addDownloadItem());
    }

    // 4. Dynamic Click Delegation (Xóa dòng download)
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('btn-remove-dl')) {
            const box = e.target.closest('.dl-item-box');
            if (box) box.remove();
        }
    });

    // 5. Dynamic Change Delegation (Tải file khi chọn tệp)
    document.addEventListener('change', async (e) => {
        // Tải ảnh đại diện (Thumbnail)
        if (e.target && e.target.id === 'thumb-file-input') {
            const file = e.target.files[0];
            const baseName = getEl('item-id').value || 'thumb_' + Date.now();
            if (file) {
                await uploadToGitHub(file, 'images', baseName, getEl('item-thumb'));
            }
        }

        // Tải file Download Game/App
        if (e.target && e.target.classList.contains('dl-file-upload')) {
            const file = e.target.files[0];
            const box = e.target.closest('.dl-item-box');
            const targetUrlInput = box ? box.querySelector('.dl-url') : null;
            const baseName = (getEl('item-id').value || 'game') + '_' + Date.now();

            if (file && targetUrlInput) {
                await uploadToGitHub(file, 'files', baseName, targetUrlInput);
            }
        }
    });
});
