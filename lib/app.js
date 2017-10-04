var logme = require('logme');
var express = require('express');
var path = require('path');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var subscriptionRoutes = require('./routes/subscriptions');
var email = require('./email.js');
var cors = require('cors')

var config = require('../config');


process.on('uncaughtException', function(err) {
    debugger;
    logme.error('Caught Error ' + err);
    if (err.stack) {
        logme.error('Stack ' + err.stack);
    }
});

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.use(cors());

// simple logger
app.use(function(req, res, next){
    logme.info(req.method + '  ' + req.url);
    next();
});

/**
 *  Default error handler when things go wrong
 **/
app.use(function(err, req, res, next){
    logme.error(err.stack);
    res.json({error:'Internal Server Error'},500);
    next();
});

// Define the webhook endpoints
app.use(subscriptionRoutes);
require("./tasks/cron_tasks")(app);

// Default root route for server
app.get('/', function(req,res,next) {
    res.send('Success! Asthma subscription service is running. https://propellerhealth.com');
});

// start the web application server
var port = config.port;
app.listen(port);
logme.info('Asthma subscription service started on port ' + port);
module.exports = app;
