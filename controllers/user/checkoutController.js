const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Cart=require("../../models/cartSchema")
const Address = require('../../models/addressSchema')
const Order= require('../../models/orderSchema')
const mongodb = require("mongodb");
const mongoose = require('mongoose');




const { v4: uuidv4 } = require('uuid');


const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, quantity } = req.query; 

        let cartItems = [];
        let grandTotal = 0;
        let totalQuantity = 0;

        if (productId) {
           
            const product = await Product.findById(productId);
            if (!product) {
                return res.redirect('/cart'); 
            }
            const selectedQuantity = quantity ? parseInt(quantity, 10) : 1;
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
            cartItems = cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
            }));
            grandTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
            totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        }

        const userAddresses = await Address.findOne({ userId });

        res.render('user/checkout', {
            cartItems,
            grandTotal,
            quantity: totalQuantity,
            addresses: userAddresses ? userAddresses.address : [],
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

        res.render("user/payment", { checkoutData: { address, cartItems, grandTotal, quantity } });
        // console.log("Cart Items:", cartItems);


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
        const { addressId, cartItems, productId, quantity, grandTotal, paymentMethod } = req.body;
        const userId = req.session.user; 

        if (!userId || !addressId || !grandTotal || !paymentMethod) {
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
            orderId: uuidv4(),
            user: userId,
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





module.exports={
    getCheckout,
    getPayment,
    proceedToPayment,
    confirmPayment,
    getSummary,
    getOrders,
    cancelOrder

   
}