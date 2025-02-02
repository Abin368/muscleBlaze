const mongoose=require('mongoose')
const {Schema} =mongoose;

const bannerSchema = new Schema({
    image:{
        type:String,
        requied:true
    },
    title:{
        type:String,
        requied:true
    },
    description:{
        type:String,
        requied:true
    },
    link:{
        type:String,
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
})

const Banner = mongoose.model("Banner",bannerSchema)
module.exports =Banner;