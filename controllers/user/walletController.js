const User = require("../../models/userSchema");
const Wallet = require('../../models/walletSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const session = require("express-session");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Coupon = require('../../models/couponSchema')
const HTTP_STATUS=require('../../config/httpStatusCode')


const getWallet = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;
        if (!userId) return res.redirect('/login');

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.render('user/wallet', { wallet: { balance: 0, transactions: [] }, currentPage: page, totalPages: 1 });
        }

        const transactions = wallet.transactions.reverse().slice(skip, skip + limit);
        const totalPages = Math.ceil(wallet.transactions.length / limit);

        res.render('user/wallet', { wallet: { ...wallet._doc, transactions }, currentPage: page, totalPages });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Internal server error');
    }
};

//----------------------------------
const processWalletPayment = async (req, res) => {
    try {
       

        const userId = req.session.user?._id || req.body.userId;
       

        if (!userId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "User not logged in." });
        }

        const { addressId, cartItems, grandTotal, paymentMethod, couponCode } = req.body;

        if (!addressId || !grandTotal || !paymentMethod || !cartItems || cartItems.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Missing required fields" });
        }

        if (paymentMethod.toLowerCase() !== "wallet") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Invalid payment method for wallet transaction." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: "User not found." });
        }

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Wallet not found." });
        }

       

        let discountAmount = 0;
        let couponName = null; 

        if (couponCode) {
            const coupon = await Coupon.findOne({ name: couponCode });

            if (!coupon) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Invalid coupon code." });
            }

            if (coupon.usedBy.includes(userId)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Coupon already used by this user." });
            }

            const originalTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            if (coupon.discountType === "fixed") {
                discountAmount = coupon.discountValue;
            } else if (coupon.discountType === "percentage") {
                discountAmount = (coupon.discountValue * originalTotal) / 100; 
            }

           
            couponName = couponCode; 
        }

        const finalAmount = grandTotal;

        if (wallet.balance < finalAmount) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Insufficient wallet balance." });
        }

        let orderItems = await Promise.all(
            cartItems.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) throw new Error(`Product not found: ${item.product}`);

                return {
                    product: product._id,
                    quantity: item.quantity,
                    price: item.price, 
                    status: "Ordered",
                    cancelMessage: "",
                    returnStatus: "Not Requested",
                    returnReason: ""
                };
            })
        );

        wallet.balance -= finalAmount;
        wallet.transactions.push({
            type: "debit",
            amount: finalAmount,
            reason: "Order Payment",
            createdAt: new Date(),
        });
        await wallet.save();

        const newOrder = new Order({
            userId: userId,
            orderItems: orderItems,
            totalPrice: grandTotal,
            discount: discountAmount,
            paymentMethod: "wallet",
            finalAmount: finalAmount,
            address: addressId,
            status: "Pending",
            paymentStatus: "Paid",
            createdAt: new Date(),
            invoiceDate: new Date(),
            couponApplied: !!couponCode,  
            couponName: couponName || null
        });

        const savedOrder = await newOrder.save();

        if (couponCode) {
            await Coupon.updateOne(
                { name: couponCode },
                { $addToSet: { usedBy: userId } }
            );
        }

        for (const item of orderItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: -item.quantity } }
            );
        }

        await User.findByIdAndUpdate(userId, {
            $push: { orderHistory: savedOrder._id }
        });

      
        res.status(HTTP_STATUS.OK).json({ success: true, orderId: savedOrder._id });

    } catch (error) {
        console.error("Error processing wallet payment:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: "Internal server error" });
    }
};



module.exports = {
    getWallet,
    processWalletPayment
}