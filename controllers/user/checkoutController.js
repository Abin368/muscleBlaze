const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Cart=require("../../models/cartSchema")
const Address = require('../../models/addressSchema')
const Order= require('../../models/orderSchema')
const mongodb = require("mongodb");

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
        console.log("Cart Items:", cartItems);


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
// const postPayment = async (req, res) => {
//     try {
//         console.log("Received payment request:", req.body); 

//         const { addressId, cartItems, grandTotal } = req.body;

//         if (!addressId || !cartItems || grandTotal === undefined) {
//             return res.json({ success: false, message: "Invalid payment data received" });
//         }

       
//         const newOrder = await Order.create({
//             address: addressId,
//             orderItems: cartItems,
//             totalPrice: grandTotal,
//             finalAmount: grandTotal, 
//             status: "Pending",
//             createdAt: new Date()
//         });

//         console.log("Order created successfully:", newOrder); 

//         res.json({ success: true, orderId: newOrder._id });
//     } catch (error) {
//         console.error("Error processing payment:", error);
//         res.json({ success: false, message: "Payment processing failed." });
//     }
// };






module.exports={
    getCheckout,
    getPayment,
    proceedToPayment
//     postPayment
}