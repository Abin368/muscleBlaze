const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require('fs')
const path=require('path')
const sharp=require('sharp')
const HTTP_STATUS=require('../../config/httpStatusCode')
const {cloudinary,uploadToCloudinary} =require('../../config/cloudinaryConfig')


//---------------------------------------------
const getProductAddPage = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });

        res.render("admin/addProduct", { categories, error: null, success: null, formData: {}    });
    } catch (error) {
        console.error(error);
        res.render("admin/addProduct", { categories: [], error: "An error occurred. Please try again.", success: null, formData: {} });
    }
};


//---------------------------------------------
const addProducts = async (req, res) => {
    try {
        console.log("Received files:", req.files); 

        const product = req.body;
        const regularPrice = parseFloat(product.regularPrice);
        const salePrice = parseFloat(product.salePrice);
        const quantity = parseInt(product.quantity);
        const size = parseFloat(product.size);

        if (!product.productName || !product.description || isNaN(regularPrice) || isNaN(salePrice) || isNaN(quantity) || isNaN(size)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "All required fields must be filled with valid values" });
        }

        if (regularPrice < 0 || salePrice < 0 || quantity < 0 || size < 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Price, Quantity, and Size must not be negative" });
        }

        if (salePrice >= regularPrice) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Sale Price must be less than Regular Price" });
        }

        if (!/^\d+(\.\d{1,3})?$/.test(size)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Size must be a valid number (e.g., 0.100Kg, 1Kg, 2.5Kg, etc.)" });
        }

        const productExists = await Product.findOne({ productName: product.productName });
        if (productExists) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Product already exists, try with another name" });
        }

        const categoryId = await Category.findOne({ _id: product.category });
        if (!categoryId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Invalid category selected" });
        }

        const uploadedImages = [];

        for (const file of req.files) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: "product-images" }, 
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary Upload Error:", error);
                            reject(error);
                        } else {
                            resolve(result.secure_url);
                        }
                    }
                ).end(file.buffer); 
            });

            uploadedImages.push(result);
        }

        console.log("Uploaded Image URLs:", uploadedImages);

        const newProduct = new Product({
            productName: product.productName,
            description: product.description,
            category: categoryId._id,
            regularPrice: regularPrice,
            salePrice: salePrice,
            createdOn: new Date(),
            quantity: quantity,
            flavor: product.flavor,
            size: size,
            productImage: uploadedImages,
            status: "Available"
        });

        await newProduct.save();
        console.log("Saved product:", newProduct); 

        return res.status(HTTP_STATUS.OK).json({ success: "Product added successfully!" });
    } catch (error) {
        console.error("Error saving product:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "An error occurred. Please try again." });
    }
};



//-----------------------------------------------------
const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;

       
        const matchingCategories = await Category.find({
            name: { $regex: new RegExp(".*" + search + ".*", "i") }
        }).select('_id');

        const categoryIds = matchingCategories.map(cat => cat._id);

      
        const productData = await Product.find({
            isDeleted: false,  
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { category: { $in: categoryIds } }
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
       
        .populate('category')
        .exec();

       
        const count = await Product.countDocuments({
            isDeleted: false,  
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { category: { $in: categoryIds } }
            ],
        });

        const totalPages = Math.ceil(count / limit);
        const category = await Category.find({ isListed: true });

        if (category) {
            res.render("admin/productDetails", {
                data: productData,
                currentPage: page,
                totalPages,
                cat: category,
                search 
            });
        } else {
            res.render('admin/pageNotfound');
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        res.redirect('/admin/pageNotfound');
    }
};


//-----------------------------------------------------
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        console.log('Product ID:', productId, 'Percentage:', percentage); 
        
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });

        const productDiscount = Math.floor(findProduct.regularPrice * (percentage / 100));
        const categoryDiscount = findCategory.categoryOffer 
            ? Math.floor(findProduct.regularPrice * (findCategory.categoryOffer / 100)) 
            : 0;

        const highestDiscount = Math.max(productDiscount, categoryDiscount);

        findProduct.salePrice = findProduct.regularPrice - highestDiscount;
        findProduct.productOffer = parseInt(percentage);
        findProduct.highestOffer = (highestDiscount === productDiscount) ? percentage : findCategory.categoryOffer;

        await findProduct.save();

        res.json({ 
            status: true, 
            message: "Product offer applied successfully", 
            salePrice: findProduct.salePrice 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};



//-----------------------------------------------------

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;

        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Product not found" });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });

        // Remove product offer
        findProduct.productOffer = 0;

        // Calculate new sale price using category offer if it exists
        const categoryDiscount = findCategory?.categoryOffer
            ? Math.floor(findProduct.regularPrice * (findCategory.categoryOffer / 100))
            : 0;

        findProduct.salePrice = findProduct.regularPrice - categoryDiscount;
        findProduct.highestOffer = findCategory?.categoryOffer || 0;

        await findProduct.save();

        res.json({ 
            status: true, 
            message: "Product offer removed successfully", 
            salePrice: findProduct.salePrice 
        });

    } catch (error) {
        console.error(error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal server error" });
    }
};


//-----------------------------------------------------
const blockProduct = async (req, res) => {
    try {
        const id = req.body.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.json({ status: true, message: "Product blocked successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

//-----------------------------------------------------
const unblockProduct = async (req, res) => {
    try {
        const { id } = req.body;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.json({ status: true, message: "Product unblocked successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Something went wrong!" });
    }
};


//-----------------------------------------------------
const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        console.log('hi')
        res.render("admin/editProduct", {
            product: product,
            categories: category,
            error: null, 
            success: null
        });
    } catch (error) {
        console.log('here is the issue')
        res.redirect('/pageNotfound');
    }
};

//-----------------------------------------------------
const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name." });
        }

        if (!data.productName || !data.description || !data.category) {
            return res.status(400).json({ error: "All required fields must be filled." });
        }

        const regularPrice = parseFloat(data.regularPrice);
        const salePrice = parseFloat(data.salePrice);
        const quantity = parseInt(data.quantity);
        const size = parseFloat(data.size);

        if (isNaN(regularPrice) || isNaN(salePrice) || isNaN(quantity) || isNaN(size)) {
            return res.status(400).json({ error: "Price, Quantity, and Size must be valid numbers." });
        }

        if (regularPrice < 0 || salePrice < 0 || quantity < 0 || size < 0) {
            return res.status(400).json({ error: "Price, Quantity, and Size cannot be negative." });
        }

        if (salePrice > regularPrice) {
            return res.status(400).json({ error: "Sale Price must be less than Regular Price." });
        }

        const category = await Category.findById(data.category);
        if (!category) {
            return res.status(400).json({ error: "Invalid category selected." });
        }

        // Upload new images to Cloudinary
        const newImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const imageUrl = await uploadToCloudinary(file.buffer);
                newImages.push(imageUrl);
            }
        }

        // Merge existing images with newly uploaded images
        const updatedImages = [...(product.productImage || []), ...newImages];
        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: category._id,
            regularPrice: regularPrice,
            salePrice: salePrice,
            quantity: quantity,
            size: size,
            flavor: data.flavor,
            productImage: updatedImages 
        };

        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        return res.json({ success: "Product updated successfully!" });

    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
};



//-----------------------------------------------
const deleteSingleImage = async(req,res)=>{
    try{
    const {imageNameToServer, productIdToServer}=req.body
    const product= await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
    const imagePath = path.join('public','uploads','product-images',imageNameToServer);
    if(fs.existsSync(imagePath)){
        await fs.unlinkSync(imagePath)
        console.log(`Image ${imageNameToServer} deleted successfully`)
    }else{
        console.log(`Image ${imageNameToServer} not found`)
    }
    res.send({status:true});
    }catch(error){
        res.redirect('/pageNotfound')
    }
}
//-----------------------------------------------------

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.body;

        await Product.updateOne({ _id: id }, { $set: { isDeleted: true } });

        res.json({ status: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Failed to delete product" });
    }
};

//-----------------------------------------------------
module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    deleteProduct
};