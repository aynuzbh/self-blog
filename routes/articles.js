const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const articlesDir = path.join(__dirname, '../../data/articles');

// 确保文章目录存在
if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
}

// 文章列表（首页）
router.get('/', (req, res) => {
    fs.readdir(articlesDir, (err, files) => {
        if (err) {
            console.error('读取文章列表错误:', err);
            return res.status(500).send('服务器错误');
        }

        const articles = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const data = JSON.parse(fs.readFileSync(path.join(articlesDir, file), 'utf8'));
                return {
                    id: file.replace('.json', ''),
                    title: data.title,
                    preview: data.content.substring(0, 100) + '...',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.render('home', { articles });
    });
});

// 创建新文章
router.get('/new', (req, res) => {
    res.render('editor', { 
        article: null,
        mode: 'create'
    });
});

// 编辑文章
router.get('/edit/:id', (req, res) => {
    const articlePath = path.join(articlesDir, `${req.params.id}.json`);
    
    if (fs.existsSync(articlePath)) {
        const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
        res.render('editor', { 
            article,
            mode: 'edit'
        });
    } else {
        res.status(404).send('文章未找到');
    }
});

// 保存文章
router.post('/save', (req, res) => {
    try {
        const { id, title, content, mode } = req.body;
        if (!title || !content) {
            console.error('缺少必要参数:', { title, content });
            return res.status(400).json({ 
                success: false, 
                message: '标题和内容不能为空' 
            });
        }

        // 确保文章目录存在
        if (!fs.existsSync(articlesDir)) {
            fs.mkdirSync(articlesDir, { recursive: true });
            console.log('创建文章目录:', articlesDir);
        }

        const now = new Date().toISOString();
        const articleData = {
            title,
            content,
            updatedAt: now,
            createdAt: mode === 'create' ? now : req.body.createdAt
        };

        const articleId = mode === 'create' ? uuidv4() : id;
        const articlePath = path.join(articlesDir, `${articleId}.json`);
        console.log('保存文章路径:', articlePath);

        fs.writeFileSync(articlePath, JSON.stringify(articleData, null, 2));
        console.log('文章保存成功:', articleId);

        res.json({ 
            success: true, 
            id: articleId,
            message: '文章保存成功'
        });
    } catch (error) {
        console.error('文章保存错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '文章保存失败',
            error: error.message 
        });
    }
});

// 删除文章
router.post('/delete/:id', (req, res) => {
    const articlePath = path.join(articlesDir, `${req.params.id}.json`);
    
    if (fs.existsSync(articlePath)) {
        fs.unlinkSync(articlePath);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: '文章未找到' });
    }
});

// 获取文章内容
router.get('/:id', (req, res) => {
    const articlePath = path.join(articlesDir, `${req.params.id}.json`);
    
    if (fs.existsSync(articlePath)) {
        const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
        res.render('article', { article });
    } else {
        res.status(404).send('文章未找到');
    }
});

// 分享文章
router.post('/share/:id', (req, res) => {
    const { customSuffix } = req.body;
    const articleId = req.params.id;
    const shareLink = `/articles/${articleId}${customSuffix ? `?ref=${customSuffix}` : ''}`;
    
    res.json({ success: true, shareLink });
});

module.exports = router;