const User = require("../../models/userSchema");
const nodemailer = require('nodemailer');
const env = require('dotenv').config();
const session = require('express-session');
const bcrypt = require("bcrypt");
//---------------------------------------------
function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
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
                  <p style="font-size: 16px; color: #333;">It is valid for the next 5 minutes.</p>
                  <p style="font-size: 14px; color: #777;">If you did not request this, please ignore this email.</p>
                  <footer style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>Thank you for using our service!</p>
                  </footer>
                </div>
              </body>
            </html>
          `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};
//------------------------------------------------
const getForget = async (req, res) => {
    try {
        return res.render('user/forgot-password', { messages: '' });
    } catch (error) {
        console.log('something gone wrong');
        res.status(500).send('Server error');
    }
};
//-------------------------------------------------------
const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email });

        if (!findUser) {
            return res.render('user/forgot-password', {
                messages: { error: "Email not found. Please enter a registered email." },
            });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.email = email;
            req.session.otpExpiry = Date.now() + 300000; 
            console.log("OTP:", otp);

            return res.render('user/forgot-otp-verification', { email, message: '' });
        } else {
            return res.render('user/forgot-password', {
                messages: { error: "Failed to send OTP, please try again" },
            });
        }
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        res.redirect('/pageNotFound');
    }
};
//--------------------------------------------------------
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.session.userOtp || !req.session.email || !req.session.otpExpiry) {
            return res.status(400).json({ success: false, message: "Session expired. Please request a new OTP." });
        }

        if (Date.now() > req.session.otpExpiry) {
            return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
        }

        if (otp.toString() === req.session.userOtp.toString()) {
            req.session.isVerified = true;
            return res.status(200).json({ success: true, message: "OTP verified successfully." });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
//-------------------------------------------------------
const resendForgetOtp = async (req, res) => {
    try {
        
        const email = req.session.email;
        if (!email) {
            console.log("Session expired - No email found in session."); 
            return res.status(400).json({ success: false, message: "Session expired. Please request a new OTP." });
        }

        const otp = generateOtp();
        console.log("Generated OTP:", otp); 

        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp.toString(); 
            req.session.otpExpiry = Date.now() + 300000; 
            console.log("OTP sent successfully to:", email);
            return res.status(200).json({ success: true, message: "OTP resent successfully." });
        } else {
            console.log("Failed to send OTP email.");
            return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error in Resend OTP:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
//------------------------------------------------------------
const getresetPassword = async (req, res) => {
    if (!req.session.isVerified) {
        return res.redirect('/forgot-password');
    }
    res.render('user/reset-password', { messages: '' });
};
//--------------------------------------------------------
const resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const email = req.session.email;

        if (newPassword !== confirmPassword) {
            return res.render('user/reset-password', { messages: { error: "Passwords do not match." } });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        req.session.destroy(); 
        return res.render('user/login', { messages: { success: "Password reset successfully. Please login." } });
    } catch (error) {
        console.error("Error resetting password:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


module.exports = {
    getForget,
    forgotEmailValid,
    verifyOtp,
    resendForgetOtp,
    getresetPassword,
    resetPassword

};