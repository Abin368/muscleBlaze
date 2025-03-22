const User =require("../../models/userSchema")
const HTTP_STATUS=require('../../config/httpStatusCode')

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 10;

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        });

        const totalPages = Math.ceil(count / limit); 

        res.render("admin/customerDetails", { 
            data: userData, 
            count, 
            page, 
            limit, 
            search,
            totalPages 
        });

    } catch (error) {
        console.error(error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};



//-----------------------------
const customerBlocked = async (req,res)=>{
    try{

        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/users')
    }catch(error){
        res.redirect('pagerror')
    }
}
//----------------------------
const customerunBlocked =async(req,res)=>{
    try{

        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    }catch(error){
        res.redirect('pageerror')
    }
}





//--------------------------------

module.exports ={
    customerInfo,
    customerBlocked,
    customerunBlocked,

  
}