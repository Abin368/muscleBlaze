const Category = require("../models/categorySchema");

const getPaginatedCategories = async (search = "", page = 1, limit = 4) => {
    const skip = (page - 1) * limit;

   
    const query = {
        name: { $regex: ".*" + search + ".*", $options: "i" },
        isDeleted: false 
    };

   
    const categoryData = await Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

   
    const totalCategories = await Category.countDocuments(query);

   
    const totalPages = Math.ceil(totalCategories / limit);

    return {
        categoryData,
        totalCategories,
        totalPages
    };
};

module.exports = {
    getPaginatedCategories
};
