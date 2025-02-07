const express=require('express')
const router=express.Router()
const passport = require('passport');
const profileController=require('../controllers/user/profileController')
const userController=require('../controllers/user/userController')
const { ensureAuthenticated, isLoggedIn, isNotLoggedIn } = require('../middlewares/authMiddleware');

router.get('/pageNotfound',userController.pageNotfound)
router.get('/',userController.loadHomepage)
router.get('/signup',isLoggedIn,userController.loadSignup)
router.post('/signup',isLoggedIn,userController.signup)
router.get('/login',isLoggedIn,userController.loadLogin)
router.post('/login',isLoggedIn,userController.login)

router.post("/verify-otp",isLoggedIn,userController.verifyOtp);
router.post("/resend-otp",isLoggedIn,userController.resendOtp);

router.get('/auth/google',isLoggedIn,ensureAuthenticated,passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',isLoggedIn,passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = {
        _id: req.user._id,
        username: req.user.name,
        email: req.user.email
      };
      console.log(req.session.user); 
    res.redirect('/')
})
router.get('/logout',userController.logout)

//profile management
router.get('/forgot-password',profileController.getForget)
router.post('/forgot-password',profileController.forgotEmailValid)
router.post('/forgot-otp-verification', profileController.verifyOtp);
router.post("/resend-forget-otp",profileController.resendForgetOtp);
router.get("/reset-password", profileController.getresetPassword);
router.post("/reset-password", profileController.resetPassword);





module.exports=router