const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        ref: "Category",
        required: true,
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
        required: true,
    },
    productOffer: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 1, 
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    flavor: {
        type: String,
        required: true,
    },
    size: {
        type: [String],
        required: true
    },
    productImage: {
        type: [String],
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "Out of stock", "Limited stock"],
        required: true,
        default: "Available" 
    }
}, { timestamps: true });


const Product = mongoose.model("Product", productSchema);

module.exports = Product;
