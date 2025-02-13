const Banner= require('../models/bannerSchema')

const loadBanners = async (req, res, next) => {
    try {
        res.locals.banner = await Banner.find();  // Store banner data globally
    } catch (error) {
        console.error("Error fetching banners:", error);
        res.locals.banner = [];
    }
    next();
};

module.exports = {
    loadBanners
}