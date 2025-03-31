const User =require("../../models/userSchema")
const Category =require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Banner= require('../../models/bannerSchema')
const Wallet = require('../../models/walletSchema')
const HTTP_STATUS=require('../../config/httpStatusCode')
const bcrypt = require("bcrypt");
const { sendOTPEmail } = require("../../services/emailService");
const { generateOTP,validateInput, ERROR_MESSAGES } = require("../../utils/validation");



const pageNotfound=async(req,res)=>{
    try{
        return res.render('user/pageNotfound')
    }catch(error){
        console.log('something gone wrong');
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Server error')
    }
}


  

//---------------------------------------------------
const loadSignup=async(req,res)=>{
    try{

        return res.render('user/signup',{messages:{}})

    }catch(error){
        console.log('signup page not found');
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Server error')
    }
}

//---------------------------------------------------
const loadLogin=async(req,res)=>{
    try{
    if(!req.session.user){
        return res.render('user/login',{message:''})
    }else{
        res.redirect('/')
    }

    }catch(error){
        console.log('login page not found');
        res.redirect('pageNotfound')
    }
}

//--------------------------------------------------
const getVerifyOtp = (req, res) => {
  if (!req.session.otpData) {
    return res.redirect('/signup'); 
  }
  res.render('user/otp-verification', { email: req.session.otpData.email, message: '' }); 
};
//---------------------------------------------------
const signup = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

   
    const errors = validateInput(name, email, phone, password, confirmPassword);
    if (errors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: errors.join(", ") });
    }

   
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Email already exists. Please log in or use a different email." });
    }

  
    if (req.session.otpExpiry && Date.now() < req.session.otpExpiry) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "An OTP has already been sent. Please wait before requesting a new one." });
    }

    
    const otp = generateOTP();
    try {
      await sendOTPEmail(email, otp);
    } catch (error) {
     
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send OTP, please try again." });
    }

    
    req.session.otpData = { name, email, phone, password, otp, timestamp: Date.now() };
    req.session.otpExpiry = Date.now() + 60000; 

   

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "OTP sent successfully. Please verify your email.",
      redirectUrl: "/otp-verification"
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
  }
};

  
  //---------------------------------------------------
  const resendOtp = async (req, res) => {
    try {
      const otpData = req.session.otpData;
  
      if (!otpData) {
        return res.json({ success: false, message: "No OTP data found!" });
      }
  
    
      const newOtp = generateOTP();
      req.session.otpData.otp = newOtp;
      req.session.otpData.timestamp = Date.now(); 

  
    
      await sendOTPEmail(otpData.email, newOtp);
     
  
      res.json({ success: true, message: "New OTP sent to your email!" });
    } catch (error) {
      console.error("Error resending OTP:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to resend OTP. Please try again!" });
    }
  };
    //---------------------------------------------------
 
    const verifySignupOtp = async (req, res) => {
      try {
          const { otp } = req.body;
          const otpData = req.session.otpData;
  
        
          if (!otpData || Date.now() - otpData.timestamp > 1 * 60 * 1000) {
              return res.json({ success: false, message: "Invalid or expired OTP!" });
          }
  
        
          if (otpData.otp !== otp) {
              return res.json({ success: false, message: "Invalid OTP!" });
          }
  
        
          const existingUser = await User.findOne({ email: otpData.email });
          if (existingUser) {
              return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Email already exists. Please log in." });
          }
  
        
          const hashedPassword = await bcrypt.hash(otpData.password, 10);
  
       
          const newUser = new User({
              name: otpData.name,
              email: otpData.email,
              phone: otpData.phone,
              password: hashedPassword,
          });
          await newUser.save();
  
       
          const wallet = new Wallet({ userId: newUser._id });
          await wallet.save();
  
       
          req.session.otpData = null;
  
          res.json({ success: true, message: "OTP verified successfully! Redirecting to login..." });
      } catch (error) {
          console.error("Error verifying OTP:", error);
          res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error. Please try again!" });
      }
  };
  
  //---------------------------------------------------
  const login = async (req, res) => {
    try {
     
      const { email, password } = req.body;
      const findUser = await User.findOne({ isAdmin: 0, email: email });
  
      if (!findUser) {
        return res.render('user/login', { message: 'User not found' });
      }
  
      if (findUser.isBlocked) {
        return res.render('user/login', { message: 'User Blocked by admin' });
      }
  
      const passwordMatch = await bcrypt.compare(password, findUser.password);
      if (!passwordMatch) {
        return res.render('user/login', { message: 'Incorrect Password' });
      }
  
      req.session.user = {
        
          _id: findUser._id,
          username:findUser.name,
          email:findUser.email
         
     }
      res.redirect('/');
      console.log(req.session.user); 
    } catch (error) {
      console.error('Login error', error);
      res.render('user/login', { message: 'Login failed. Please try again later' });
    }
  };
//---------------------------------------------------
const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
    });
    
    const categories = await Category.find({ isListed: true , isDeleted:false});
    const categoryIds = categories.length ? categories.map(category => category._id) : [];

    let productData = await Product.find({
      isDeleted:false,
      isBlocked: false,
      category: { $in: categoryIds.length ? categoryIds : undefined },
      quantity: { $gt: 0 }
    });

    productData = productData
      .filter(p => p.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

   


    res.render('user/home', { 
      user: user || null, 
      product: productData, 
      banner: findBanner.length ? findBanner : []  
    });

  } catch (error) {
    console.error('Error loading homepage:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('user/pageNotfound', { message: 'Something went wrong!' });
  }
};
  //------------------------------------------------------
  const logout = async (req, res) => {
    try {
        if (req.session.user) {
            delete req.session.user; 
            await req.session.save(); 
        }

        if (req.user) {
            req.logout(function (err) { 
                if (err) {
                    console.log('Google Logout Error:', err);
                    return res.redirect('/pageerror');
                }
            });
        }

     
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return res.redirect('/login');
    } catch (error) {
        console.log('Logout error:', error);
        res.redirect('/pageerror');
    }
};








//-----------------------------------------



//---------------------------------------------------

const getProductDetail = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,  
      isBlocked: false   
    });

    if (!product) {
      return res.redirect('/pageNotfound'); 
    }

    res.render('user/productDetail', { product, currentPath: req.originalUrl });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect('/pageNotfound');
  }
};

//-----------------------------------------------------
const getCategoryPage = (req, res) => {
  const categoryName = req.params.categoryName;

  Product.find({ category: categoryName })
      .then((products) => {
          res.render('user/category', { products, currentPath: req.originalUrl });
      })
      .catch((err) => {
          console.error(err);
          res.redirect('/pageNotfound');
      });
};
//------------------------------------
const loadShoppingPage = async (req, res) => {
  try {
    const user = req.session.user;
    const searchQuery = req.query.query || ""; 
    const selectedFlavor = req.query.flavor || ""; 
    const selectedCategory = req.query.category || "";
    const selectedPrice = req.query.price || ""; 

    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    let productFilter = {
      isDeleted: false,
      isBlocked: false,
      quantity: { $gt: 0 }
    };

    if (searchQuery) {
      productFilter.$or = [
        { name: { $regex: searchQuery, $options: "i" } }, 
        { category: { $regex: searchQuery, $options: "i" } },
        { flavor: { $regex: searchQuery, $options: "i" } } 
      ];
    }

    if (selectedFlavor) {
      productFilter.flavor = selectedFlavor;
    }

    if (selectedCategory) {
      productFilter.category = selectedCategory;
    }

    
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    console.log("Fetched Categories:", categories);

    
    const validCategoryIds = categories.map(cat => cat._id.toString());
    productFilter.category = { $in: validCategoryIds };

    const products = await Product.find(productFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    

    if (!products || products.length === 0) {
      return res.render('user/shop', {
        user: user ? await User.findById(user).lean() : null,
        productt: [], 
        categories,
        flavors: await Product.distinct("flavor", { isBlocked: false, quantity: { $gt: 0 } }),
        totalProducts: 0,
        currentPage: page,
        totalPages: 0,
        searchQuery,
        selectedFlavor, 
        selectedCategory, 
        selectedPrice 
      });
    }

    const productsWithOffers = await Promise.all(products.map(async (product) => {
      const category = await Category.findById(product.category).lean(); 
      const productOffer = product.productOffer || 0;
      const categoryOffer = category ? category.categoryOffer || 0 : 0;
      const highestOffer = Math.max(productOffer, categoryOffer); 
      return { ...product, highestOffer }; 
    }));

    const totalProducts = await Product.countDocuments(productFilter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('user/shop', {
      user: user ? await User.findById(user).lean() : null,
      product: productsWithOffers,
      categories,
      flavors: await Product.distinct("flavor", { isBlocked: false, quantity: { $gt: 0 } }),
      totalProducts,
      currentPage: page,
      totalPages,
      searchQuery,
      selectedFlavor, 
      selectedCategory, 
      selectedPrice 
    });

  } catch (error) {
    console.error("Error in loadShoppingPage:", error);
    res.redirect('/pageNotFound');
  }
};



//-------------------------------
const filterProduct = async (req, res) => {
  try {
    const user = req.session.user;
    const category = req.query.category;
    const flavor = req.query.flavor;
    const price = req.query.price;
    const sortBy = req.query.sort || "";
    const searchQuery = req.query.query ? req.query.query.trim() : ""; 

   
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const validCategoryIds = categories.map(cat => cat._id.toString());

  

    const query = {
      isBlocked: false,
      quantity: { $gt: 0 },
      category: { $in: validCategoryIds } 
    };

   
    if (category && validCategoryIds.includes(category)) {
      query.category = category;
    }

    if (flavor) {
      query.flavor = flavor;
    }

    if (price) {
      query.salePrice = {
        "1500": { $lt: 1500 },
        "2500": { $lt: 2500 },
        "4000": { $lt: 4000 },
        "above4000": { $gt: 4000 }
      }[price] || query.salePrice;
    }

   
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } }
      ];

      const matchedCategory = await Category.findOne({ 
        name: { $regex: searchQuery, $options: "i" },
        isListed: true,
        isDeleted: false
      }).lean();

      if (matchedCategory) {
        query.$or.push({ category: matchedCategory._id });
      }
    }

  
    let sortCondition = { createdAt: -1 };
    if (sortBy === "low-to-high") {
      sortCondition = { salePrice: 1 };
    } else if (sortBy === "high-to-low") {
      sortCondition = { salePrice: -1 };
    } else if (sortBy === "aA-zZ") {
      sortCondition = { productName: 1 };
    } else if (sortBy === "zZ-aZ") {
      sortCondition = { productName: -1 };
    }

   
    let findProducts = await Product.find(query).sort(sortCondition).lean();

  

   
    const uniqueFlavors = await Product.distinct("flavor", {
      isBlocked: false,
      quantity: { $gt: 0 },
      category: { $in: validCategoryIds }
    });

   
    const itemsPerPage = 12;
    const currentPage = parseInt(req.query.page) || 1;
    const totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const currentProduct = findProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    let userData = null;
    if (user) {
      userData = await User.findById(user).lean();
      if (userData) {
        const searchEntry = {
          category: category || null,
          flavor: flavor || null,
          price: price || null,
          searchedOn: new Date()
        };
        userData.searchHistory.push(searchEntry);
        await User.updateOne({ _id: user }, { $push: { searchHistory: searchEntry } });
      }
    }

    req.session.filterProducts = currentProduct;

    res.render("user/shop", {
      user: userData,
      product: currentProduct,
      categories,
      flavors: uniqueFlavors.filter(Boolean),
      totalPages,
      currentPage,
      selectedCategory: category || null,
      selectedFlavor: flavor || null,
      selectedPrice: price || null,
      searchQuery, 
      selectedSort: sortBy || null 
    });

  } catch (error) {
    console.error("Error filtering products:", error);
    res.redirect("/pageNotFound");
  }
};

//-----------------------------------------------------------------

const searchProducts = async (req, res) => {
  try {
    const user = req.session.user;
    const query = req.query.query ? req.query.query.trim() : "";

    const selectedFlavor = req.query.flavor || "";
    const selectedCategory = req.query.category || "";
    const selectedPrice = req.query.price || "";
    const sortBy = req.query.sort || ""; 

    

   
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const validCategoryIds = categories.map(cat => cat._id.toString());

    

    let searchCondition = {
      isBlocked: false,
      quantity: { $gt: 0 },
      category: { $in: validCategoryIds }, 
      $or: [
        { name: { $regex: query, $options: "i" } }, 
        { description: { $regex: query, $options: "i" } }, 
      ],
    };

   
    const matchedCategory = await Category.findOne({ 
      name: { $regex: query, $options: "i" },
      isListed: true,
      isDeleted: false
    }).lean();

    if (matchedCategory) {
      searchCondition.$or.push({ category: matchedCategory._id });
    }

  
    if (selectedFlavor) {
      searchCondition.flavor = selectedFlavor;
    }

    if (selectedCategory && validCategoryIds.includes(selectedCategory)) {
      searchCondition.category = selectedCategory;
    }

    if (selectedPrice) {
      searchCondition.salePrice = {
        "1500": { $lt: 1500 },
        "2500": { $lt: 2500 },
        "4000": { $lt: 4000 },
        "above4000": { $gt: 4000 }
      }[selectedPrice] || searchCondition.salePrice;
    }

  
    let sortCondition = { createdAt: -1 };
    if (sortBy === "low-to-high") {
      sortCondition = { salePrice: 1 };
    } else if (sortBy === "high-to-low") {
      sortCondition = { salePrice: -1 };
    }

  
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

  
    const product = await Product.find(searchCondition)
      .sort(sortCondition)
      .skip(skip)
      .limit(limit)
      .lean();

    

    const totalProducts = await Product.countDocuments(searchCondition);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("user/shop", {
      user: user ? await User.findById(user).lean() : null,
      product,
      categories, 
      flavors: await Product.distinct("flavor", { 
        isBlocked: false, 
        quantity: { $gt: 0 },
        category: { $in: validCategoryIds }
      }),
      totalProducts,
      currentPage: page,
      totalPages,
      searchQuery: query,
      selectedFlavor,
      selectedCategory,
      selectedPrice,
      selectedSort: sortBy || null 
    });

  } catch (error) {
    console.error("Error in searchProducts:", error);
    res.redirect("/pageNotFound");
  }
};

//------------------------------
const loadAbout=async(req,res)=>{
  try{
    return res.render('user/about')
  }catch(error){
    console.log('something gone wrong');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Server error')
  }
}




  
module.exports ={
    pageNotfound,
    loadHomepage,
    loadSignup,
    loadLogin,
    signup,
    resendOtp,
    verifySignupOtp,
    login,
    logout,
    getVerifyOtp,
    getProductDetail,
    getCategoryPage,
    loadShoppingPage,
    filterProduct,
    searchProducts,
    loadAbout
}
    