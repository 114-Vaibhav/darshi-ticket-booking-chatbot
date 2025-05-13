const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');
const { SessionsClient } = require('@google-cloud/dialogflow');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(bodyParser.json());

const intentHandlers = require('./handlers/intentHandlers');
const projectId = 'petpooja-xn9h';
const sessionClient = new SessionsClient();

// 🔧 Helper to convert JSON to Dialogflow Struct
function jsonToStructProto(json) {
    const structProto = { fields: {} };
    for (const k in json) {
        structProto.fields[k] = convertValue(json[k]);
    }
    return structProto;
}

function convertValue(value) {
    const valueType = typeof value;
    if (valueType === 'number') {
        return { numberValue: value };
    } else if (valueType === 'string') {
        return { stringValue: value };
    } else if (valueType === 'boolean') {
        return { boolValue: value };
    } else if (Array.isArray(value)) {
        return {
            listValue: {
                values: value.map(convertValue),
            },
        };
    } else if (valueType === 'object' && value !== null) {
        return {
            structValue: jsonToStructProto(value),
        };
    } else {
        return { nullValue: 'NULL_VALUE' };
    }
}

// ============================
// 🤖 Dialogflow webhook endpoint (for testing locally)
// ============================
app.post('/', (req, res) => {
    console.log('📥 Incoming webhook request from Dialogflow');
    const agent = new WebhookClient({ request: req, response: res });

    console.log('🎯 Matched Intent:', agent.intent);

    const intentMap = new Map();
    Object.keys(intentHandlers).forEach(intent => {
        intentMap.set(intent, async (agent) => {
            console.log(`🔧 Handling intent: ${intent}`);
            try {
                await intentHandlers[intent](agent);
                console.log(`✅ Response sent for: ${intent}`);
            } catch (err) {
                console.error(`❌ Error handling ${intent}:`, err);
                agent.add('Sorry, something went wrong on the server.');
            }
        });
    });

    agent.handleRequest(intentMap);
});

// ============================
// 💬 Custom endpoint: UI → Dialogflow
// ============================
app.post('/message', async (req, res) => {
    const { message, sessionId = 'default-session-id', user = {} } = req.body;

    if (user?.email || user?.name) {
        console.log(`🙋 User info received → Name: ${user.name}, Email: ${user.email}`);
    } else {
        console.log('ℹ️ No user info provided in request.');
    }

    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: 'en',
            },
        },
        queryParams: {
            payload: jsonToStructProto({
                data: {
                    user,
                },
            }),
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        console.log('🤖 Dialogflow response:', result.fulfillmentText);
        res.json({ reply: result.fulfillmentText });
    } catch (err) {
        console.error('❌ Dialogflow request failed:', err);
        res.status(500).json({ reply: 'Error contacting Dialogflow.' });
    }
});

// ============================
// 🧑 Google Login - Save User
// ============================
app.post('/save-user', (req, res) => {
    const { name, email } = req.body;
    console.log(`User logged in: ${name} - ${email}`);
    res.status(200).send({ message: 'User received' });
});

// ============================
// 🧠 Dialogflow fulfillment webhook (from Dialogflow console)
// ============================
app.post('/webhook', (req, res) => {
    const body = req.body;
    const user = body.originalDetectIntentRequest?.payload?.data?.user || {};

    const agent = new WebhookClient({ request: req, response: res });

    console.log('🎯 Matched Intent:', agent.intent);
    console.log(`🙋 Fulfillment Webhook User → Name: ${user.name || 'Anonymous'}, Email: ${user.email || 'Not Provided'}`);

    const intentMap = new Map();
    Object.keys(intentHandlers).forEach(intent => {
        intentMap.set(intent, async (agent) => {
            try {
                await intentHandlers[intent](agent);
            } catch (err) {
                console.error(`❌ Error handling ${intent}:`, err);
                agent.add('Internal server error.');
            }
        });
    });

    agent.handleRequest(intentMap);
});


// ============================
// 🚀 Start the server
// ============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
