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

      
        const product = await Product.findById(productId).populate('category').lean();
        if (!product) {
            return res.redirect('/shop'); 
        }

        const findCategory = product.category || null;
        const productOffer = product.productOffer || 0;
        const categoryOffer=findCategory ? findCategory.categoryOffer || 0 :0;
        const highestOffer = Math.max(productOffer, categoryOffer);
       
        const quantity = product.quantity || 0; 

      
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId }
        }).limit(5).lean(); 

        res.render('user/productDetails', {
            user: userData,
            product,
            quantity,
            highestOffer, 
            category: findCategory,
            relatedProducts  
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
