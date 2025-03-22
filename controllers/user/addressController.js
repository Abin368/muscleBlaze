const User = require("../../models/userSchema");
const Address = require('../../models/addressSchema')
const session = require("express-session");
const HTTP_STATUS=require('../../config/httpStatusCode')


const getAddresses = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;
        if (!userId) {
            return res.redirect('/login'); 
        }

        const addresses = await Address.find({ userId: userId });

     
        console.log(addresses);

        res.render('user/addresses', { addresses: addresses });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Internal server error');
    }
};
//---------------------------------------------------------------
const addAddress = async (req, res) => {
    try {
        const { addressType, name, city, landmark, state, district, pincode, phone } = req.body;
        const userId = req.session.user._id;

        if (!addressType || !name || !city || !state || !district || !pincode || !phone) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'All fields are required.' });
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Invalid phone number. It should be 10 digits long.' });
        }

      
        const pincodeRegex = /^[0-9]{6}$/;
        if (!pincodeRegex.test(pincode)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Invalid pincode. It should be 6 digits long.' });
        }

        const user = await Address.findOne({ userId: userId });

        if (!user) {
            const newAddress = new Address({
                userId: userId,
                address: [{
                    addressType,
                    name,
                    city,
                    landmark,
                    state,
                    district,
                    pincode,
                    phone
                }]
            });

            await newAddress.save();
        } else {
            user.address.push({
                addressType,
                name,
                city,
                landmark,
                state,
                district,
                pincode,
                phone
            });

            await user.save();
        }

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Address added successfully.' });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error.' });
    }
};
//----------------------------------------------------------

const deleteAddress= async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.session.user._id;

        
        const user = await Address.findOne({ userId: userId });

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'User not found' });
        }

       
        const addressIndex = user.address.findIndex(address => address._id.toString() === addressId);
        if (addressIndex !== -1) {
            user.address.splice(addressIndex, 1);
            await user.save();
            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Address deleted successfully.' });
        } else {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Address not found' });
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
//----------------------------------------
const getAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        console.log("Fetching Address ID:", addressId);

        const userId = req.session.user?._id;
        if (!userId) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: "User not authenticated" });
        }

        
        const userAddresses = await Address.findOne({ userId });

        if (!userAddresses) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: "User's address not found" });
        }

       
        const address = userAddresses.address.find(addr => addr._id.toString() === addressId);

        if (!address) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: "Address not found" });
        }

        res.status(HTTP_STATUS.OK).json(address);
    } catch (error) {
        console.error("Error fetching address:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }
};



//-----------------------------------------
const updateAddress = async (req, res) => {
    try {
        const { addressType, name, city, landmark, state, district, pincode, phone } = req.body;
        const { addressId } = req.params;

        console.log("Updating Address ID:", addressId);

      
        if (!addressType || !name || !city || !state || !district || !pincode || !phone) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'All fields are required.' });
        }

        if (!/^\d{6}$/.test(pincode)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Invalid pincode format. It should be a 6-digit number.' });
        }

     
        if (!/^\d{10}$/.test(phone)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Invalid phone number format. It should be a 10-digit number.' });
        }

     
        const userId = req.session.user._id;
        const user = await Address.findOne({ userId });

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'User not found' });
        }

        const addressToUpdate = user.address.find(addr => addr._id.toString() === addressId);
        if (!addressToUpdate) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Address not found' });
        }

   
        addressToUpdate.addressType = addressType;
        addressToUpdate.name = name;
        addressToUpdate.city = city;
        addressToUpdate.landmark = landmark;
        addressToUpdate.state = state;
        addressToUpdate.district = district;
        addressToUpdate.pincode = pincode;
        addressToUpdate.phone = phone;

     
        await user.save();

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Address updated successfully', data: addressToUpdate });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
    }
};




//----------------------------------------------------------

module.exports ={
    getAddresses,
    addAddress,
    deleteAddress,
    updateAddress,
    getAddress
}

