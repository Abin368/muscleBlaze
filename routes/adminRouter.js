const express=require('express')
const router=express.Router()
const adminController =require('../controllers/admin/adminController')
const {adminAuth} =require('../middlewares/authMiddleware')
const { preventCache, isAdmin} = require('../middlewares/cacheControl');
const customerController =require('../controllers/admin/customerController')

router.get('/admin/login',preventCache, adminController.loadLogin);
router.post('/admin/login',preventCache, adminController.login);
router.get('/admin/dashboard',preventCache,adminController.loadDashboard)
router.get('/admin/dashboard',preventCache,isAdmin,adminController.loadDashboard)
router.get('/admin/logout',adminAuth,preventCache,adminController.logout)

//customer management
router.get('/admin/users',adminAuth,preventCache,customerController.customerInfo)
router.get('/admin/blockCustomer',preventCache,customerController.customerBlocked)
router.get('/admin/unblockCustomer',preventCache,customerController.customerunBlocked)

module.exports=router