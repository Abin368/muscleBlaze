const { unique, type } = require('jquery');
const mongoose=require('mongoose')
const {Schema} =mongoose;
const walletSchema = new Schema({
    userId:{
    type: Schema.Types.ObjectId,
    ref:'User',
    require:true,
    unique:true
    },
    balance:{
        type:Number,
        default:0,
    },

    transactions:[{
        type:{
            type:String,
            enum:['cod','Razorpay','credit','debit','refund'],
            required:true
        },
        amount:{
            type:Number,
            required:true
        },
        reason:{
            type:String,
            required:true
        },
        orderId:{
            type:Schema.Types.ObjectId,
            ref:'Order',
            required:false
        },
        createdAt:{
            type:Date,
            default:Date.now
        }
    }]

})
const Wallet = mongoose.model('Wallet',walletSchema)
module.exports = Wallet