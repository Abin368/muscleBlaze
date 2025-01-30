const express = require('express');
require('dotenv').config(); 

const app = express();
const connectDB = require('./config/db'); 

connectDB(); 

const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
