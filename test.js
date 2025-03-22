<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Product</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <!-- Cropper.js CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/sidebar.css">

    <link rel="stylesheet" href="/addProduct.css">

</head>

<body>
    <%- include('../../views/partials/admin/sidebar') %>

    <div class="main-content">
        <h1 class="text-center">Add Product</h1>
        
        <% if (error) { %>
            <div class="alert alert-danger mt-3">
                <%= error %>
            </div>
        <% } %>
        
        <% if (success) { %>
            <div class="alert alert-success mt-3">
                <%= success %>
            </div>
        <% } %>
        
        <form action="/admin/addProduct" method="POST" enctype="multipart/form-data" onsubmit="return validateForm()">
            <!-- Product Name -->
            <div class="form-group">
                <label>Product Name</label>
                <input type="text" name="productName" class="form-control" value="<%= formData?.productName || '' %>" required>
            </div>
    
            <!-- Description -->
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" id="descriptionid" class="form-control" rows="3" required><%= formData?.description?.trim() || '' %></textarea>

            </div>
    
            <!-- Category Dropdown -->
            <div class="form-group">
                <label>Category</label>
                <select name="category" class="form-control" required>
                    <option value="" disabled selected>Select Category</option>
                    <% categories.forEach(category => { %>
                        <option value="<%= category._id %>" <%= (formData?.category?.toString() === category._id.toString()) ? 'selected' : '' %>>
                            <%= category.name %>
                        </option>
                    <% }) %>
                </select>
            </div>
            
    
            <!-- Regular & Sale Price -->
            <div class="form-row">
                <div class="form-group">
                    <label>Regular Price</label>
                    <input type="number" name="regularPrice" class="form-control" value="<%= formData?.regularPrice || '' %>" required>
                </div>
                <div class="form-group">
                    <label>Sale Price</label>
                    <input type="number" name="salePrice" class="form-control" value="<%= formData?.salePrice || '' %>" required>
                </div>
            </div>
    
            <!-- Quantity, Size, Flavor -->
            <div class="form-row">
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" name="quantity" class="form-control" value="<%= formData?.quantity || '' %>" required>
                </div>
                <div class="form-group">
                    <label>Size</label>
                    <input type="number" name="size" class="form-control" placeholder="Eg: 1Kg,2Kg.." value="<%= formData?.size || '' %>" required>
                </div>
                <div class="form-group">
                    <label>Flavor</label>
                    <input type="text" name="flavor" class="form-control" value="<%= formData?.flavor || '' %>" required>
                </div>
            </div>
    
            <!-- Image Upload & Cropper.js -->
            <div class="card mb-2">
                <div class="card-header">
                    <h4>Choose images</h4>
                </div>
                <div class="border row">
                    <div id="addedImagesContainer" class="thumbnails-container"></div>
                </div>
    
                <!-- Image 1 -->
                <div class="row">
                    <div class="card-body align-items-center" style="margin-bottom: 20px;">
                        <img src="<%= formData?.existingImages?.[0] ? '/uploads/product-images/' + formData.existingImages[0] : '' %>" alt="" id="imgView1">

                        <input class="form-control" type="file" name="images1" id="input1" accept="image/png, image/jpeg, image/jpg" onchange="viewImage1(event), initializeCropper(1)">
                        <div id="images-error1" class="error-message"></div>
                    </div>
                    <div class="image-cropper d-flex align-items-center" id="cropper1" style="display:none;">
                        <img src="" id="croppedImg1" alt="">
                        <button type="button" id="saveButton1" class="btn-sm btn-primary" onclick="saveCroppedImage(1)">Save</button>
                        <span id="deleteIcon1" onclick="deleteImage(1)" style="display:none; margin-left: 10px; cursor: pointer; color: #dc3545;">
                            <i class="fas fa-trash-alt"></i>
                        </span>
                    </div>
                </div>
    
                <!-- Image 2 -->
                <div class="row">
                    <div class="card-body align-items-center" style="margin-bottom: 20px;">
                        <img src="<%= formData?.existingImages?.[1] ? '/uploads/product-images/' + formData.existingImages[1] : '' %>" alt="" id="imgView2">

                        <input class="form-control" type="file" name="images2" id="input2" accept="image/png, image/jpeg, image/jpg" onchange="viewImage2(event), initializeCropper(2)">
                    </div>
                    <div class="image-cropper d-flex align-items-center" id="cropper2" style="display:none;">
                        <img src="" id="croppedImg2" alt="">
                        <button type="button" id="saveButton2" class="btn-sm btn-primary" onclick="saveCroppedImage(2)">Save</button>
                        <span id="deleteIcon2" onclick="deleteImage(2)" style="display:none; margin-left: 10px; cursor: pointer; color: #dc3545;">
                            <i class="fas fa-trash-alt"></i>
                        </span>
                    </div>
                </div>
    
                <!-- Image 3 -->
                <div class="row">
                    <div class="card-body align-items-center" style="margin-bottom: 20px;">
                        <img src="<%= formData?.existingImages?.[2] ? '/uploads/product-images/' + formData.existingImages[2] : '' %>" alt="" id="imgView3">

                        <input class="form-control" type="file" name="images3" id="input3" accept="image/png, image/jpeg, image/jpg" onchange="viewImage3(event), initializeCropper(3)">
                    </div>
                    <div class="image-cropper d-flex align-items-center" id="cropper3" style="display:none;">
                        <img src="" id="croppedImg3" alt="">
                        <button type="button" id="saveButton3" class="btn-sm btn-primary" onclick="saveCroppedImage(3)">Save</button>
                        <span id="deleteIcon3" onclick="deleteImage(3)" style="display:none; margin-left: 10px; cursor: pointer; color: #dc3545;">
                            <i class="fas fa-trash-alt"></i>
                        </span>
                    </div>
                </div>
    
            </div>
    
            <!-- Publish Button -->
        
<div>
    <button class="btn btn-md rounded font-sm hover-up publish-btn" type="button" onclick="validateAndSubmit()">Publish</button>
</div>

        </form>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">

    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <script src="https://kit.fontawesome.com/your-kit-id.js" crossorigin="anonymous"></script>
    <script>

// document.addEventListener("DOMContentLoaded", function() {
    
//     const existingImages = JSON.parse('<%- JSON.stringify(formData?.existingImages || []) %>');

//     if (existingImages.length > 0) {
//         for (let i = 0; i < existingImages.length; i++) {
//             if (existingImages[i]) {
//                 document.getElementById(`imgView${i+1}`).src = "/uploads/product-images/" + existingImages[i];
//             }
//         }
//     }
// });


//-----------------------
document.addEventListener("DOMContentLoaded", function () {
   
    const existingImages = JSON.parse('<%- JSON.stringify(formData?.existingImages || []) %>');
    if (existingImages.length > 0) {
        for (let i = 0; i < existingImages.length; i++) {
            if (existingImages[i]) {
                document.getElementById(`imgView${i + 1}`).src = "/uploads/product-images/" + existingImages[i];
            }
        }
    }

   
    const cropperInstances = {}; 
    const imageInputs = ["input1", "input2", "input3"];
    const croppedImages = ["croppedImg1", "croppedImg2", "croppedImg3"];
    const saveButtons = ["saveButton1", "saveButton2", "saveButton3"];
    const deleteIcons = ["deleteIcon1", "deleteIcon2", "deleteIcon3"];

    imageInputs.forEach((inputId, index) => {
        const inputElement = document.getElementById(inputId);
        const croppedImage = document.getElementById(croppedImages[index]);
        const saveButton = document.getElementById(saveButtons[index]);
        const deleteIcon = document.getElementById(deleteIcons[index]);
        const cropperContainer = document.getElementById(`cropper${index + 1}`); 

        inputElement.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                if (!file.type.startsWith("image/")) {
                    showToast("Please upload an image file (JPEG, PNG)", "error");
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    croppedImage.src = e.target.result;
                    croppedImage.style.display = "block";
                    cropperContainer.style.display = "flex"; 
                    deleteIcon.style.display = "inline-block"; 

                   
                    if (cropperInstances[inputId]) {
                        cropperInstances[inputId].destroy();
                    }

                  
                    cropperInstances[inputId] = new Cropper(croppedImage, {
                        aspectRatio: 1,
                        viewMode: 2,
                        autoCropArea: 1,
                        responsive: true,
                    });

                    saveButton.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });

        saveButton.addEventListener("click", function () {
            const cropper = cropperInstances[inputId];
            if (cropper) {
                cropper.getCroppedCanvas({ width: 440, height: 440 }).toBlob((blob) => {
                    const file = new File([blob], `cropped_${inputElement.files[0].name}`, { type: "image/jpeg" });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    inputElement.files = dataTransfer.files;
                    showToast("Image cropped successfully!", "success");
                });
            }
        });
    });


    window.deleteImage = function(index) {
        const inputElement = document.getElementById(`input${index}`);
        const croppedImage = document.getElementById(`croppedImg${index}`);
        const saveButton = document.getElementById(`saveButton${index}`);
        const deleteIcon = document.getElementById(`deleteIcon${index}`);
        const cropperContainer = document.getElementById(`cropper${index}`);
        const imgView = document.getElementById(`imgView${index}`);

        inputElement.value = '';
        croppedImage.src = '';
        imgView.src = '';
        cropperContainer.style.display = 'none';
        saveButton.style.display = 'none';
        deleteIcon.style.display = 'none';

        if (cropperInstances[`input${index}`]) {
            cropperInstances[`input${index}`].destroy();
            delete cropperInstances[`input${index}`];
        }

        showToast("Image deleted successfully!", "success");
    };




  
    window.validateAndSubmit = async function () {
        const form = document.querySelector("form");
        const formData = new FormData(form);

       
        const productName = formData.get("productName").trim();
        const regularPrice = formData.get("regularPrice");
        const salePrice = formData.get("salePrice");
        const quantity = formData.get("quantity");
        const images = imageInputs.map(id => document.getElementById(id).files.length).reduce((a, b) => a + b, 0);

        if (!productName || !regularPrice || !salePrice || !quantity) {
            showToast("Please fill in all required fields!", "error");
            return false;
        }

        if (images !== 3) {
            showToast("Please upload exactly 3 images!", "error");
            return false;
        }

       
        try {
            const response = await fetch("/admin/addProduct", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                showToast(result.success, "success");
                window.location.href = "/admin/products"; 
            } else if (result.error) {
                showToast(result.error, "error");
            }
        } catch (error) {
            console.error("Error:", error);
            showToast("An error occurred. Please try again.", "error");
        }
    };

   
    function showToast(message, type = "info") {
        const backgroundColor = type === "error" ? "#ff4444" : type === "success" ? "#00C851" : "#33b5e5";
        Toastify({
            text: message,
            duration: 3000, 
            close: true,
            gravity: "top", 
            position: "right", 
            backgroundColor: backgroundColor,
            stopOnFocus: true, 
        }).showToast();
    }
});
    </script>
    


</body>

</html>
































const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require('fs')
const path=require('path')
const sharp=require('sharp')
const HTTP_STATUS=require('../../config/httpStatusCode')


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

        // Parse numeric values
        const regularPrice = parseFloat(product.regularPrice);
        const salePrice = parseFloat(product.salePrice);
        const quantity = parseInt(product.quantity);
        const size = parseFloat(product.size);

        // Validation Checks
        if (!product.productName || !product.description || isNaN(regularPrice) || isNaN(salePrice) || isNaN(quantity) || isNaN(size)) {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "All required fields must be filled with valid values",
                success: null,
                formData: product // Preserve form data
            });
        }

        if (regularPrice < 0 || salePrice < 0 || quantity < 0 || size < 0) {
            return res.render("admin/addProduct", {
                categories: await Category.find({ isDeleted: false }),
                error: "Price, Quantity, and Size must not be negative",
                success: null,
                formData: product
            });
        }

        if (salePrice >= regularPrice) {
            return res.render("admin/addProduct", {
                categories: await Category.find({ isDeleted: false }),
                error: "Sale Price must be less than Regular Price",
                success: null,
                formData: product
            });
        }

        if (!/^\d+(\.\d{1,3})?$/.test(size)) {
            return res.render("admin/addProduct", {
                categories: await Category.find({ isDeleted: false }),
                error: "Size must be a valid number (e.g., 0.100Kg, 1Kg, 2.5Kg, etc.)",
                success: null,
                formData: product
            });
        }
        
        // Check if product already exists
        const productExists = await Product.findOne({ productName: product.productName });
        if (productExists) {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "Product already exists, try with another name",
                success: null,
                formData: product
            });
        }

        // Check if category is valid
        const categoryId = await Category.findOne({ _id: product.category });
        if (!categoryId) {
            return res.render("admin/addProduct", { 
                categories: await Category.find({ isDeleted: false }),
                error: "Invalid category selected",
                success: null,
                formData: product
            });
        }

        // Image Upload Handling
        const images = [];
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
                success: null,
                formData: product
            });
        }

        
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
            productImage: images,
            status: "Available"
        });

        await newProduct.save();

        return res.render("admin/addProduct", { 
            categories: await Category.find({ isDeleted: false }),
            error: null,
            success: "Product added successfully!",
            formData: {} // Reset form after success
        });

    } catch (error) {
        console.error("Error saving product:", error);
        return res.render("admin/addProduct", { 
            categories: await Category.find({ isDeleted: false }),
            error: "An error occurred. Please try again.",
            success: null,
            formData: req.body 
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
        console.log('Product ID:', productId, 'Percentage:', percentage); 
        
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Product not found" });
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

        res.json({ status: true, message: "Product offer applied successfully" });
    } catch (error) {
        console.error(error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal server error" });
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

        
        findProduct.productOffer = 0;

        
        const categoryDiscount = findCategory?.categoryOffer
            ? Math.floor(findProduct.regularPrice * (findCategory.categoryOffer / 100))
            : 0;

       
        findProduct.salePrice = findProduct.regularPrice - categoryDiscount;
        findProduct.highestOffer = findCategory?.categoryOffer || 0; 

        await findProduct.save();

        res.json({ status: true, message: "Product offer removed successfully" });
    } catch (error) {
        console.error(error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal server error" });
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
        console.log('hi')
        res.render("admin/editProduct", {
            product: product,
            categories: category,
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
        const product = await Product.findById(id);

        if (!product) {
            return res.render("admin/editProduct", {
                error: "Product not found.",
                product,
                categories: await Category.find({ isDeleted: false }),
                success: null 
            });
        }

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.render("admin/editProduct", {
                error: "Product with this name already exists. Please try with another name.",
                product,
                categories: await Category.find({ isDeleted: false }),
                success: null 
            });
        }

        if (!data.productName || !data.description || !data.category) {
            return res.render("admin/editProduct", {
                error: "All required fields must be filled.",
                product,
                categories: await Category.find({ isDeleted: false }),
                success: null 
            });
        }

        const regularPrice = parseFloat(data.regularPrice);
        const salePrice = parseFloat(data.salePrice);
        const quantity = parseInt(data.quantity);
        const size = parseFloat(data.size);

        if (isNaN(regularPrice) || isNaN(salePrice) || isNaN(quantity) || isNaN(size)) {
            return res.render("admin/editProduct", {
                error: "Price, Quantity, and Size must be valid numbers.",
                product,
                categories: await Category.find({ isDeleted: false }),
                success: null 
            });
        }

        if (regularPrice < 0 || salePrice < 0 || quantity < 0 || size < 0) {
            return res.render("admin/editProduct", {
                error: "Price, Quantity, and Size cannot be negative.",
                product,
                categories: await Category.find({ isDeleted: false }),
                success: null 
            });
        }

        if (salePrice > regularPrice) {
            return res.render("admin/editProduct", {
                error: "Sale Price must be less than Regular Price.",
                product,
                categories: await Category.find({ isDeleted: false }),
                success: null 
            });
        }

        const category = await Category.findById(data.category);
        if (!category) {
            return res.render("admin/editProduct", {
                error: "Invalid category selected.",
                product,
                categories: await Category.find({ isDeleted: false }),
                success: null 
            });
        }

        const images = [];
        if (req.files && (req.files.images1 || req.files.images2 || req.files.images3)) {
            const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
            
            if (req.files.images1 && allowedFormats.includes(req.files.images1[0].mimetype)) {
                images.push(req.files.images1[0].filename);
            }
            if (req.files.images2 && allowedFormats.includes(req.files.images2[0].mimetype)) {
                images.push(req.files.images2[0].filename);
            }
            if (req.files.images3 && allowedFormats.includes(req.files.images3[0].mimetype)) {
                images.push(req.files.images3[0].filename);
            }

            if (images.length === 0) {
                return res.render("admin/editProduct", {
                    error: "Invalid image format. Please upload JPG, PNG, or WEBP.",
                    product,
                    categories: await Category.find({ isDeleted: false }),
                    success: null 
                });
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: category._id,
            regularPrice: regularPrice,
            salePrice: salePrice,
            quantity: quantity,
            size: size,
            flavor: data.flavor,
        };

        if (images.length > 0) {
            updateFields.productImage = images;
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        return res.render("admin/editProduct", {
            success: "Product updated successfully!",
            error: null, 
            product: await Product.findById(id),
            categories: await Category.find({ isDeleted: false })
        });

    } catch (error) {
        console.error(error);
        return res.render("admin/editProduct", {
            error: "An unexpected error occurred. Please try again.",
            success: null, 
            product: await Product.findById(id),
            categories: await Category.find({ isDeleted: false })
        });
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