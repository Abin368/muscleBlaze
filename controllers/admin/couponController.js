const Coupon=require('../../models/couponSchema')
const mongoose = require('mongoose');
const HTTP_STATUS=require('../../config/httpStatusCode')


const getAllCoupons = async (req, res) => {
    try {
        let search = req.query.search?.trim() || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const query = search ? { name: { $regex: ".*" + search + ".*", $options: "i" } } : {};
        
        const coupons = await Coupon.find(query).sort({createdOn:-1}).skip(skip).limit(limit);
        const totalCoupons = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);

      
        if (req.xhr) {
            return res.json({ coupons, totalPages, currentPage: page, search });
        }

       
        res.render("admin/couponDetails", {
            coupons,
            search,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};

//-------------------------------------------------
const addCoupon = async (req, res) => {
    try {
        const { name, discountType, discountValue, minimumPrice, expireOn } = req.body;

    
        const existingCoupon = await Coupon.findOne({ name });
        if (existingCoupon) {
            return res.json({ success: false, message: "Coupon already exists" });
        }

        const expirationDate = new Date(expireOn);
        const currentDate = new Date();

    
        if (discountValue < 0) {
            return res.json({ success: false, message: "Discount value cannot be negative" });
        }

        if (minimumPrice < 0) {
            return res.json({ success: false, message: "Minimum price cannot be negative" });
        }

        if (discountType === "fixed" && Number(discountValue) > Number(minimumPrice)) {
            return res.json({ success: false, message: "For fixed discount, discount value should be less than minimum price." });
        }
        
        if (discountType === "percentage" && discountValue > 100) {
            return res.json({ success: false, message: "Percentage discount cannot exceed 100%." });
        }
        
        if (isNaN(expirationDate.getTime())) {
            return res.json({ success: false, message: "Invalid date format" });
        }

        if (expirationDate <= currentDate) {
            return res.json({ success: false, message: "Expiration date must be in the future" });
        }

        const newCoupon = new Coupon({ name, discountType, discountValue, minimumPrice, expireOn: expirationDate });
        await newCoupon.save();

        return res.json({
            success: true,
            message: "Coupon added successfully!",
            coupon: newCoupon,
        });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "An error occurred while adding the coupon" });
    }
};


//------------------------------------------------------
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.query;

     
        const deletedCoupon = await Coupon.findByIdAndDelete(id);
        if (!deletedCoupon) {
            req.session.errorMessage = 'Coupon not found!';
            return res.redirect('/admin/coupons');
        }

        req.session.successMessage = 'Coupon deleted successfully!';
        return res.redirect('/admin/coupons');

    } catch (error) {
        console.error(error);
        req.session.errorMessage = 'Error deleting coupon!';
        return res.redirect('/admin/coupons');
    }
};
//-------------------------------------

const editCoupon = async (req, res) => {
    try {
        const { name, discountType, discountValue, minimumPrice, expireOn } = req.body;
        console.log("Received data for update:", req.body); 

    
        const { couponId } = req.params;
        const existingCoupon = await Coupon.findOne({ name, _id: { $ne: couponId } });

        if (existingCoupon) {
            return res.json({ success: false, message: "Coupon name already exists!" });
        }

      
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            { name, discountType, discountValue, minimumPrice, expireOn },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.json({ success: false, message: "Coupon not found!" });
        }

        res.json({ success: true, message: "Coupon updated successfully!" });

    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};
//-------------------------------------------------------------
const getListCoupon = async (req, res) => {
    try {
        let { id: couponId, page = 1, search = "" } = req.query;

        await Coupon.findByIdAndUpdate(couponId, { isList: false });

        res.redirect(`/admin/coupons`);
    } catch (error) {
        console.error("Error listing coupon:", error);
        res.redirect("/pageerror");
    }
};

//----------------------------------
const getUnlistCoupon = async (req, res) => {
    try {
        let { id: couponId, page = 1, search = "" } = req.query;

        await Coupon.findByIdAndUpdate(couponId, { isList: true });

        res.redirect(`/admin/coupons`);
    } catch (error) {
        console.error("Error unlisting coupon:", error);
        res.redirect("/pageerror");
    }
};




module.exports={
    getAllCoupons,
    addCoupon,
    deleteCoupon,
    editCoupon,
    getListCoupon,
    getUnlistCoupon
}