const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Cart=require("../../models/cartSchema")
const Address = require('../../models/addressSchema')
const Order= require('../../models/orderSchema')
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const Razorpay = require("razorpay");
const crypto = require("crypto");
const razorpay= require('../../config/razorpay')

require("dotenv").config();




const { v4: uuidv4 } = require('uuid');


const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, quantity } = req.query;

        let cartItems = [];
        let grandTotal = 0;
        let totalQuantity = 0;
        let outOfStockMessages = [];

        if (productId) {
          
            const product = await Product.findById(productId);
            if (!product) {
                return res.redirect('/cart');
            }
           
            const selectedQuantity = quantity ? parseInt(quantity, 10) : 1;
            if (selectedQuantity > product.quantity) {
            console.log(product.quantity)
                outOfStockMessages.push(`${product.name} is out of stock. Please remove it from the cart.`);
                console.log(product.quantity)
            }

            cartItems = [{
                product,
                quantity: selectedQuantity,
                totalPrice: product.salePrice * selectedQuantity
            }];
            grandTotal = cartItems[0].totalPrice;
            totalQuantity = selectedQuantity;
        } else {
          
            const cart = await Cart.findOne({ userId }).populate('items.productId');
            if (!cart || cart.items.length === 0) {
                return res.redirect('/cart');
            }

            let validItems = []; 
            let outOfStockProducts = [];

            for (let item of cart.items) {
                if (!item.productId) {
                    continue; 
                }

                if (item.quantity > item.productId.quantity) {
                    console.log(item.productId.quantity)
                    console.log(item.quantity)
                    outOfStockMessages.push(`${item.productId.productName} is out of stock. Remove from the Cart and Continue`);
                    outOfStockProducts.push(item.productId._id); 
                } else {
                   
                    validItems.push({
                        product: item.productId,
                        quantity: item.quantity,
                        totalPrice: item.totalPrice
                    });
                }
            }

            if (outOfStockMessages.length > 0) {
              
                return res.render('user/cart', { 
                    items: cart.items, 
                    grandTotal: cart.items.reduce((sum, item) => sum + item.totalPrice, 0), 
                    quantity: cart.items.reduce((sum, item) => sum + item.quantity, 0), 
                    swalMessage: outOfStockMessages.join('\n') 
                });
            }

            cartItems = validItems;
            grandTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
            totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        }

        const userAddresses = await Address.findOne({ userId });

        res.render('user/checkout', {
            cartItems,
            grandTotal,
            quantity: totalQuantity,
            addresses: userAddresses ? userAddresses.address : [],
            swalMessage: null 
        });

    } catch (error) {
        console.error("Error fetching checkout page:", error);
        res.redirect('/cart');
    }
};




//-------------------------------------
const getPayment = async (req, res) => {
    try {
        const { addressId, cartItems, grandTotal, quantity } = req.session.checkoutData || {};

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
        console.log('userId',userId)

        res.render("user/payment", { 
            checkoutData: { address, cartItems, grandTotal, quantity, userId } 
        });

    } catch (error) {
        console.error("Error loading payment page:", error);
        res.redirect('/cart');
    }
};

//---------------------------------------------
const proceedToPayment = async (req, res) => {
    try {
        const { addressId, cartItems, grandTotal, quantity } = req.body;

        if (!addressId || !cartItems || !grandTotal || !quantity) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

       
        req.session.checkoutData = { addressId, cartItems, grandTotal, quantity };

        res.json({ success: true });
    } catch (error) {
        console.error("Error proceeding to payment:", error);
        res.status(500).json({ success: false, message: "Failed to proceed to payment." });
    }
};



//-------------------------------------
const confirmPayment = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.body.userId;
        console.log("Extracted userId:", userId);
        console.log("Received Checkout Data:", req.body);

        if (!userId) {
            console.error("User ID is missing from session or request.");
            return res.status(400).json({ success: false, error: "User not logged in." });
        }

        const { addressId, cartItems, productId, quantity, grandTotal, paymentMethod } = req.body;

        if (!addressId || !grandTotal || !paymentMethod) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const validPaymentMethods = ['cod', 'credit_card', 'paypal'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ success: false, error: 'Invalid payment method' });
        }

        let orderItems = [];

        if (cartItems && cartItems.length > 0) {
            orderItems = cartItems.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.price
            }));
        } else if (productId && quantity) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            if (product.stock < quantity) {
                return res.status(400).json({ success: false, error: 'Insufficient stock' });
            }
            orderItems.push({
                product: productId,
                quantity: quantity,
                price: product.price * quantity
            });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid order data' });
        }

        const finalAmount = grandTotal;

        const newOrder = new Order({
            userId: userId,  
            orderItems: orderItems,
            totalPrice: grandTotal,
            paymentMethod: paymentMethod,
            finalAmount: finalAmount,
            address: addressId,
            status: 'Pending',
            createdAt: new Date(),
            invoiceDate: new Date()
        });

        const savedOrder = await newOrder.save();

        for (const item of orderItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: -item.quantity } }  
            );
        }

        await User.findByIdAndUpdate(userId, {
            $push: { orderHistory: savedOrder._id }
        });

        console.log('Order saved successfully:', savedOrder);

        res.status(200).json({ success: true, orderId: savedOrder._id });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

//----------------------------------------------------------------------
const createRazorpayOrder = async (req, res) => {
    try {
        const { grandTotal } = req.body;
        if (!grandTotal) {
            return res.status(400).json({ success: false, error: 'Grand total is required' });
        }

        console.log("Creating Razorpay Order...");

        const options = {
            amount: grandTotal * 100, 
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
        console.log("Razorpay Order Created:", order); 

        res.status(200).json({ 
            success: true, 
            razorpayOrderId: order.id, 
            amount: order.amount, 
            currency: order.currency 
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
//------------------------------------------------------------------

const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, userId, addressId, orderItems, grandTotal, paymentMethod } = req.body;

        console.log("Received Data in /payment/verify:", req.body);

        if (!userId || userId === "MISSING_USER_ID") {
            return res.status(400).json({ success: false, message: "User ID is missing or invalid." });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid User ID format." });
        }

        const objectIdUserId = new mongoose.Types.ObjectId(userId);

      
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            console.log("Signature Mismatch");
            return res.status(400).json({ success: false, message: "Payment verification failed." });
        }

        console.log("Razorpay Signature Verified");

       
        const totalPrice = grandTotal;
        const finalAmount = totalPrice;

     
        const newOrder = new Order({
            userId: objectIdUserId,
            orderItems,
            totalPrice,
            finalAmount,
            address: addressId,
            status: 'Pending',
            paymentMethod: paymentMethod, 
            paymentStatus: 'Paid',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
        });

        const savedOrder = await newOrder.save();  

        
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: -item.quantity } }  
            );
        }

        await User.findByIdAndUpdate(userId, {
            $push: { orderHistory: savedOrder._id }
        });

       
        res.json({
            success: true,
            message: "Payment verified and order placed successfully.",
            orderId: savedOrder._id  
        });

    } catch (error) {
        console.error(" Error in verifyRazorpayPayment:", error);
        res.status(500).json({ success: false, message: "Payment verification failed." });
    }
};


//-------------------------------------------------------


// ---------------- GET ORDER SUMMARY PAGE ----------------

const getSummary = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).render("pageNotFound");
        }

       
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return res.status(404).render("pageNotFound");
        }

     
        const userAddress = await Address.findOne(
            { "address._id": order.address },
            { "address.$": 1 } 
        );

        if (!userAddress || !userAddress.address[0]) {
            return res.status(404).render("pageNotFound");
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

        const user = await User.findById(userId)
            .populate({
                path: "orderHistory",
                populate: { path: "orderItems.product", model: "Product" } 
            })
            .lean(); 

        if (!user || !user.orderHistory.length) {
            return res.render("user/orders", { orders: [] });
        }

       
        const sortedOrders = user.orderHistory.sort((a, b) => {
            return a.status === 'Cancelled' ? 1 : -1;
        });

        res.render("user/orders", { orders: sortedOrders });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.redirect("/");
    }
};

//---------------------------------------------
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('orderItems.product');

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: "Order is already cancelled" });
        }

      
        for (let item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product._id, { 
                $inc: { quantity: item.quantity } 
            });
        }

        
        order.status = 'Cancelled';
        await order.save();

        res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
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
            return res.status(404).render("user/errorPage", { message: "Order not found" });
        }

        const addressId = order.address; 
        console.log("Address ID from Order:", addressId);

      
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
        });

    } catch (error) {
        console.error("Error fetching user order details:", error);
        res.status(500).render("user/errorPage", { message: "Internal Server Error" });
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
    verifyRazorpayPayment

   
}