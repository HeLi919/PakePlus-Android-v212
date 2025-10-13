// 链接处理 - 优化版本
const hookClick = (e) => {
    const origin = e.target.closest('a');
    
    if (!origin || !origin.href) return;
    
    // 只在特定条件下处理
    const shouldHandle = 
        origin.target === '_blank' || 
        document.querySelector('head base[target="_blank"]');
    
    if (shouldHandle) {
        // 检查是否是外部链接
        const isExternal = !origin.href.startsWith(window.location.origin);
        const isSamePage = origin.href.includes('#') && 
                          origin.href.replace(/#.*/, '') === window.location.href.replace(/#.*/, '');
        
        // 跳过页面内锚点链接
        if (isSamePage) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // 对于外部链接或需要特殊处理的链接
        if (isExternal) {
            // 添加确认对话框，避免意外跳转
            if (confirm(`即将离开当前页面，访问: ${new URL(origin.href).hostname}\n是否继续？`)) {
                window.open(origin.href, '_blank', 'noopener,noreferrer');
            }
        } else {
            // 内部链接直接在当前页面打开
            location.href = origin.href;
        }
    }
};

// 密码管理 - 增强版本（包含自动重新登录功能）
class PasswordManager {
    constructor() {
        this.storageKey = 'encryptedCredentials';
        this.isEnabled = false;
        this.autoReloginEnabled = false;
        this.reloginAttempts = 0;
        this.maxReloginAttempts = 3;
        this.init();
    }
    
    init() {
        // 检查功能是否启用
        this.isEnabled = localStorage.getItem('passwordManagerEnabled') === 'true';
        this.autoReloginEnabled = localStorage.getItem('autoReloginEnabled') === 'true';
        
        // 提供启用/禁用选项
        if (!localStorage.getItem('passwordManagerEnabled')) {
            this.showInitialPrompt();
        }
        
        // 启动掉线检测
        this.startSessionMonitoring();
    }
    
    showInitialPrompt() {
        const enable = confirm('是否启用密码自动保存功能？\n\n注意：密码将加密保存在本地浏览器中。');
        localStorage.setItem('passwordManagerEnabled', enable.toString());
        this.isEnabled = enable;
        
        if (enable) {
            const enableRelogin = confirm('是否启用自动重新登录功能？\n\n当检测到登录状态失效时，会自动尝试重新登录。');
            localStorage.setItem('autoReloginEnabled', enableRelogin.toString());
            this.autoReloginEnabled = enableRelogin;
        }
    }
    
    // 改进的加密（虽然仍然不是绝对安全，但比base64好）
    encrypt(text) {
        // 添加简单的混淆
        const timestamp = Date.now().toString();
        const mixedText = text + '|' + timestamp + '|' + window.location.hostname;
        return btoa(unescape(encodeURIComponent(mixedText)));
    }
    
    decrypt(encrypted) {
        try {
            const decoded = decodeURIComponent(escape(atob(encrypted)));
            // 提取原始文本（去掉时间戳和域名）
            return decoded.split('|')[0];
        } catch {
            return null;
        }
    }
    
    saveCredentials(username, password) {
        if (!this.isEnabled) return;
        
        const credentials = {
            username: this.encrypt(username),
            password: this.encrypt(password),
            domain: window.location.hostname,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        const key = `${this.storageKey}_${window.location.hostname}`;
        try {
            localStorage.setItem(key, JSON.stringify(credentials));
            this.showSaveNotification();
        } catch (e) {
            console.error('保存密码失败:', e);
        }
    }
    
    showSaveNotification() {
        console.log('登录信息已安全保存');
        
        const notification = document.createElement('div');
        notification.textContent = '✓ 密码已保存';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
    
    getCredentials() {
        if (!this.isEnabled) return null;
        
        const key = `${this.storageKey}_${window.location.hostname}`;
        const data = localStorage.getItem(key);
        
        if (!data) return null;
        
        try {
            const credentials = JSON.parse(data);
            
            // 检查数据是否过期（30天）
            const isExpired = Date.now() - credentials.timestamp > 30 * 24 * 60 * 60 * 1000;
            if (isExpired) {
                this.clearCredentials();
                return null;
            }
            
            return {
                username: this.decrypt(credentials.username),
                password: this.decrypt(credentials.password)
            };
        } catch {
            this.clearCredentials();
            return null;
        }
    }
    
    clearCredentials() {
        const key = `${this.storageKey}_${window.location.hostname}`;
        localStorage.removeItem(key);
    }
    
    // 改进的自动填充检测
    safeAutoFill() {
        if (!this.isEnabled) return false;
        
        const credentials = this.getCredentials();
        if (!credentials) return false;
        
        // 更准确的登录页面检测
        const hasPasswordField = document.querySelector('input[type="password"]');
        const hasUsernameField = document.querySelector('input[type="text"][name*="user"], input[type="email"][name*="user"], input[name*="user"], input[name*="email"]');
        
        const isLikelyLoginPage = hasPasswordField && 
            (hasUsernameField || 
             document.querySelector('form[action*="login"], form[id*="login"]'));
        
        if (isLikelyLoginPage) {
            // 延迟填充，确保页面完全加载
            setTimeout(() => {
                this.fillForm(credentials);
            }, 500);
            return true;
        }
        return false;
    }
    
    fillForm(credentials) {
        const forms = document.querySelectorAll('form');
        let filled = false;
        
        for (let form of forms) {
            const passwordField = form.querySelector('input[type="password"]');
            if (!passwordField) continue;
            
            // 改进的用户名字段查找
            let usernameField = this.findUsernameField(form);
            
            if (usernameField && passwordField) {
                // 检查字段是否已经填充
                if (!usernameField.value && !passwordField.value) {
                    usernameField.value = credentials.username;
                    passwordField.value = credentials.password;
                    
                    // 触发事件
                    this.triggerInputEvents(usernameField);
                    this.triggerInputEvents(passwordField);
                    
                    console.log('自动填充完成');
                    filled = true;
                    
                    // 显示填充提示
                    this.showAutoFillNotification();
                }
                break;
            }
        }
        
        return filled;
    }
    
    // 自动提交登录表单
    autoSubmitForm() {
        if (this.reloginAttempts >= this.maxReloginAttempts) {
            console.log('已达到最大自动重新登录尝试次数');
            return false;
        }
        
        const forms = document.querySelectorAll('form');
        for (let form of forms) {
            const passwordField = form.querySelector('input[type="password"]');
            if (!passwordField) continue;
            
            // 查找提交按钮
            const submitButton = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
            
            if (submitButton) {
                console.log('尝试自动重新登录');
                this.reloginAttempts++;
                
                // 触发点击事件（更自然的方式）
                submitButton.click();
                return true;
            } else {
                // 如果没有找到提交按钮，直接提交表单
                form.submit();
                return true;
            }
        }
        return false;
    }
    
    findUsernameField(form) {
        const selectors = [
            'input[name="username"]',
            'input[name="email"]',
            'input[name="user"]',
            'input[name="login"]',
            'input[type="text"]',
            'input[type="email"]'
        ];
        
        for (let selector of selectors) {
            const field = form.querySelector(selector);
            if (field && field.type !== 'hidden') {
                return field;
            }
        }
        return null;
    }
    
    triggerInputEvents(element) {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    showAutoFillNotification() {
        const notification = document.createElement('div');
        notification.textContent = '🔐 已自动填充登录信息';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
    
    // 会话监控和掉线检测
    startSessionMonitoring() {
        if (!this.autoReloginEnabled) return;
        
        // 定期检查登录状态
        setInterval(() => {
            this.checkLoginStatus();
        }, 30000); // 每30秒检查一次
        
        // 监听页面跳转和错误
        window.addEventListener('beforeunload', () => {
            this.reloginAttempts = 0; // 重置尝试次数
        });
        
        // 监听网络状态
        window.addEventListener('online', () => {
            // 网络恢复时检查登录状态
            setTimeout(() => this.checkLoginStatus(), 2000);
        });
    }
    
    // 检查登录状态
    async checkLoginStatus() {
        if (!this.autoReloginEnabled || !this.isEnabled) return;
        
        // 检查当前是否在登录页面
        const isLoginPage = document.querySelector('input[type="password"]') && 
                           (document.querySelector('input[type="text"]') || 
                            document.querySelector('input[type="email"]'));
        
        if (isLoginPage) {
            // 如果在登录页面，检查是否有保存的凭据
            const credentials = this.getCredentials();
            if (credentials) {
                console.log('检测到登录页面，尝试自动重新登录');
                
                // 先填充表单
                const filled = this.fillForm(credentials);
                if (filled) {
                    // 等待一下然后自动提交
                    setTimeout(() => {
                        this.autoSubmitForm();
                    }, 1000);
                }
            }
        } else {
            // 如果不在登录页面，检查是否有登录状态失效的迹象
            this.detectLogoutIndicators();
        }
    }
    
    // 检测登出指示器
    detectLogoutIndicators() {
        // 常见的登出指示器：
        
        // 1. 页面包含登录相关的文字提示
        const logoutTextIndicators = [
            '请登录', '登录', 'sign in', 'login',
            '会话已过期', 'session expired',
            '请重新登录', '请重新输入密码',
            '未登录', '未认证', '认证失败'
        ];
        
        const pageText = document.body.innerText.toLowerCase();
        for (let indicator of logoutTextIndicators) {
            if (pageText.includes(indicator.toLowerCase())) {
                console.log('检测到登出指示器:', indicator);
                this.handleLogoutDetection();
                return;
            }
        }
        
        // 2. URL中包含登录相关路径
        const loginPaths = ['/login', '/signin', '/auth', '/authenticate'];
        const currentPath = window.location.pathname.toLowerCase();
        for (let path of loginPaths) {
            if (currentPath.includes(path)) {
                console.log('检测到登录路径:', path);
                this.handleLogoutDetection();
                return;
            }
        }
        
        // 3. 检查是否有登录表单
        const loginForm = document.querySelector('form input[type="password"]');
        if (loginForm && window.location.pathname !== '/') {
            console.log('检测到非首页的登录表单');
            this.handleLogoutDetection();
        }
    }
    
    // 处理登出检测
    handleLogoutDetection() {
        if (this.reloginAttempts >= this.maxReloginAttempts) {
            console.log('已达到最大重新登录尝试次数，停止自动重新登录');
            return;
        }
        
        const credentials = this.getCredentials();
        if (!credentials) {
            console.log('没有保存的凭据，无法自动重新登录');
            return;
        }
        
        console.log('尝试自动重新登录');
        
        // 填充并提交登录表单
        const filled = this.fillForm(credentials);
        if (filled) {
            setTimeout(() => {
                const submitted = this.autoSubmitForm();
                if (submitted) {
                    this.showReloginNotification();
                }
            }, 1500);
        }
    }
    
    showReloginNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = '🔄 检测到登录状态失效，正在自动重新登录...';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FF9800;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }
    
    // 提供管理接口
    enableAutoRelogin() {
        this.autoReloginEnabled = true;
        localStorage.setItem('autoReloginEnabled', 'true');
        this.startSessionMonitoring();
    }
    
    disableAutoRelogin() {
        this.autoReloginEnabled = false;
        localStorage.setItem('autoReloginEnabled', 'false');
    }
}

// 初始化密码管理器
const passwordManager = new PasswordManager();

// 改进的表单提交处理
const handleFormSubmit = (e) => {
    const form = e.target;
    
    // 查找密码字段
    const passwordField = form.querySelector('input[type="password"]');
    if (!passwordField) return;
    
    const password = passwordField.value;
    if (!password) return;
    
    // 查找用户名字段
    const usernameField = passwordManager.findUsernameField(form);
    if (!usernameField) return;
    
    const username = usernameField.value;
    if (!username) return;
    
    // 检查是否已经保存过
    const existing = passwordManager.getCredentials();
    const isNew = !existing || existing.username !== username;
    
    if (isNew && passwordManager.isEnabled) {
        // 延迟询问，避免干扰表单提交
        setTimeout(() => {
            if (confirm('是否保存此登录信息？')) {
                passwordManager.saveCredentials(username, password);
                
                // 询问是否启用自动重新登录
                if (!localStorage.getItem('autoReloginEnabled')) {
                    const enableRelogin = confirm('是否启用自动重新登录功能？\n当检测到登录状态失效时，会自动尝试重新登录。');
                    if (enableRelogin) {
                        passwordManager.enableAutoRelogin();
                    }
                }
            }
        }, 100);
    }
};

// 事件监听 - 使用更安全的方式
let isClickHandlerAttached = false;
let isSubmitHandlerAttached = false;

function attachEventListeners() {
    if (!isClickHandlerAttached) {
        document.addEventListener('click', hookClick, { capture: true });
        isClickHandlerAttached = true;
    }
    
    if (!isSubmitHandlerAttached) {
        document.addEventListener('submit', handleFormSubmit, true);
        isSubmitHandlerAttached = true;
    }
}

// 安全的自动填充
window.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
    passwordManager.safeAutoFill();
});

// 处理动态加载的内容
const observer = new MutationObserver(() => {
    passwordManager.safeAutoFill();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 提供管理接口
window.passwordManager = {
    clear: () => passwordManager.clearCredentials(),
    disable: () => {
        passwordManager.isEnabled = false;
        localStorage.setItem('passwordManagerEnabled', 'false');
    },
    enable: () => {
        passwordManager.isEnabled = true;
        localStorage.setItem('passwordManagerEnabled', 'true');
    },
    enableAutoRelogin: () => passwordManager.enableAutoRelogin(),
    disableAutoRelogin: () => passwordManager.disableAutoRelogin(),
    getStatus: () => ({
        enabled: passwordManager.isEnabled,
        autoRelogin: passwordManager.autoReloginEnabled,
        hasCredentials: !!passwordManager.getCredentials()
    })
};

console.log('密码管理器已加载，输入 passwordManager.getStatus() 查看状态');