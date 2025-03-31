const express=require('express')
const router=express.Router()
const adminController =require('../controllers/admin/adminController')
const {adminAuth} =require('../middlewares/authMiddleware')
const { preventCache, isAdmin} = require('../middlewares/cacheControl');
const customerController =require('../controllers/admin/customerController')
const  categoryController=require('../controllers/admin/categoryController')
const  productController=require('../controllers/admin/productController');
const bannerController=require('../controllers/admin/bannerController')
const orderController=require('../controllers/admin/orderController')
const couponController=require('../controllers/admin/couponController')
const WalletController=require('../controllers/admin/walletController')

const multer = require('multer');  
const { storage, fileFilter } = require('../helpers/multer');  
const upload = multer({ storage, fileFilter });  

router.get('/admin/login',preventCache, adminController.loadLogin);
router.post('/admin/login',preventCache, adminController.login);
router.get('/admin/dashboard',preventCache,adminController.loadDashboard)
router.get('/admin/dashboard',preventCache,isAdmin,adminController.loadDashboard)
router.get('/admin/sales-report',preventCache,adminController.salesReport)
router.get('/admin/logout',adminAuth,preventCache,adminController.logout)

//customer management
router.get('/admin/users',adminAuth,preventCache,customerController.customerInfo)
router.get('/admin/blockCustomer',preventCache,customerController.customerBlocked)
router.get('/admin/unblockCustomer',preventCache,customerController.customerunBlocked)

//category management
router.get('/admin/categories',adminAuth,preventCache,categoryController.categoryInfo)
router.post('/admin/addCategory',categoryController.addCategory)
router.get('/admin/listCategory',adminAuth,categoryController.getListCategory)
router.get('/admin/unlistCategory',adminAuth,categoryController.getUnlistCategory)
router.get('/admin/editCategory/:id', adminAuth, categoryController.getEditCategory);
router.post('/admin/updateCategory', adminAuth, categoryController.updateCategory);
router.get('/admin/deleteCategory',adminAuth,categoryController.deleteCategory)
router.post('/admin/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/admin/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)

//product management
router.get('/admin/addproducts',adminAuth,productController.getProductAddPage)
// router.post('/admin/addProduct', upload.fields([
//     { name: 'images1', maxCount: 1 },
//     { name: 'images2', maxCount: 1 },
//     { name: 'images3', maxCount: 1 }
// ]), productController.addProducts);  
router.post('/admin/addProduct', upload.array('images', 10), productController.addProducts);

router.get('/admin/products',adminAuth,productController.getAllProducts)
router.post('/admin/addProductOffer',adminAuth,productController.addProductOffer)
router.post('/admin/removeProductOffer',adminAuth,productController.removeProductOffer)
router.get('/admin/blockProduct',adminAuth,productController.blockProduct)
router.get('/admin/unblockProduct',adminAuth,productController.unblockProduct)
router.get('/admin/editProduct',adminAuth,productController.getEditProduct)
// router.post('/admin/editProduct/:id',adminAuth,upload.fields([
//     { name: 'images1', maxCount: 1 },
//     { name: 'images2', maxCount: 1 },
//     { name: 'images3', maxCount: 1 }
// ]),productController.editProduct)
router.post('/admin/editProduct/:id', adminAuth, upload.array('images'), productController.editProduct);
router.post('/admin/deleteImage',adminAuth,productController.deleteSingleImage)
router.get('/admin/deleteProduct',adminAuth,productController.deleteProduct)

//Banner Management

router.get('/admin/banners',adminAuth,bannerController.getBanner)
router.get('/admin/addBanner',adminAuth,bannerController.getAddBannerPage)
router.post('/admin/addBanner',adminAuth,upload.fields([
    { name: 'images1', maxCount: 1 },

]),bannerController.addBanner)

router.get('/admin/deleteBanner',adminAuth,bannerController.deleteBanner)


//order management
router.get('/admin/orders',adminAuth,orderController.getOrder)
router.get('/admin/ordersPage/:orderId', adminAuth,orderController.getOrderDetails);
router.post('/admin/updateOrderStatus/:orderId', adminAuth, orderController.updateOrderStatus);
router.post("/admin/approve-return", adminAuth, orderController.approveReturn);


//coupon management
router.get('/admin/coupons',adminAuth, couponController.getAllCoupons);
router.post('/admin/addCoupon',adminAuth, couponController.addCoupon)
router.get('/admin/deleteCoupon',adminAuth, couponController.deleteCoupon);
router.post('/admin/editCoupon/:couponId', adminAuth, couponController.editCoupon);
router.get('/admin/listCoupon',adminAuth, couponController.getListCoupon)
router.get('/admin/unlistCoupon',adminAuth,couponController.getUnlistCoupon)


//wallet management
router.get("/admin/wallet", adminAuth,WalletController.getWallets);
router.get("/admin/wallet/:userId", adminAuth,WalletController.getWalletTransaction);



module.exports=router