const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const mongoose = require("mongoose");
const HTTP_STATUS=require('../../config/httpStatusCode')

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;
        const userData = userId ? await User.findById(userId).lean() : null;

        const productId = req.query.id;
        if (!productId) return res.redirect('/shop');

        const product = await Product.findById(productId).populate('category').lean();
        if (!product) return res.redirect('/shop');

        product.reviews = product.reviews || [];

        product.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

     
        let userReview = null;
        if (userId) {
            const userReviewIndex = product.reviews.findIndex(review => review.user.toString() === userId);
            if (userReviewIndex !== -1) {
                userReview = product.reviews[userReviewIndex];
            }
        }

        const limit = 5;
        const page = parseInt(req.query.page) || 1;
        const totalReviews = product.reviews.length;
        const totalPages = Math.ceil(totalReviews / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

       
        let paginatedReviews = product.reviews.slice(startIndex, endIndex);

      
        if (userReview) {
            paginatedReviews = [
                userReview,
                ...paginatedReviews.filter(r => r.user.toString() !== userId)
            ];
        }

       
        const averageRating = totalReviews > 0
            ? (product.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
            : 0;

     
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        product.reviews.forEach(review => {
            ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
        });

    
        const findCategory = product.category || null;
        const productOffer = product.productOffer || 0;
        const categoryOffer = findCategory ? findCategory.categoryOffer || 0 : 0;
        const highestOffer = Math.max(productOffer, categoryOffer);
        const quantity = product.quantity || 0;

      
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId },
        })
            .limit(5)
            .lean();


        if (req.xhr) {
            return res.json({
                reviews: paginatedReviews,
                currentPage: page,
                totalPages,
            });
        }

        res.render('user/productDetails', {
            user: userData,
            product,
            quantity,
            highestOffer,
            category: findCategory,
            relatedProducts,
            averageRating,
            totalReviews,
            ratingCounts,
            reviews: paginatedReviews,
            currentPage: page,
            totalPages,
        });

    } catch (error) {
        console.error('Error fetching product details:', error);
        res.redirect('/pageNotFound');
    }
};



//----------------------------------------------------------

const addReview = async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        
      
        const userId = req.session.user?._id;  

        if (!userId) {
            return res.json({ success: false, message: "Please log in to add a review." });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.json({ success: false, message: "Invalid rating value." });
        }

        const product = await Product.findById(productId);
        if (!product ||product.isBlocked || product.isDeleted) {
            return res.json({ success: false, message: "Product not found." });
        }

       


        const userObjectId = new mongoose.Types.ObjectId(userId);

     
        const existingReview = product.reviews.find(review =>
            review.user.toString() === userObjectId.toString()
        );

        console.log("Existing Review:", existingReview); 

        if (existingReview) {
            return res.json({ success: false, message: "You have already reviewed this product." });
        }

       
        product.reviews.push({ user: userObjectId, rating, comment });
        await product.save();

        return res.json({ success: true, message: "Review added successfully!" });

    } catch (error) {
        console.error("Error adding review:", error);
        res.json({ success: false, message: "Error adding review." });
    }
};
//----------------------------------------------
const editReview = async (req, res) => {
    try {
        const { reviewId, rating, comment } = req.body;
        const userId = req.session.user._id;

        if (!userId) {
            return res.json({ success: false, message: "Please log in to edit your review." });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.json({ success: false, message: "Invalid rating value." });
        }

  
        const product = await Product.findOne({ "reviews._id": reviewId });

        if (!product || product.isBlocked || product.isDeleted) {
            return res.json({ success: false, message: "Product not found." });
        }

 
        const review = product.reviews.find(r => r._id.toString() === reviewId);

        if (!review) {
            return res.json({ success: false, message: "Review not found." });
        }

      
        if (review.user.toString() !== userId) {
            return res.json({ success: false, message: "You are not authorized to edit this review." });
        }

      
        review.rating = rating;
        review.comment = comment;
        await product.save();

        return res.json({ success: true, message: "Review updated successfully!" });

    } catch (error) {
        console.error("Error updating review:", error);
        res.json({ success: false, message: "Error updating review." });
    }
};



module.exports ={
    productDetails,
    addReview,
    editReview
   
  
}
