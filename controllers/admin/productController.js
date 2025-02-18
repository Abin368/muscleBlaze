const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require('fs')
const path=require('path')
const sharp=require('sharp')


//---------------------------------------------
const getProductAddPage = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });

        res.render("admin/addProduct", { categories, error: null, success: null });
    } catch (error) {
        console.error(error);
        res.render("admin/addProduct", { categories: [], error: "An error occurred. Please try again.", success: null });
    }
};


//---------------------------------------------
const addProducts = async (req, res) => {
    try {
        const product = req.body;

       
        if (!product.productName || !product.description || !product.regularPrice || !product.salePrice || !product.quantity || !product.size) {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "All required fields must be filled",
                success: null
            });
        }

        // Validate that price, quantity, and size are not negative
        if (product.regularPrice < 0 || product.salePrice < 0 || product.quantity < 0 || product.size < 0) {
            return res.render("admin/addProduct", {
                categories: await Category.find({ isDeleted: false }),
                error: "Price, Quantity, and Size must not be negative",
                success: null
            });
        }

        // Ensure sale price is less than regular price
        if (product.salePrice >= product.regularPrice) {
            return res.render("admin/addProduct", {
                categories: await Category.find({ isDeleted: false }),
                error: "Sale Price must be less than Regular Price",
                success: null
            });
        }

        // Check if size contains digits\
        if (!/^\d+(\.\d{1,3})?$/.test(product.size)) {
            return res.render("admin/addProduct", {
                categories: await Category.find({ isDeleted: false }),
                error: "Size must be a valid number (e.g., 0.100Kg, 1Kg, 2.5Kg, etc.)",
                success: null
            });
        }
        

        // Check if product already exists
        const productExists = await Product.findOne({ productName: product.productName });
        if (productExists) {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "Product already exists, try with another name",
                success: null
            });
        }

        // Find category ID
        const categoryId = await Category.findOne({ _id: product.category });
        if (!categoryId) {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "Invalid category selected",
                success: null
            });
        }

        // Handle Images
        const images = [];
        console.log(req.files);

        if (req.files && req.files.images1 && req.files.images2 && req.files.images3) {
            const uploadDir = path.join(__dirname, "../../public/uploads/product-images");

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const imageFields = ['images1', 'images2', 'images3'];
            for (const field of imageFields) {
                const file = req.files[field][0]; 
                const originalImagePath = file.path;

                const resizedImageFilename = Date.now() + '-' + path.basename(file.filename);
                const resizedImagePath = path.join(uploadDir, resizedImageFilename);

                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                images.push(resizedImageFilename);
            }
        } else {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "Please upload exactly 3 images",
                success: null
            });
        }

        // Create New Product
        const newProduct = new Product({
            productName: product.productName,
            description: product.description,
            category: categoryId._id,
            regularPrice: product.regularPrice,
            salePrice: product.salePrice,
            createdOn: new Date(),
            quantity: product.quantity,
            flavor: product.flavor,
            size: product.size,
            productImage: images,
            status: "Available"
        });

        await newProduct.save();

        return res.render("admin/addProduct", { 
            categories: await Category.find({ isDeleted: false }),
            error: null,
            success: "Product added successfully!"
        });
    } catch (error) {
        console.error("Error saving product:", error);
        return res.render("admin/addProduct", { 
            categories: await Category.find({ isDeleted: false }),
            error: "An error occurred. Please try again.",
            success: null
        });
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

        const category = await Category.find({ isListed: true });

        if (category) {
            res.render("admin/productDetails", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                search 
            });
        } else {
            res.render('page-404');
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        res.redirect('/pageerror');
    }
};


//-----------------------------------------------------
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        console.log('Product ID:', productId, 'Percentage:', percentage); // Debugging log
        
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This Product category already has a category offer" });
        }

        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();

        findCategory.categoryOffer = 0;
        await findCategory.save();

        res.json({ status: true });
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
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;
        await findProduct.save();

        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

//-----------------------------------------------------
const blockProduct = async(req,res)=>{
    try{
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')
    }catch(error){
        res.redirect('/pagerror')
    }
}

//-----------------------------------------------------
const unblockProduct = async(req,res)=>{
    try{
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    }catch(error){
        res.redirect('/pagerror')
    }
}


//-----------------------------------------------------
const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        res.render("admin/editProduct", {
            product: product,
            category: category,
            error: null, 
            success: null
        });
    } catch (error) {
        console.log('here is the issue')
        res.redirect('/pageerror');
    }
};

//-----------------------------------------------------
const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const product = await Product.findOne({ _id: id });

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this name already exists. Please try with another name.' });
        }

        const images = [];
        if (req.files && (req.files.images1 || req.files.images2 || req.files.images3)) {
            if (req.files.images1) images.push(req.files.images1[0].filename);
            if (req.files.images2) images.push(req.files.images2[0].filename);
            if (req.files.images3) images.push(req.files.images3[0].filename);
        }

       
        let categoryId = product.category; 
        if (data.category) {
            const category = await Category.findOne({ name: data.category });
            if (!category) {
                return res.status(400).json({ error: 'Invalid category selected.' });
            }
            categoryId = category._id; 
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: categoryId, 
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            flavor: data.flavor,
            ...(images.length > 0 && { productImage: [...product.productImage, ...images] })
        };

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
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
        res.redirect('/pageerror')
    }
}
//-----------------------------------------------------

const deleteProduct = async(req,res)=>{
    try{
        const { id, search, page } = req.query;

        await Product.updateOne({ _id: id }, { $set: { isDeleted: true } });

     
        req.session.successMessage = 'Category deleted successfully';
        return res.redirect(`/admin/products?search=${search}&page=${page}`);
    }catch(error){
        console.error(error);
        req.session.errorMessage = 'Failed to delete category';
        return res.redirect(`/admin/products?search=${search}&page=${page}`);

    }
}
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