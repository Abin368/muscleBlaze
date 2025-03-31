const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema")
const Address = require("../../models/addressSchema")
const Wallet = require('../../models/walletSchema')
const HTTP_STATUS=require('../../config/httpStatusCode')

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
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

     
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
            res.render("admin/orderDetails", {
                orders,
                search: searchQuery,
                page,
                limit,
                totalOrders,
                totalPages: Math.ceil(totalOrders / limit)
            }, (err, html) => {
                if (err) {
                    console.error(err);
                    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error rendering partial content" });
                }
                res.send(html);
            });
        } else {
            res.render("admin/orderDetails", {
                orders,
                search: searchQuery,
                page,
                limit,
                totalOrders,
                totalPages: Math.ceil(totalOrders / limit)
            });
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch orders" });
    }
};




//---------------------------------
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId; 

        const order = await Order.findById(orderId)
            .populate("userId", "name email")  
            .populate("orderItems.product", "productName price productImage salePrice");

        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).send("Order not found");
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

        res.render("admin/orderDetailsPage", {  
            order,  
            orderDate,
            deliveryDate: formattedDeliveryDate,
            totalItems,
            address: selectedAddress || null  
        });

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};


//-----------------------------------------------

const updateOrderStatus = async (req, res) => {
    try {
      

        const { orderId } = req.params;
        const { status, cancelMessage, productId } = req.body;

        let updateData = { status };

        if (status === "Cancelled" && cancelMessage) {
            if (productId) {
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
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
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, message: "Order status updated successfully", order });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};
//---------------------------------------------------------
const approveReturn = async (req, res) => {
    try {
        const { orderId, returnItems } = req.body;

        const order = await Order.findById(orderId)
            .populate('orderItems.product', 'productName')
            .populate('userId', 'name');

        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
        }

        if (!order.userId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "User not found for this order" });
        }

        const userId = order.userId._id.toString();

       
        const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPreDiscount = order.orderItems.reduce((sum, item) => {
            const itemTotal = item.totalPrice || (order.paymentMethod === 'Razorpay' ? item.price : item.price * item.quantity);
            return sum + itemTotal;
        }, 0);
        const totalDiscount = order.discount || 0;
        const effectiveGrandTotal = order.finalAmount || (totalPreDiscount - totalDiscount);

      
        const wallet = await Wallet.findOne({ userId });
        const previousRefunds = wallet?.transactions
            .filter(t => t.orderId === orderId && t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0) || 0;

     
        let refundAmount = 0;
        let returnedQuantity = 0;
        let returnedPreDiscountTotal = 0;
        const bulkUpdateOps = [];

        order.orderItems.forEach(item => {
            const itemId = item.product._id.toString();
            if (returnItems.includes(itemId) && item.returnStatus === "Requested") {
                const itemTotal = item.totalPrice || (order.paymentMethod === 'Razorpay' ? item.price : item.price * item.quantity);
               

                item.returnStatus = "Approved";
                item.status = "Returned";

                returnedPreDiscountTotal += itemTotal;
                returnedQuantity += item.quantity;

                bulkUpdateOps.push({
                    updateOne: {
                        filter: { _id: item.product._id },
                        update: { $inc: { quantity: item.quantity } }
                    }
                });
            }
        });

        if (returnedQuantity === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "No valid products selected for return" });
        }

       
        const refundDiscount = totalDiscount * (returnedQuantity / totalQuantity);
        refundAmount = returnedPreDiscountTotal - refundDiscount;
        const maxRefundable = effectiveGrandTotal - previousRefunds;
        refundAmount = Math.min(refundAmount, maxRefundable);
        refundAmount = Math.max(refundAmount, 0);
        refundAmount = parseFloat(refundAmount.toFixed(2));

       

      
        const allReturned = order.orderItems.every(item => item.status === "Returned");
        const someReturned = order.orderItems.some(item => item.status === "Returned");
        order.status = allReturned ? "Returned" : someReturned ? "Partially Returned" : "Return Requested";
        await order.save();
      

     
        if (bulkUpdateOps.length > 0) {
            await Product.bulkWrite(bulkUpdateOps);
            console.log("Stock restored for returned products.");
        }

       
        if (refundAmount > 0 && ["Razorpay", "wallet"].includes(order.paymentMethod)) {
            console.log(`Processing refund of ${refundAmount} to wallet for ${order.paymentMethod} payment.`);

            let wallet = await Wallet.findOne({ userId }) || new Wallet({
                userId,
                balance: 0,
                transactions: []
            });

            const previousBalance = Number(wallet.balance || 0);
            wallet.balance = previousBalance + refundAmount;
            wallet.transactions.push({
                type: "credit",
                amount: refundAmount,
                reason: `Refund for returned items - ${order.paymentMethod}`,
                orderId: order._id,
                date: new Date()
            });

            await wallet.save();
           

            const user = await User.findById(userId);
            if (user) {
                user.wallet = Number(user.wallet || 0) + refundAmount;
                await user.save();
                
            } else {
                console.log('User not found for ID:', userId);
            }
        } else {
            console.log('No refund processed:', { refundAmount, paymentMethod: order.paymentMethod });
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Return approved, stock updated & wallet credited.",
            refundAmount,
            newOrderStatus: order.status
        });

    } catch (error) {
        console.error("Error approving return:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error approving return" });
    }
};


module.exports={
    getOrder,
    getOrderDetails,
    updateOrderStatus,
    approveReturn
}