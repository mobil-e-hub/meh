// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');
const dotenv = require('dotenv');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


// Environment variables
dotenv.config({path: `${__dirname}/../../.env`});
const port = process.env.GIT_PORT || 3005;
const secret = process.env.GIT_SECRET || '';

// Server
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`)
});

// Endpoints
app.get('/', (req, res) => {
    res.status(200).send('This is the base url of the git updater module.');
});

app.get('/ping', (req, res) => {
    res.json({ git: 'pong' });
});

app.post('/', async (req, res) => {
    try {
        console.log('Running git updater...')
        // TODO: Verify secret from Webhook

        const { stdout, stderr } = await exec('pwd');
        if (stdout != '') { console.log('stdout:', stdout) };
        if (stderr != '') { console.error('stderr:', stderr) };

        res.json({ success: true });
    }
    catch (e) {
        console.log(e);
        res.json({ success: false, error: e });
    }
});