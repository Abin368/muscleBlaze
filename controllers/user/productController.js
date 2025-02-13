const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user; 
        const userData = userId ? await User.findById(userId).lean() : null; 

        const productId = req.query.id;
        if (!productId) {
            return res.redirect('/shop');
        }

        // Fetch the main product with its category
        const product = await Product.findById(productId).populate('category').lean();
        if (!product) {
            return res.redirect('/shop'); 
        }

        const findCategory = product.category || null;
        const productOffer = product.productOffer || 0;
        const totalOffer = productOffer;
        const quantity = product.quantity || 0; 

        // Fetch related products from the same category, excluding the current product
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId }
        }).limit(5).lean(); // Limit the number of related items

        res.render('user/productDetails', {
            user: userData,
            product,
            quantity,
            totalOffer,
            category: findCategory,
            relatedProducts  // Pass related products to the template
        });

    } catch (error) {
        console.error('Error fetching product details:', error);
        res.redirect('/pageNotFound');
    }
};


//-----------------------------------------------------------


module.exports ={
    productDetails,
  
}
