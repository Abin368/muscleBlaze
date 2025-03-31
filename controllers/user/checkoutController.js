const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Wallet = require('../../models/walletSchema')
const Cart=require("../../models/cartSchema")
const Address = require('../../models/addressSchema')
const Order= require('../../models/orderSchema')
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const Razorpay = require("razorpay");
const Coupon=require('../../models/couponSchema')
const crypto = require("crypto");
const razorpay= require('../../config/razorpay')
const HTTP_STATUS=require('../../config/httpStatusCode')



require("dotenv").config();




const { v4: uuidv4 } = require('uuid');


const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        let { productId, quantity, couponCode } = req.query;

      

        let cartItems = [];
        let grandTotal = 0;
        let originalTotal = 0;
        let totalQuantity = 0;
        let discount = 0;
        let product = null; 

        if (productId) {
          
            product = await Product.findById(productId).populate('category');
            if (!product || product.isBlocked || product.isDeleted || !product.category || product.category.isDeleted || !product.category.isListed) {
               
                return res.redirect('/pageNotFound');
            }

            let selectedQuantity = quantity ? parseInt(quantity, 10) : 1;
            if (selectedQuantity > product.quantity) {
                return res.render('user/checkout', {
                    cartItems: [],
                    grandTotal: 0,
                    originalTotal: 0,
                    quantity: 0,
                    addresses: await Address.findOne({ userId }) || { address: [] },
                    swalMessage: `${product.name} is out of stock.`,
                    discount: 0,
                    couponCode: null
                });
            }

            cartItems = [{
                product: product._id,
                name: product.name,
                quantity: selectedQuantity,
                price: product.salePrice,
                totalPrice: product.salePrice * selectedQuantity
            }];
            originalTotal = cartItems[0].totalPrice;
            grandTotal = originalTotal;
            totalQuantity = selectedQuantity;

        } else {
         
            const cart = await Cart.findOne({ userId }).populate('items.productId');
            if (!cart || cart.items.length === 0) {
               
                return res.redirect('/cart');
            }

            cartItems = cart.items.map(item => ({
                product: item.productId._id,
                name: item.productId.name,
                quantity: item.quantity,
                price: item.productId.salePrice,
                totalPrice: item.totalPrice
            }));

            originalTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
            grandTotal = originalTotal;
            totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        }

        const userAddresses = await Address.findOne({ userId }) || { address: [] };
        const availableCoupons = await Coupon.find({
            status: 'active',
            expireOn: { $gt: new Date() }, 
            isList: true,
            usedBy: { $ne: userId } 
        }).lean();
     
        req.session.checkoutData = {
            cartItems,
            grandTotal,
            originalTotal,
            quantity: totalQuantity,
            couponCode,
            discount
            
        };

       

        res.render('user/checkout', {
            cartItems,
            grandTotal,
            originalTotal,
            quantity: totalQuantity,
            addresses: userAddresses.address, 
            discount,
            couponCode,
            product,
            availableCoupons
        });

    } catch (error) {
        console.error(" Error fetching checkout page:", error);
        res.redirect('/cart');
    }
};



//-------------------------------------
const applyCoupon = async (req, res) => {
    try {
        
        const { couponCode, productId, quantity, cartItems } = req.body;

     
        if (!couponCode) {
            return res.json({ success: false, message: "Coupon code is required." });
        }

       
        const coupon = await Coupon.findOne({
            name: couponCode,
            status: "active",
            expireOn: { $gt: new Date() }
        });
        if (!coupon) {
            return res.json({ success: false, message: "Invalid or expired coupon." });
        }

       
    
        const userId = req.session.user?._id;
        if (!userId) {
            return res.json({ success: false, message: "User not authenticated." });
        }

        if (coupon.usageLimit === 1 && coupon.usedBy && coupon.usedBy.includes(userId)) {
            return res.json({ success: false, message: "You have already used this coupon." });
        }

        let grandTotal = 0;
        let discount = 0;
        let originalTotal = 0;
        let itemsToCalculate = [];

      
        if (!productId || productId.trim() === "") {
           

            const cart = await Cart.findOne({ userId }).populate("items.productId");
            if (!cart || cart.items.length === 0) {
                return res.json({ success: false, message: "Cart is empty." });
            }

            itemsToCalculate = cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.salePrice,
                totalPrice: item.productId.salePrice * item.quantity
            }));
        } else {
          
          

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.json({ success: false, message: "Invalid product ID." });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.json({ success: false, message: "Invalid product." });
            }

            const selectedQuantity = quantity ? parseInt(quantity, 10) : 1;
            if (isNaN(selectedQuantity) || selectedQuantity <= 0) {
                return res.json({ success: false, message: "Invalid quantity." });
            }

            itemsToCalculate = [{
                product: product,
                quantity: selectedQuantity,
                price: product.salePrice,
                totalPrice: product.salePrice * selectedQuantity
            }];
        }

      
        originalTotal = itemsToCalculate.reduce((sum, item) => sum + item.totalPrice, 0);
        grandTotal = originalTotal;
       

      
        if (grandTotal < coupon.minimumPrice) {
            return res.json({
                success: false,
                message: `Coupon requires a minimum purchase of ₹${coupon.minimumPrice}.`
            });
        }

       
        if (coupon.discountType === "fixed") {
            discount = coupon.discountValue;
        } else if (coupon.discountType === "percentage") {
            discount = (coupon.discountValue / 100) * grandTotal;
            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        }
        

        let newTotal = grandTotal - discount;
        if (newTotal < 0) newTotal = 1;


       

      
        req.session.checkoutData = {
            cartItems: itemsToCalculate.map(item => ({
                product: item.product._id, 
                name: item.product.name,  
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice
            })),
            grandTotal: newTotal,
            originalTotal,
            quantity: itemsToCalculate.reduce((sum, item) => sum + item.quantity, 0), 
            couponCode,
            discount
        };

       
        await req.session.save(); 
        return res.json({
            success: true,
            newTotal,
            discount,
            couponCode,
            originalTotal
        });

    } catch (error) {
        console.error("Error applying coupon:", error);
        return res.json({ success: false, message: error.message || "Error applying coupon." });
    }
};


//-----------------------------------
const removeCoupon = async (req, res) => {
    try {
        if (!req.session.checkoutData) {
            return res.json({ success: false, message: "No coupon applied." });
        }

        let { cartItems, originalTotal } = req.session.checkoutData;
        req.session.checkoutData = { ...req.session.checkoutData, couponCode: null, discount: 0, grandTotal: originalTotal };
        await req.session.save();

        return res.json({ success: true, newTotal: originalTotal, discount: 0, couponCode: null });

    } catch (error) {
        console.error("Error removing coupon:", error);
        return res.json({ success: false, message: "Error removing coupon." });
    }
};
//-------------------------------------
const getPayment = async (req, res) => {
    try {
        const { addressId, cartItems, grandTotal, quantity, couponCode, discount, originalTotal } = req.session.checkoutData || {};

        if (!addressId || !cartItems || !grandTotal || !quantity) {
            return res.redirect('/cart');
        }

        const userAddress = await Address.findOne(
            { "address._id": addressId },
            { "address.$": 1 }
        );

        if (!userAddress || !userAddress.address[0]) {
            return res.redirect('/cart');
        }

        const address = userAddress.address[0];
        const userId = req.session.user._id;  
      

        res.render("user/payment", { 
            checkoutData: { 
                address, 
                cartItems, 
                grandTotal, 
                quantity, 
                userId, 
                couponCode, 
                discount, 
                originalTotal: originalTotal || grandTotal 
            } 
        });

    } catch (error) {
        console.error("Error loading payment page:", error);
        res.redirect('/cart');
    }
};



//---------------------------------------------
const proceedToPayment = async (req, res) => {
    try {
        const { addressId, cartItems, quantity } = req.body;

        if (!addressId || !cartItems || !quantity) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

      
        const productIds = cartItems.map(item => item.product);

     
        const products = await Product.find({ _id: { $in: productIds } }, 'productName price');

     
        const updatedCartItems = cartItems.map(item => {
            const product = products.find(p => p._id.toString() === item.product.toString());
            return {
                product: item.product,
                name: product ? product.productName : "Unknown Product",  
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice
            };
        });

        let updatedGrandTotal = req.session.checkoutData?.grandTotal || updatedCartItems.reduce((sum, item) => sum + item.totalPrice, 0);

     
        req.session.checkoutData = {
            ...req.session.checkoutData,
            addressId,
            cartItems: updatedCartItems,
            grandTotal: updatedGrandTotal,
            quantity,
            couponCode: req.session.checkoutData?.couponCode || null,
            discount: req.session.checkoutData?.discount || 0,
            originalTotal: req.session.checkoutData?.originalTotal || updatedGrandTotal
        };

      
        req.session.save((err) => {
            if (err) {
                console.error("Error saving session:", err);
                return res.status(500).json({ success: false, message: "Failed to save session." });
            }
            return res.json({ success: true });
        });

    } catch (error) {
        console.error("Error proceeding to payment:", error);
        res.status(500).json({ success: false, message: "Failed to proceed to payment." });
    }
};




//-------------------------------------
const confirmPayment = async (req, res) => {
    try {
        
        
        const userId = req.session.user?._id || req.body.userId;
      

        if (!userId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "User not logged in." });
        }

        const { addressId, cartItems, productId, quantity, grandTotal, paymentMethod, couponCode } = req.body;

        if (!addressId || !grandTotal || !paymentMethod) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Missing required fields" });
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

        const finalAmount = grandTotal ;

        if (paymentMethod.toLowerCase() === "cod" && finalAmount > 1000) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "COD not allowed for orders above 1000. Choose another payment method." });
        }

        let orderItems = [];

        if (cartItems && cartItems.length > 0) {
            orderItems = await Promise.all(cartItems.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) throw new Error(`Product not found: ${item.product}`);
                if (product.quantity < item.quantity) throw new Error(`Insufficient stock for: ${product.name}`);

                return {
                    product: product._id,
                    quantity: item.quantity,
                    price: item.price,
                    status: "Ordered",
                    cancelMessage: "",
                    returnStatus: "Not Requested",
                    returnReason: ""
                };
            }));
        } else if (productId && quantity) {
            const product = await Product.findById(productId);
            if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: "Product not found" });
            if (product.quantity < quantity) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Insufficient stock" });

            orderItems.push({
                product: product._id,
                quantity: quantity,
                price: product.price * quantity,
                status: "Ordered",
                cancelMessage: "",
                returnStatus: "Not Requested",
                returnReason: ""
            });
        } else {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Invalid order data" });
        }

        if (orderItems.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "No valid products in order" });
        }

        const newOrder = new Order({
            userId: userId,
            orderItems: orderItems,
            totalPrice: grandTotal,
            discount: discountAmount,
            paymentMethod: paymentMethod,
            finalAmount: finalAmount,
            address: addressId,
            status: "Pending",
            paymentStatus: paymentMethod.toLowerCase() === "cod" ? "Pending" : "Paid",
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
        console.error("Error processing payment:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: "Internal server error" });
    }
};



//----------------------------------------------------------------------
const createRazorpayOrder = async (req, res) => {
    try {
        const { addressId, cartItems, grandTotal, paymentMethod, couponCode } = req.body;
        const userId = req.session.user?._id || req.body.userId;

        if (!userId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "User not logged in." });
        }

        if (!addressId || !grandTotal || !paymentMethod || !cartItems || cartItems.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Missing required fields" });
        }

        if (paymentMethod.toLowerCase() !== "razorpay") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Invalid payment method for Razorpay transaction." });
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

        const finalAmount = grandTotal 

        if (isNaN(finalAmount) || finalAmount <= 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Invalid final amount." });
        }

        let orderItems = await Promise.all(
            cartItems.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) throw new Error(`Product not found: ${item.product}`);

                return {
                    product: product._id,
                    quantity: item.quantity,
                    price: item.totalPrice
                };
            })
        );

        const options = {
            amount: finalAmount * 100,
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
       

     
        const newOrder = new Order({
            userId: userId,
            orderItems: orderItems,
            totalPrice: grandTotal,
            discount: discountAmount,
            finalAmount: finalAmount,
            paymentMethod: "Razorpay",
            address: addressId,
            status: "Pending",
            createdAt: new Date(),
            invoiceDate: new Date(),
            razorpayOrderId: order.id,
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

       

        res.status(HTTP_STATUS.OK).json({
            success: true,
            razorpayOrderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
};


//------------------------------------------------------------------

const verifyRazorpayPayment = async (req, res) => {
    try {
       
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Missing required payment verification fields.",
                orderId: orderId || 'unknown'
            });
        }

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed: Invalid signature.",
                orderId
            });
        }

     
        let existingOrder = orderId ? await Order.findById(orderId) : null;

      
        if (!existingOrder) {
            existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        }

        if (!existingOrder) {
            return res.status(400).json({
                success: false,
                message: "Order not found.",
                orderId
            });
        }

        existingOrder.paymentStatus = "Paid";
        existingOrder.status = "Paid";
        existingOrder.razorpayPaymentId = razorpay_payment_id;
        await existingOrder.save();

       

        res.json({
            success: true,
            message: "Payment verified and order placed successfully.",
            orderId: existingOrder._id
        });
    } catch (error) {
        console.error(" Payment Verification Error:", error);
        res.status(500).json({
            success: false,
            message: "Payment verification failed.",
            orderId: req.body.orderId || 'unknown'
        });
    }
};

//-------------------------------------------------------
const paymentFailurePage = (req, res) => {
    try {
        const { orderId, error } = req.query;
        res.render("user/paymentFailure", { orderId, error });
    } catch (err) {
        console.error("Payment Failure Error:", err);
        res.redirect("/pageerror");
    }
};
//---------------------------------------------
const paymentFailure = async (req, res) => {
    try {
        const { orderId } = req.body; 

        if (!orderId) {
            return res.status(400).json({ success: false, error: "Order ID is required" });
        }

     
        const order = await Order.findOneAndUpdate(
            { razorpayOrderId: orderId },
            { $set: { status: "Failed" } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

       
        res.status(200).json({ success: true, message: "Order status updated to Failed" });

    } catch (error) {
        console.error("Error handling payment failure:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

// ---------------- GET ORDER SUMMARY PAGE ----------------

const retryRazorpayPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Order ID is required." });
        }

        const order = await Order.findById(orderId).populate('userId', 'name email phone');
        if (!order) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Order not found." });
        }

        if (order.paymentStatus === "Paid" || order.status === "Paid") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Order already paid." });
        }

        if (order.paymentMethod.toLowerCase() !== "razorpay") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: "Invalid payment method for retry." });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const options = {
            amount: Math.round(order.finalAmount * 100),
            currency: "INR",
            receipt: `order_${orderId}`.substring(0, 40),

            payment_capture: 1
        };

        const razorpayOrder = await razorpay.orders.create(options);
        order.razorpayOrderId = razorpayOrder.id; 
        await order.save();

        res.status(HTTP_STATUS.OK).json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            orderId: order._id,
            userName: order.userId?.name,
            userEmail: order.userId?.email,
            userPhone: order.userId?.phone
        });
    } catch (error) {
        console.error("Error retrying Razorpay payment:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: error.message,
            orderId: req.body.orderId || 'unknown'
        });
    }
};


//------------------------------------------------------------------

const getSummary = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).render("user/pageNotfound");
        }

       
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).render("user/pageNotfound");
        }

     
        const userAddress = await Address.findOne(
            { "address._id": order.address },
            { "address.$": 1 } 
        );

        if (!userAddress || !userAddress.address[0]) {
            return res.status(HTTP_STATUS.NOT_FOUND).render("user/pageNotfound");
        }

        order.address = userAddress.address[0]; 
        const createdAtDate = new Date(order.createdAt);
        const expectedDeliveryDate = new Date(createdAtDate);
        expectedDeliveryDate.setDate(createdAtDate.getDate() + 3);
        order.formattedCreatedAt = createdAtDate.toLocaleDateString("en-GB");
       
        order.formattedExpectedDate = expectedDeliveryDate.toLocaleDateString("en-GB");

        res.render("user/order-summary", { order });

    } catch (error) {
        console.error("Error fetching order summary:", error);
        res.redirect("/pageNotFound");
    }
};

//----------------------------------------------
const getOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.redirect('/login');

        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId)
            .populate({
                path: "orderHistory",
                populate: { path: "orderItems.product", model: "Product" }
            })
            .lean();

        if (!user || !user.orderHistory.length) {
            return res.render("user/orders", { orders: [], currentPage: 1, totalPages: 1 });
        }

        
        const sortedOrders = user.orderHistory
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) 
           

        const paginatedOrders = sortedOrders.slice(skip, skip + limit);
        const totalPages = Math.ceil(sortedOrders.length / limit);

        res.render("user/orders", { 
            orders: paginatedOrders, 
            currentPage: page, 
            totalPages 
        });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.redirect("/");
    }
};

//---------------------------------------------
const cancelOrder = async (req, res) => {
    try {
        const { orderId, cancelItems, cancelReason } = req.body;
        

        const order = await Order.findById(orderId);
        if (!order) {
           
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
        }
        console.log('Raw Order Data:', JSON.stringify(order, null, 2));

        if (!order.paymentMethod) {
           
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Payment method missing" });
        }

        let refundAmount = 0;
        let allCancelled = true;
        const bulkUpdateOps = [];

      
        const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPreDiscount = order.orderItems.reduce((sum, item) => {
            
            const itemTotal = item.totalPrice || (order.paymentMethod === 'Razorpay' ? item.price : item.price * item.quantity);
            return sum + itemTotal;
        }, 0);
        const totalDiscount = order.discount || 0;
        const effectiveGrandTotal = order.grandTotal || order.finalAmount || (totalPreDiscount - totalDiscount);
       

       
        const wallet = await Wallet.findOne({ userId: order.userId });
        const previousRefunds = wallet?.transactions
            .filter(t => t.orderId === orderId && t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0) || 0;
       

       
        let canceledQuantity = 0;
        let canceledPreDiscountTotal = 0;

        order.orderItems.forEach((item) => {
            const itemId = item.product.toString();
            if (cancelItems.includes(itemId) && item.status !== "Cancelled") {
                const itemTotal = item.totalPrice || (order.paymentMethod === 'Razorpay' ? item.price : item.price * item.quantity);
                console.log(`Cancelling item: ${itemId}, Quantity: ${item.quantity}, Price: ${item.price}, TotalPrice: ${itemTotal}`);
                item.status = "Cancelled";
                item.cancelMessage = cancelReason;

                canceledPreDiscountTotal += itemTotal;
                canceledQuantity += item.quantity;

                bulkUpdateOps.push({
                    updateOne: {
                        filter: { _id: item.product },
                        update: { $inc: { quantity: item.quantity } }
                    }
                });
            } else if (item.status !== "Cancelled") {
                allCancelled = false;
            }
        });

        
        if (canceledQuantity > 0) {
            const refundDiscount = totalDiscount * (canceledQuantity / totalQuantity);
            refundAmount = canceledPreDiscountTotal - refundDiscount;
            const maxRefundable = effectiveGrandTotal - previousRefunds;
            refundAmount = Math.min(refundAmount, maxRefundable); 
            refundAmount = Math.max(refundAmount, 0);
            refundAmount = parseFloat(refundAmount.toFixed(2));
            console.log('Refund Calculation:', {
                canceledQuantity,
                canceledPreDiscountTotal,
                refundDiscount,
                refundAmount,
                maxRefundable
            });
        } else {
            console.log('No new items to cancel.');
        }

       
        order.status = allCancelled ? "Cancelled" : "Partially Cancelled";
        await order.save();
       
      
        if (bulkUpdateOps.length > 0) {
            await Product.bulkWrite(bulkUpdateOps);
           
        }

       
        if (refundAmount > 0 && ["Razorpay", "wallet"].includes(order.paymentMethod)) {
            

            let wallet = await Wallet.findOne({ userId: order.userId }) || new Wallet({
                userId: order.userId,
                balance: 0,
                transactions: []
            });

            const previousBalance = Number(wallet.balance || 0);
            wallet.balance = previousBalance + refundAmount;
            wallet.transactions.push({
                type: "credit",
                amount: refundAmount,
                reason: `Refund for cancelled items (${cancelReason}) - ${order.paymentMethod}`,
                orderId: orderId,
                date: new Date(),
            });

            await wallet.save();
            

            const user = await User.findById(order.userId);
            if (user) {
                user.wallet = Number(user.wallet || 0) + refundAmount;
                await user.save();
               
            } else {
                console.log('User not found for ID:', order.userId);
            }
        } else {
            console.log('No refund processed:', { refundAmount, paymentMethod: order.paymentMethod });
        }

        res.status(HTTP_STATUS.OK).json({ success: true, message: "Selected items cancelled successfully." });

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};


//----------------------------------------
const getUserOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user._id; 

        const order = await Order.findOne({ _id: orderId, userId })
        .populate("userId", "name email")
        .populate({
            path: "orderItems.product",
            select: "productName price productImage salePrice", 
        });

        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).render("user/errorPage", { message: "Order not found" });
        }

        const addressId = order.address; 
      
      
        const addressDoc = await Address.findOne({ "address._id": addressId }, { "address.$": 1 });
        const selectedAddress = addressDoc ? addressDoc.address[0] : null;

        if (!selectedAddress) {
            console.log("No matching address found!");
        }

       
        const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const orderDate = order.createdAt.toDateString();
        const deliveryDate = new Date(order.createdAt);
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        const formattedDeliveryDate = deliveryDate.toDateString();

        res.render("user/orderUserDetails", {
            order,
            orderDate,
            deliveryDate: formattedDeliveryDate,
            totalItems,
            address: selectedAddress || null,
            cancelMessage: order.cancelMessage || "", 
            invoiceUrl: order.invoiceUrl || "",
        });

    } catch (error) {
        console.error("Error fetching user order details:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("user/errorPage", { message: "Internal Server Error" });
    }
};



module.exports={
    getCheckout,
    getPayment,
    proceedToPayment,
    confirmPayment,
    getSummary,
    getOrders,
    cancelOrder,
    getUserOrderDetails,
    createRazorpayOrder,
    verifyRazorpayPayment,
    applyCoupon,
    removeCoupon,
    paymentFailurePage,
    paymentFailure,
    retryRazorpayPayment
 

   
}