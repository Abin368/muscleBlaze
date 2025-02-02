const mongoose=require('mongoose')
const {Schema} =mongoose;

const productSchema=new Schema({
    productName:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        ref:"Category",
        required:true,
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true,
    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        default:true,
    },
    flavor:{
        type:String,
        required:true,
    },
    size:{
        type:[String],
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    status:{
        type:String,
        enum:["available","out of stock","pending"],
        required:true,
        default:"Available"
    }
},{timestamps:true});

const Product=mongoose.Model("Product",productSchema)
module.exports=Product;