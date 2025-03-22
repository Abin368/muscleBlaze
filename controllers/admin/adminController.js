const User =require('../../models/userSchema')
const mongoose = require('mongoose')
const Wallet = require("../../models/walletSchema");
const Order = require("../../models/orderSchema");
const Category = require("../../models/categorySchema");
const bcrypt = require('bcrypt')
const HTTP_STATUS=require('../../config/httpStatusCode')

const loadLogin = async (req, res) => {
    try {
        if (req.session.admin) {
          
            return res.redirect('/admin/dashboard');
        } else {
           
            return res.render('admin/login', { error: null }); 
        }
    } catch (error) {
        console.log('Login failed:', error.message); 
        return res.redirect('/pagerror'); 
    }

};
//--------------------------------------------------------------
//admin signin and verification

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const findAdmin = await User.findOne({ email: email, isAdmin: true });

     
        if (!findAdmin) {
            return res.render('admin/login', { message: 'Admin not found', error: true });
        }

        if (findAdmin.isBlocked) {
            return res.render('admin/login', { message: 'Admin Blocked', error: true });
        }

     
        const passwordMatch = await bcrypt.compare(password, findAdmin.password);
        if (!passwordMatch) {
            return res.render('admin/login', { message: 'Incorrect Password', error: true });
        }
        req.session.admin = {
            _id: findAdmin._id,
            username: findAdmin.name,
            email: findAdmin.email
        };

        return res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        return res.render('admin/login', { message: 'Login failed. Please try again later', error: true });
    }
};
//----------------------------------------------


const loadDashboard = async (req, res) => {
    try {
        const admin = req.session.admin;
        if (!admin) return res.redirect('/admin/login');

        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const orders = await Order.find();

        let totalSales = 0, totalRefund = 0, totalCancellations = 0, totalReturns = 0;

        orders.forEach(order => {
            order.orderItems.forEach(item => {
                if (item.status === "Cancelled" || item.status === "Returned") {
                    totalRefund += item.price;
                    if (item.status === "Cancelled") totalCancellations += item.price;
                    else if (item.status === "Returned") totalReturns += item.price;
                } else {
                    totalSales += item.price;
                }
            });
        });

        const walletTransactionResult = await Wallet.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const walletTransactions = walletTransactionResult.length ? walletTransactionResult[0].total : 0;

        const currentYear = new Date().getFullYear();
       const monthlySales = await Order.aggregate([
    {
        $match: {
            createdAt: {
                $gte: new Date(`${currentYear}-01-01`), 
                $lte: new Date() 
            }
        }
    },
    {
        $unwind: "$orderItems"
    },
    {
        $group: {
            _id: { $month: "$createdAt" }, 
            total: { $sum: "$orderItems.price" } 
        }
    },
    {
        $sort: { _id: 1 } 
    }
]);



const topProductSales = await Order.aggregate([
    { $unwind: "$orderItems" },  
    { 
        $group: { 
            _id: "$orderItems.product",  
            totalSold: { $sum: "$orderItems.quantity" }
        } 
    },
    { $sort: { totalSold: -1 } }, 
    { $limit: 5 }, 
    { 
        $lookup: {  
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
        }
    },
    { $unwind: "$productDetails" }, 
    {
        $project: {  
            _id: 1,
            totalSold: 1,
            productName: "$productDetails.productName" 
            
        }
    }
]);



const topCategorySales = await Order.aggregate([
    { $unwind: "$orderItems" }, 
    { 
        $lookup: {
            from: "products",
            localField: "orderItems.product",
            foreignField: "_id",
            as: "productDetails"
        }
    },
    { $unwind: "$productDetails" },
    { 
        $group: { 
            _id: "$productDetails.category",  
            totalSold: { $sum: "$orderItems.quantity" }
        } 
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 }
]);
//--------------

//----------



const categoryIds = topCategorySales.map(cat => cat._id); 

const categories = await Category.find({ _id: { $in: categoryIds } }).select("name");


const categoryMap = {};
categories.forEach(cat => {
    categoryMap[cat._id] = cat.name;
});


topCategorySales.forEach(cat => {
    cat._id = categoryMap[cat._id] || "Unknown Category"; 
});
      

        return res.render("admin/dashboard", { 
            admin, totalUsers, totalOrders, totalSales, totalRefund, totalCancellations, totalReturns, walletTransactions, 
            monthlySales,currentYear,topProductSales,topCategorySales
        });

    } catch (error) {
        console.log('Error loading dashboard:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Server error');
    }
};


//----------------------------------------------
const salesReport = async (req, res) => {
    try {
        const { start, end, filter } = req.query;
        let filterCondition = {
            status: { $in: ["Delivered", "Returned", "Partially Returned"] } 
        };

        if (start && end) {
            filterCondition.createdAt = {
                $gte: new Date(start),
                $lte: new Date(end)
            };
        }

        const orders = await Order.find(filterCondition)
            .populate('userId', 'name')
            .sort({ createdAt: -1 });

        const salesData = orders.map(order => ({
            orderId: order.orderId,
            date: order.createdAt,
            customer: order.userId?.name || "Unknown",
            status: order.status,
            totalAmount: order.finalAmount,
            paymentMethod: order.paymentMethod
        }));

        res.json(salesData);
    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
};




//------------------------------------------


const logout = async (req, res) => {
    try {
        if (req.session.admin) {
            delete req.session.admin; 
            await req.session.save();
        }

        console.log('Admin session cleared successfully');
        return res.redirect('/admin/login');
    } catch (error) {
        console.log('Logout error:', error);
        res.redirect('/pageerror');
    }
};



//----------------------------------------------




//----------------------------------------------
module.exports ={
    loadLogin,
    login,
    loadDashboard,
    logout,
    salesReport
}