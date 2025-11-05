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
            width: 350px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: none;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.08);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            user-select: none; /* 防止拖拽时选择文本 */
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            overflow: hidden;
        }
        
        #zhihu-exporter-panel:hover {
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        #zhihu-exporter-panel h3 {
            margin: 0;
            padding: 16px 20px;
            background: linear-gradient(135deg, #0084ff 0%, #0066cc 100%);
            color: white;
            border-bottom: none;
            cursor: move; /* 更改光标表示可拖拽 */
            border-radius: 12px 12px 0 0;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
        }
        
        #zhihu-exporter-panel h3::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
            pointer-events: none;
        }
        
        #zhihu-exporter-panel h3::after {
            content: '⚙️';
            font-size: 18px;
            margin-left: 8px;
        }
        
        #zhihu-exporter-content {
            padding: 20px;
            max-height: 500px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #d1d5db transparent;
        }
        
        #zhihu-exporter-content::-webkit-scrollbar {
            width: 6px;
        }
        
        #zhihu-exporter-content::-webkit-scrollbar-track {
            background: transparent;
        }
        
        #zhihu-exporter-content::-webkit-scrollbar-thumb {
            background-color: #d1d5db;
            border-radius: 3px;
        }
        
        #zhihu-exporter-content input, #zhihu-exporter-content textarea, #zhihu-exporter-content select {
            width: 100%;
            margin-bottom: 15px;
            padding: 12px 15px;
            box-sizing: border-box;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s ease;
            background-color: #ffffff;
        }
        
        #zhihu-exporter-content input:focus, #zhihu-exporter-content textarea:focus, #zhihu-exporter-content select:focus {
            outline: none;
            border-color: #0084ff;
            box-shadow: 0 0 0 3px rgba(0, 132, 255, 0.1);
        }
        
        /* 输入框和选择框增强样式 */
        #zhihu-exporter-content input[type="text"],
        #zhihu-exporter-content input[type="number"],
        #zhihu-exporter-content select {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: 1px solid #e5e7eb;
            position: relative;
        }
        
        #zhihu-exporter-content input[type="text"]:hover,
        #zhihu-exporter-content input[type="number"]:hover,
        #zhihu-exporter-content select:hover {
            border-color: #d1d5db;
            background: linear-gradient(135deg, #ffffff 0%, #f1f3f4 100%);
        }
        
        #zhihu-exporter-content select {
            cursor: pointer;
            appearance: none;
            background-image: linear-gradient(45deg, transparent 50%, #6c757d 50%), linear-gradient(135deg, #6c757d 50%, transparent 50%);
            background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%;
            background-size: 5px 5px, 5px 5px;
            background-repeat: no-repeat;
            padding-right: 30px;
        }
        
        #zhihu-exporter-content input[type="number"] {
            -moz-appearance: textfield;
        }
        
        #zhihu-exporter-content input[type="number"]::-webkit-outer-spin-button,
        #zhihu-exporter-content input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        
        #zhihu-exporter-content label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #374151;
            font-size: 14px;
        }
        
        #zhihu-exporter-content button {
            padding: 10px 16px;
            background: linear-gradient(135deg, #0084ff 0%, #0066cc 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-right: 8px;
            margin-bottom: 8px;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0, 132, 255, 0.2);
            position: relative;
            overflow: hidden;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        #zhihu-exporter-content button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        
        #zhihu-exporter-content button:hover::before {
            left: 100%;
        }
        
        #zhihu-exporter-content button:hover {
            background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 102, 204, 0.3);
        }
        
        #zhihu-exporter-content button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);
        }
        
        #zhihu-exporter-content .collection-item {
            padding: 12px 15px;
            border: 1px solid #e5e7eb;
            margin-bottom: 10px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            background-color: #ffffff;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        #zhihu-exporter-content .collection-item:hover {
            border-color: #d1d5db;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
        }
        
        #zhihu-exporter-content .collection-item input[type="checkbox"] {
            width: auto;
            margin-right: 10px;
            margin-bottom: 0;
            cursor: pointer;
        }
        
        #zhihu-exporter-content .collection-item label {
            margin-bottom: 0;
            cursor: pointer;
            flex: 1;
            font-weight: 400;
            color: #4b5563;
            word-break: break-all;
        }
        
        /* 收藏夹列表项增强样式 */
        #zhihu-exporter-content .collection-item-content {
            display: flex;
            width: 100%;
            align-items: center;
            justify-content: space-between;
        }
        
        #zhihu-exporter-content .collection-item-main {
            display: flex;
            align-items: center;
            flex: 1;
        }
        
        #zhihu-exporter-content .collection-item-meta {
            display: flex;
            align-items: center;
        }
        
        #zhihu-exporter-content .remove-collection {
            background: none;
            border: none;
            color: #6c757d;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            box-shadow: none;
        }
        
        #zhihu-exporter-content .remove-collection:hover {
            color: #dc3545;
            background: rgba(220, 53, 69, 0.1);
        }
        
        #zhihu-exporter-content .collection-item input[type="checkbox"] {
            width: 18px;
            height: 18px;
            margin-right: 12px;
            cursor: pointer;
            accent-color: #0084ff;
        }
        
        #zhihu-exporter-content .collection-item label {
            font-size: 14px;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
        }
        
        #zhihu-exporter-content .collection-item label span:first-child {
            font-weight: 500;
            color: #212529;
            margin-bottom: 2px;
        }
        
        #zhihu-exporter-content .collection-item label span:last-child {
            font-size: 12px;
            color: #6c757d;
            word-break: break-all;
        }
        
        #export-status {
            margin-top: 15px;
            padding: 12px 15px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            font-size: 13px;
            max-height: 120px;
            overflow-y: auto;
            color: #495057;
            line-height: 1.5;
            border: 1px solid #e9ecef;
            position: relative;
        }
        
        #export-status .status-timestamp {
            font-size: 11px;
            color: #6c757d;
            margin-right: 8px;
        }
        
        #export-status .status-message {
            animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .export-progress {
            height: 12px;
            background: #e9ecef;
            border-radius: 6px;
            margin: 15px 0;
            overflow: hidden;
            position: relative;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .export-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #0084ff 0%, #0066cc 100%);
            border-radius: 6px;
            width: 0%;
            transition: width 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .export-progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 2s infinite;
        }
        
        .export-progress-bar::before {
            content: attr(data-percentage);
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            font-size: 10px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        
        /* 按钮类型样式 */
        #zhihu-exporter-content button.btn-primary {
            background: linear-gradient(135deg, #0084ff 0%, #0066cc 100%);
            box-shadow: 0 2px 5px rgba(0, 132, 255, 0.2);
        }
        
        #zhihu-exporter-content button.btn-primary:hover {
            background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
            box-shadow: 0 4px 8px rgba(0, 102, 204, 0.3);
        }
        
        #zhihu-exporter-content button.btn-success {
            background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
            box-shadow: 0 2px 5px rgba(76, 175, 80, 0.2);
        }
        
        #zhihu-exporter-content button.btn-success:hover {
            background: linear-gradient(135deg, #388E3C 0%, #2E7D32 100%);
            box-shadow: 0 4px 8px rgba(56, 142, 60, 0.3);
        }
        
        #zhihu-exporter-content button.btn-secondary {
            background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            box-shadow: 0 2px 5px rgba(108, 117, 125, 0.2);
        }
        
        #zhihu-exporter-content button.btn-secondary:hover {
            background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
            box-shadow: 0 4px 8px rgba(90, 98, 104, 0.3);
        }
        
        #zhihu-exporter-content button.btn-warning {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            box-shadow: 0 2px 5px rgba(255, 152, 0, 0.2);
        }
        
        #zhihu-exporter-content button.btn-warning:hover {
            background: linear-gradient(135deg, #f57c00 0%, #e65100 100%);
            box-shadow: 0 4px 8px rgba(245, 124, 0, 0.3);
        }
        
        #zhihu-exporter-content button.btn-danger {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            box-shadow: 0 2px 5px rgba(244, 67, 54, 0.2);
        }
        
        #zhihu-exporter-content button.btn-danger:hover {
            background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
            box-shadow: 0 4px 8px rgba(211, 47, 47, 0.3);
        }
        
        /* 按钮组样式 */
        #zhihu-exporter-content .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
            margin-bottom: 15px;
        }
        
        .section-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 20px 0;
        }
    `);

    // 全局变量
    let collections = [];
    let isPanelMinimized = false;

    // 处理评论选项变化
    function handleCommentOptionChange() {
        const option = document.getElementById('comment-save-option').value;
        const customInput = document.getElementById('custom-comment-count');

        if (option === 'custom') {
            customInput.style.display = 'inline-block';
        } else {
            customInput.style.display = 'none';
        }

        // 保存设置
        saveCommentSettings();
    }

    // 保存评论设置
    function saveCommentSettings() {
        const option = document.getElementById('comment-save-option').value;
        const customCount = document.getElementById('custom-comment-count').value;

        const settings = {
            option: option,
            customCount: customCount || 10 // 默认值
        };

        GM_setValue('zhihu_comment_settings', JSON.stringify(settings));
    }

    // 加载评论设置
    function loadCommentSettings() {
        const saved = GM_getValue('zhihu_comment_settings', null);

        if (saved) {
            try {
                const settings = JSON.parse(saved);
                document.getElementById('comment-save-option').value = settings.option;
                document.getElementById('custom-comment-count').value = settings.customCount;

                // 根据选项显示/隐藏自定义输入框
                if (settings.option === 'custom') {
                    document.getElementById('custom-comment-count').style.display = 'inline-block';
                } else {
                    document.getElementById('custom-comment-count').style.display = 'none';
                }
            } catch (e) {
                console.error('加载评论设置失败:', e);
            }
        }
    }

    // 获取评论设置
    function getCommentSettings() {
        const option = document.getElementById('comment-save-option').value;
        const customCount = parseInt(document.getElementById('custom-comment-count').value) || 10;

        if (option === 'none') {
            return 0; // 不保存评论
        } else if (option === 'all') {
            return -1; // 保存全部评论
        } else if (option === 'custom') {
            return customCount; // 保存自定义数量
        } else {
            return parseInt(option); // 保存指定数量（5或10）
        }
    }

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
            '<button id="add-url" class="btn-primary">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="12" y1="5" x2="12" y2="19"></line>' +
            '<line x1="5" y1="12" x2="19" y2="12"></line>' +
            '</svg>' +
            '添加' +
            '</button>' +
            '<button id="fetch-collections" class="btn-success">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>' +
            '</svg>' +
            '获取主页收藏夹' +
            '</button>' +
            '</div>' +
            '<div class="section-divider"></div>' +
            '<div>' +
            '<label>评论保存设置:</label>' +
            '<select id="comment-save-option">' +
            '<option value="none">不保存评论</option>' +
            '<option value="5">保存前5条评论</option>' +
            '<option value="10">保存前10条评论</option>' +
            '<option value="custom">自定义数量</option>' +
            '<option value="all">保存全部评论</option>' +
            '</select>' +
            '<input type="number" id="custom-comment-count" min="1" max="1000" placeholder="自定义数量" style="display:none; width:100px;" />' +
            '</div>' +
            '<div class="section-divider"></div>' +
            '<div>' +
            '<label>选择要导出的内容:</label>' +
            '<div id="collections-list"></div>' +
            '<div class="button-group">' +
            '<button id="select-all" class="btn-secondary">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M5 12l5 5L20 7"></path>' +
            '</svg>' +
            '全选' +
            '</button>' +
            '<button id="deselect-all" class="btn-secondary">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M18 6L6 18"></path>' +
            '<path d="M6 6l12 12"></path>' +
            '</svg>' +
            '取消全选' +
            '</button>' +
            '<button id="clear-list" class="btn-secondary">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M3 6h18"></path>' +
            '<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>' +
            '</svg>' +
            '清空列表' +
            '</button>' +
            '<button id="clear-storage" class="btn-warning">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>' +
            '<line x1="12" y1="9" x2="12" y2="13"></line>' +
            '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
            '</svg>' +
            '清除本地数据' +
            '</button>' +
            '</div>' +
            '</div>' +
            '<div class="section-divider"></div>' +
            '<div>' +
            '<div class="button-group">' +
            '<button id="export-selected" class="btn-primary">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>' +
            '<polyline points="7 10 12 15 17 10"></polyline>' +
            '<line x1="12" y1="15" x2="12" y2="3"></line>' +
            '</svg>' +
            '导出选中' +
            '</button>' +
            '<button id="export-current" class="btn-primary">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>' +
            '<polyline points="14 2 14 8 20 8"></polyline>' +
            '<line x1="16" y1="13" x2="8" y2="13"></line>' +
            '<line x1="16" y1="17" x2="8" y2="17"></line>' +
            '<polyline points="10 9 9 9 8 9"></polyline>' +
            '</svg>' +
            '导出当前页面' +
            '</button>' +
            '<button id="uncollect-selected" class="btn-danger">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>' +
            '<line x1="12" y1="9" x2="12" y2="13"></line>' +
            '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
            '</svg>' +
            '取消收藏选中' +
            '</button>' +
            '</div>' +
            '</div>' +
            '<div class="section-divider"></div>' +
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

        // 绑定评论设置相关事件
        document.getElementById('comment-save-option').addEventListener('change', handleCommentOptionChange);
        document.getElementById('custom-comment-count').addEventListener('change', saveCommentSettings);

        // 添加拖拽功能
        addDragFunctionality(panel);

        // 加载已保存的收藏夹和评论设置
        loadCollections();
        loadCommentSettings();

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
            item.innerHTML = `
                <div class="collection-item-content">
                    <div class="collection-item-main">
                        <input type="checkbox" id="collection-${collection.id}" data-id="${collection.id}" ${collection.selected ? 'checked' : ''}>
                        <label for="collection-${collection.id}">
                            <span>${collection.type}</span>
                            <span>${truncateText(collection.url, 40)}</span>
                        </label>
                    </div>
                    <div class="collection-item-meta">
                        <button class="remove-collection" data-id="${collection.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

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

            // 绑定删除按钮事件
            item.querySelector('.remove-collection').addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                removeCollection(id);
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

    // 删除单个收藏夹
    function removeCollection(id) {
        collections = collections.filter(c => c.id !== id);
        saveCollections();
        renderCollectionsList();
        updateStatus('已删除收藏夹');
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
        const title = extractCollectionItemTitle(item);

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

    // 通用收藏夹项目标题提取函数
    function extractCollectionItemTitle(item) {
        return item.content.title || (item.content.question && item.content.question.title) || '未知标题';
    }

    // 导出收藏夹项目
    function exportCollectionItems(items, index, collectionName, callback) {
        if (index >= items.length) {
            callback && callback();
            return;
        }

        const item = items[index];
        const contentUrl = item.content.url;
        const title = extractCollectionItemTitle(item);

        updateStatus('导出文章 (' + (index + 1) + '/' + items.length + '): ' + truncateText(title, 30));

        exportArticle(contentUrl, () => {
            setTimeout(() => {
                exportCollectionItems(items, index + 1, collectionName, callback);
            }, 1000); // 1秒延迟
        });
    }

    // 获取文章评论
    function getArticleComments(articleUrl, callback, limit = -1) {
        // 提取文章ID
        let articleId = '';
        let articleType = '';

        if (articleUrl.includes('/question/')) {
            // 问答页面
            const match = articleUrl.match(/\/question\/(\d+)/);
            if (match) {
                articleId = match[1];
                articleType = 'question';
            }
        } else if (articleUrl.includes('/p/')) {
            // 专栏文章
            const match = articleUrl.match(/\/p\/(\d+)/);
            if (match) {
                articleId = match[1];
                articleType = 'article';
            }
        } else if (articleUrl.includes('/answer/')) {
            // 回答页面
            const match = articleUrl.match(/\/answer\/(\d+)/);
            if (match) {
                articleId = match[1];
                articleType = 'answer';
            }
        }

        if (!articleId) {
            callback([]);
            return;
        }

        // 构建API URL
        let apiUrl = '';
        if (articleType === 'question') {
            // 对于问题，获取所有回答的评论
            apiUrl = `https://www.zhihu.com/api/v4/questions/${articleId}/answers?include=data[*].comment_count&limit=20&offset=0`;
        } else if (articleType === 'article') {
            // 对于专栏文章，直接获取评论
            apiUrl = `https://www.zhihu.com/api/v4/articles/${articleId}/comments?order=normal&limit=20&offset=0`;
        } else if (articleType === 'answer') {
            // 对于回答，直接获取评论
            apiUrl = `https://www.zhihu.com/api/v4/answers/${articleId}/comments?order=normal&limit=20&offset=0`;
        }

        if (!apiUrl) {
            callback([]);
            return;
        }

        // 发送请求获取评论
        GM_xmlhttpRequest({
            method: "GET",
            url: apiUrl,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            onload: function (response) {
                try {
                    const data = JSON.parse(response.responseText);
                    let comments = [];

                    if (articleType === 'question') {
                        // 对于问题，需要获取每个回答的评论
                        const answers = data.data || [];
                        let processedAnswers = 0;

                        if (answers.length === 0) {
                            callback([]);
                            return;
                        }

                        answers.forEach(answer => {
                            const answerId = answer.id;
                            const answerUrl = `https://www.zhihu.com/api/v4/answers/${answerId}/comments?order=normal&limit=20&offset=0`;

                            GM_xmlhttpRequest({
                                method: "GET",
                                url: answerUrl,
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                                },
                                onload: function (commentResponse) {
                                    try {
                                        const commentData = JSON.parse(commentResponse.responseText);
                                        const answerComments = commentData.data || [];

                                        // 添加回答信息到评论中
                                        answerComments.forEach(comment => {
                                            comment.answer_id = answerId;
                                            comment.answer_author = answer.author?.name || '匿名用户';
                                        });

                                        comments = comments.concat(answerComments);
                                    } catch (e) {
                                        console.error('解析回答评论失败:', e);
                                    }

                                    processedAnswers++;
                                    if (processedAnswers === answers.length) {
                                        // 所有回答处理完成，按时间升序排列（最早的评论在前）
                                        comments.sort((a, b) => new Date(a.created_time * 1000) - new Date(b.created_time * 1000));

                                        // 应用限制
                                        if (limit > 0) {
                                            comments = comments.slice(0, limit);
                                        }

                                        callback(comments);
                                    }
                                },
                                onerror: function () {
                                    processedAnswers++;
                                    if (processedAnswers === answers.length) {
                                        // 按时间升序排列（最早的评论在前）
                                        comments.sort((a, b) => new Date(a.created_time * 1000) - new Date(b.created_time * 1000));
                                        if (limit > 0) {
                                            comments = comments.slice(0, limit);
                                        }
                                        callback(comments);
                                    }
                                }
                            });
                        });
                    } else {
                        // 对于文章和回答，直接使用返回的评论
                        comments = data.data || [];

                        // 按照创建时间升序排列（最早的评论在前）
                        comments.sort((a, b) => new Date(a.created_time * 1000) - new Date(b.created_time * 1000));

                        // 应用限制
                        if (limit > 0) {
                            comments = comments.slice(0, limit);
                        }

                        callback(comments);
                    }
                } catch (error) {
                    console.error('获取评论失败:', error);
                    callback([]);
                }
            },
            onerror: function (error) {
                console.error('请求评论API失败:', error);
                callback([]);
            }
        });
    }

    // 将评论转换为Markdown格式
    function commentsToMarkdown(comments) {
        if (!comments || comments.length === 0) {
            return '';
        }

        let markdown = '\n\n## 💬 评论\n\n';

        comments.forEach((comment, index) => {
            const author = comment.author?.name || '匿名用户';
            const content = comment.content || '';
            const createdTime = comment.created_time ?
                new Date(comment.created_time * 1000).toLocaleString() : '未知时间';

            // 添加楼层号和作者信息
            markdown += `### 📝 ${index + 1}楼: ${author}\n\n`;

            // 添加评论内容，使用引用格式
            markdown += `> ${content}\n\n`;

            // 添加发布时间，使用小字体样式
            markdown += `<small>📅 发布时间: ${createdTime}</small>\n\n`;

            // 如果有子评论，也一并处理
            if (comment.child_comments && comment.child_comments.length > 0) {
                // 按时间顺序排列子评论
                const sortedChildComments = [...comment.child_comments].sort(
                    (a, b) => new Date(a.created_time * 1000) - new Date(b.created_time * 1000)
                );

                markdown += `#### 💭 回复 (${sortedChildComments.length}条)\n\n`;
                sortedChildComments.forEach((childComment, childIndex) => {
                    const childAuthor = childComment.author?.name || '匿名用户';
                    const childContent = childComment.content || '';
                    const childCreatedTime = childComment.created_time ?
                        new Date(childComment.created_time * 1000).toLocaleString() : '未知时间';

                    // 检查是否是回复特定用户的评论
                    let replyInfo = '';
                    if (childComment.reply_to_author && childComment.reply_to_author.name) {
                        replyInfo = ` 回复 @${childComment.reply_to_author.name}`;
                    }

                    // 使用嵌套引用格式表示回复
                    markdown += `>> **${childAuthor}**${replyInfo}: ${childContent}\n\n`;
                    markdown += `>> <small>📅 ${childCreatedTime}</small>\n\n`;
                });
            }

            // 添加分隔线
            if (index < comments.length - 1) {
                markdown += '---\n\n';
            }
        });

        return markdown;
    }

    // 通用标题提取函数
    function extractTitle(doc, articleUrl) {
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
        return title;
    }

    // 导出文章
    function exportArticle(articleUrl, callback) {
        // 获取评论设置
        const commentLimit = getCommentSettings();

        GM_xmlhttpRequest({
            method: "GET",
            url: articleUrl,
            onload: function (response) {
                try {
                    // 解析HTML内容
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");

                    // 使用通用标题提取函数
                    const title = extractTitle(doc, articleUrl);

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

                        // 直接使用处理后的HTML，让htmlToMarkdownWithImages函数处理图片
                        updateStatus('正在处理文章内容...');
                        const processedHTML = contentClone.innerHTML;

                        // 转换为Markdown
                        updateStatus('正在转换为Markdown格式...');
                        const markdown = htmlToMarkdownWithImages(processedHTML, title, []);
                        let fullMarkdown = '> 原文链接: ' + articleUrl + '\n\n# ' + title + '\n\n' + markdown;

                        // 如果需要保存评论，获取评论并添加到Markdown
                        if (commentLimit !== 0) {
                            updateStatus('正在获取评论...');
                            getArticleComments(articleUrl, function (comments) {
                                if (comments && comments.length > 0) {
                                    const actualCount = commentLimit > 0 ?
                                        Math.min(commentLimit, comments.length) : comments.length;

                                    // 处理评论数量不足的情况
                                    if (commentLimit > 0 && comments.length < commentLimit) {
                                        updateStatus(`文章只有 ${comments.length} 条评论，少于设置的 ${commentLimit} 条，将全部保存`);
                                    }

                                    const limitedComments = commentLimit > 0 ?
                                        comments.slice(0, commentLimit) : comments;

                                    const commentsMarkdown = commentsToMarkdown(limitedComments);
                                    fullMarkdown += commentsMarkdown;

                                    updateStatus(`已添加 ${actualCount} 条评论到导出内容`);
                                } else {
                                    updateStatus('未获取到评论或文章没有评论');
                                }

                                // 下载文件
                                const filename = sanitizeFilename(title) + '.md';
                                downloadMarkdown(fullMarkdown, filename);
                                updateStatus('✓ 导出完成: ' + truncateText(title, 30));

                                callback && callback();
                            }, commentLimit);
                        } else {
                            // 不需要保存评论，直接下载
                            const filename = sanitizeFilename(title) + '.md';
                            downloadMarkdown(fullMarkdown, filename);
                            updateStatus('✓ 导出完成: ' + truncateText(title, 30));

                            callback && callback();
                        }
                    } else {
                        updateStatus('✗ 导出失败: 无法提取内容 ' + truncateText(articleUrl, 30));
                        callback && callback();
                    }
                } catch (error) {
                    console.error('导出过程中发生错误:', error);
                    updateStatus('✗ 导出出错: ' + error.message);
                    callback && callback();
                }
            },
            onerror: function (error) {
                console.error('文章请求失败:', error);
                updateStatus('✗ 请求失败: ' + error.statusText);
                callback && callback();
            }
        });
    }

    // 通用图片处理函数
    function processImage(img, index, title, prefix = '') {
        // 优先使用data-original属性获取高质量图片，其次使用src
        let src = img.getAttribute('data-original') || img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        const titleAttr = img.getAttribute('title') || '';

        // 跳过SVG占位符 - 修复检测逻辑，确保正确识别SVG占位符
        if (src && (src.startsWith('data:image/svg+xml') || src.includes('xmlns=\'http://www.w3.org/2000/svg\''))) {
            return ''; // 返回空字符串，表示应该移除这个元素
        }

        if (src) {
            // 根据图片URL确定文件扩展名
            let extension = '.jpg'; // 默认扩展名
            if (src.includes('.png') || src.startsWith('data:image/png')) {
                extension = '.png';
            } else if (src.includes('.gif') || src.startsWith('data:image/gif')) {
                extension = '.gif';
            }

            // 生成有规律的图片文件名
            const imageName = `${sanitizeFilename(title)}_image_${prefix}${index + 1}${extension}`;

            // 下载图片
            downloadImage(src, imageName);

            // 返回替换后的HTML
            return `<img src="${imageName}" alt="${alt}" style="border:1px solid #ccc;">`;
        } else {
            return ''; // 返回空字符串，表示应该移除这个元素
        }
    }

    // HTML转Markdown函数（带图片处理）
    function htmlToMarkdownWithImages(html, title, imageInfoList) {
        // 创建临时元素以处理HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 通用元素处理函数
        function processElement(selector, processor) {
            const elements = tempDiv.querySelectorAll(selector);
            elements.forEach(processor);
        }

        // 处理图片 - 将img标签转换为Markdown格式，并下载图片
        // 首先处理figure标签中的图片
        const figureImages = tempDiv.querySelectorAll('figure');
        figureImages.forEach((figure, index) => {
            const img = figure.querySelector('img');
            if (img) {
                const replacement = processImage(img, index, title);
                figure.outerHTML = replacement;
            } else {
                // figure标签中没有img元素，移除整个figure标签
                figure.outerHTML = '';
            }
        });

        // 处理剩余的独立img标签（不包含在figure标签中的）
        // 需要重新获取tempDiv中的img标签，因为前面的处理可能已经改变了DOM结构
        const remainingImages = tempDiv.querySelectorAll('img');
        // 从figureImages.length开始计数，避免图片编号重复
        remainingImages.forEach((img, index) => {
            // 跳过已经处理过的图片（通过检查是否已经是我们替换的HTML格式）
            if (img.hasAttribute('style') && img.getAttribute('style').includes('border:1px solid #ccc')) {
                return;
            }

            const replacement = processImage(img, index, title, figureImages.length);
            img.outerHTML = replacement;
        });

        // 处理标题
        processElement('h1, h2, h3, h4, h5, h6', heading => {
            const level = parseInt(heading.tagName.substring(1));
            const text = heading.textContent.trim();
            heading.outerHTML = '\n' + '#'.repeat(level) + ' ' + text + '\n\n';
        });

        // 处理粗体和斜体
        processElement('strong, b', element => {
            element.outerHTML = '**' + element.textContent + '**';
        });

        processElement('em, i', element => {
            element.outerHTML = '*' + element.textContent + '*';
        });

        // 处理链接
        processElement('a', a => {
            const href = a.getAttribute('href');
            const text = a.textContent.trim();
            if (href && text) {
                a.outerHTML = `[${text}](${href})`;
            } else {
                a.outerHTML = text;
            }
        });

        // 处理代码块
        processElement('pre', pre => {
            const code = pre.querySelector('code');
            if (code) {
                const lang = code.className ? code.className.replace('language-', '') : '';
                const content = code.textContent;
                pre.outerHTML = '\n``' + lang + '\n' + content + '\n```\n';
            }
        });

        // 处理内联代码
        processElement('code', code => {
            // 跳过已经在pre中的code
            if (!code.closest('pre')) {
                code.outerHTML = '`' + code.textContent + '`';
            }
        });

        // 处理表格
        processElement('table', table => {
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
        processElement('ol', ol => {
            const items = ol.querySelectorAll('li');
            let markdown = '\n';
            items.forEach((li, index) => {
                markdown += (index + 1) + '. ' + li.textContent.trim() + '\n';
            });
            ol.outerHTML = markdown + '\n';
        });

        processElement('ul', ul => {
            const items = ul.querySelectorAll('li');
            let markdown = '\n';
            items.forEach(li => {
                markdown += '* ' + li.textContent.trim() + '\n';
            });
            ul.outerHTML = markdown + '\n';
        });

        // 处理段落和换行
        processElement('p', p => {
            p.outerHTML = '\n' + p.textContent.trim() + '\n\n';
        });

        processElement('br', br => {
            br.outerHTML = '\n';
        });

        // 处理块引用
        processElement('blockquote', blockquote => {
            const text = blockquote.textContent.trim();
            blockquote.outerHTML = '\n> ' + text.replace(/\n/g, '\n> ') + '\n\n';
        });

        // 转换为文本并清理
        let text = tempDiv.innerHTML;

        // 修复空白行问题 - 只保留单个空行，而不是移除所有空白
        text = text.replace(/\n{3,}/g, '\n\n'); // 将多个连续空行替换为两个换行符

        // 修复行首行尾空格
        text = text.replace(/[ \t]+$/gm, ''); // 移除行尾空格
        text = text.replace(/^[ \t]+/gm, ''); // 移除行首空格

        return text.trim();
    }

    // 通用下载函数
    function downloadResource(url, filename, isImage = false) {
        // 使用fetch和Blob下载资源
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP错误! 状态: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                // 创建Blob URL
                const blobUrl = URL.createObjectURL(blob);

                // 使用降级下载方案
                fallbackDownload(blobUrl, filename);
            })
            .catch(error => {
                console.error(`${isImage ? '图片' : '文件'}下载失败:`, filename, error);

                // 如果fetch失败，尝试使用传统方法
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.target = '_blank'; // 在新标签页打开，避免跳转当前页面
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    }

    // 下载图片
    function downloadImage(imageUrl, filename) {
        // 确保图片URL是完整的
        let fullImageUrl = imageUrl;
        if (imageUrl.startsWith('//')) {
            fullImageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
            fullImageUrl = 'https://www.zhihu.com' + imageUrl;
        }

        // 解码HTML实体编码（如&amp;转换为&）并处理URL中的空格和特殊字符
        try {
            // 创建临时元素来解码HTML实体
            const tempElement = document.createElement('textarea');
            tempElement.innerHTML = fullImageUrl;
            fullImageUrl = tempElement.value;

            // 处理URL中的空格和特殊字符
            fullImageUrl = fullImageUrl.replace(/\s+/g, ''); // 移除所有空格
            fullImageUrl = fullImageUrl.replace(/[`"']/g, ''); // 移除可能的引号
        } catch (e) {
            console.error('URL解码失败:', fullImageUrl, e);
        }

        // 特殊处理知乎图片URL，确保获取原始图片
        if (fullImageUrl.includes('zhimg.com/')) {
            try {
                // 先移除所有空格
                fullImageUrl = fullImageUrl.replace(/\s+/g, '');

                // 对于知乎图片，保留必要的查询参数
                // 知乎图片URL格式: https://picx.zhimg.com/v2-xxx_720w.jpg?source=7e7ef6e2&needBackground=1
                const urlParts = fullImageUrl.split('?');
                const baseUrl = urlParts[0];
                const params = urlParts.length > 1 ? urlParts[1] : '';

                // 解析查询参数
                const urlParams = new URLSearchParams(params);

                // 保留必要的参数，如source和needBackground
                const essentialParams = new URLSearchParams();
                if (urlParams.has('source')) {
                    essentialParams.set('source', urlParams.get('source'));
                }
                if (urlParams.has('needBackground')) {
                    essentialParams.set('needBackground', urlParams.get('needBackground'));
                }

                // 重新构建URL
                const paramString = essentialParams.toString();
                fullImageUrl = paramString ? `${baseUrl}?${paramString}` : baseUrl;
            } catch (e) {
                // 如果处理失败，保持原URL
                console.error('知乎图片URL处理失败:', fullImageUrl, e);
                // 尝试简单处理，移除空格和查询参数
                fullImageUrl = fullImageUrl.replace(/\s+/g, '').split('?')[0];
            }
        }

        // 使用通用下载函数下载图片
        downloadResource(fullImageUrl, filename, true);
    }

    // 下载Markdown文件
    function downloadMarkdown(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // 直接使用降级下载方案
        fallbackDownload(url, filename);
    }

    // 降级下载方案
    function fallbackDownload(url, filename) {
        try {
            // 方案1: 使用传统的点击方式
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';

            // 添加到文档中并触发点击
            document.body.appendChild(link);

            // 尝试多种触发点击的方式
            if (link.click) {
                link.click();
            } else if (document.createEvent) {
                const event = document.createEvent('MouseEvents');
                event.initEvent('click', true, true);
                link.dispatchEvent(event);
            } else if (document.createEventObject) {
                link.fireEvent('onclick');
            }

            // 延迟移除元素和释放URL，确保下载开始后再清理
            setTimeout(() => {
                try {
                    document.body.removeChild(link);
                } catch (e) {
                    console.error('移除临时链接元素时出错:', e);
                }
            }, 100);

            // 更长的延迟后再释放URL对象
            setTimeout(() => {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.error('释放Blob URL时出错:', e);
                }
            }, 5000);
        } catch (e) {
            console.error('降级方案执行失败:', e);

            // 方案2: 如果点击方案失败，尝试使用数据URI方式
            try {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    try {
                        document.body.removeChild(link);
                    } catch (e) { }
                }, 100);
                return;
            } catch (e2) {
                console.error('数据URI方案也失败:', e2);
            }

            // 方案3: 最后的兜底方案，在新窗口中打开
            try {
                window.open(url, '_blank');
            } catch (e3) {
                console.error('所有下载方案都失败了:', e3);
                // 如果所有方案都失败，显示提示信息
                alert('无法自动下载文件，请在新打开的窗口或标签页中手动保存文件');
            }
        }
    }

    // 更新状态显示
    function updateStatus(message) {
        const statusElement = document.getElementById('export-status');
        if (statusElement) {
            const time = new Date().toLocaleTimeString();
            statusElement.innerHTML = '<div class="status-message"><span class="status-timestamp">[' + time + ']</span> ' + message + '</div>';
            statusElement.scrollTop = statusElement.scrollHeight;

            // 添加动画效果
            statusElement.lastElementChild.style.animation = 'none';
            setTimeout(() => {
                statusElement.lastElementChild.style.animation = 'fadeIn 0.3s ease-in-out';
            }, 10);
        }
    }

    // 更新进度条
    function updateProgressBar(percentage) {
        const progressBar = document.getElementById('export-progress-bar');
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            progressBar.setAttribute('data-percentage', Math.round(percentage) + '%');

            // 添加动画效果
            progressBar.style.transition = 'width 0.3s ease-in-out';
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
        return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 100);
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