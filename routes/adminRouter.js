const express=require('express')
const router=express.Router()
const adminController =require('../controllers/admin/adminController')
const {adminAuth} =require('../middlewares/authMiddleware')
const { preventCache, isAdmin} = require('../middlewares/cacheControl');
const customerController =require('../controllers/admin/customerController')
const  categoryController=require('../controllers/admin/categoryController')
const  productController=require('../controllers/admin/productController')

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


module.exports=router