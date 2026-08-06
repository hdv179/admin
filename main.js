document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    loadComponent("header", "tpl-header.html");
    loadComponent("footer", "tpl-footer.html");
    routePageData();
});

function initTheme() {
    const savedTheme = localStorage.getItem("hdv179_theme") || "default";
    document.documentElement.setAttribute("data-theme", savedTheme);
}

function setTheme(themeName) {
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("hdv179_theme", themeName);
}

function loadComponent(elementId, filePath) {
    const targetEl = document.getElementById(elementId);
    if (targetEl) {
        fetch(filePath)
            .then(res => res.text())
            .then(html => { targetEl.innerHTML = html; })
            .catch(console.error);
    }
}

function getUrlParam(param) {
    return new URLSearchParams(window.location.search).get(param);
}

// Helper render thẻ item rút gọn
function createItemCardHtml(item) {
    return `
        <div class="wap-card" style="display:flex; gap:5px; align-items:center;">
            <img src="${item.thumb || 'assets/images/default.png'}" style="width:36px; height:36px; object-fit:cover; border:1px solid var(--border-color);">
            <div style="flex:1; overflow:hidden;">
                <a href="detail.html?id=${item.id}" style="font-weight:bold; color:var(--primary-main);">${item.title}</a>
                <div style="font-size:10px; color:#555;">📱 ${item.screen || 'N/A'} | 👤 ${item.vendor || 'N/A'}</div>
            </div>
        </div>
    `;
}

function routePageData() {
    const path = window.location.pathname;
    const cat = getUrlParam('cat') || 'gameloft';
    const id = getUrlParam('id');
    const query = getUrlParam('q');

    if (path.includes('detail.html') && id) {
        renderDetailPage(id);
    } else if (path.includes('category.html')) {
        const catTitle = document.getElementById('category-title');
        if (query) {
            if (catTitle) catTitle.innerText = `TÌM KIẾM: "${query.toUpperCase()}"`;
            renderSearchResults(query.trim().toLowerCase());
        } else {
            const page = parseInt(getUrlParam('page')) || 1;
            if (catTitle) catTitle.innerText = `DANH MỤC: ${cat.toUpperCase()}`;
            renderListPage(cat, page);
        }
    } else if (document.getElementById('home-gameloft')) {
        renderHomeSection('gameloft', 'home-gameloft', 4);
        renderHomeSection('teamobi', 'home-teamobi', 4);
        renderHomeSection('ungdung', 'home-ungdung', 4);
    }
}

function renderSearchResults(query) {
    const listContainer = document.getElementById('post-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="wap-card">🔄 Đang tìm kiếm...</div>';
    
    // Đã cập nhật đầy đủ 13 danh mục theo yêu cầu
    const categories = [
        'gameloft', 'teamobi', 'gameonline', 'gameoffline', 
        'gameviethoa', 'trinhduyet', 'ungdung', 'hinhnen', 
        'nhacchuong', 'chude', 'doctruyen', 'thuthuat'
    ];
    
    Promise.all(categories.map(cat => fetch(`data/index/${cat}.json`).then(r => r.ok ? r.json() : []).catch(() => [])))
        .then(results => {
            const matchedItems = results.flat().filter(item => 
                (item.title && item.title.toLowerCase().includes(query)) || 
                (item.vendor && item.vendor.toLowerCase().includes(query)) ||
                (item.id && item.id.toLowerCase().includes(query))
            );

            if (!matchedItems.length) {
                listContainer.innerHTML = `<div class="wap-card">Không tìm thấy kết quả cho "<b>${query}</b>".</div>`;
                return;
            }

            let html = `<div style="font-size:10px; padding:3px; color:#555;">Tìm thấy <b>${matchedItems.length}</b> kết quả:</div>`;
            matchedItems.forEach(item => html += createItemCardHtml(item));
            listContainer.innerHTML = html;
        });
}

function renderListPage(cat, page = 1, perPage = 10) {
    const listContainer = document.getElementById('post-list');
    const paginationContainer = document.getElementById('pagination');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="wap-card">🔄 Đang tải danh sách...</div>';

    fetch(`data/index/${cat}.json`)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.length) {
                listContainer.innerHTML = '<div class="wap-card">Chưa có bài viết nào.</div>';
                return;
            }

            const totalPages = Math.ceil(data.length / perPage);
            const pageData = data.slice((page - 1) * perPage, page * perPage);

            let html = '';
            pageData.forEach(item => html += createItemCardHtml(item));
            listContainer.innerHTML = html;

            if (paginationContainer && totalPages > 1) {
                let p2 = '<div style="text-align:center; margin:5px 0;">';
                if (page > 1) p2 += `<a href="?cat=${cat}&page=${page - 1}" class="btn btn-secondary">« Trước</a> `;
                p2 += `<span>Trang ${page}/${totalPages}</span>`;
                if (page < totalPages) p2 += ` <a href="?cat=${cat}&page=${page + 1}" class="btn btn-secondary">Sau »</a>`;
                paginationContainer.innerHTML = p2 + '</div>';
            }
        })
        .catch(() => { listContainer.innerHTML = '<div class="wap-card">Mục này chưa có dữ liệu.</div>'; });
}

function renderDetailPage(id) {
    const detailContainer = document.getElementById('post-detail');
    if (!detailContainer) return;

    detailContainer.innerHTML = '<div class="wap-card">🔄 Đang tải bài viết...</div>';

    fetch(`data/items/${id}.json`)
        .then(res => res.json())
        .then(item => {
            let html = `
                <div class="title-head">${item.title.toUpperCase()}</div>
                <div class="wap-card">
                    <div style="font-size:10px; margin-bottom:5px; border-bottom:1px dashed var(--border-color); padding-bottom:3px;">
                        📌 <b>Hãng:</b> ${item.vendor} | 🖥️ <b>Màn hình:</b> ${item.screen}<br>
                        🏷️ <b>Phiên bản:</b> ${item.version} | 📅 <b>Cập nhật:</b> ${item.date}
                    </div>
            `;

            if (item.blocks) {
                item.blocks.forEach(b => {
                    if (b.type === 'text') html += `<p style="margin:3px 0;">${b.value.replace(/\n/g, '<br>')}</p>`;
                    if (b.type === 'image') html += `<div style="text-align:center; margin:4px 0;"><img src="${b.value}" style="max-width:100%; border:1px solid var(--border-color);">${b.caption ? `<div style="font-size:9px;"><i>${b.caption}</i></div>` : ''}</div>`;
                });
            }
            html += `</div>`;

            if (item.downloads) {
                item.downloads.forEach(g => {
                    html += `<div class="title-head">📥 ${g.groupTitle.toUpperCase()}</div><div class="wap-card">`;
                    g.files.forEach(f => {
                        html += `<a href="${f.url}" class="btn btn-block" style="text-align:left; margin:2px 0;" download>💾 ${f.label}</a>`;
                    });
                    html += `</div>`;
                });
            }

            detailContainer.innerHTML = html;
        })
        .catch(() => { detailContainer.innerHTML = '<div class="wap-card" style="color:red;">❌ Bài viết không tồn tại!</div>'; });
}

function renderHomeSection(cat, containerId, limit = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;

    fetch(`data/index/${cat}.json`)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.length) {
                container.innerHTML = '<div class="wap-card">Đang cập nhật...</div>';
                return;
            }
            let html = '';
            data.slice(0, limit).forEach(item => html += createItemCardHtml(item));
            container.innerHTML = html;
        })
        .catch(() => { container.innerHTML = '<div class="wap-card">Chưa có dữ liệu.</div>'; });
}

async function uploadToGitHub(fileObj, folderPath, customBaseName, targetInputEl) {
    const token = document.getElementById('gh-token').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    const itemId = document.getElementById('game-id').value.trim();

    if (!token || !repo) return alert('Thiếu Token hoặc Repo!');

    let baseName = (customBaseName || itemId).trim();
    if (!baseName) return alert('Vui lòng nhập ID bài viết hoặc Tên file!');

    baseName = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    const ext = fileObj.name.split('.').pop();
    const fileName = `${baseName}-${Date.now()}.${ext}`;
    const fullPath = `${folderPath}/${fileName}`;

    targetInputEl.value = "Đang tải lên...";

    const reader = new FileReader();
    reader.readAsDataURL(fileObj);
    reader.onload = async function () {
        try {
            const res = await fetch(`https://api.github.com/repos/${repo}/contents/${fullPath}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Upload: ${fileName}`, content: reader.result.split(',')[1] })
            });

            if (res.ok) {
                targetInputEl.value = fullPath;
                alert(`Thành công: ${fullPath}`);
            } else {
                alert('Lỗi upload file!');
                targetInputEl.value = '';
            }
        } catch (e) {
            alert('Lỗi kết nối API!');
            targetInputEl.value = '';
        }
    };
}
