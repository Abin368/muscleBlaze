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

       
        if (!product.productName || !product.description || !product.regularPrice || !product.salePrice || !product.quantity) {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "All required fields must be filled",
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
module.exports = {
    getProductAddPage,
    addProducts,
};


//------------------------------------------------------------------------
