const Category = require("../models/categorySchema");

const getPaginatedCategories = async (search = "", page = 1, limit = 4) => {
    const skip = (page - 1) * limit;

    // Add the isDeleted filter to the query
    const query = {
        name: { $regex: ".*" + search + ".*", $options: "i" },
        isDeleted: false // Only fetch categories where isDeleted is false
    };

    // Fetch category data with the filter
    const categoryData = await Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // Count total categories based on the filter
    const totalCategories = await Category.countDocuments(query);

    // Calculate total pages
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
