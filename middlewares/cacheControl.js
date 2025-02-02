// Middleware to prevent caching
const preventCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        return next(); // Proceed if admin is logged in
    } else {
        return res.redirect('/admin/login'); // Redirect to login if not logged in
    }
};

module.exports = {
    preventCache,
    isAdmin,
};
