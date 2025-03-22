const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const session = require("express-session");
const bcrypt = require("bcrypt");
const HTTP_STATUS=require('../../config/httpStatusCode')

//---------------------------------------------

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
    },
});

transporter.verify((error) => {
    if (error) console.error("Nodemailer connection error:", error);
    else console.log("Nodemailer is ready to send emails!");
});

//-----------------------------------------------------
// Function to send OTP via email
const sendVerificationEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP Code for Password Reset",
            html: `
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; text-align: center;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                  <h2 style="color: #4CAF50;">Account Verification</h2>
                  <p style="font-size: 16px; color: #333;">Hello,</p>
                  <p style="font-size: 16px; color: #333;">Your OTP code is:</p>
                  <h3 style="font-size: 28px; color: #4CAF50; font-weight: bold;">${otp}</h3>
                  <p style="font-size: 16px; color: #333;">It is valid for the next 1 minute.</p>
                  <p style="font-size: 14px; color: #777;">If you did not request this, please ignore this email.</p>
                  <footer style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>Thank you for using our service!</p>
                  </footer>
                </div>
              </body>
            </html>
          `,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};

//------------------------------------------------

const getForget = async (req, res) => {
    try {
        return res.render("user/forgot-password", { messages: "" });
    } catch (error) {
        console.error("Error rendering forgot-password:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server error");
    }
};

//-------------------------------------------------------

const getForgotOtpVerification = (req, res) => {
    if (!req.session.email) {
        return res.redirect('/forgot-password');
    }
    res.render('user/forgot-otp-verification', { email: req.session.email, message: '' });
};


//-------------------------------------------------------
const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email });

        if (!findUser) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Email not found. Please enter a registered email." });
        }

        if (req.session.otpExpiry && Date.now() < req.session.otpExpiry) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "An OTP has already been sent. Please wait before requesting a new one." });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.email = email;
            req.session.otpExpiry = Date.now() + 60000; 
            console.log("OTP:", otp);
           

            return res.status(HTTP_STATUS.OK).json({ success: true, message: "OTP sent successfully.", redirectUrl: "/forgot-otp-verification" });
        } else {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send OTP, please try again." });
        }
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};
//--------------------------------------------------------
// Handle OTP Verification
const verifyOtp = async (req, res) => {
    try {
        const { otp,email } = req.body;

        if (!req.session.userOtp || !req.session.email || !req.session.otpExpiry) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Session expired. Please request a new OTP." });
        }

        if (Date.now() > req.session.otpExpiry) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "OTP expired. Please request a new OTP." });
        }

        if (otp.toString() === req.session.userOtp.toString()) {
            req.session.isVerified = true;
            return res.status(HTTP_STATUS.OK).json({ success: true, message: "OTP verified successfully." });
        } else {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};

//-------------------------------------------------------


const resendForgetOtp = async (req, res) => {
    try {
        const email = req.session.email;
        if (!email) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Session expired. Please request a new OTP." });
        }

       
        if (req.session.otpExpiry && Date.now() < req.session.otpExpiry) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Please wait until the timer ends before resending OTP." });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.otpExpiry = Date.now() + 60000; 

            return res.status(HTTP_STATUS.OK).json({ success: true, message: "New OTP has been sent!" });
        } else {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error in Resend OTP:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};

//------------------------------------------------------------

const getresetPassword = async (req, res) => {
    if (!req.session.isVerified) {
        return res.redirect("/forgot-password");
    }
    res.render("user/reset-password", { messages: "" });
};

//--------------------------------------------------------

const resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const email = req.session.email;

       
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.render("user/reset-password", { 
                messages: { error: "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character." }
            });
        }

        if (newPassword !== confirmPassword) {
            return res.render("user/reset-password", { 
                messages: { error: "Passwords do not match." }
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        req.session.destroy();
        res.redirect('/login')
        
    } catch (error) {
        console.error("Error resetting password:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};
//------------------------------------------------
const getProfile=async(req,res)=>{
    try{
        const userId=req.session.user
        const userData=await User.findById(userId)
      
        
         res.render('user/profile',{
            user:userData,
           
        })
    }catch(error){
        console.error('something went wrong',error)
        res.redirect('/pageNotFound')
    }
}

//------------------------------------------------------
const updateProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const { name, email, phone } = req.body;

        await User.findByIdAndUpdate(userId, { name, email, phone });

        res.status(HTTP_STATUS.OK).json({ success: true, message: "Profile updated successfully!" });
    } catch (error) {
        console.error("Profile update failed:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
    }
};
//----------------------------------------

exports.updateProfile = async (req, res) => {
    try {
        const { id, name, phone } = req.body;

        if (!id || !name || !phone) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "All fields are required" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { name, phone },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User not found" });
        }

        res.status(HTTP_STATUS.OK).json({ success: true, message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
    }
};
//--------------------------------------------


const updatePassword = async (req, res) => {
    try {
        const { id, currentPassword, newPassword } = req.body;

        if (!id || !currentPassword || !newPassword) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: " All fields are required" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User not found" });
        }

       
        if (!user.password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "No password found. Please set a password first." });
        }

     
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Incorrect current password" });
        }

       
        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Weak password: Must be at least 8 characters, contain 1 uppercase letter, and 1 number." });
        }

       
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(HTTP_STATUS.OK).json({ success: true, message: " Password updated successfully!" });
    } catch (error) {
        console.error("Password Update Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
    }
};
//------------------------------------------------------------------







module.exports = {
    getForget,
    forgotEmailValid,
    verifyOtp,
    resendForgetOtp,
    getresetPassword,
    resetPassword,
    getForgotOtpVerification,
    getProfile,
    updateProfile,
    updatePassword,
   
 


   
 

};
