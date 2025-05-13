
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { SessionsClient } = require('@google-cloud/dialogflow');
const uuid = require('uuid');
require('dotenv').config();
console.log('🔐 Google Credentials Path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
const fs = require('fs');
console.log('📄 File Exists:', fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));


const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(bodyParser.json());

// Load Dialogflow credentials (set GOOGLE_APPLICATION_CREDENTIALS env var or use key.json path directly)
const projectId = 'petpooja-xn9h'; // 🔁 Replace this
const sessionClient = new SessionsClient(); // auth will use GOOGLE_APPLICATION_CREDENTIALS

app.post('/message', async (req, res) => {
    const userMessage = req.body.message;
    const sessionId = uuid.v4();
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: userMessage,
                languageCode: 'en',
            },
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
