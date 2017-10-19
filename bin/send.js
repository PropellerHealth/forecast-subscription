'use strict'
const _ = require('underscore');
const async = require('async');
const minimist = require('minimist');
const Joi = require('joi');
var forecastClient = require('asthma-forecast')();
var email = require('../lib/email');
var sms = require('../lib/sms');

const ZIP_REGEX = /^\d{5}$/;
const PHONE_REGEX = /^[0-9]{10}$/;

var argv = minimist(process.argv, {string:['to','zip']});
const schema = Joi.object().keys({
    zip: Joi.string().regex(ZIP_REGEX).required(),
    to: [Joi.string().email().required(), Joi.string().regex(PHONE_REGEX).required()],
});
const result = Joi.validate(_.pick(argv,'zip','to'), schema);
if (result.error) {
    console.error(result.error);
    return;
}
const subscriber = result.value;

async.waterfall([
    function fetchForecast(next) {
        forecastClient.getForecastByZipCode(subscriber.zip, function (err, forecast) {
            next(err, forecast);
        });
    },
    function send(forecast, next) {
        if (!forecast.properties) {
            return next(new Error('missing forecast.properties in response for ' + subscriber.zip));
        }
        
        let method = subscriber.to.indexOf('@') >= 0 ? email : sms;
        method.sendForecast(subscriber.to, forecast.properties.code, subscriber.zip, next);
    }
],(err) =>{
    if (err) {
        console.error('unable to send forecast for ' + subscriber.zip + ' to ' + subscriber.to);
        console.error(err);
    } else {
        console.log('sent forecast for ' + subscriber.zip + ' to ' + subscriber.to);
    }
});
