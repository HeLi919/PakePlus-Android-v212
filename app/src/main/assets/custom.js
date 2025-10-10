// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true })

// 自动保存密码的功能
const handleFormSubmit = (e) => {
    const form = e.target;
    let username, password;

    // 遍历表单元素
    for (let element of form.elements) {
        if (element.type === 'password') {
            password = element.value;
            break;
        }
    }

    if (!password) {
        return;
    }

    // 尝试通过常见的用户名字段名来查找用户名
    const usernameFields = ['username', 'email', 'user', 'login', 'account'];
    for (let field of usernameFields) {
        const usernameElement = form.querySelector(`[name="${field}"]`) || form.querySelector(`[id="${field}"]`);
        if (usernameElement) {
            username = usernameElement.value;
            break;
        }
    }

    // 如果还是没找到，则尝试找到第一个非隐藏的文本输入框
    if (!username) {
        for (let element of form.elements) {
            if (element.type === 'text' || element.type === 'email') {
                username = element.value;
                break;
            }
        }
    }

    if (username && password) {
        // 注意：这里使用明文存储，实际中应该加密存储
        localStorage.setItem('savedUsername', username);
        localStorage.setItem('savedPassword', password);
        console.log('密码已保存');
    }
}

document.addEventListener('submit', handleFormSubmit, true);

// 自动填充密码
const autoFillPassword = () => {
    const username = localStorage.getItem('savedUsername');
    const password = localStorage.getItem('savedPassword');
    if (!username || !password) {
        return;
    }

    const forms = document.querySelectorAll('form');
    for (let form of forms) {
        let usernameField, passwordField;

        const usernameFields = ['username', 'email', 'user', 'login', 'account'];
        for (let field of usernameFields) {
            usernameField = form.querySelector(`[name="${field}"]`) || form.querySelector(`[id="${field}"]`);
            if (usernameField) {
                break;
            }
        }

        passwordField = form.querySelector('input[type="password"]');

        if (usernameField && passwordField) {
            usernameField.value = username;
            passwordField.value = password;
            console.log('自动填充完成');
            break;
        }
    }
}

window.addEventListener('DOMContentLoaded', autoFillPassword);