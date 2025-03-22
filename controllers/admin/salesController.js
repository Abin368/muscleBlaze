const ExcelJS = require("exceljs");

const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");



//---------------------------------
// const getSalesReport = async (req, res) => {
//     try {
//         let { filter, startDate, endDate } = req.query;

//         let matchStage = {};
//         if (filter === "daily") {
//             matchStage.createdAt = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
//         } else if (filter === "weekly") {
//             let weekAgo = new Date();
//             weekAgo.setDate(weekAgo.getDate() - 7);
//             matchStage.createdAt = { $gte: weekAgo };
//         } else if (filter === "monthly") {
//             let monthAgo = new Date();
//             monthAgo.setMonth(monthAgo.getMonth() - 1);
//             matchStage.createdAt = { $gte: monthAgo };
//         } else if (filter === "custom" && startDate && endDate) {
//             matchStage.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
//         }

//         const salesData = await Order.aggregate([
//             { $match: matchStage },
//             { $group: {
//                 _id: null,
//                 totalOrders: { $sum: 1 },
//                 totalAmount: { $sum: "$totalAmount" },
//                 totalDiscount: { $sum: "$discount" }
//             }},
//             { $project: { _id: 0 } }
//         ]);

//         res.json(salesData[0] || { totalOrders: 0, totalAmount: 0, totalDiscount: 0 });
//     } catch (error) {
//         res.status(500).json({ message: "Error fetching sales report", error });
//     }
// };
//-------------------------------------------------
// const downloadSalesReport = async (req, res) => {
//     try {
//         let { filter, startDate, endDate } = req.query;

//         const salesData = await Order.aggregate([
//             { $match: matchStage },
//             { $group: {
//                 _id: null,
//                 totalOrders: { $sum: 1 },
//                 totalAmount: { $sum: "$totalAmount" },
//                 totalDiscount: { $sum: "$discount" }
//             }},
//             { $project: { _id: 0 } }
//         ]);

//         const doc = new PDFDocument();
//         const fileName = `sales_report_${Date.now()}.pdf`;
//         const filePath = `./public/reports/${fileName}`;
//         const stream = fs.createWriteStream(filePath);
//         doc.pipe(stream);

//         doc.fontSize(16).text("Sales Report", { align: "center" });
//         doc.moveDown();
//         doc.fontSize(12).text(`Filter: ${filter.toUpperCase()}`);
//         doc.text(`Total Orders: ${salesData[0]?.totalOrders || 0}`);
//         doc.text(`Total Amount: ₹${salesData[0]?.totalAmount || 0}`);
//         doc.text(`Total Discount: ₹${salesData[0]?.totalDiscount || 0}`);

//         doc.end();
//         stream.on("finish", () => {
//             res.download(filePath);
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Error generating PDF", error });
//     }
// };

//-------------------------------------------------
// const downloadSalesReportExcel = async (req, res) => {
//     try {
//         let { filter, startDate, endDate } = req.query;

//         let matchStage = {};
//         if (filter === "daily") {
//             matchStage.createdAt = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
//         } else if (filter === "weekly") {
//             let weekAgo = new Date();
//             weekAgo.setDate(weekAgo.getDate() - 7);
//             matchStage.createdAt = { $gte: weekAgo };
//         } else if (filter === "monthly") {
//             let monthAgo = new Date();
//             monthAgo.setMonth(monthAgo.getMonth() - 1);
//             matchStage.createdAt = { $gte: monthAgo };
//         } else if (filter === "custom" && startDate && endDate) {
//             matchStage.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
//         }

//         const salesData = await Order.aggregate([
//             { $match: matchStage },
//             { $group: {
//                 _id: null,
//                 totalOrders: { $sum: 1 },
//                 totalAmount: { $sum: "$totalAmount" },
//                 totalDiscount: { $sum: "$discount" }
//             }},
//             { $project: { _id: 0 } }
//         ]);

//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet("Sales Report");

//         worksheet.columns = [
//             { header: "Filter", key: "filter", width: 20 },
//             { header: "Total Orders", key: "totalOrders", width: 15 },
//             { header: "Total Amount (₹)", key: "totalAmount", width: 20 },
//             { header: "Total Discount (₹)", key: "totalDiscount", width: 20 }
//         ];

//         worksheet.addRow({
//             filter: filter.toUpperCase(),
//             totalOrders: salesData[0]?.totalOrders || 0,
//             totalAmount: salesData[0]?.totalAmount || 0,
//             totalDiscount: salesData[0]?.totalDiscount || 0
//         });

//         const fileName = `sales_report_${Date.now()}.xlsx`;
//         const filePath = `./public/reports/${fileName}`;
//         await workbook.xlsx.writeFile(filePath);

//         res.download(filePath);
//     } catch (error) {
//         res.status(500).json({ message: "Error generating Excel report", error });
//     }
// };


module.exports={
  
    // downloadSalesReportExcel,
    // getSalesReport,
    // downloadSalesReport 
}