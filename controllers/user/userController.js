const User =require("../../models/userSchema")
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
//---------------------------------------------------
const signup = async (req, res) => {
    try {
      const { name, email, phone, password, confirmPassword } = req.body;
  
     
      const errors = validateInput(name, email, phone, password, confirmPassword);
      if (errors.length > 0) {
        return res.render("user/signup", { messages: { error: errors } });
      }
  
    
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.render("user/signup", { messages: { error: [ERROR_MESSAGES.EMAIL_EXISTS] } });
      }
  
     
      const otp = generateOTP();
      req.session.otpData = { name, email, phone, password, otp, timestamp: Date.now() };
  
      
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).render("user/signup", { messages: { error: [ERROR_MESSAGES.SERVER_ERROR] } });
        }
  
       
        sendOTPEmail(email, otp)
          .then(() => {
            res.render("user/otp-verification", { messages: { success: "OTP sent to your email!" } });
          })
          .catch((error) => {
            console.error("Error sending OTP:", error);
            res.status(500).render("user/signup", { messages: { error: [ERROR_MESSAGES.SERVER_ERROR] } });
          });
      });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).render("user/signup", { messages: { error: [ERROR_MESSAGES.SERVER_ERROR] } });
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
      res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again!" });
    }
  };
    //---------------------------------------------------
 
  const verifyOtp = async (req, res) => {
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
      
      if (user) {
       
        res.render('user/home', { user: user });
      } else {
       
        res.render('user/home', { user: null });
      }
    } catch (error) {
      console.log('Error loading homepage:', error);
      res.status(500).send('Server error');
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

//---------------------------------------------------


  
module.exports ={
    pageNotfound,
    loadHomepage,
    loadSignup,
    loadLogin,
    signup,
    resendOtp,
    verifyOtp,
    login,
    logout,
   
    // handleForgotPassword,
    // verifyForgotPasswordOtp,
    // resetPassword,
    // loadResetPassword,
    // resendForgetotp
}