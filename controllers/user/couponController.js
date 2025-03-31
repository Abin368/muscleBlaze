const Coupon = require('../../models/couponSchema')
const HTTP_STATUS=require('../../config/httpStatusCode')

const getCoupon =async(req,res)=>{
    try{
    let userId=req.session.user ? req.session.user._id : null;
    let date= new Date()
    if(!userId){
       
       return res.redirect('/login')
    }

    let coupons = await Coupon.find({isList:true,expireOn:{$gte:date}})
    res.render('user/coupons',{coupons})

    }catch(error){
        console.error(error)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Internal server error');
    }
}
//--------------------------------------


module.exports={
    getCoupon
}