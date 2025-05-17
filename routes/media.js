const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mediaDir = path.join(__dirname, '../../public/uploads');
const dataDir = path.join(__dirname, '../../data/media');

// 确保目录存在
[mediaDir, dataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 配置multer文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, mediaDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只支持图片文件 (jpeg, jpg, png, gif)'));
        }
    }
});

// 获取素材列表
router.get('/', (req, res) => {
    fs.readdir(mediaDir, (err, files) => {
        if (err) {
            console.error('读取素材列表错误:', err);
            return res.status(500).send('服务器错误');
        }

        const mediaFiles = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
            })
            .map(file => {
                const stats = fs.statSync(path.join(mediaDir, file));
                const metadataPath = path.join(dataDir, `${file}.json`);
                let metadata = {};
                
                if (fs.existsSync(metadataPath)) {
                    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                }

                return {
                    filename: file,
                    url: `/uploads/${file}`,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    ...metadata
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.render('media', { mediaFiles });
    });
});

// 上传素材
router.post('/upload', upload.single('media'), (req, res) => {
    try {
        if (!req.file) {
            console.error('没有接收到文件');
            return res.status(400).json({ success: false, message: '请选择有效的图片文件' });
        }

        console.log('接收到文件:', req.file);

        // 确保上传目录存在
        if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir, { recursive: true });
        }

        // 创建元数据文件
        const metadata = {
            originalName: req.file.originalname,
            uploadDate: new Date().toISOString(),
            usageCount: 0,
            lastUsed: null
        };

        const metadataPath = path.join(dataDir, `${req.file.filename}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log('元数据文件创建成功:', metadataPath);

        // 返回完整的文件路径
        const fileUrl = `/uploads/${req.file.filename}`;
        console.log('文件上传成功:', fileUrl);

        res.json({ 
            success: true, 
            filename: req.file.filename,
            url: fileUrl
        });
    } catch (error) {
        console.error('文件上传错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '文件上传失败',
            error: error.message 
        });
    }
});

// 重命名素材
router.post('/rename', (req, res) => {
    const { oldName, newName } = req.body;
    
    if (!oldName || !newName) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const oldPath = path.join(mediaDir, oldName);
    const newPath = path.join(mediaDir, newName);
    const oldMetaPath = path.join(dataDir, `${oldName}.json`);
    const newMetaPath = path.join(dataDir, `${newName}.json`);

    if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ success: false, message: '文件不存在' });
    }

    try {
        // 重命名文件
        fs.renameSync(oldPath, newPath);
        
        // 重命名元数据文件
        if (fs.existsSync(oldMetaPath)) {
            fs.renameSync(oldMetaPath, newMetaPath);
        }

        res.json({ success: true, newName });
    } catch (err) {
        console.error('重命名错误:', err);
        res.status(500).json({ success: false, message: '重命名失败' });
    }
});

// 删除素材
router.post('/delete', (req, res) => {
    const { filename } = req.body;
    
    if (!filename) {
        return res.status(400).json({ success: false, message: '缺少文件名参数' });
    }

    const filePath = path.join(mediaDir, filename);
    const metaPath = path.join(dataDir, `${filename}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: '文件不存在' });
    }

    try {
        // 删除文件
        fs.unlinkSync(filePath);
        
        // 删除元数据文件
        if (fs.existsSync(metaPath)) {
            fs.unlinkSync(metaPath);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('删除错误:', err);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

// 记录素材使用
router.post('/record-usage', (req, res) => {
    const { filename } = req.body;
    
    if (!filename) {
        return res.status(400).json({ success: false, message: '缺少文件名参数' });
    }

    const metaPath = path.join(dataDir, `${filename}.json`);

    if (!fs.existsSync(metaPath)) {
        return res.status(404).json({ success: false, message: '元数据文件不存在' });
    }

    try {
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        metadata.usageCount = (metadata.usageCount || 0) + 1;
        metadata.lastUsed = new Date().toISOString();
        
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error('记录使用错误:', err);
        res.status(500).json({ success: false, message: '记录使用失败' });
    }
});

module.exports = router;