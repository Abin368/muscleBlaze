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
const customerBlocked = async (req, res) => {
    try {
        const id = req.query.id || req.body.id; 
        const result = await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, error: "Customer not found or already blocked" });
        }
        res.json({ success: true, message: "Customer blocked successfully" });
    } catch (error) {
        console.error("Error blocking customer:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

const customerunBlocked = async (req, res) => {
    try {
        const id = req.query.id || req.body.id;
        const result = await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, error: "Customer not found or already unblocked" });
        }
        res.json({ success: true, message: "Customer unblocked successfully" });
    } catch (error) {
        console.error("Error unblocking customer:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};





//--------------------------------

module.exports ={
    customerInfo,
    customerBlocked,
    customerunBlocked,

  
}