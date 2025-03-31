const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Cart=require("../../models/cartSchema")
const Address = require('../../models/addressSchema')
const Order= require('../../models/orderSchema')
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const Wallet = require('../../models/walletSchema')
const puppeteer = require("puppeteer");
const path = require("path");
const ejs = require("ejs");
const stream = require('stream')
const HTTP_STATUS=require('../../config/httpStatusCode')

const requestReturn = async (req, res) => {
    try {
        const { orderId, returnItems, returnReason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });

        if (!order.orderItems || order.orderItems.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "No items found in order." });
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
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error processing return request." });
    }
}
//------------------------------------------------
const generateInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
        .populate('userId')
        .populate('orderItems.product')
      
    

        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).send("Order not found");
        }
        const addressId = order.address; 
      

      
        const addressDoc = await Address.findOne({ "address._id": addressId }, { "address.$": 1 });
        const selectedAddress = addressDoc ? addressDoc.address[0] : null;

        if (!selectedAddress) {
            console.log("No matching address found!");
        }


        res.render('user/invoiceTemplate', { order,  address: selectedAddress || null});
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};




//------------------------------------------




module.exports ={
    requestReturn,
    generateInvoice

}