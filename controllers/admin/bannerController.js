const Banner=require('../../models/bannerSchema');
const path=require('path')
const fs= require('fs')
const HTTP_STATUS=require('../../config/httpStatusCode')
const {cloudinary,uploadToCloudinary} =require('../../config/cloudinaryConfig')



const getBanner=async(req,res)=>{
    try{
        const findBanner = await Banner.find({})
        res.render('admin/bannerDetails',{data:findBanner})
    }catch(error){
        res.redirect('/pageerror')
    }
}
//--------------------------------------
const getAddBannerPage = async(req,res)=>{
    try{
        res.render('admin/addBanner');
    }catch(error){
        res.redirect('/pageerror')
    }
}
//---------------------------------


const addBanner = async (req, res) => {
    try {
       

        const data = req.body;
        const image = req.files["images1"] ? req.files["images1"][0] : null;

        if (!image) {
            return res.render("addBanner", { error: "Please upload an image!" });
        }

      
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: "products" },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary Upload Error:", error);
                        reject(error);
                    } else {
                        resolve(result.secure_url);
                    }
                }
            ).end(image.buffer);
        });

       

       
        const newBanner = new Banner({
            image: result, 
            title: data.bannerName,
            description: data.description,
            startDate: new Date(data.startDate + "T00:00:00"),
            endDate: new Date(data.endDate + "T00:00:00"),
        });

        await newBanner.save();
      

        
        return res.redirect("/admin/banners");
    } catch (error) {
        console.error("Error adding banner:", error);
        return res.render("addBanner", { error: "Something went wrong! Please try again." });
    }
};

module.exports = { addBanner };



//---------------------------------
const deleteBanner = async (req, res) => {
    try {
        const id = req.query.id; 
        if (!id) {
           
            return res.redirect('/admin/banners');
        }

        const result = await Banner.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            console.log("Error: No banner found with this ID.");
        } else {
            console.log("Banner deleted successfully:", result);
        }

        res.redirect('/admin/banners');
    } catch (error) {
        console.error("Error deleting banner:", error);
        res.redirect('/pageerror');
    }
};




//---------------------------------

module.exports={
    getBanner,
    getAddBannerPage,
    addBanner,
    deleteBanner
}