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
const repo = process.env.GIT_REPO || '';

// Updater commands
const commands = [
    `cd "${repo}" && git pull`,
    // `cd "${repo}/sim" && npm install`,
    `cd "${repo}/opt" && pip install -r requirements.txt`,
    `cd "${repo}/viz" && npm install`,
    `cd "${repo}/monitoring" && npm install`
]

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
    console.log('Running git updater...')
    // TODO: Verify secret

    for (command of commands) {
        try {
            console.log(`Command: ${command}`);
            const { stdout, stderr } = await exec(command); 
            console.log('stdout:', stdout);
            console.error('stderr:', stderr);
        }
        catch (e) {
            console.error('error:', e);
        }
    }

    console.log('Done!')

    res.json({ success: true });    
});