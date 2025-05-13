
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

let gstate, gplace, gdistrict;


const intentHandlers = {
    WelcomeIntent: (agent) => {
        console.log("Handling WelcomeIntent");
        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;
        if (!userEmail) {
            agent.add("🔐 Please login first to book ticket, show ticket or get history.");
            return;
        }

        return new Promise((resolve) => {
            const query = "SELECT DISTINCT state FROM parks";
            db.query(query, (err, results) => {
                if (err) {
                    console.error("❌ MySQL Error:", err);
                    agent.add("Sorry, I couldn’t fetch the states at the moment.");
                    return resolve();
                }
                const states = results.map(row => row.state).join(", ");
                console.log("Fetched states:", states);
                agent.context.set({ name: "awaiting_state", lifespan: 5 }); // added context
                agent.add(`Welcome! ${user.name} Please choose a state from the following: ${states}`);
                resolve();
            });
        });
    },

    SelectStateIntent: (agent) => {
        console.log("Handling SelectStateIntent");
        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;
        if (!userEmail) {
            agent.add("🔐 Please login first to book ticket, show ticket or get history.");
            return;
        }
        return new Promise((resolve) => {
            const state = agent.parameters.indian_state;
            console.log("State selected:", state);
            gstate = state;
            agent.context.set({ name: "awaiting_district", lifespan: 5, parameters: { state } });

            const query = "SELECT DISTINCT district FROM parks WHERE state = ?";
            db.query(query, [state], (err, results) => {
                if (err) {
                    console.error("❌ MySQL Error:", err);
                    agent.add("Sorry, I couldn’t fetch districts.");
                    return resolve();
                }
                const districts = results.map(row => row.district).join(", ");
                console.log("Fetched districts:", districts);
                agent.add(`${user.name}, Select a district: ${districts}`);
                resolve();
            });
        });
    },

    SelectDistrictIntent: (agent) => {
        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;
        if (!userEmail) {
            agent.add("🔐 Please login first to book ticket, show ticket or get history.");
            return;
        }
        console.log("Handling SelectDistrictIntent");
        return new Promise((resolve) => {
            const { state } = agent.context.get('awaiting_district').parameters;
            const district = agent.parameters.district;
            console.log("State:", state, "District selected:", district);
            gdistrict = district;
            agent.context.set({ name: "select_place_type-followup", lifespan: 5, parameters: { state, district } });

            const query = "SELECT DISTINCT name, category FROM parks WHERE state = ? AND district = ?";
            db.query(query, [state, district], (err, results) => {
                if (err) {
                    console.error("❌ MySQL Error:", err);
                    agent.add("Sorry, I couldn’t fetch places.");
                    return resolve();
                }

                const names = results.map(row => `${row.name} (${row.category})`).join(", ");
                console.log("Fetched place names:", names);
                agent.add(`Please ${user.name} select a place (Museum or Park) from: ${names}`);
                resolve();
            });
        });
    },

    SelectPlaceIntent: (agent) => {
        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;
        if (!userEmail) {
            agent.add("🔐 Please login first to book ticket, show ticket or get history.");
            return;
        }
        console.log("Handling SelectPlaceIntent");
        const place = agent.parameters['place-name'];
        console.log("Place selected:", place);
        gplace = place;
        agent.context.set({ name: "ticket_count", lifespan: 5, parameters: { place } });
        agent.add(` ${user.name}, How many adults and children with you? Please reply like: 2 adults and 3 children`);
    },

    ticket_count: (agent) => {
        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;
        if (!userEmail) {
            agent.add("🔐 Please login first to book ticket, show ticket or get history.");
            return;
        }
        console.log("Handling ticket_count Intent");
        return new Promise((resolve) => {
            const { place } = agent.context.get('ticket_count').parameters;
            console.log("Ticket count parameters: ")
            console.log(agent.parameters)
            // const adults = agent.parameters.adults || 0;
            // const children = agent.parameters.children || 0;
            // Extract the 'number' and 'ticket-type' parameters from the agent's parameters

            // Get parameters directly from agent
            const number = agent.parameters.number || [];
            const ticketType = agent.parameters['ticket-type'] || [];

            let adults = 0;
            let children = 0;

            console.log("ticket type............................................................................. is adultaaa");

            if (ticketType && ticketType.length > 0) {
                console.log("Processing ticket types:", ticketType);

                // Process all ticket types, not just the first one
                for (let i = 0; i < ticketType.length; i++) {
                    const type = ticketType[i]?.toLowerCase().trim();
                    const count = number[i] || 0;

                    if (type === 'adult') {
                        console.log(`Found ${count} adults`);
                        adults = count;
                    } else if (type === 'child') {
                        console.log(`Found ${count} children`);
                        children = count;
                    }
                }
            } else {
                console.log("ticketType is empty or undefined");
            }

            console.log(`Place: ${place}, Adults: ${adults}, Children: ${children}`);

            const query = "SELECT * FROM parks WHERE name = ?";
            db.query(query, [place], (err, results) => {
                if (err || results.length === 0) {
                    console.error("❌ MySQL Error or No Results:", err);
                    agent.add("Could not find the place.");
                    return resolve();
                }

                const row = results[0];
                const total = adults * row.chargesAdults + children * row.chargesChildren;

                const ticketInfo = {
                    place,
                    adults,
                    children,
                    adult_price: row.chargesAdults,
                    child_price: row.chargesChildren,
                    total,

                };

                agent.context.set({ name: "confirm_booking-followup", lifespan: 5, parameters: ticketInfo });

                console.log(`Total calculated: ₹${total}`);
                agent.add(`${user.name}, Confirm booking for ${place}?\nAdults: ${adults}, Children: ${children}\nTotal: ₹${total}`);
                resolve();
            });
        });
    },





    ConfirmBookingIntent: (agent) => {
        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;
        if (!userEmail) {
            agent.add("🔐 Please login first to book ticket, show ticket or get history.");
            return;
        }

        const {
            place, adults, children, adult_price, child_price, total, date
        } = agent.context.get('confirm_booking-followup')?.parameters || {};

        const userName = user.name || 'Anonymous';
        const gstate = agent.context.get('booking_context')?.parameters?.gstate || 'Not specified';
        const gdistrict = agent.context.get('booking_context')?.parameters?.gdistrict || 'Not specified';

        const bookingData = {
            place, adults, children, adult_price, child_price, total, date, gstate, gdistrict, userName, userEmail
        };

        // Store data in output context to be used in next intent
        agent.context.set({
            name: 'booking_confirmed',
            lifespan: 5,
            parameters: bookingData
        });

        const dummyLink = `https://dummy-payment.com/pay-now?bookingId=${Math.floor(Math.random() * 100000)}`;
        agent.add(`🧾 *Please pay ₹${total} to confirm your booking.*\n\n🔗 Payment Link: ${dummyLink}\n\nAfter payment, type *"Payment done"* or click the link and return.`);

        // END of this intent
    },


    PaymentSuccessIntent: (agent) => {
        const {
            place, adults, children, adult_price, child_price, total,
            date, userName, userEmail
        } = agent.context.get('booking_confirmed')?.parameters || {};
        console.log("Payment intent inside")
        const now = new Date();
        const bookingId = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const bookingDate = now.toISOString().slice(0, 10);
        const visitDate = date || bookingDate;
        const paymentId = "pay_" + Math.random().toString(36).substring(2, 10);

        return new Promise((resolve) => {
            const insertQuery = `
            INSERT INTO ticket_details (
                booking_id, booking_date, visit_date, state, district,
                place_name, adult_count, adult_price, child_count,
                child_price, total_paid, user_name, user_email,
                payment_id, payment_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

            db.query(insertQuery, [
                bookingId, bookingDate, visitDate, gstate, gdistrict,
                place, adults, adult_price, children, child_price, total,
                userName, userEmail, paymentId, 'Paid'
            ], (err) => {
                if (err) {
                    console.error("❌ MySQL Error:", err);
                    agent.add("❌ Booking failed after payment.");
                    return resolve();
                }

                //                 const ticket = `
                // ✅ *Booking Confirmed!* ✅

                // 🔖 *Booking ID:* ${bookingId}  
                // 💳 *Payment ID:* ${paymentId}  
                // 💰 *Paid:* ₹${total}  
                // 📅 *Booked On:* ${bookingDate}  
                // 📅 *Visit Date:* ${visitDate}  
                // 🌍 *State:* ${gstate}  
                // 🏙️ *District:* ${gdistrict}  
                // 📍 *Place:* ${place}  
                // 👨‍👩‍👧 *Visitors:* ${adults} Adults × ₹${adult_price}, ${children} Children × ₹${child_price}  
                // 🙋 *User:* ${userName} (${userEmail})  

                // 🎉 Thank you for your booking!
                //             `;

                const ticket = `
    ✅ *Booking Confirmed!* ✅

    ┌────────────────────────────────────────────────────────────┐
    │ 🔖 *Booking ID*     │ ${bookingId}                         │
    ├────────────────────────────────────────────────────────────┤
    │ 🔖 *Payment ID*     │ ${paymentId}                         │
    ├────────────────────────────────────────────────────────────┤
    │ 📅 *Booked On*      │ ${bookingDate}                       │
    ├────────────────────────────────────────────────────────────┤
    │ 🌍 *Visit Place*    │ ${place}                             │
    ├────────────────────────────────────────────────────────────┤
    │ 📅 *Visit Date*     │ ${visitDate}                         │
    ├────────────────────────────────────────────────────────────┤
    │ 🏙️ *State*         │ ${gstate}                             │
    ├────────────────────────────────────────────────────────────┤
    │ 🏘️ *District*      │ ${gdistrict}                          │
    ├────────────────────────────────────────────────────────────┤
    │ 👨‍🦰 *Adults*        │ ${adults} × ₹${adult_price}                │
    ├────────────────────────────────────────────────────────────┤
    │ 👧 *Children*       │ ${children} × ₹${child_price}              │
    ├────────────────────────────────────────────────────────────┤
    │ 💰 *Total*          │ ₹${total}                              │
    ├────────────────────────────────────────────────────────────┤
    │ 🙋 *User*           │ ${userName} (${userEmail})            │
    └────────────────────────────────────────────────────────────┘

    Thank you for your booking! 🎉
                `;

                agent.add(ticket);
                resolve();
            });
        });
    },

    SearchTicketIntent: (agent) => {
        console.log("🔍 Handling SearchTicketIntent");

        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;

        if (!userEmail) {
            agent.add("🔐 Please login first to search for a ticket.");
            return;
        }

        const bookingId = agent.parameters.booking_id;

        if (!bookingId) {
            agent.add("❓ Please provide your booking ID.");
            return;
        }

        return new Promise((resolve) => {
            const query = `
            SELECT * FROM ticket_details 
            WHERE booking_id = ? `;
            //     const query = `
            //     SELECT * FROM ticket_details 
            //     WHERE booking_id = ? 
            //     AND user_email = ?
            // `;

            db.query(query, [bookingId, userEmail], (err, results) => {
                if (err) {
                    console.error("❌ DB Error:", err);
                    agent.add("Something went wrong while fetching your ticket.");
                    return resolve();
                }

                if (results.length === 0) {
                    agent.add("🚫 No ticket found with that ID for your account.");
                    return resolve();
                }
                const t = results[0];
                const formattedVisitDate = new Date(t.visit_date).toLocaleDateString('en-US', {
                    weekday: 'short', // "Fri"
                    year: 'numeric',  // "2025"
                    month: 'short',   // "May"
                    day: 'numeric'    // "09"
                });
                const formattedBookingDate = new Date(t.booking_date).toLocaleDateString('en-US', {
                    weekday: 'short', // "Fri"
                    year: 'numeric',  // "2025"
                    month: 'short',   // "May"
                    day: 'numeric'    // "09"
                });

                const message = `
🎫 *Your Ticket Details*   

┌────────────────────────────────────────────────────────────┐
│ 🔖 *Booking ID*     │ ${t.booking_id}                      │
├────────────────────────────────────────────────────────────┤
│ 📅 *Booked On*      │ ${formattedBookingDate}                       │
├────────────────────────────────────────────────────────────┤
│ 🌍 *Visit Place*    │ ${t.place_name}                             │
├────────────────────────────────────────────────────────────┤
│ 📅 *Visit Date*     │ ${formattedVisitDate}                         │
├────────────────────────────────────────────────────────────┤
│ 🏙️ *State*         │ ${t.state}                            │
├────────────────────────────────────────────────────────────┤
│ 🏘️ *District*      │ ${t.district}                         │
├────────────────────────────────────────────────────────────┤
│ 👨‍🦰 *Adults*        │ ${t.adult_count} × ₹${t.adult_price}                │
├────────────────────────────────────────────────────────────┤
│ 👧 *Children*       │ ${t.child_count} × ₹${t.child_price}              │
├────────────────────────────────────────────────────────────┤
│ 💰 *Total*          │ ₹${t.total_paid}                              │
├────────────────────────────────────────────────────────────┤
│ 🙋 *User*           │ ${t.user_name} ${t.user_email}           │
└────────────────────────────────────────────────────────────┘

Thank you for your booking! 🎉
            `;
                //                 const message = `
                // _______________________________________
                // 🎫 *Your Ticket Details*             
                // _______________________________________
                // | 🆔 Booking ID  | ${t.booking_id}        |
                // | -------------- | ---------------------- |
                // | 🏛️ Place      | ${t.place_name}         |
                // | 📅 Visit Date | ${t.visit_date}         |
                // | 👨 Adults     | ${t.adult_count} × ₹${t.adult_price} |
                // | 👧 Children   | ${t.child_count} × ₹${t.child_price} |
                // | 💰 Total Paid | ₹${t.total_paid}         |
                // | 📍 Location   | ${t.district}, ${t.state} |
                // | 📧 Email      | ${t.user_email}         |
                // _______________________________________
                // `;

                console.log(message);

                agent.add(message);
                resolve();
            });
        });
    },

    ViewHistoryIntent: (agent) => {
        console.log("📜 Handling ViewHistoryIntent");

        const user = agent?.originalRequest?.payload?.data?.user || {};
        const userEmail = user.email;

        if (!userEmail) {
            agent.add("🔐 Please login first to view your booking history.");
            return;
        }

        return new Promise((resolve) => {
            const query = `
            SELECT booking_id, place_name, visit_date, total_paid 
            FROM ticket_details 
            WHERE user_email = ?
            ORDER BY booking_date DESC
        `;

            db.query(query, [userEmail], (err, results) => {
                if (err) {
                    console.error("❌ DB Error:", err);
                    agent.add("Couldn't fetch your booking history.");
                    return resolve();
                }

                if (results.length === 0) {
                    agent.add("📭 No past bookings found.");
                    return resolve();
                }

                // let message = "📚 *Your Booking History:*\n";
                // results.slice(0, 5).forEach((t, i) => {
                //     message += `\n${i + 1}. ${t.place_name} on ${t.visit_date} (₹${t.total_paid}) [ID: ${t.booking_id}]`;
                // });
                let message = `
📚 *${user.name} Here is Your Booking History:*

┌────────────────────────────────────────────────────────────┐
│ 🔖 *Booking ID*     │ 📅 *Visit Date*   │ 🏛️ *Place*         │ 💰 *Total Paid*  │
├────────────────────────────────────────────────────────────┤
`;

                // Loop through results to create table rows
                results.slice(0, 5).forEach((t, i) => {
                    const formattedDate = new Date(t.visit_date).toLocaleDateString('en-US', {
                        weekday: 'short', // "Fri"
                        year: 'numeric',  // "2025"
                        month: 'short',   // "May"
                        day: 'numeric'    // "09"
                    });

                    message += `
│ ${t.booking_id}          │ ${formattedDate}    │ ${t.place_name}     │ ₹${t.total_paid}        │
├────────────────────────────────────────────────────────────┤
`;

                });

                message += `└────────────────────────────────────────────────────────────┘`;

                console.log(message);

                agent.add(message);
                resolve();
            });
        });
    }
};

module.exports = intentHandlers;


