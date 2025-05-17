/**
 * 编辑器页面JavaScript功能
 */

// 初始化Quill编辑器图片上传处理
function initImageUpload(quill) {
    // 创建隐藏的文件输入元素
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/*');
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            
            // 上传图片
            uploadImage(file)
                .then(imageUrl => {
                    // 获取当前光标位置
                    const range = quill.getSelection(true);
                    
                    // 插入图片到编辑器
                    quill.insertEmbed(range.index, 'image', imageUrl);
                    
                    // 移动光标到图片后面
                    quill.setSelection(range.index + 1);
                })
                .catch(error => {
                    console.error('图片上传失败:', error);
                    alert('图片上传失败: ' + error.message);
                });
        }
    });
    
    document.body.appendChild(fileInput);
    
    // 监听工具栏图片按钮点击
    quill.getModule('toolbar').addHandler('image', () => {
        fileInput.click();
    });
}

// 上传图片到服务器
function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('media', file);
        
        fetch('/media/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 记录图片使用
                return fetch('/media/record-usage', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filename: data.filename.split('/').pop()
                    })
                })
                .then(() => data.url);
            } else {
                throw new Error(data.message || '上传失败');
            }
        })
        .then(resolve)
        .catch(reject);
    });
}

// 初始化编辑器
document.addEventListener('DOMContentLoaded', () => {
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: '在这里输入文章内容...'
    });

    // 初始化图片上传功能
    initImageUpload(quill);
});