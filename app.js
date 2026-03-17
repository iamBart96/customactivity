const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const env = process.env;

const app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(bodyParser.raw({type: 'application/jwt'}));

// Log every incoming request (helps diagnose which endpoints SFMC actually calls)
app.use((req, res, next) => {
    console.log(`REQUEST ${req.method} ${req.originalUrl} content-type:${req.headers['content-type']}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));


app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));

/*
app.get('/', async (req, res) => {
    res.render('index');
});
*/

const JbRoutes = require('./routes/index');
app.use('/jb', JbRoutes);

// Catch-all logging for any requests that dont match an existing route.
// This helps identify which endpoint SFMC is attempting to call.
app.use((req, res) => {
    console.log('UNMATCHED REQUEST', req.method, req.originalUrl, 'content-type:', req.headers['content-type']);
    res.sendStatus(200);
});


app.listen(env.PORT, () => {
    console.log("Server listening on port: " + env.PORT);
});
