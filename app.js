const express = require('express');
require('dotenv').config(); 
const session = require('express-session');
// const flash = require('connect-flash');
const passport = require("./config/passport");
const app = express();
const path = require('path');
const connectDB = require('./config/db'); 
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
connectDB(); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));
// app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// app.use((req, res, next) => {
//     res.locals.success = req.flash('success');
//     res.locals.error = req.flash('error');
//     next();
// });

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.admin = req.session.admin || null; // Add admin session to locals
    next();
});


// app.set('views', [
//     path.join(__dirname, 'views/user'),
//     path.join(__dirname, 'views/admin')
// ]);

app.set('view engine', 'ejs');


 // app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', userRouter);
app.use('/', adminRouter); // Admin routes

app.get('*', (req, res) => {
    if (req.session.admin) {
        return res.render('admin/dashboard', { username: req.session.admin });
    } else if (req.session.user) {
        return res.render('user/home', { username: req.session.user });
    } else {
        return res.redirect('/pageNotfound');
    }
});


const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
