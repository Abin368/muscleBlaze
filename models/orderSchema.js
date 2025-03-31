const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId: {   
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        status: {  
            type: String,
            enum: ['Ordered', 'Cancelled','Return Requested','Partially Returned','Returned'],
            default: 'Ordered'
        },
        cancelMessage: { 
            type: String,
            default: ''
        },
        returnStatus: {  
            type: String,
            enum: ['Not Requested', 'Requested', 'Approved', 'Rejected', 'Returned','Partially Returned'],
            default: 'Not Requested'
        },
        returnReason: {  
            type: String,
            default: ''
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        required: true
    },
    invoiceDate: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned','Paid','Return Requested','Partially Returned','Partially Cancelled','Failed']
    },
    cancelMessage: {  
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponName:{
        type:String
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'UPI', 'Card','Razorpay','wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    trackingInfo: {
        type: String,
        default: null
    },
    invoiceUrl :{
        type:String
    },
    razorpayOrderId: {
        type: String,
        unique: true
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
