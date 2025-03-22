const Wallet=require('../../models/walletSchema')
const User=require('../../models/userSchema')
const HTTP_STATUS=require('../../config/httpStatusCode')



const getWallets = async (req, res) => {
    try {
        const searchQuery = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        
        let searchFilter = {};
        if (searchQuery.trim()) {
            searchFilter = {
                $or: [
                    { "userId.name": { $regex: searchQuery, $options: "i" } },
                    { "userId.email": { $regex: searchQuery, $options: "i" } } 
                ]
            };
        }

       
        const wallets = await Wallet.find()
            .populate("userId", "name email") 
            .then(wallets => wallets.filter(wallet => 
                wallet.userId && (wallet.userId.name.match(new RegExp(searchQuery, "i")) || 
                wallet.userId.email.match(new RegExp(searchQuery, "i")))
            ));

        const totalWallets = wallets.length;
        const totalPages = Math.ceil(totalWallets / limit);
        const paginatedWallets = wallets.slice(skip, skip + limit);

       
        if (req.headers.accept === "application/json") {
            return res.json({ wallets: paginatedWallets, totalPages, currentPage: page });
        }

       
        res.render("admin/walletDetails", {
            wallets: paginatedWallets,
            totalPages,
            currentPage: page,
            search: searchQuery
        });
    } catch (error) {
        console.error("Error fetching wallets:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};
//---------------------------------
const getWalletTransaction = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search?.trim() || "";

       
        const wallet = await Wallet.findOne({ userId })
            .populate("userId", "name email")
            .lean();

        if (!wallet) return res.status(404).send("Wallet not found");

       
        let transactions = wallet.transactions || [];
        transactions = transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (searchQuery) {
            transactions = transactions.filter(transaction =>
                transaction._id.toString().includes(searchQuery) || 
                transaction.type.toLowerCase().includes(searchQuery.toLowerCase()) 
            );
        }

        
        const totalTransactions = transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        transactions = transactions.slice(skip, skip + limit);

      
        if (req.headers.accept === "application/json") {
            return res.json({ transactions, totalPages, currentPage: page });
        }

      
        res.render("admin/walletTransactions", {
            wallet, transactions, totalPages, currentPage: page, search: searchQuery
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};








module.exports={
    getWallets,
    getWalletTransaction
}