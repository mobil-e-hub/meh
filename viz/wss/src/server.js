// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');
const socket = require('socket.io');
const { EventGridPublisherClient, AzureKeyCredential } = require("@azure/eventgrid");

// Internal modules


// Server for incoming EventGrid messages
const app = express();
const port = 3002;
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`);
});

app.get('/ping', (req, res) => {
    res.status(200).json({ wss: 'pong' });
});


// WebSocket to forward messages to Visualization
const io = socket(server, { cors: { origin: "http://localhost:8080", methods: ["GET", "POST"], credentials: true }, allowEIO3: true });
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log("> Socket disconnected.");
    });

    socket.on('eventgrid', async ({ topic, message }) => {
        try {
            await eventGridClient.send([{ eventType: 'mobil-e-hub', dataVersion: '1', subject: topic, data: message }]);
        }
        catch (err) {
            console.log(err);
        }
    });

    console.log("> Socket connected.");
});


// EventGrid client
const eventGridClient = new EventGridPublisherClient(
    "https://mobilehub-dev-azweu.westeurope-1.eventgrid.azure.net/api/events",
    "EventGrid",
    new AzureKeyCredential("mIODu+I1dUE6EbEUZzTDC1QDLxWb0btNujdvlVpObE4=")
);


// Receive events from EventGrid
app.post('/eventgrid', async (req, res) => {
    for (const event of req.body) {
        // If this is a validation request, reply appropriately
        if (event.data && event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
            res.status(200).json({ ValidationResponse: event.data.validationCode });
        }
        // Otherwise forward event to Visualization
        else {
            try {
                let [entity, id, ...args] = event.subject.split('/');
                io.emit('eventgrid', { topic: { entity, id, args, rest: args.join('/'), string: event.subject }, message: event.data });
            }
            catch (err) {
                console.log(`Invalid event received: ${err}`);
            }
        }
    }

    // There's no need to return anything except status 200
    res.status(200).end();
});
