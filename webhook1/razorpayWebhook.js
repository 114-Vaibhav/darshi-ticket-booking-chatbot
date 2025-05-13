// webhook/razorpayWebhook.js
const express = require("express");
const router = express.Router();

router.get("/razorpay-webhook", async (req, res) => {
    const paymentStatus = req.query.razorpay_payment_link_status;
    const paymentId = req.query.razorpay_payment_id;

    if (paymentStatus === "paid") {
        // TODO: Fetch user/ticket details from DB based on payment ID
        // Send confirmation email/chat message
        console.log("Payment successful:", paymentId);

        // OPTIONAL: Trigger Dialogflow or email API to send the ticket
    }

    return res.sendStatus(200);
});

module.exports = router;
