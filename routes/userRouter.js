const express=require('express')
const router=express.Router()
const passport = require('passport');
const profileController=require('../controllers/user/profileController')
const userController=require('../controllers/user/userController')
const productController=require('../controllers/user/productController')
const emailChangeController=require('../controllers/user/emailChangeController')
const addressController =require('../controllers/user/addressController')
const cartController=require('../controllers/user/cartController')
const wishlistController=require('../controllers/user/wishlistController')
const checkoutController=require('../controllers/user/checkoutController')
const returnController=require('../controllers/user/returnController')
const walletController=require('../controllers/user/walletController')
const couponController=require('../controllers/user/couponController')

const { ensureAuthenticated, isLoggedIn, isNotLoggedIn } = require('../middlewares/authMiddleware');
const {preventCache} = require('../middlewares/cacheControl')

router.get('/pageNotfound',preventCache,userController.pageNotfound)
router.get('/',preventCache,userController.loadHomepage)
router.get('/signup',preventCache,isLoggedIn,userController.loadSignup)
router.post('/signup',preventCache,isLoggedIn,userController.signup)
router.get('/login',preventCache,isLoggedIn,userController.loadLogin)
router.post('/login',preventCache,isLoggedIn,userController.login)
router.get("/otp-verification",preventCache,userController.getVerifyOtp);
router.post("/verify-otp",preventCache,isLoggedIn,userController.verifySignupOtp);
router.post("/resend-otp",preventCache,isLoggedIn,userController.resendOtp);

router.get('/auth/google',preventCache,isLoggedIn,ensureAuthenticated,passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',preventCache,isLoggedIn,passport.authenticate('google',{failureRedirect:'/signup', failureMessage: true,}),(req,res)=>{
    req.session.user = {
        _id: req.user._id,
        username: req.user.name,
        email: req.user.email
      };
      console.log(req.session.user); 
    res.redirect('/')
})
router.get('/about',preventCache,userController.loadAbout)
router.get('/logout',userController.logout)

//profile management
router.get('/forgot-password', preventCache, isLoggedIn, profileController.getForget);
router.post('/forgot-password', preventCache, isLoggedIn, profileController.forgotEmailValid);
router.get('/forgot-otp-verification', preventCache, isLoggedIn,profileController.getForgotOtpVerification)
router.post('/forgot-otp-verification', preventCache, isLoggedIn, profileController.verifyOtp);
router.post('/resend-forget-otp', preventCache, isLoggedIn, profileController.resendForgetOtp);
router.get('/reset-password', preventCache, isLoggedIn, profileController.getresetPassword);
router.post('/reset-password', preventCache, isLoggedIn, profileController.resetPassword);
router.get('/profile',preventCache,profileController.getProfile)
router.put('/updateProfile', preventCache, profileController.updateProfile);
router.put('/updatePassword',preventCache,profileController.updatePassword)

router.get('/addresses',preventCache, addressController.getAddresses);
router.post('/add-address',preventCache, addressController.addAddress);
router.delete('/delete-address/:addressId',preventCache,addressController.deleteAddress)
router.get('/get-address/:addressId', preventCache, addressController.getAddress);
router.put('/update-address/:addressId', preventCache, addressController.updateAddress);


router.get('/email-change', preventCache, emailChangeController.getemailChange);
router.post('/email-change', preventCache,  emailChangeController.changeEmailValid);
router.get('/emailChange-otp-verification', preventCache,emailChangeController.getEmailOtpVerification)
router.post('/emailChange-otp-verification', preventCache, emailChangeController.verifyOtp);
router.post('/resend-email-otp', preventCache,  emailChangeController.resendEmailOtp);


router.get('/product/:id', preventCache,isLoggedIn,userController.getProductDetail);
router.get('/category/:categoryName', preventCache,isLoggedIn,userController.getCategoryPage);

router.get('/shop',preventCache,userController.loadShoppingPage)
router.get('/filter',preventCache,userController.filterProduct)
router.get('/search', preventCache,userController.searchProducts);


//product management

router.get('/productDetails',preventCache,productController.productDetails)
router.post("/add-review", preventCache,productController.addReview);
router.post("/edit-review", preventCache,productController.editReview);


//cart management

router.get('/cart', preventCache,cartController.getCart)
router.post('/cart/add',preventCache,cartController.addToCart);
router.post('/cart/update-quantity', preventCache,cartController.updateQuantity);
router.post('/cart/delete', preventCache, cartController.deleteFromCart);
router.get('/cart-wishlist-count',preventCache, cartController.cartWishlistCounter)

//wishlist management 
router.get('/wishlist',preventCache,wishlistController.getWishlist)
router.post('/wishlist/add',preventCache,wishlistController.addToWishlist);
router.post('/wishlist/remove', preventCache,wishlistController.removeFromWishlist);

//checkout and payment
router.get('/checkout',preventCache,checkoutController.getCheckout)
router.post('/proceed-to-payment', preventCache, checkoutController.proceedToPayment);
router.get('/payment', preventCache, checkoutController.getPayment);
router.post('/payment/proceed', preventCache, checkoutController.confirmPayment);
router.post('/payment/razorpay', preventCache, checkoutController.createRazorpayOrder);
router.post('/payment/verify', preventCache, checkoutController.verifyRazorpayPayment);

router.get('/order-summary/:orderId', preventCache, checkoutController.getSummary);
router.get('/orders',preventCache, checkoutController.getOrders)
router.post("/order/cancel", preventCache, checkoutController.cancelOrder);
router.get("/order/details/:orderId", preventCache, checkoutController.getUserOrderDetails);
router.get("/payment-failure",preventCache, checkoutController.paymentFailurePage); // Show failure page
router.post("/payment-failure", preventCache,checkoutController.paymentFailure); // Update order status to Failed
router.post("/payment/retry", preventCache,checkoutController.retryRazorpayPayment);

//return product
router.post('/order/return',preventCache, returnController.requestReturn);
router.get('/invoice/:orderId',preventCache, returnController.generateInvoice);
// router.get('/invoice/:orderId',preventCache, returnController.getInvoice);

//wallet management
router.get('/wallet',preventCache, walletController.getWallet);
router.post('/payment/wallet', preventCache, walletController.processWalletPayment);

//coupon management
router.get('/coupons',preventCache, couponController.getCoupon);
router.post('/apply-coupon',preventCache, checkoutController.applyCoupon);
router.post('/remove-coupon',preventCache, checkoutController.removeCoupon)



module.exports=router