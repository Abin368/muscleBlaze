const Category = require("../../models/categorySchema");
const { getPaginatedCategories } = require("../../helpers/categoryHelpers");
const Product = require("../../models/productSchema");
const HTTP_STATUS = require("../../config/httpStatusCode");

const categoryInfo = async (req, res) => {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    try {
        const { categoryData, totalCategories, totalPages } = await getPaginatedCategories(search, page, limit);

        if (req.xhr) { 
            return res.json({
                success: categoryData.length > 0,
                categoryData,
                currentPage: page,
                totalPages
            });
        }

        const successMessage = req.session.successMessage || null;
        const errorMessage = req.session.errorMessage || null;
        req.session.successMessage = null;
        req.session.errorMessage = null;

        res.render('admin/categoryDetails', {
            search,
            cat: categoryData,
            currentPage: page,
            totalPages,
            totalCategories,
            successMessage,
            errorMessage
        });

    } catch (error) {
        console.error("Error fetching categories:", error);

        if (req.xhr) { 
            return res.json({ success: false, message: "Error fetching categories" });
        }

        res.render('admin/categoryDetails', {
            search,
            cat: [],
            successMessage: null,
            errorMessage: 'Error fetching categories'
        });
    }
};




//--------------------------------------------------------------
const addCategory = async (req, res) => {
    const { name, description } = req.body;
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;

    try {
       
        const formattedName = name.trim().toLowerCase();

        
        if (!formattedName) {
            const errorMessage = 'Category name cannot be empty!';
            
            if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(400).json({ success: false, message: errorMessage });
            } else {
                req.session.errorMessage = errorMessage;
                return res.redirect(`/admin/categories?search=${search}&page=${page}`);
            }
        }

        
        const existingCategory = await Category.findOne({
            name: { $regex: `^${formattedName}$`, $options: 'i' }
        });

        if (existingCategory) {
            const errorMessage = 'Category already exists!';
            
            if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(400).json({ success: false, message: errorMessage });
            } else {
                req.session.errorMessage = errorMessage;
                return res.redirect(`/admin/categories?search=${search}&page=${page}`);
            }
        }

       
        const newCategory = new Category({
            name: formattedName,
            description
        });

        await newCategory.save();

       
        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(200).json({
                success: true,
                message: 'Category added successfully!',
                newCategory
            });
        } else {
            req.session.successMessage = 'Category added successfully!';
            return res.redirect(`/admin/categories?search=${search}&page=${page}`);
        }
    } catch (error) {
        console.error("Error adding category:", error);
        
        const errorMessage = 'An error occurred while adding the category!';

        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(500).json({ success: false, message: errorMessage });
        } else {
            req.session.errorMessage = errorMessage;
            return res.redirect(`/admin/categories?search=${search}&page=${page}`);
        }
    }
};


//----------------------------------------------------------------------
const getListCategory = async (req, res) => {
    try {
        const { id } = req.body;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });

        
        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
};

const getUnlistCategory = async (req, res) => {
    try {
        const { id } = req.body;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });

        
        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
};

//------------------------------------------------------------------
// GET Edit Category Page
const getEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.redirect(`/admin/categories?error=true&message=Category not found`);
        }

    
      
        res.render('admin/editCategory', { category, error: false, message: req.query.message || '' });
    } catch (error) {
        console.error(error);
        res.redirect(`/admin/categories?error=true&message=Error fetching category`);
    }
};
//--------------------------------------------------------


const updateCategory = async (req, res) => {
    try {
        const { id, name, description } = req.body;

    
        const existingCategory = await Category.findOne({ name, _id: { $ne: id } });

        if (existingCategory) {

            return res.redirect(`/admin/editCategory/${id}?error=true&message=Category name already exists`);
        }



       
        await Category.updateOne({ _id: id }, { $set: { name, description } });

      
        return res.redirect(`/admin/categories?message=Category updated successfully`);
    } catch (error) {
        console.error(error);
       
        return res.redirect(`/admin/editCategory/${id}?error=true&message=Failed to update category`);
    }
};
//-----------------------------------------------------------------------------
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.query;

        await Category.updateOne({ _id: id }, { $set: { isDeleted: true } });

        return res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Failed to delete category' });
    }
};

//--------------------------------
const addCategoryOffer = async (req, res) => {
    try {
        const { categoryId, percentage } = req.body;  
      
        
        const findCategory = await Category.findOne({ _id: categoryId });
        if (!findCategory) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Category not found" });
        }

       
        if (findCategory.categoryOffer > 0) {
            return res.json({ status: false, message: "This category already has a category offer" });
        }

       
        findCategory.categoryOffer = parseInt(percentage);  
        await findCategory.save();

        
        const productsInCategory = await Product.find({ category: categoryId });

        for (let product of productsInCategory) {
            let categoryDiscount = Math.floor(product.regularPrice * (percentage / 100));
            let productDiscount = product.productOffer ? Math.floor(product.regularPrice * (product.productOffer / 100)) : 0;

            let highestDiscount = Math.max(categoryDiscount, productDiscount); 
            product.salePrice = product.regularPrice - highestDiscount;

           
            product.highestOffer = highestDiscount === categoryDiscount ? percentage : product.productOffer || 0;

            await product.save();
        }

        res.json({ status: true, message: "Category offer applied successfully" });
    } catch (error) {
        console.error(error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal server error" });
    }
};

//------------------------------------
const removeCategoryOffer = async (req, res) => {
    try {
        const { categoryId } = req.body;
        
      
        const findCategory = await Category.findOne({ _id: categoryId });
        
        if (!findCategory) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Category not found" });
        }

        
        findCategory.categoryOffer = 0;
        await findCategory.save();

        
        const productsInCategory = await Product.find({ category: categoryId });

        for (let product of productsInCategory) {
            let productDiscount = product.productOffer ? Math.floor(product.regularPrice * (product.productOffer / 100)) : 0;
            product.salePrice = product.regularPrice - productDiscount;

           
            product.highestOffer = product.productOffer || 0;

            await product.save();
        }

        res.json({ status: true, message: "Category offer removed successfully" });
    } catch (error) {
        console.error(error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal server error" });
    }
};



//-------------------------------------
module.exports = {
    categoryInfo,
    addCategory,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    updateCategory,
    deleteCategory,
    addCategoryOffer,
    removeCategoryOffer
};
