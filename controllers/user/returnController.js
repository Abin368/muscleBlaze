const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Cart=require("../../models/cartSchema")
const Address = require('../../models/addressSchema')
const Order= require('../../models/orderSchema')
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const Wallet = require('../../models/walletSchema')

const requestReturn = async (req, res) => {
    try {
        const { orderId, returnItems, returnReason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (!order.orderItems || order.orderItems.length === 0) {
            return res.status(400).json({ success: false, message: "No items found in order." });
        }

        const itemsToReturn = Array.isArray(returnItems) ? returnItems : [returnItems];

        let allItemsReturned = true; 

        itemsToReturn.forEach(productId => {
            const item = order.orderItems.find(item => item.product.toString() === productId);
            if (item) {
                item.returnStatus = "Requested";
                item.returnReason = returnReason;
            }
        });

       
        allItemsReturned = order.orderItems.some(item => item.returnStatus === "Requested");

        if (allItemsReturned) {
            order.status = "Return Requested";
        }

        await order.save();

        res.json({ success: true, message: "Return request submitted successfully." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error processing return request." });
    }
}

module.exports ={
    requestReturn
}