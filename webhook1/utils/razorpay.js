// utils/razorpay.js
const Razorpay = require("razorpay");
require("dotenv").config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createPaymentLink({ amount, userName, userEmail, userContact }) {
    const options = {
        amount: amount * 100, // in paise
        currency: "INR",
        accept_partial: false,
        description: `Ticket Booking for ${userName}`,
        customer: {
            name: userName,
            contact: userContact,
            email: userEmail,
        },
        notify: {
            sms: true,
            email: true,
        },
        reminder_enable: true,
        callback_url: "https://yourdomain.com/razorpay-webhook",
        callback_method: "get",
    };

    const response = await razorpayInstance.paymentLink.create(options);
    return response;
}

module.exports = { createPaymentLink };
