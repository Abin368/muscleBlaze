const User =require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

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

//admin get to dashboard
const loadDashboard = async (req, res) => {
    try {
      
        const admin = req.session.admin;

        if (admin) {
            return res.render('admin/dashboard', { admin: admin });
        } else {
           
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.log('Error loading dashboard:', error);
        return res.status(500).send('Server error');
    }
};

//----------------------------------------------

//admin logout
const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log('Session destruction error', err);
                return res.redirect('/pageNotFound');
            }

            console.log('Session destroyed successfully'); 

            
            res.clearCookie('connect.sid'); 

            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

           
            return res.redirect('/admin/login');
        });
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
    logout
}