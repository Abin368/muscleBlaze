const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const session = require("express-session");
const bcrypt = require("bcrypt");
const HTTP_STATUS=require('../../config/httpStatusCode')


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
//------------------------------
const getemailChange = async (req, res) => {
    try {
        return res.render("user/email-change", { messages: "" });
    } catch (error) {
        console.error("Error rendering forgot-password:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server error");
    }
};
//----------------------------------------

const getEmailOtpVerification = (req, res) => {
    if (!req.session.email) {
        return res.redirect('/email-change');
    }
    res.render('user/emailChange-otp-verification', { email: req.session.email, message: '' });
};

//------------------------------------
const changeEmailValid = async (req, res) => {
    try {
        
 

        const { email } = req.body;
        const findUser = await User.findOne({ email });
       

       
        if (findUser && findUser.email !== req.session.email) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "This email is already registered. Please enter a unique email." });
        }

       
        if (req.session.otpExpiry && Date.now() < req.session.otpExpiry) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "An OTP has already been sent. Please wait before requesting a new one." });
        }

     
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        console.log(otp);
      

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.email = email;
            req.session.otpExpiry = Date.now() + 60000; 
            console.log(email)

            return res.status(HTTP_STATUS.OK).json({ success: true, message: "OTP sent successfully.", redirectUrl: "/emailChange-otp-verification" });
        } else {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send OTP, please try again." });
        }
    } catch (error) {
        console.error("Error in changeEmailValid:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};
//-------------------------------------------------------
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.session.user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "User session expired. Please log in again." });
        }

        const userId = req.session.user._id; 
        console.log("User ID from session:", userId);

        if (!userId) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "User not logged in." });
        }

        if (!req.session.userOtp || !req.session.email || !req.session.otpExpiry) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Session expired. Please request a new OTP." });
        }

        if (Date.now() > req.session.otpExpiry) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "OTP expired. Please request a new OTP." });
        }

        if (otp.toString() === req.session.userOtp.toString()) {
         
            const newEmail = req.session.email;  
            console.log("New email to update:", newEmail);

         
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { email: newEmail },  
                { new: true } 
            );

            if (!updatedUser) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User not found." });
            }

            req.session.user.email = updatedUser.email;

           
            req.session.userOtp = null;
            req.session.otpExpiry = null;
            req.session.isVerified = true;

            console.log("Updated email in session:", req.session.user.email);
            console.log("Updated email in database:", updatedUser.email);

            return res.status(HTTP_STATUS.OK).json({ success: true, message: "OTP verified successfully. Email updated." });
        } else {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};



//---------------------------------
const resendEmailOtp = async (req, res) => {
    try {
        const email = req.session.email;  // Get email from session
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
            req.session.otpExpiry = Date.now() + 60000;  // 1 minute expiry

            return res.status(HTTP_STATUS.OK).json({ success: true, message: "New OTP has been sent!" });
        } else {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error in Resend OTP:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};


module.exports={
    getemailChange,
    getEmailOtpVerification,
    changeEmailValid,
    verifyOtp,
    resendEmailOtp
}