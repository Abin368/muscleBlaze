const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema')
const Product = require("../../models/productSchema");
const Wishlist = require('../../models/wishlistSchema')
const mongoose = require('mongoose');
const mongodb = require("mongodb");
const HTTP_STATUS=require('../../config/httpStatusCode')

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login'); 
        }

    
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId'); 
        

        res.render('user/wishlist', { 
            wishlist: wishlist ? wishlist.products : [] 
        });

    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.redirect('/pageNotFound');
    }
};



//----------------------------------------


const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user; 
        const { productId } = req.body;

        if (!userId) {
            return res.json({ success: false, message: 'User not logged in' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const alreadyExists = wishlist.products.some(item => 
            item.productId.equals(new mongoose.Types.ObjectId(productId))
        );

        if (alreadyExists) {
            return res.json({ success: false, message: 'Product already in wishlist' });
        }

        wishlist.products.push({ productId: product._id, addedOn: new Date() });

        await wishlist.save();
        res.json({ success: true, message: 'Added to wishlist' });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.json({ success: false, message: 'Error adding product to wishlist' });
    }
};

//---------------------------------------------------
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.json({ success: false, message: 'Wishlist not found' });
        }

        // Remove product from wishlist
        wishlist.products = wishlist.products.filter(
            item => item.productId.toString() !== productId
        );

        await wishlist.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.json({ success: false, message: 'Error removing product from wishlist' });
    }
};



module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist

}