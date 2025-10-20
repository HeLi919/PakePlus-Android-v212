// 密码管理器 - 自动保存和自动填充
class PasswordManager {
    constructor() {
        this.storageKey = 'autoSavedPasswords';
        this.isEnabled = true;
        this.currentDomain = window.location.hostname;
        this.init();
    }
    
    init() {
        console.log('密码管理器已初始化');
        this.autoFillOnLoad();
        this.setupFormMonitoring();
        this.setupNavigationMonitor();
    }
    
    // 加密存储（简单的base64编码）
    encrypt(text) {
        return btoa(unescape(encodeURIComponent(text)));
    }
    
    decrypt(encrypted) {
        try {
            return decodeURIComponent(escape(atob(encrypted)));
        } catch {
            return null;
        }
    }
    
    // 保存账号密码
    saveCredentials(username, password, website = null) {
        if (!this.isEnabled) return;
        
        const websiteKey = website || this.currentDomain;
        const credentials = {
            username: this.encrypt(username),
            password: this.encrypt(password),
            domain: websiteKey,
            timestamp: Date.now()
        };
        
        // 获取现有保存的密码
        const allCredentials = this.getAllCredentials();
        allCredentials[websiteKey] = credentials;
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(allCredentials));
            console.log('账号密码已保存:', websiteKey);
            this.showNotification('✓ 密码已保存');
        } catch (e) {
            console.error('保存密码失败:', e);
        }
    }
    
    // 获取所有保存的凭据
    getAllCredentials() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }
    
    // 获取当前网站的凭据
    getCurrentCredentials() {
        const allCredentials = this.getAllCredentials();
        const credentials = allCredentials[this.currentDomain];
        
        if (!credentials) return null;
        
        // 检查是否过期（90天）
        const isExpired = Date.now() - credentials.timestamp > 90 * 24 * 60 * 60 * 1000;
        if (isExpired) {
            this.clearCredentials(this.currentDomain);
            return null;
        }
        
        return {
            username: this.decrypt(credentials.username),
            password: this.decrypt(credentials.password)
        };
    }
    
    // 清除凭据
    clearCredentials(website = null) {
        const websiteKey = website || this.currentDomain;
        const allCredentials = this.getAllCredentials();
        delete allCredentials[websiteKey];
        localStorage.setItem(this.storageKey, JSON.stringify(allCredentials));
        console.log('已清除保存的密码:', websiteKey);
    }
    
    // 页面加载时自动填充
    autoFillOnLoad() {
        if (!this.isEnabled) return;
        
        // 延迟执行，确保页面完全加载
        setTimeout(() => {
            const credentials = this.getCurrentCredentials();
            if (credentials) {
                const filled = this.fillLoginForm(credentials);
                if (filled) {
                    console.log('自动填充完成');
                    this.showNotification('🔐 已自动填充账号密码');
                }
            }
        }, 1000);
    }
    
    // 填充登录表单
    fillLoginForm(credentials) {
        const forms = document.querySelectorAll('form');
        let filled = false;
        
        for (let form of forms) {
            const passwordField = this.findPasswordField(form);
            if (!passwordField) continue;
            
            const usernameField = this.findUsernameField(form);
            
            if (usernameField && passwordField) {
                // 只在字段为空时填充
                if (!usernameField.value && !passwordField.value) {
                    usernameField.value = credentials.username;
                    passwordField.value = credentials.password;
                    
                    // 触发输入事件
                    this.triggerInputEvents(usernameField);
                    this.triggerInputEvents(passwordField);
                    
                    filled = true;
                    
                    // 自动提交（可选）
                    this.autoSubmitForm(form);
                    break;
                }
            }
        }
        
        return filled;
    }
    
    // 查找密码字段
    findPasswordField(form) {
        return form.querySelector('input[type="password"]');
    }
    
    // 查找用户名字段
    findUsernameField(form) {
        const selectors = [
            'input[name="username"]',
            'input[name="user"]',
            'input[name="email"]',
            'input[name="account"]',
            'input[name="login"]',
            'input[type="text"]',
            'input[type="email"]'
        ];
        
        for (let selector of selectors) {
            const field = form.querySelector(selector);
            if (field && field.type !== 'hidden' && !field.disabled) {
                return field;
            }
        }
        return null;
    }
    
    // 触发输入事件
    triggerInputEvents(element) {
        ['input', 'change', 'focus'].forEach(eventType => {
            element.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
    }
    
    // 自动提交表单（可选）
    autoSubmitForm(form) {
        // 查找提交按钮
        const submitSelectors = [
            'input[type="submit"]',
            'button[type="submit"]',
            'button:not([type])',
            '[onclick*="submit"]',
            '[onclick*="login"]'
        ];
        
        for (let selector of submitSelectors) {
            const submitBtn = form.querySelector(selector);
            if (submitBtn) {
                console.log('找到提交按钮，自动提交');
                setTimeout(() => {
                    submitBtn.click();
                }, 500);
                return true;
            }
        }
        return false;
    }
    
    // 设置表单监控
    setupFormMonitoring() {
        // 监控表单提交
        document.addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        }, true);
        
        // 监控密码输入
        document.addEventListener('input', (e) => {
            if (e.target.type === 'password') {
                this.handlePasswordInput(e.target);
            }
        });
    }
    
    // 处理表单提交
    handleFormSubmit(e) {
        const form = e.target;
        const passwordField = this.findPasswordField(form);
        
        if (!passwordField || !passwordField.value) return;
        
        const usernameField = this.findUsernameField(form);
        if (!usernameField || !usernameField.value) return;
        
        // 自动保存（不询问）
        this.saveCredentials(usernameField.value, passwordField.value);
    }
    
    // 处理密码输入
    handlePasswordInput(passwordField) {
        const form = passwordField.closest('form');
        if (!form) return;
        
        const usernameField = this.findUsernameField(form);
        if (usernameField && usernameField.value && passwordField.value) {
            // 实时保存（可选，可能会频繁保存）
            // this.saveCredentials(usernameField.value, passwordField.value);
        }
    }
    
    // 设置导航监控
    setupNavigationMonitor() {
        // 监听页面跳转
        let currentUrl = window.location.href;
        
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('检测到页面跳转，重新尝试自动填充');
                setTimeout(() => this.autoFillOnLoad(), 1500);
            }
        }, 1000);
        
        // 监听页面可见性变化（标签页切换）
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => this.autoFillOnLoad(), 500);
            }
        });
    }
    
    // 显示通知
    showNotification(message) {
        // 移除现有通知
        const existingNotice = document.querySelector('.password-manager-notice');
        if (existingNotice) {
            existingNotice.remove();
        }
        
        const notice = document.createElement('div');
        notice.className = 'password-manager-notice';
        notice.textContent = message;
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notice);
        
        setTimeout(() => {
            if (document.body.contains(notice)) {
                notice.remove();
            }
        }, 3000);
    }
    
    // 添加管理界面
    addControlPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #333;
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
            font-size: 12px;
            font-family: Arial, sans-serif;
        `;
        
        panel.innerHTML = `
            <div>密码管理器</div>
            <button onclick="passwordManager.toggle()" style="margin:2px; padding:2px 5px;">${this.isEnabled ? '禁用' : '启用'}</button>
            <button onclick="passwordManager.clearCurrent()" style="margin:2px; padding:2px 5px;">清除</button>
        `;
        
        document.body.appendChild(panel);
    }
    
    // 切换启用状态
    toggle() {
        this.isEnabled = !this.isEnabled;
        console.log('密码管理器:', this.isEnabled ? '已启用' : '已禁用');
        this.showNotification(`密码管理器${this.isEnabled ? '已启用' : '已禁用'}`);
        
        if (this.isEnabled) {
            this.autoFillOnLoad();
        }
    }
    
    // 清除当前网站密码
    clearCurrent() {
        this.clearCredentials();
        this.showNotification('已清除保存的密码');
    }
}

// 初始化密码管理器
const passwordManager = new PasswordManager();

// 在页面完全加载后添加控制面板
window.addEventListener('load', () => {
    setTimeout(() => {
        passwordManager.addControlPanel();
    }, 2000);
});

// 暴露到全局，方便调试
window.passwordManager = passwordManager;

console.log('🔐 密码管理器已加载 - 自动保存和填充账号密码');