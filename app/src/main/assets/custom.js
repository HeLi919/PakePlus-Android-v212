// 链接处理 - 更安全的实现
const hookClick = (e) => {
    const origin = e.target.closest('a');
    
    // 只在特定条件下处理
    if (origin && origin.href && origin.target === '_blank') {
        // 检查是否是外部链接或其他特定条件
        const isExternal = !origin.href.startsWith(window.location.origin);
        
        if (isExternal) {
            e.preventDefault();
            // 可以添加确认对话框
            if (confirm('是否在新窗口打开链接？')) {
                window.open(origin.href, '_blank');
            } else {
                location.href = origin.href;
            }
        }
    }
};

// 密码管理 - 安全改进版本
class PasswordManager {
    constructor() {
        this.storageKey = 'encryptedCredentials';
    }
    
    // 简单的加密（实际项目中应该使用更安全的加密方式）
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
    
    saveCredentials(username, password, domain) {
        const credentials = {
            username: this.encrypt(username),
            password: this.encrypt(password),
            domain: domain || window.location.hostname,
            timestamp: Date.now()
        };
        
        // 只保存当前域名的凭证
        const key = `${this.storageKey}_${window.location.hostname}`;
        localStorage.setItem(key, JSON.stringify(credentials));
    }
    
    getCredentials() {
        const key = `${this.storageKey}_${window.location.hostname}`;
        const data = localStorage.getItem(key);
        
        if (!data) return null;
        
        try {
            const credentials = JSON.parse(data);
            return {
                username: this.decrypt(credentials.username),
                password: this.decrypt(credentials.password)
            };
        } catch {
            return null;
        }
    }
    
    // 安全的自动填充
    safeAutoFill() {
        const credentials = this.getCredentials();
        if (!credentials) return;
        
        // 只在登录页面尝试自动填充
        const isLoginPage = document.querySelector('input[type="password"]') && 
                           (document.querySelector('input[type="text"]') || 
                            document.querySelector('input[type="email"]'));
        
        if (isLoginPage) {
            setTimeout(() => {
                this.fillForm(credentials);
            }, 100);
        }
    }
    
    fillForm(credentials) {
        const forms = document.querySelectorAll('form');
        
        for (let form of forms) {
            const passwordField = form.querySelector('input[type="password"]');
            if (!passwordField) continue;
            
            let usernameField = form.querySelector('input[type="text"], input[type="email"]');
            
            // 尝试常见用户名字段
            if (!usernameField) {
                const usernameSelectors = ['[name="username"]', '[name="email"]', '[name="user"]'];
                for (let selector of usernameSelectors) {
                    usernameField = form.querySelector(selector);
                    if (usernameField) break;
                }
            }
            
            if (usernameField && passwordField) {
                usernameField.value = credentials.username;
                passwordField.value = credentials.password;
                
                // 触发change事件
                usernameField.dispatchEvent(new Event('change', { bubbles: true }));
                passwordField.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log('自动填充完成');
                break;
            }
        }
    }
}

// 初始化密码管理器
const passwordManager = new PasswordManager();

// 改进的表单提交处理
const handleFormSubmit = (e) => {
    const form = e.target;
    let username, password;
    
    // 查找密码字段
    const passwordField = form.querySelector('input[type="password"]');
    if (!passwordField) return;
    
    password = passwordField.value;
    
    // 查找用户名字段
    const usernameFields = ['username', 'email', 'user', 'login'];
    let usernameField;
    
    for (let field of usernameFields) {
        usernameField = form.querySelector(`[name="${field}"]`) || 
                       form.querySelector(`[id="${field}"]`);
        if (usernameField) {
            username = usernameField.value;
            break;
        }
    }
    
    // 如果没找到，找第一个文本输入框
    if (!usernameField) {
        usernameField = form.querySelector('input[type="text"], input[type="email"]');
        if (usernameField) {
            username = usernameField.value;
        }
    }
    
    if (username && password) {
        // 询问用户是否保存密码
        if (confirm('是否保存登录信息？')) {
            passwordManager.saveCredentials(username, password);
            console.log('登录信息已安全保存');
        }
    }
};

// 事件监听
document.addEventListener('submit', handleFormSubmit, true);
document.addEventListener('click', hookClick, { capture: true });

// 安全的自动填充
window.addEventListener('DOMContentLoaded', () => {
    passwordManager.safeAutoFill();
});