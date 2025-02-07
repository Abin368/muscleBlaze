
   const ensureAuthenticated = (req, res, next) => {
      if (req.isAuthenticated()) {
        return res.redirect('/'); // Redirect if user is already logged in
      }
      next();
    };

  
  const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/'); // Redirect to home if already logged in
    }
    next();
};

const isNotLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }
    next();
};



////IMPORTANT ONE 
const adminAuth = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  
  if (!req.session.admin) {
      return res.redirect('/admin/login');
  }
  next();
};



// const redirectAfterPost = (req, res, next) => {
//   if (req.method === "POST") {
//       res.redirect(req.originalUrl);
//   } else {
//       next();
//   }
// };




module.exports = { isLoggedIn, isNotLoggedIn, ensureAuthenticated,adminAuth};
