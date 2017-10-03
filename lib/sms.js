'use strict'
var logme = require('logme');
var twilio = require('twilio');
var MessagingResponse = twilio.twiml.MessagingResponse;	
var Handlebars = require('handlebars');
var path = require('path');
var fs = require('fs');
var constants = require('./constants');

var twilioClient = new twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
var _templates = new Map();

function send(toPhone, text, callback) {
    var data = {
        from: process.env.TWILIO_NUMBER,
        to: '+1' + toPhone,
        body: text
    };

    // TODO: handle send error
    twilioClient.messages.create(data).then(function (message) {
        console.log(message.sid);
        callback(null, message);
    });
}

function render(name, toPhone, templateVars, callback) {
    if (!_templates.has(name)) {
        fs.readFile(path.join(__dirname, 'templates', 'sms', name, 'text.hbs'), 'utf8', function (err, data) {
            if (err) {
                logme.error('Error loading SMS handlebars template: ' + err);
                return callback(err);
            }

            let template = Handlebars.compile(data);
            _templates.set(name, template);

            let result = template(templateVars);
            result = result.trim();
            callback(null, result);
        });
    } else {
        let template = _templates.get(name);
        let result = template(templateVars);
        result = result.trim();
        callback(null, result);
    }
}

const renderForecast = function (toPhone, forecast, zip, callback) {
    let templateVars = {
        isForecastPoor: forecast === 'high',
        isForecastFair: forecast === 'medium',
        isForecastGood: forecast === 'low',
        zip: zip,
        toPhone: toPhone
    }
    render('forecast', toPhone, templateVars, callback);
};

const renderWelcome = function (toPhone, zip, callback) {
    let templateVars = {
        toPhone: toPhone,
        zip: zip
    };
    render('welcome', toPhone, templateVars, callback);
};

const renderInstructions = function (toPhone, callback) {
    let templateVars = {
        toPhone: toPhone
    };
    render('instructions', toPhone, templateVars, callback);
};

const renderUnsubscribe = function (toPhone, callback) {
    let templateVars = {
        toPhone: toPhone
    };

    render('unsubscribe', toPhone, templateVars, callback);
};

module.exports.renderForecast = renderForecast;
module.exports.renderWelcome = renderWelcome;
module.exports.renderInstructions = renderInstructions;
module.exports.renderUnsubscribe = renderUnsubscribe;

module.exports.sendForecast = function (toPhone, forecast, zip, callback) {
    renderForecast(toPhone, forecast, zip, (err, text) => {
        if (err) {
            return callback(err);
        }

        send(toPhone, text, callback);
    });
};

module.exports.sendWelcome = function (toPhone, zip, callback) {
    renderWelcome(toPhone, zip, (err, text) => {
        if (err) {
            return callback(err);
        }

        send(toPhone, text, callback);
    });
};

module.exports.sendInstructions = function (toPhone, callback) {
    renderInstructions(toPhone, (err, text) => {
        if (err) {
            return callback(err);
        }

        send(toPhone, text, callback);
    });
};

module.exports.sendUnsubscribe = function (toPhone, callback) {
    renderUnsubscribe(toPhone, (err, text) => {
        if (err) {
            return callback(err);
        }

        send(toPhone, text, callback);
    });
};