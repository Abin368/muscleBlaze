const express=require('express')
const router=express.Router()
const adminController =require('../controllers/admin/adminController')
const {adminAuth} =require('../middlewares/authMiddleware')
const { preventCache, isAdmin} = require('../middlewares/cacheControl');
const customerController =require('../controllers/admin/customerController')
const  categoryController=require('../controllers/admin/categoryController')
const  productController=require('../controllers/admin/productController');
const multer = require('multer');  // Import multer
const { storage, fileFilter } = require('../helpers/multer');  // Import the Multer config from helpers
const upload = multer({ storage, fileFilter });  

router.get('/admin/login',preventCache, adminController.loadLogin);
router.post('/admin/login',preventCache, adminController.login);
router.get('/admin/dashboard',preventCache,adminController.loadDashboard)
router.get('/admin/dashboard',preventCache,isAdmin,adminController.loadDashboard)
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

//product management
router.get('/admin/addproducts',adminAuth,productController.getProductAddPage)
router.post('/admin/addProduct', upload.fields([
    { name: 'images1', maxCount: 1 },
    { name: 'images2', maxCount: 1 },
    { name: 'images3', maxCount: 1 }
]), productController.addProducts);  

router.get('/admin/products',adminAuth,productController.getAllProducts)
router.post('/admin/addProductOffer',adminAuth,productController.addProductOffer)
router.post('/admin/removeProductOffer',adminAuth,productController.removeProductOffer)
router.get('/admin/blockProduct',adminAuth,productController.blockProduct)
router.get('/admin/unblockProduct',adminAuth,productController.unblockProduct)
router.get('/admin/editProduct',adminAuth,productController.getEditProduct)
router.post('/admin/editProduct/:id',adminAuth,upload.fields([
    { name: 'images1', maxCount: 1 },
    { name: 'images2', maxCount: 1 },
    { name: 'images3', maxCount: 1 }
]),productController.editProduct)
router.post('/admin/deleteImage',adminAuth,productController.deleteSingleImage)
router.get('/admin/deleteProduct',adminAuth,productController.deleteProduct)



module.exports=router