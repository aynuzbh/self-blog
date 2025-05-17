const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cors = require('cors');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
const articlesDir = path.join(dataDir, 'articles');
const mediaDir = path.join(dataDir, 'media');

[dataDir, articlesDir, mediaDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置中间件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1天
}));

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 身份验证中间件
const authMiddleware = require('./middleware/auth');

// 路由
const authRoutes = require('./routes/auth');
const articlesRoutes = require('./routes/articles');
const mediaRoutes = require('./routes/media');

app.use('/auth', authRoutes);
app.use('/articles', authMiddleware, articlesRoutes);
app.use('/media', authMiddleware, mediaRoutes);

// 首页路由
app.get('/', (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect('/articles');
  } else {
    res.redirect('/auth/login');
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).render('error', { message: '页面未找到' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: '服务器错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});