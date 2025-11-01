// ==UserScript==
// @name         知乎收藏夹导出工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  用于导出知乎收藏夹内容为Markdown格式的油猴脚本 | 隐私安全：本地存储数据，可一键清理
// @author       You
// @match        https://www.zhihu.com/*
// @match        https://zhuanlan.zhihu.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      www.zhihu.com
// @connect      zhuanlan.zhihu.com
// @license      MIT
// ==/UserScript==

/*
 * 🔒 隐私说明 | Privacy Notice
 * 
 * 本地存储说明：
 * - 本脚本会在浏览器本地存储用户的知乎收藏夹信息（使用GM_setValue/GM_getValue API）
 * - 存储的数据包括：收藏夹URL、名称、类型等基本信息
 * - 这些数据仅保存在本地，不会上传到任何外部服务器
 * 
 * 数据清理建议：
 * - 建议用户定期点击"清除本地数据"按钮清理存储的数据
 * - 清除功能会删除所有以"zhihu_"开头的本地存储项
 * - 清理操作不会影响知乎网站上的实际收藏夹内容
 * 
 * 网络请求说明：
 * - 脚本会通过GM_xmlhttpRequest向知乎API发送请求以获取收藏夹内容
 * - 这些请求会在浏览器网络记录中留下痕迹（如开发者工具的Network面板）
 * - 请求仅用于获取公开可访问的收藏夹数据，不会传输用户隐私信息
 * 
 * Local Storage Notice:
 * - This script stores user's Zhihu collection information locally using GM_setValue/GM_getValue APIs
 * - Stored data includes: collection URLs, names, types and other basic information
 * - All data is stored locally only and will not be uploaded to any external servers
 * 
 * Data Cleanup Recommendation:
 * - Users are advised to regularly click the "Clear Local Data" button to clean stored data
 * - The clear function will delete all local storage items starting with "zhihu_"
 * - Cleanup operations will not affect actual collections on the Zhihu website
 * 
 * Network Request Notice:
 * - The script sends requests to Zhihu API via GM_xmlhttpRequest to fetch collection content
 * - These requests will leave traces in browser network records (e.g., Network panel in developer tools)
 * - Requests are only used to fetch publicly accessible collection data and will not transmit user private information
 */

(function () {
    'use strict';

    // 添加样式
    GM_addStyle(`
        #zhihu-exporter-panel {
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            user-select: none; /* 防止拖拽时选择文本 */
        }
        #zhihu-exporter-panel h3 {
            margin: 0;
            padding: 10px;
            background: #0084ff;
            color: white;
            border-bottom: 1px solid #ddd;
            cursor: move; /* 更改光标表示可拖拽 */
            border-radius: 5px 5px 0 0;
        }
        #zhihu-exporter-content {
            padding: 10px;
            max-height: 500px;
            overflow-y: auto;
        }
        #zhihu-exporter-content input, #zhihu-exporter-content textarea, #zhihu-exporter-content select {
            width: 100%;
            margin-bottom: 10px;
            padding: 5px;
            box-sizing: border-box;
        }
        #zhihu-exporter-content button {
            padding: 5px 10px;
            background: #0084ff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            margin-right: 5px;
            margin-bottom: 5px;
        }
        #zhihu-exporter-content button:hover {
            background: #0066cc;
        }
        #zhihu-exporter-content .collection-item {
            padding: 5px;
            border: 1px solid #eee;
            margin-bottom: 5px;
            border-radius: 3px;
            display: flex;
            align-items: center;
        }
        #zhihu-exporter-content .collection-item input[type="checkbox"] {
            width: auto;
            margin-right: 5px;
        }
        #export-status {
            margin-top: 10px;
            padding: 5px;
            background: #f0f0f0;
            border-radius: 3px;
            font-size: 12px;
            max-height: 100px;
            overflow-y: auto;
        }
        .export-progress {
            height: 10px;
            background: #f0f0f0;
            border-radius: 5px;
            margin: 5px 0;
        }
        .export-progress-bar {
            height: 100%;
            background: #0084ff;
            border-radius: 5px;
            width: 0%;
        }
    `);

    // 全局变量
    let collections = [];
    let isPanelMinimized = false;

    // 创建面板
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'zhihu-exporter-panel';

        panel.innerHTML =
            '<h3>知乎收藏夹导出工具</h3>' +
            '<div id="zhihu-exporter-content">' +
            '<div>' +
            '<label>输入收藏夹或文章链接:</label>' +
            '<input type="text" id="zhihu-url" placeholder="https://www.zhihu.com/collection/..." />' +
            '<button id="add-url">添加</button>' +
            '<button id="fetch-collections" style="background: #4CAF50;">获取主页收藏夹</button>' +
            '</div>' +
            '<div>' +
            '<label>选择要导出的内容:</label>' +
            '<div id="collections-list"></div>' +
            '<button id="select-all">全选</button>' +
            '<button id="deselect-all">取消全选</button>' +
            '<button id="clear-list">清空列表</button>' +
            '<button id="clear-storage" style="background: #ff9800;">清除本地数据</button>' +
            '</div>' +
            '<div>' +
            '<button id="export-selected">导出选中</button>' +
            '<button id="export-current">导出当前页面</button>' +
            '<button id="uncollect-selected" style="background: #ff6b6b;">取消收藏选中</button>' +
            '</div>' +
            '<div class="export-progress">' +
            '<div class="export-progress-bar" id="export-progress-bar"></div>' +
            '</div>' +
            '<div id="export-status"></div>' +
            '</div>';

        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('zhihu-exporter-panel').querySelector('h3').addEventListener('click', togglePanel);
        document.getElementById('add-url').addEventListener('click', addUrl);
        document.getElementById('select-all').addEventListener('click', selectAll);
        document.getElementById('deselect-all').addEventListener('click', deselectAll);
        document.getElementById('clear-list').addEventListener('click', clearList);
        document.getElementById('clear-storage').addEventListener('click', clearStorage);
        document.getElementById('export-selected').addEventListener('click', exportSelected);
        document.getElementById('export-current').addEventListener('click', exportCurrentPage);
        document.getElementById('uncollect-selected').addEventListener('click', uncollectSelected);
        document.getElementById('fetch-collections').addEventListener('click', fetchUserCollections);

        // 添加拖拽功能
        addDragFunctionality(panel);

        // 加载已保存的收藏夹
        loadCollections();

        // 自动检测当前页面是否为收藏夹页面
        detectCurrentPage();
    }

    // 添加拖拽功能
    function addDragFunctionality(panel) {
        const header = panel.querySelector('h3');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // 计算元素相对于视口的位置
        function getElementPosition(element) {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY
            };
        }

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);

        function dragStart(e) {
            // 只有在面板未最小化时才能拖拽
            if (isPanelMinimized) return;

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header) {
                isDragging = true;
                panel.style.cursor = 'move';
            }
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;

            isDragging = false;
            panel.style.cursor = 'default';
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, panel);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
        }
    }

    // 切换面板显示/隐藏
    function togglePanel() {
        const content = document.getElementById('zhihu-exporter-content');
        const header = document.getElementById('zhihu-exporter-panel').querySelector('h3');

        if (isPanelMinimized) {
            content.style.display = 'block';
            header.textContent = '知乎收藏夹导出工具';
            isPanelMinimized = false;
        } else {
            content.style.display = 'none';
            header.textContent = '知乎导出工具';
            isPanelMinimized = true;
        }
    }

    // 添加URL
    function addUrl() {
        const urlInput = document.getElementById('zhihu-url');
        const url = urlInput.value.trim();

        if (!url) {
            updateStatus('请输入有效的URL');
            return;
        }

        // 验证URL格式
        if (!url.startsWith('https://www.zhihu.com/') && !url.startsWith('https://zhuanlan.zhihu.com/')) {
            updateStatus('请输入知乎收藏夹或文章链接');
            return;
        }

        // 检查是否已存在
        if (collections.some(c => c.url === url)) {
            updateStatus('该链接已存在于列表中');
            return;
        }

        // 添加到列表
        const type = url.includes('/collection/') ? '收藏夹' : '文章';
        const name = type === '收藏夹' ? '收藏夹-' + Date.now() : '文章-' + Date.now();

        collections.push({
            id: Date.now(),
            name: name,
            url: url,
            type: type,
            selected: true
        });

        saveCollections();
        renderCollectionsList();
        urlInput.value = '';
        updateStatus('已添加到导出列表');
    }

    // 获取用户主页收藏夹列表
    function fetchUserCollections() {
        updateStatus('正在获取主页收藏夹列表...');

        // 首先尝试从当前页面提取收藏夹信息
        try {
            // 查找页面中的收藏夹项目
            const collectionItems = document.querySelectorAll('.SelfCollectionItem');

            if (collectionItems.length > 0) {
                let addedCount = 0;

                collectionItems.forEach((item, index) => {
                    const titleElement = item.querySelector('.SelfCollectionItem-title');
                    if (!titleElement) return;

                    const collectionUrl = titleElement.getAttribute('href');
                    const collectionName = titleElement.textContent.trim().replace(/\s*[\u200B-\u200D\uFEFF\xA0]+$/, ''); // 移除零宽字符

                    // 构造完整的URL
                    const fullUrl = collectionUrl.startsWith('http') ? collectionUrl : 'https://www.zhihu.com' + collectionUrl;

                    // 检查是否已存在
                    if (!collections.some(c => c.url === fullUrl)) {
                        collections.push({
                            id: Date.now() + index,
                            name: collectionName || `收藏夹-${Date.now() + index}`,
                            url: fullUrl,
                            type: '收藏夹',
                            selected: true
                        });
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    saveCollections();
                    renderCollectionsList();
                    updateStatus(`成功从当前页面添加 ${addedCount} 个收藏夹到列表`);
                    return;
                }
            }
        } catch (e) {
            // 如果从当前页面提取失败，继续尝试其他方法
            updateStatus('从当前页面提取失败，尝试其他方法...');
        }

        // 尝试获取当前登录用户名
        let currentUsername = '';
        try {
            // 尝试从页面元素获取用户名
            const userLink = document.querySelector('.AppHeader-profileText') || 
                             document.querySelector('.ProfileHeader-name') ||
                             document.querySelector('[href^="/people/"]');
            
            if (userLink) {
                const href = userLink.getAttribute('href');
                if (href && href.includes('/people/')) {
                    currentUsername = href.split('/people/')[1].split('/')[0];
                }
            }
        } catch (e) {
            console.log('获取用户名失败:', e);
        }

        // 如果无法获取用户名，显示提示
        if (!currentUsername) {
            updateStatus('无法获取当前用户名，请手动输入收藏夹链接或访问用户主页');
            return;
        }

        // 如果从当前页面无法获取，尝试直接访问用户的收藏夹页面
        const collectionsUrl = `https://www.zhihu.com/people/${currentUsername}/collections`;

        GM_xmlhttpRequest({
            method: "GET",
            url: collectionsUrl,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            onload: function (response) {
                try {
                    // 解析HTML内容
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");

                    // 查找收藏夹项目
                    const collectionItems = doc.querySelectorAll('.SelfCollectionItem');

                    if (collectionItems.length === 0) {
                        // 尝试其他选择器
                        const fallbackItems = doc.querySelectorAll('a[href*="/collection/"]');
                        if (fallbackItems.length > 0) {
                            let addedCount = 0;

                            fallbackItems.forEach((item, index) => {
                                const collectionUrl = item.getAttribute('href');
                                const collectionName = item.textContent.trim().replace(/\s*[\u200B-\u200D\uFEFF\xA0]+$/, '');

                                if (collectionUrl && collectionUrl.includes('/collection/')) {
                                    // 构造完整的URL
                                    const fullUrl = collectionUrl.startsWith('http') ? collectionUrl : 'https://www.zhihu.com' + collectionUrl;

                                    // 检查是否已存在
                                    if (!collections.some(c => c.url === fullUrl)) {
                                        collections.push({
                                            id: Date.now() + index,
                                            name: collectionName || `收藏夹-${Date.now() + index}`,
                                            url: fullUrl,
                                            type: '收藏夹',
                                            selected: true
                                        });
                                        addedCount++;
                                    }
                                }
                            });

                            if (addedCount > 0) {
                                saveCollections();
                                renderCollectionsList();
                                updateStatus(`成功添加 ${addedCount} 个收藏夹到列表（备选方案）`);
                                return;
                            }
                        }

                        updateStatus('未找到收藏夹项目');
                        return;
                    }

                    let addedCount = 0;

                    collectionItems.forEach((item, index) => {
                        const titleElement = item.querySelector('.SelfCollectionItem-title');
                        if (!titleElement) return;

                        const collectionUrl = titleElement.getAttribute('href');
                        const collectionName = titleElement.textContent.trim().replace(/\s*[\u200B-\u200D\uFEFF\xA0]+$/, '');

                        // 构造完整的URL
                        const fullUrl = collectionUrl.startsWith('http') ? collectionUrl : 'https://www.zhihu.com' + collectionUrl;

                        // 检查是否已存在
                        if (!collections.some(c => c.url === fullUrl)) {
                            collections.push({
                                id: Date.now() + index,
                                name: collectionName || `收藏夹-${Date.now() + index}`,
                                url: fullUrl,
                                type: '收藏夹',
                                selected: true
                            });
                            addedCount++;
                        }
                    });

                    if (addedCount > 0) {
                        saveCollections();
                        renderCollectionsList();
                        updateStatus(`成功添加 ${addedCount} 个收藏夹到列表`);
                    } else {
                        updateStatus('未找到新的收藏夹');
                    }
                } catch (error) {
                    updateStatus('解析收藏夹列表失败: ' + error.message);
                }
            },
            onerror: function (error) {
                updateStatus('获取收藏夹列表失败: ' + error.statusText);
            }
        });
    }

    // 渲染收藏夹列表
    function renderCollectionsList() {
        const collectionsList = document.getElementById('collections-list');
        collectionsList.innerHTML = '';

        collections.forEach(collection => {
            const item = document.createElement('div');
            item.className = 'collection-item';
            item.innerHTML =
                '<input type="checkbox" id="collection-' + collection.id + '" data-id="' + collection.id + '" ' + (collection.selected ? 'checked' : '') + ' />' +
                '<label for="collection-' + collection.id + '">' + collection.type + ': ' + truncateText(collection.url, 40) + '</label>';

            collectionsList.appendChild(item);

            // 绑定复选框事件
            item.querySelector('input').addEventListener('change', function () {
                const id = parseInt(this.dataset.id);
                const collection = collections.find(c => c.id === id);
                if (collection) {
                    collection.selected = this.checked;
                    saveCollections();
                }
            });
        });
    }

    // 加载已保存的收藏夹
    function loadCollections() {
        const saved = GM_getValue('zhihu_collections', '[]');
        try {
            collections = JSON.parse(saved);
            renderCollectionsList();
        } catch (e) {
            collections = [];
        }
    }

    // 保存收藏夹列表
    function saveCollections() {
        GM_setValue('zhihu_collections', JSON.stringify(collections));
    }

    // 全选
    function selectAll() {
        collections.forEach(collection => {
            collection.selected = true;
        });
        saveCollections();
        renderCollectionsList();
    }

    // 取消全选
    function deselectAll() {
        collections.forEach(collection => {
            collection.selected = false;
        });
        saveCollections();
        renderCollectionsList();
    }

    // 清空列表
    function clearList() {
        collections = [];
        saveCollections();
        renderCollectionsList();
        updateStatus('列表已清空');
    }

    // 清除本地存储数据
    function clearStorage() {
        if (!confirm('确定要清除所有本地存储的数据吗？此操作不可恢复！\n\n清理说明：\n- 将删除所有本地保存的收藏夹信息\n- 不会影响知乎网站上的实际收藏夹内容\n- 建议定期清理以保护隐私\n\nAre you sure you want to clear all locally stored data? This operation cannot be undone!')) {
            return;
        }

        try {
            // 清除收藏夹数据
            GM_deleteValue('zhihu_collections');
            
            // 清除其他可能的存储数据
            const allValues = GM_listValues();
            allValues.forEach(valueName => {
                if (valueName.startsWith('zhihu_')) {
                    GM_deleteValue(valueName);
                }
            });

            // 重置内存中的数据
            collections = [];
            renderCollectionsList();
            
            updateStatus('所有本地数据已清除');
        } catch (error) {
            updateStatus('清除数据失败: ' + error.message);
        }
    }

    // 导出选中内容
    function exportSelected() {
        const selectedCollections = collections.filter(c => c.selected);

        if (selectedCollections.length === 0) {
            updateStatus('请先选择要导出的内容');
            return;
        }

        updateStatus('开始导出 ' + selectedCollections.length + ' 个项目...');
        updateProgressBar(0);

        // 逐个导出
        exportCollectionsSequentially(selectedCollections, 0);
    }

    // 顺序导出收藏夹
    function exportCollectionsSequentially(collections, index) {
        if (index >= collections.length) {
            updateStatus('所有项目导出完成');
            updateProgressBar(100);
            return;
        }

        const collection = collections[index];
        updateProgressBar((index / collections.length) * 100);
        updateStatus('正在导出 (' + (index + 1) + '/' + collections.length + '): ' + collection.type);

        if (collection.type === '收藏夹') {
            exportCollection(collection.url, () => {
                setTimeout(() => {
                    exportCollectionsSequentially(collections, index + 1);
                }, 1000); // 1秒延迟
            });
        } else {
            exportArticle(collection.url, () => {
                setTimeout(() => {
                    exportCollectionsSequentially(collections, index + 1);
                }, 1000); // 1秒延迟
            });
        }
    }

    // 导出当前页面
    function exportCurrentPage() {
        const currentUrl = window.location.href;
        let type = '文章';

        if (currentUrl.includes('/collection/')) {
            type = '收藏夹';
        } else if (!currentUrl.includes('/question/') && !currentUrl.includes('/p/')) {
            // 尝试从页面标题判断
            const title = document.title;
            if (title.includes('收藏') || title.includes('收藏夹')) {
                type = '收藏夹';
            } else {
                updateStatus('当前页面不是支持的导出类型');
                return;
            }
        }

        updateStatus('开始导出当前页面: ' + type);
        updateProgressBar(0);

        if (type === '收藏夹') {
            exportCollection(currentUrl, () => {
                updateStatus('当前收藏夹导出完成');
                updateProgressBar(100);
            });
        } else {
            exportArticle(currentUrl, () => {
                updateStatus('当前文章导出完成');
                updateProgressBar(100);
            });
        }
    }

    // 取消收藏选中的收藏夹内容
    function uncollectSelected() {
        const selectedCollections = collections.filter(c => c.selected && c.type === '收藏夹');

        if (selectedCollections.length === 0) {
            updateStatus('请先选择要取消收藏的收藏夹');
            return;
        }

        if (!confirm('确定要取消收藏选中的收藏夹中的所有内容吗？此操作不可恢复！')) {
            return;
        }

        updateStatus('开始取消收藏 ' + selectedCollections.length + ' 个收藏夹...');
        updateProgressBar(0);

        // 逐个取消收藏
        uncollectCollectionsSequentially(selectedCollections, 0);
    }

    // 顺序取消收藏收藏夹
    function uncollectCollectionsSequentially(collections, index) {
        if (index >= collections.length) {
            updateStatus('所有收藏夹取消收藏完成');
            updateProgressBar(100);
            return;
        }

        const collection = collections[index];
        updateProgressBar((index / collections.length) * 100);
        updateStatus('正在取消收藏 (' + (index + 1) + '/' + collections.length + '): ' + collection.type);

        uncollectCollection(collection.url, () => {
            setTimeout(() => {
                uncollectCollectionsSequentially(collections, index + 1);
            }, 1000); // 1秒延迟
        });
    }

    // 取消收藏收藏夹中的所有内容
    function uncollectCollection(collectionUrl, callback) {
        // 提取收藏夹ID
        const collectionId = collectionUrl.split('/').pop().split('?')[0];
        if (!collectionId) {
            updateStatus('无法提取收藏夹ID');
            callback && callback();
            return;
        }

        // 获取收藏夹所有项目
        getAllCollectionItems(collectionId, (items) => {
            if (items.length === 0) {
                updateStatus('收藏夹为空或无法访问');
                callback && callback();
                return;
            }

            updateStatus('获取到 ' + items.length + ' 个项目，开始取消收藏...');
            uncollectCollectionItems(items, 0, collectionId, () => {
                updateStatus('收藏夹取消收藏完成 (' + items.length + ' 个项目)');
                callback && callback();
            });
        });
    }

    // 取消收藏收藏夹中的项目
    function uncollectCollectionItems(items, index, collectionId, callback) {
        if (index >= items.length) {
            callback && callback();
            return;
        }

        const item = items[index];
        const contentId = item.content.id;
        const contentType = item.content.type || 'answer'; // 默认为answer
        const title = item.content.title || (item.content.question && item.content.question.title) || '未知标题';

        updateStatus('取消收藏 (' + (index + 1) + '/' + items.length + '): ' + truncateText(title, 30));

        // 发送DELETE请求取消收藏
        const uncollectUrl = `https://www.zhihu.com/api/v4/collections/${collectionId}/contents/${contentId}?content_id=${contentId}&content_type=${contentType}`;

        GM_xmlhttpRequest({
            method: "DELETE",
            url: uncollectUrl,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": `https://www.zhihu.com/collection/${collectionId}`,
                "X-Requested-With": "fetch"
            },
            onload: function (response) {
                if (response.status === 200) {
                    updateStatus('✓ 取消收藏成功: ' + truncateText(title, 30));
                } else {
                    updateStatus('✗ 取消收藏失败: ' + truncateText(title, 30) + ' (' + response.status + ')');
                }

                setTimeout(() => {
                    uncollectCollectionItems(items, index + 1, collectionId, callback);
                }, 500); // 0.5秒延迟
            },
            onerror: function (error) {
                updateStatus('✗ 取消收藏出错: ' + truncateText(title, 30) + ' (' + error.statusText + ')');

                setTimeout(() => {
                    uncollectCollectionItems(items, index + 1, collectionId, callback);
                }, 500); // 0.5秒延迟
            }
        });
    }

    // 导出收藏夹
    function exportCollection(collectionUrl, callback) {
        // 提取收藏夹ID
        const collectionId = collectionUrl.split('/').pop().split('?')[0];
        if (!collectionId) {
            updateStatus('无法提取收藏夹ID');
            callback && callback();
            return;
        }

        // 创建收藏夹目录
        const collectionName = '收藏夹_' + collectionId;

        // 获取收藏夹内容（这里简化处理，实际需要分页获取）
        updateStatus('正在获取收藏夹内容...');

        // 获取所有收藏夹内容
        getAllCollectionItems(collectionId, (items) => {
            if (items.length === 0) {
                updateStatus('收藏夹为空或无法访问');
                callback && callback();
                return;
            }

            updateStatus('获取到 ' + items.length + ' 个项目，开始导出...');
            exportCollectionItems(items, 0, collectionName, () => {
                updateStatus('收藏夹导出完成 (' + items.length + ' 个项目)');
                callback && callback();
            });
        });
    }

    // 获取收藏夹所有项目（分页）
    function getAllCollectionItems(collectionId, callback, offset = 0, allItems = []) {
        const limit = 20; // 每页20个项目
        const apiUrl = `https://www.zhihu.com/api/v4/collections/${collectionId}/items?offset=${offset}&limit=${limit}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: apiUrl,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            onload: function (response) {
                try {
                    const data = JSON.parse(response.responseText);
                    const items = data.data || [];

                    // 添加当前页的项目到总列表
                    allItems = allItems.concat(items);

                    // 检查是否还有更多页面
                    if (items.length === limit) {
                        // 还有更多页面，继续获取
                        updateStatus(`已获取 ${allItems.length} 个项目，继续获取更多...`);
                        setTimeout(() => {
                            getAllCollectionItems(collectionId, callback, offset + limit, allItems);
                        }, 500); // 0.5秒延迟避免请求过快
                    } else {
                        // 已获取所有项目
                        callback(allItems);
                    }
                } catch (error) {
                    updateStatus('解析收藏夹数据失败: ' + error.message);
                    callback(allItems); // 返回已获取的项目
                }
            },
            onerror: function (error) {
                updateStatus('获取收藏夹失败: ' + error.statusText);
                callback(allItems); // 返回已获取的项目
            }
        });
    }

    // 导出收藏夹项目
    function exportCollectionItems(items, index, collectionName, callback) {
        if (index >= items.length) {
            callback && callback();
            return;
        }

        const item = items[index];
        const contentUrl = item.content.url;
        const title = item.content.title || (item.content.question && item.content.question.title) || '未知标题';

        updateStatus('导出文章 (' + (index + 1) + '/' + items.length + '): ' + truncateText(title, 30));

        exportArticle(contentUrl, () => {
            setTimeout(() => {
                exportCollectionItems(items, index + 1, collectionName, callback);
            }, 1000); // 1秒延迟
        });
    }

    // 导出文章
    function exportArticle(articleUrl, callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: articleUrl,
            onload: function (response) {
                try {
                    // 解析HTML内容
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");

                    // 提取标题
                    let title = '';
                    if (articleUrl.includes('/question/')) {
                        // 问答页面
                        title = doc.querySelector('h1.QuestionHeader-title')?.textContent?.trim() ||
                            doc.querySelector('title')?.textContent?.replace(' - 知乎', '')?.trim() ||
                            '未知标题';
                    } else {
                        // 专栏文章
                        title = doc.querySelector('h1.Post-Title')?.textContent?.trim() ||
                            doc.querySelector('h1.ContentItem-title')?.textContent?.trim() ||
                            doc.querySelector('title')?.textContent?.replace(' - 知乎', '')?.trim() ||
                            '未知标题';
                    }

                    // 提取内容
                    let contentElement = null;
                    if (articleUrl.includes('/question/')) {
                        // 问答页面内容
                        contentElement = doc.querySelector('.RichContent-inner') ||
                            doc.querySelector('.RichText') ||
                            doc.querySelector('.AnswerCard .ContentItem-content');
                    } else {
                        // 专栏文章内容
                        contentElement = doc.querySelector('.Post-RichText') ||
                            doc.querySelector('.RichContent-inner') ||
                            doc.querySelector('.RichText') ||
                            doc.querySelector('.Post-content');
                    }

                    if (contentElement) {
                        // 克隆内容元素以避免修改原页面
                        const contentClone = contentElement.cloneNode(true);

                        // 移除不必要的元素
                        const removeSelectors = [
                            'style', 'script', '.ContentItem-actions',
                            '.Reward', '.AuthorInfo', '.Post-footer',
                            '.Comments-container', '.Sticky', '.ModalWrap'
                        ];

                        removeSelectors.forEach(selector => {
                            contentClone.querySelectorAll(selector).forEach(el => el.remove());
                        });

                        // 处理图片
                        const images = contentClone.querySelectorAll('img');
                        images.forEach(img => {
                            const src = img.getAttribute('src') || img.getAttribute('data-original') || img.getAttribute('data-actualsrc');
                            if (src) {
                                img.setAttribute('src', src);
                            }
                        });

                        // 转换为Markdown
                        const markdown = htmlToMarkdown(contentClone.innerHTML);
                        const fullMarkdown = '> 原文链接: ' + articleUrl + '\n\n# ' + title + '\n\n' + markdown;

                        // 下载文件
                        const filename = sanitizeFilename(title) + '.md';
                        downloadMarkdown(fullMarkdown, filename);
                        updateStatus('✓ 导出完成: ' + truncateText(title, 30));
                    } else {
                        updateStatus('✗ 导出失败: 无法提取内容 ' + truncateText(articleUrl, 30));
                    }
                } catch (error) {
                    updateStatus('✗ 导出出错: ' + error.message);
                }

                callback && callback();
            },
            onerror: function (error) {
                updateStatus('✗ 请求失败: ' + error.statusText);
                callback && callback();
            }
        });
    }

    // HTML转Markdown函数
    function htmlToMarkdown(html) {
        // 创建临时元素以处理HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 处理代码块
        tempDiv.querySelectorAll('pre').forEach(pre => {
            const code = pre.querySelector('code');
            if (code) {
                const lang = code.className ? code.className.replace('language-', '') : '';
                const content = code.textContent;
                pre.outerHTML = '``' + lang + '\n' + content + '\n```';
            }
        });

        // 处理表格
        tempDiv.querySelectorAll('table').forEach(table => {
            let markdown = '\n';
            const rows = table.querySelectorAll('tr');
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td, th');
                const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
                markdown += '| ' + cellTexts.join(' | ') + ' |\n';
                if (index === 0) {
                    markdown += '|' + cellTexts.map(() => '---').join('|') + '|\n';
                }
            });
            table.outerHTML = markdown + '\n';
        });

        // 处理列表
        tempDiv.querySelectorAll('li').forEach(li => {
            const parent = li.parentElement;
            if (parent.tagName === 'OL') {
                const index = Array.from(parent.children).indexOf(li) + 1;
                li.innerHTML = index + '. ' + li.innerHTML;
            } else {
                li.innerHTML = '* ' + li.innerHTML;
            }
        });

        // 转换为文本并清理
        let text = tempDiv.innerText || tempDiv.textContent;

        // 清理多余的空白行
        text = text.replace(/\s*\s*/g, '');

        return text;
    }

    // 下载Markdown文件
    function downloadMarkdown(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        GM_download({
            url: url,
            name: filename,
            onload: function () {
                URL.revokeObjectURL(url);
            },
            onerror: function () {
                // 降级到普通下载方式
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        });
    }

    // 更新状态显示
    function updateStatus(message) {
        const statusElement = document.getElementById('export-status');
        if (statusElement) {
            const time = new Date().toLocaleTimeString();
            statusElement.innerHTML += '[' + time + '] ' + message + '<br>';
            statusElement.scrollTop = statusElement.scrollHeight;
            // 减少控制台日志输出，保护用户隐私
            // console.log('[知乎导出工具]', message);
        }
    }

    // 更新进度条
    function updateProgressBar(percentage) {
        const progressBar = document.getElementById('export-progress-bar');
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
    }

    // 检测当前页面
    function detectCurrentPage() {
        const currentUrl = window.location.href;

        // 如果是收藏夹页面，自动添加到列表
        if (currentUrl.includes('/collection/')) {
            const exists = collections.some(c => c.url === currentUrl);
            if (!exists) {
                collections.push({
                    id: Date.now(),
                    name: '当前收藏夹',
                    url: currentUrl,
                    type: '收藏夹',
                    selected: true
                });
                saveCollections();
                renderCollectionsList();
            }
        }
    }

    // 工具函数：截断文本
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // 工具函数：清理文件名
    function sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, '_').substring(0, 100);
    }

    // 初始化
    function init() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createPanel);
        } else {
            createPanel();
        }
        
        // 首次运行时显示隐私提示
        const privacyNoticeShown = GM_getValue('privacy_notice_shown', false);
        if (!privacyNoticeShown) {
            setTimeout(() => {
                alert('🔒 隐私提示 | Privacy Notice\n\n' +
                      '本脚本会本地存储您的收藏夹信息，建议定期使用"清除本地数据"功能清理数据。\n' +
                  '脚本会向知乎API发送请求，这些请求会在浏览器中留下网络记录。\n\n' +
                      'This script stores your collection information locally. ' +
      'It is recommended to regularly use the "Clear Local Data" feature.\n' +
             'The script sends requests to Zhihu API, which will leave network records in the browser.');
         GM_setValue('privacy_notice_shown', true);
            }, 3000);
        }
    }

    // 启动脚本
    init();
})();