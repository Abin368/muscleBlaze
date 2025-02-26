const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Cart=require("../../models/cartSchema")
const mongodb = require("mongodb");


const getCart = async (req, res) => {
  try {
      const userId = req.session.user; 
      if (!userId) {
          return res.redirect('/login'); 
      }

      const cart = await Cart.findOne({ userId }).populate('items.productId'); 
      if (!cart || cart.items.length === 0) {
          return res.render('user/cart', { items: [], grandTotal: 0, quantity: 0, swalMessage: null }); 
      }

      let totalQuantity = 0;
      let grandTotal = 0;
      let outOfStockMessages = [];

      cart.items.forEach(item => {
          if (!item.productId) {
              return;
          }
          if (item.quantity > item.productId.quantity) {
              outOfStockMessages.push(`${item.productId.productName} is out of stock. Please remove it from the cart.`);
          }
          totalQuantity += item.quantity;
          grandTotal += item.totalPrice;
      });

      res.render('user/cart', {
          items: cart.items,
          grandTotal: grandTotal,
          quantity: totalQuantity,
          swalMessage: outOfStockMessages.length > 0 ? outOfStockMessages.join('\n') : null
      });

  } catch (error) {
      console.error('Error fetching cart:', error);
      res.redirect('/pageNotFound');
  }
};


//----------------------------------------


const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;  
    const { productId } = req.body;   
    const product = await Product.findById(productId);

    if (!product) {
      return res.json({ success: false, message: 'Product not found' });
    }
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const existingItem = cart.items.find(item => item.productId.toString() === productId);

    if (existingItem) {
    
      existingItem.quantity += 1;
      existingItem.totalPrice = existingItem.quantity * existingItem.price;
    } else {
    
      cart.items.push({
        productId: product._id,
        quantity: 1,
        price: product.salePrice,
        totalPrice: product.salePrice,
      });
    }

  
    await cart.save();

  
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.json({ success: false, message: 'Error adding product to cart' });
  }
};
//-----------------------------------------------

const updateQuantity = async (req, res) => {
  try {
    const { productId, action } = req.body;
    const userId = req.session.user;

  
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }

    const item = cart.items.find(item => item.productId.toString() === productId);

    if (!item) {
      return res.status(404).send("Item not found in cart");
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    let newQuantity = item.quantity;

    if (action === "increase" && newQuantity < product.quantity && newQuantity < 5) {
      newQuantity++;
    } else if (action === "decrease" && newQuantity > 1) {
      newQuantity--;
    }

    
    item.quantity = newQuantity;
    item.totalPrice = item.quantity * product.salePrice;

    await cart.save();

   
    res.json({
      success: true,
      updatedQuantity: newQuantity,
      totalPrice: item.totalPrice
    });
  } catch (error) {
    res.status(500).send("Something went wrong while updating cart.");
  }
};
//-----------------------------------
const deleteFromCart = async (req, res) => {
    try {
      const { productId } = req.body;  
      const userId = req.session.user; 
      
      const cart = await Cart.findOne({ userId });
  
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found" });
      }
  
     
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
  
      if (itemIndex === -1) {
        return res.status(404).json({ success: false, message: "Item not found in cart" });
      }
  
      cart.items.splice(itemIndex, 1);
  
      
      await cart.save();
  
      
      res.json({ success: true, message: "Item deleted successfully from cart" });
    } catch (error) {
      console.error("Error deleting product from cart:", error);
      res.status(500).json({ success: false, message: "Something went wrong while deleting the product from cart" });
    }
  };
  



module.exports={
    getCart,
    addToCart,
    updateQuantity,
    deleteFromCart
}