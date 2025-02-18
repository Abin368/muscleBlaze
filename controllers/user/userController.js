const User =require("../../models/userSchema")
const Category =require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Banner= require('../../models/bannerSchema')
const bcrypt = require("bcrypt");
const { sendOTPEmail } = require("../../services/emailService");
const { generateOTP,validateInput, ERROR_MESSAGES } = require("../../utils/validation");



const pageNotfound=async(req,res)=>{
    try{
        return res.render('user/pageNotfound')
    }catch(error){
        console.log('something gone wrong');
        res.status(500).send('Server error')
    }
}

//---------------------------------------------------

  

//---------------------------------------------------
const loadSignup=async(req,res)=>{
    try{

        return res.render('user/signup',{messages:{}})

    }catch(error){
        console.log('signup page not found');
        res.status(500).send('Server error')
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
      return res.status(400).json({ success: false, message: errors.join(", ") });
    }

   
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists. Please use a different email." });
    }

    if (req.session.otpExpiry && Date.now() < req.session.otpExpiry) {
      return res.status(400).json({ success: false, message: "An OTP has already been sent. Please wait before requesting a new one." });
    }

    const otp = generateOTP();
    try {
      await sendOTPEmail(email, otp);
    } catch (error) {
      console.error("Error sending OTP:", error);
      return res.status(500).json({ success: false, message: "Failed to send OTP, please try again." });
    }

    req.session.otpData = { name, email, phone, password, otp, timestamp: Date.now() };
    req.session.otpExpiry = Date.now() + 60000; 
    console.log("Generated OTP:", otp);
    // console.log("Redirecting user to: /otp-verification");  

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully. Please verify your email.",
      redirectUrl: "/otp-verification"
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
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
      console.log(newOtp)
  
      res.json({ success: true, message: "New OTP sent to your email!" });
    } catch (error) {
      console.error("Error resending OTP:", error);
      res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again!" });
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
  
     
      const hashedPassword = await bcrypt.hash(otpData.password, 10);
  
      
      const newUser = new User({
        name: otpData.name,
        email: otpData.email,
        phone: otpData.phone,
        password: hashedPassword,
      });
      await newUser.save();
  
     
      req.session.otpData = null;
  
      res.json({ success: true, message: "OTP verified successfully! Redirecting to login..." });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ success: false, message: "Internal Server Error. Please try again!" });
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
    
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.length ? categories.map(category => category._id) : [];

    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categoryIds.length ? categoryIds : undefined },
      quantity: { $gt: 0 }
    });

    productData = productData
      .filter(p => p.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    console.log("User:", user);
   console.log("Banners fetched:", findBanner);
console.log("Type of findBanner:", typeof findBanner);
console.log("findBanner length:", findBanner.length);


    res.render('user/home', { 
      user: user || null, 
      product: productData, 
      banner: findBanner.length ? findBanner : []  
    });

  } catch (error) {
    console.error('Error loading homepage:', error);
    res.status(500).render('user/pageNotfound', { message: 'Something went wrong!' });
  }
};
  //------------------------------------------------------
const logout =  async (req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log('Session destruction error',err)
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
    }
    catch(error){
        console.log('Logout error')
        res.redirect('/pageNotfound')
    }
}

//---------------------------------------------------

const getProductDetail = (req, res) => {
  const productId = req.params.id;

  Product.findById(productId)
      .then((product) => {
          if (!product) {
              return res.redirect('/404'); 
          }
          res.render('user/productDetail', { product, currentPath: req.originalUrl });
      })
      .catch((err) => {
          console.error(err);
          res.redirect('/pageNotfound'); 
      });
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

    console.log("selectedFlavor in controller:", selectedFlavor); 

    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

   
    let productFilter = {
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

   
    const product = await Product.find(productFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalProducts = await Product.countDocuments(productFilter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('user/shop', {
      user: user ? await User.findById(user).lean() : null,
      product,
      categories: await Category.find({ isListed: true }).lean(),
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

    const query = {
      isBlocked: false,
      quantity: { $gt: 0 }
    };

    
    if (category) {
      const findCategory = await Category.findById(category).lean();
      if (findCategory) {
        query.category = findCategory._id;
      }
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

    // Search Filter
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } }
      ];

      const matchedCategory = await Category.findOne({ name: { $regex: searchQuery, $options: "i" } }).lean();
      if (matchedCategory) {
        query.$or.push({ category: matchedCategory._id });
      }
    }

    // Sorting
    let sortCondition = { createdAt: -1 };
    if (sortBy === "low-to-high") {
      sortCondition = { salePrice: 1 };
    } else if (sortBy === "high-to-low") {
      sortCondition = { salePrice: -1 };
    }else if(sortBy === "aA-zZ"){
      sortCondition = {name:1}
    }else if(sortBy === "zZ-aA"){
      sortCondition = {name:-1}
    }

   
    let findProducts = await Product.find(query).sort(sortCondition).lean();

   
    const uniqueFlavors = await Product.distinct("flavor", {
      isBlocked: false,
      quantity: { $gt: 0 }
    });

  
    const categories = await Category.find({ isListed: true }).lean();

    // Pagination
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

    console.log("Selected Flavor in Search Controller:", selectedFlavor);

    const categories = await Category.find({ isListed: true }).lean();

    let searchCondition = {
      isBlocked: false,
      quantity: { $gt: 0 },
      $or: [
        { name: { $regex: query, $options: "i" } }, 
        { description: { $regex: query, $options: "i" } }, 
      ],
    };

    
    const matchedCategory = await Category.findOne({ name: { $regex: query, $options: "i" } }).lean();
    if (matchedCategory) {
      searchCondition.$or.push({ category: matchedCategory._id });
    }

  
    if (selectedFlavor) {
      searchCondition.flavor = selectedFlavor;
    }

    if (selectedCategory) {
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

    // Sorting
    let sortCondition = { createdAt: -1 };
    if (sortBy === "low-to-high") {
      sortCondition = { salePrice: 1 };
    } else if (sortBy === "high-to-low") {
      sortCondition = { salePrice: -1 };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    // Fetch Products
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
      flavors: await Product.distinct("flavor", { isBlocked: false, quantity: { $gt: 0 } }),
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
    searchProducts
}
    