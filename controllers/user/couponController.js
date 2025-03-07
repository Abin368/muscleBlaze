const Coupon = require('../../models/couponSchema')


const getCoupon =async(req,res)=>{
    try{
    let userId=req.session.user ? req.session.user._id : null;
    let date= new Date()
    if(!userId){
        console.log('no user')
       return res.redirect('/login')
    }

    let coupons = await Coupon.find({isList:true,expireOn:{$gte:date}})
    res.render('user/coupons',{coupons})

    }catch(error){
        console.error(error)
        res.status(500).send('Internal server error');
    }
}
//--------------------------------------


module.exports={
    getCoupon
}