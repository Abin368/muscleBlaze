const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema")
const Address = require("../../models/addressSchema")
const Wallet = require('../../models/walletSchema')

const getOrder = async (req, res) => {
    try {
        const searchQuery = req.query.search?.trim() || "";  
        const page = parseInt(req.query.page) || 1; 
        const limit = 10;  
        const skip = (page - 1) * limit;  

      
        let filter = {};
        if (searchQuery) {
            filter = {
                $or: [
                    { orderId: { $regex: searchQuery, $options: "i" } },  
                    { status: { $regex: searchQuery, $options: "i" } },  
                    { "userId.name": { $regex: searchQuery, $options: "i" } },  
                    { "userId.email": { $regex: searchQuery, $options: "i" } },  
                    { "orderItems.product.productName": { $regex: searchQuery, $options: "i" } }  
                ]
            };
        }

       
        const totalOrders = await Order.countDocuments(filter);

      
        const orders = await Order.find(filter)
            .populate("userId", "name email")  
            .populate("orderItems.product", "productName price")  
            .skip(skip) 
            .limit(limit) 
            .lean();

        res.render("admin/orderDetails", {  
            orders, 
            search: searchQuery, 
            page, 
            limit, 
            totalOrders,  
            totalPages: Math.ceil(totalOrders / limit)  
        }); 
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};



//---------------------------------
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId; 

        const order = await Order.findById(orderId)
            .populate("userId", "name email")  
            .populate("orderItems.product", "productName price productImage");

        if (!order) {
            return res.status(404).send("Order not found");
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

        res.render("admin/orderDetailsPage", {  
            order,  
            orderDate,
            deliveryDate: formattedDeliveryDate,
            totalItems,
            address: selectedAddress || null  
        });

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
};


//-----------------------------------------------

const updateOrderStatus = async (req, res) => {
    try {
        console.log("Received Data:", req.body); 

        const { orderId } = req.params;
        const { status, cancelMessage, productId } = req.body;

        let updateData = { status };

        if (status === "Cancelled" && cancelMessage) {
            if (productId) {
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found" });
                }

          
                order.orderItems.forEach((item) => {
                    if (item.product.toString() === productId) {
                        item.status = "Cancelled";
                        item.cancelMessage = cancelMessage;
                    }
                });

                await order.save();
            } else {
              
                updateData.cancelMessage = cancelMessage;
            }
        }

        const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, message: "Order status updated successfully", order });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
//---------------------------------------------------------
const approveReturn = async (req, res) => {
    try {
        const { orderId, returnItems } = req.body;

        const order = await Order.findById(orderId)
            .populate("orderItems.product")
            .populate("userId");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (!order.userId) {
            return res.status(400).json({ success: false, message: "User not found for this order." });
        }

        const userId = order.userId._id.toString();
        let refundAmount = 0;
        let hasReturnedItems = false;

        for (const item of order.orderItems) {
            if (returnItems.includes(item.product._id.toString()) && item.returnStatus === "Requested") {
                item.returnStatus = "Approved";
                refundAmount += item.product.salePrice * item.quantity;
                hasReturnedItems = true;

             
                await Product.findByIdAndUpdate(item.product._id, {
                    $inc: { quantity: item.quantity }
                });
            }
        }

        if (!hasReturnedItems) {
            return res.status(400).json({ success: false, message: "No valid products selected for return." });
        }

        console.log("Total Refund Amount:", refundAmount);

     
        await Wallet.findOneAndUpdate(
            { userId },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transactions: {
                        type: "credit",
                        amount: refundAmount,
                        reason: "Product Return Refund",
                        orderId: order._id
                    }
                }
            },
            { new: true, upsert: true }
        );

       
        const allReturned = order.orderItems.every(item => item.returnStatus === "Approved");
        const someReturned = order.orderItems.some(item => item.returnStatus === "Approved");

        if (allReturned) {
            order.status = "Returned";
        } else if (someReturned) {
            order.status = "Partially Returned";
        } else {
            order.status = "Return Requested";
        }

        await order.save();

        res.json({
            success: true,
            message: "Return approved, stock updated & wallet credited.",
            refundAmount,
            newOrderStatus: order.status
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error approving return." });
    }
};




module.exports={
    getOrder,
    getOrderDetails,
    updateOrderStatus,
    approveReturn
}