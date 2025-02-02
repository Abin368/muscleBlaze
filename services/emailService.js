
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL, 
    pass: process.env.NODEMAILER_PASSWORD, 
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: email,
    subject: "Your OTP Code for Account Verification",
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

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };