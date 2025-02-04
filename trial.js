// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>OTP Verification</title>
//   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
//   <style>
//     /* General Reset */
//     * {
//       margin: 0;
//       padding: 0;
//       box-sizing: border-box;
//     }

//     body {
//       font-family: 'Poppins', sans-serif;
//       background: linear-gradient(135deg, #000000, #333333); /* Black gradient background */
//       display: flex;
//       justify-content: center;
//       align-items: center;
//       height: 100vh;
//       color: #fff;
//     }

//     .otp-container {
//       background: rgba(255, 255, 255, 0.1); /* Semi-transparent white background */
//       backdrop-filter: blur(10px);
//       border-radius: 20px;
//       padding: 40px;
//       width: 100%;
//       max-width: 400px;
//       text-align: center;
//       box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
//       animation: fadeIn 1s ease-in-out;
//     }

//     .otp-container h2 {
//       font-size: 24px;
//       margin-bottom: 20px;
//       color: #ffcc00; /* Yellow heading */
//     }

//     .otp-container p {
//       font-size: 14px;
//       margin-bottom: 30px;
//       color: #e0e0e0; /* Light gray text */
//     }

//     .otp-inputs {
//       display: flex;
//       justify-content: space-between;
//       margin-bottom: 30px;
//     }

//     .otp-inputs input {
//       width: 50px;
//       height: 50px;
//       text-align: center;
//       font-size: 20px;
//       border: 2px solid rgba(255, 255, 255, 0.3); /* White border */
//       border-radius: 10px;
//       background: transparent;
//       color: #fff; /* White text */
//       outline: none;
//       transition: all 0.3s ease;
//     }

//     .otp-inputs input:focus {
//       border-color: #ffcc00; /* Yellow border on focus */
//       transform: scale(1.1);
//     }

//     .otp-container button {
//       width: 100%;
//       padding: 15px;
//       background: #ffcc00; /* Yellow button */
//       border: none;
//       border-radius: 10px;
//       color: #000; /* Black text */
//       font-size: 16px;
//       font-weight: bold;
//       cursor: pointer;
//       transition: background 0.3s ease;
//     }

//     .otp-container button:hover {
//       background: #e6b800; /* Darker yellow on hover */
//     }

//     .otp-container .resend-otp {
//       margin-top: 20px;
//       font-size: 14px;
//       color: #e0e0e0; /* Light gray text */
//     }

//     .otp-container .resend-otp a {
//       color: #ffcc00; /* Yellow link */
//       text-decoration: none;
//       font-weight: bold;
//     }

//     .otp-container .resend-otp a:hover {
//       text-decoration: underline;
//     }

//     /* Animations */
//     @keyframes fadeIn {
//       from {
//         opacity: 0;
//         transform: translateY(-20px);
//       }
//       to {
//         opacity: 1;
//         transform: translateY(0);
//       }
//     }
//   </style>
// </head>
// <body>
//   <div class="otp-container">
//     <h2>OTP Verification</h2>
//     <p>Enter the 6-digit OTP sent to your email.</p>

//     <form action="/verify-otp" method="POST">
//       <div class="otp-inputs">
//         <input type="text" name="otp1" maxlength="1" required autofocus>
//         <input type="text" name="otp2" maxlength="1" required>
//         <input type="text" name="otp3" maxlength="1" required>
//         <input type="text" name="otp4" maxlength="1" required>
//         <input type="text" name="otp5" maxlength="1" required>
//         <input type="text" name="otp6" maxlength="1" required>
//       </div>

//       <button type="submit">Verify OTP</button>
//     </form>

//     <div class="resend-otp">
//       Didn't receive the OTP? <a href="/otp-verification">Resend OTP</a>
//     </div>
//   </div>

//   <script>
//     // Auto-focus the next input field
//     const inputs = document.querySelectorAll('.otp-inputs input');
//     inputs.forEach((input, index) => {
//       input.addEventListener('input', () => {
//         if (input.value.length === 1 && index < inputs.length - 1) {
//           inputs[index + 1].focus();
//         }
//       });

//       input.addEventListener('keydown', (e) => {
//         if (e.key === 'Backspace' && index > 0 && input.value.length === 0) {
//           inputs[index - 1].focus();
//         }
//       });
//     });
//   </script>
// </body>
// </html>

//--------------------------------------------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------
const categoryInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const { categoryData, totalCategories, totalPages } = await getPaginatedCategories(search, page, limit);

        res.render("admin/categoryDetails", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            search: search
        });

    } catch (error) {
        console.error(error);
        res.redirect('pageerror');
    }
};

//--------------------------------------------------------------
const addCategory = async (req, res) => {
    const { name, description } = req.body;
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    try {
        // Check if category exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            const { categoryData, totalCategories, totalPages } = await getPaginatedCategories(search, page, limit);
            return res.render('admin/categoryDetails', {
                error: true,
                message: 'Category already exists',
                search: search,
                cat: categoryData,
                currentPage: page,
                totalPages: totalPages,
                totalCategories: totalCategories
            });
        }

        // Save new category
        const newCategory = new Category({ name, description });
        await newCategory.save();

        // Fetch updated categories
        const { categoryData, totalCategories, totalPages } = await getPaginatedCategories(search, page, limit);

        return res.render('admin/categoryDetails', {
            error: false,
            message: 'Category added successfully',
            search: search,
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error(error);
        return res.render('admin/categoryDetails', {
            error: true,
            message: 'An error occurred while adding the category',
            search: search,
            cat: []
        });
    }
};