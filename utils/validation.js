const VALIDATION = {
  NAME: /^[A-Za-z ]{2,}$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^[0-9]{10}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

const ERROR_MESSAGES = {
  REQUIRED: "All fields are required!",
  NAME: "Name can only contain letters and spaces (min 2 characters)!",
  EMAIL: "Invalid email format!",
  PHONE: "Phone number must be exactly 10 digits!",
  PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, number, and special character!",
  CONFIRM_PASSWORD: "Passwords do not match!",
  EMAIL_EXISTS: "Email is already registered!",
  INVALID_OTP: "Invalid or expired OTP!",
  SERVER_ERROR: "Internal Server Error. Please try again!",
};

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Validate input fields
const validateInput = (name, email, phone, password, confirmPassword) => {
  const errors = [];

  
  if (!name || !email || !phone || !password || !confirmPassword) {
    errors.push(ERROR_MESSAGES.REQUIRED);
    return errors; 
  }

  if (!VALIDATION.NAME.test(name.trim())) errors.push(ERROR_MESSAGES.NAME);
  if (!VALIDATION.EMAIL.test(email.trim())) errors.push(ERROR_MESSAGES.EMAIL);
  if (!VALIDATION.PHONE.test(phone.trim())) errors.push(ERROR_MESSAGES.PHONE);
  if (!VALIDATION.PASSWORD.test(password)) errors.push(ERROR_MESSAGES.PASSWORD);
  if (password !== confirmPassword) errors.push(ERROR_MESSAGES.CONFIRM_PASSWORD);

  return errors;
};

module.exports = { generateOTP, validateInput, ERROR_MESSAGES };
