const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expireOn: {
        type: Date,
        required: true
    },
    discountType: {  
        type: String,
        enum: ['fixed', 'percentage'],  
        required: true
    },
    discountValue: {  
        type: Number,  
        required: true  
    },
    maxDiscount: {  
        type: Number,  
        default: null  
    },
    minimumPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isList: {
        type: Boolean,
        default: true
    },
    usageLimit: {
        type: Number,
        default: 1
    },
    usedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
