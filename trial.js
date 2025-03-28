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
        <h1 class="text-center">Edit Product</h1>
        
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
        
        
        <form action="/admin/editProduct/<%=product._id%>" method="POST" enctype="multipart/form-data" onsubmit="return validateForm()">
            <!-- Product Name -->
            <div class="form-group">
                <label>Product Name</label>
                <input type="text" name="productName" class="form-control" value="<%=product.productName%>" required>
            </div>
    
            <!-- Description -->
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" id="descriptionid" class="form-control" rows="3" required><%= product.description %></textarea>

            </div>
    
            <select name="category" class="form-control" required>
                <% if (categories && categories.length > 0) { %>
                    <% for (let i = 0; i < categories.length; i++) { %>
                        <option value="<%= categories[i]._id %>"
                            <% if (product.category && categories[i]._id.toString() === product.category.toString()) { %> selected <% } %>>
                            <%= categories[i].name %>
                        </option>
                    <% } %>
                <% } else { %>
                    <option disabled>No categories available</option>
                <% } %>
            </select>
            

    
            <!-- Regular & Sale Price -->
            <div class="form-row">
                <div class="form-group">
                    <label>Regular Price</label>
                    <input type="number" name="regularPrice" class="form-control" value="<%=product.regularPrice%>" required>
                </div>
                <div class="form-group">
                    <label>Sale Price</label>
                    <input type="number" name="salePrice" class="form-control" value="<%=product.salePrice%>" required>
                </div>
            </div>
    
            <!-- Quantity, Size, Flavor -->
            <div class="form-row">
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" name="quantity" class="form-control" value="<%=product.quantity%>" required>
                </div>
                <div class="form-group">
                    <label>Size</label>
                    <input type="number" name="size" class="form-control" placeholder="Eg: 1Kg,2Kg.." step="0.01" min="0.1" value="<%=product.size%>" required>
                </div>
                <div class="form-group">
                    <label>Flavor</label>
                    <input type="text" name="flavor" class="form-control" value="<%=product.flavor%>" required>
                </div>
            </div>
    
            <!-- Image Upload & Cropper.js -->

           
            <div class="card mb-2">
                <div class="card-header">
                    <h4>Choose images</h4>
                </div>
              
                <!-- <div class="border row">
                    <div id="addedImagesContainer" class="thumbnails-container"></div>
                </div> -->


                <%for(let i = 0; i < product.productImage.length ;i++){%>

                <div class="col-md-12">
                    <div class="mb-4">
                        <div class="col-12">
                            <td>
                                <input type="hidden" value="<%=product.productImage[i]%>" id="imageDatas">
                                <img class="rounded" style="width: 50px; height: 60px;"
                                    src="/uploads/product-images/<%=product.productImage[i]%>"
                                    alt="">
                                <i onclick="deleteSingleImage('<%=product.productImage[i]%>','<%=product._id%>')" style="position: absolute; margin-left: .5rem; cursor: pointer;" class="fa-thin fa-x"></i>
                            </td>
                        </div>
                       
                    </div>
                </div>

                     <%}%>

                <!-- Image 1 -->
                <div class="row">
                    <div class="card-body align-items-center" style="margin-bottom: 20px;">
                        <img src="" alt="" id="imgView1">
                        <input class="form-control" type="file" name="images1" id="input1" accept="image/png, image/jpeg, image/jpg" onchange="viewImage1(event), initializeCropper(1)">
                        <div id="images-error1" class="error-message"></div>
                    </div>
                    <div class="image-cropper d-flex align-items-center" id="cropper1" style="display:none;">
                        <img src="" id="croppedImg1" alt="">
                        <button type="button" id="saveButton1" class="btn-sm btn-primary" onclick="saveCroppedImage(1)">Save</button>
                    </div>
                </div>
    
                <!-- Image 2 -->
                <div class="row">
                    <div class="card-body align-items-center" style="margin-bottom: 20px;">
                        <img src="" alt="" id="imgView2">
                        <input class="form-control" type="file" name="images2" id="input2" accept="image/png, image/jpeg, image/jpg" onchange="viewImage2(event), initializeCropper(2)">
                    </div>
                    <div class="image-cropper d-flex align-items-center" id="cropper2" style="display:none;">
                        <img src="" id="croppedImg2" alt="">
                        <button type="button" id="saveButton2" class="btn-sm btn-primary" onclick="saveCroppedImage(2)">Save</button>
                    </div>
                </div>
    
                <!-- Image 3 -->
                <div class="row">
                    <div class="card-body align-items-center" style="margin-bottom: 20px;">
                        <img src="" alt="" id="imgView3">
                        <input class="form-control" type="file" name="images3" id="input3" accept="image/png, image/jpeg, image/jpg" onchange="viewImage3(event), initializeCropper(3)">
                    </div>
                    <div class="image-cropper d-flex align-items-center" id="cropper3" style="display:none;">
                        <img src="" id="croppedImg3" alt="">
                        <button type="button" id="saveButton3" class="btn-sm btn-primary" onclick="saveCroppedImage(3)">Save</button>
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
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <script>
        document.addEventListener("DOMContentLoaded", function () {
    const cropperInstances = {}; 
    const imageInputs = ["input1", "input2", "input3"];
    const croppedImages = ["croppedImg1", "croppedImg2", "croppedImg3"];
    const saveButtons = ["saveButton1", "saveButton2", "saveButton3"];
    
    imageInputs.forEach((inputId, index) => {
        const inputElement = document.getElementById(inputId);
        const croppedImage = document.getElementById(croppedImages[index]);
        const saveButton = document.getElementById(saveButtons[index]);

        inputElement.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                if (!file.type.startsWith("image/")) {
                    alert("Please upload an image file (JPEG, PNG)");
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    croppedImage.src = e.target.result;
                    croppedImage.style.display = "block";

                    // Initialize Cropper.js
                    if (cropperInstances[inputId]) {
                        cropperInstances[inputId].destroy();
                    }

                    cropperInstances[inputId] = new Cropper(croppedImage, {
                        aspectRatio: 1, // Square crop
                        viewMode: 2,
                        autoCropArea: 1,
                        responsive: true
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
                    alert("Image cropped successfully!");
                });
            }
        });
    });

    
    window.validateAndSubmit = function () {
        const productName = document.querySelector("input[name='productName']").value.trim();
        const regularPrice = document.querySelector("input[name='regularPrice']").value;
        const salePrice = document.querySelector("input[name='salePrice']").value;
        const quantity = document.querySelector("input[name='quantity']").value;
        const images = imageInputs.map(id => document.getElementById(id).files.length).reduce((a, b) => a + b, 0);

        if (!productName || !regularPrice || !salePrice || !quantity) {
            alert("Please fill in all required fields!");
            return false;
        }

        // if (images !== 3) {
        //     alert("Please upload exactly 3 images!");
        //     return false;
        // }
      

        document.querySelector("form").submit();
    };
});

//------------------------------------------
function deleteSingleImage(imageId,productId){
    $.ajax({
        url:"/admin/deleteImage",
        method:'post',
        data:{imageNameToServer:imageId,productIdToServer:productId},
        success:((response)=>{
            if(response.status===true){
                window.location.reload()
            }
        })
    })
}

    </script>

</body>

</html>





























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