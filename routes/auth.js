const express = require('express');
const router = express.Router();

// 登录页面
router.get('/login', (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect('/');
  } else {
    res.render('login', { error: null });
  }
});

// 登录处理
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    res.redirect('/');
  } else {
    res.render('login', { error: '用户名或密码错误' });
  }
});

// 登出
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session销毁错误:', err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;