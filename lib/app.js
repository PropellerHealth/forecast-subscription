var winston = require('winston');
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
    winston.error('Caught Error ' + err);
    if (err.stack) {
        winston.error('Stack ' + err.stack);
    }
});

var app = express();
app.locals.serverIsReady = false;

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.use('/favicon.ico', express.static(__dirname + '/public/img/favicon.ico'));
app.use(cors());

// simple logger
app.use(function(req, res, next){
    winston.info(req.method + '  ' + req.url);
    next();
});

/**
 *  Default error handler when things go wrong
 **/
app.use(function(err, req, res, next){
    winston.error(err.stack);
    res.json({error:'Internal Server Error'},500);
    next();
});

// Define the routes
app.use(subscriptionRoutes);
require("./tasks/cron_tasks")(app);

// Default root route for server
app.get('/', function(req,res,next) {
    res.redirect("https://propellerhealth.com");
});

app.get('/ready', function(req,res,next) {
    if (req.app.locals.serverIsReady) {
        res.sendStatus(200);
    } else {
        res.sendStatus(500)
    }
});

app.get('/live', function(req,res,next) {
    res.sendStatus(200);
});

// start the web application server
var port = config.port;
app.listen(port, () => {
    app.locals.serverIsReady = true;
    winston.info('Asthma subscription service started on port ' + port);
});
module.exports = app;
