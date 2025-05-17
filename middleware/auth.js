/**
 * 身份验证中间件
 * 检查用户是否已登录，如果未登录则重定向到登录页面
 */
module.exports = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};