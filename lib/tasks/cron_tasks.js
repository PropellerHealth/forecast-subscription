'use strict';
var logme = require('logme');
var forecastClient = require('asthma-forecast')();
var twilio = require('twilio');
var mailgunJS = require('mailgun-js');
var async = require('async');
var subscriberModel = require('../models/subscriber');

var eachSubscriptionForecast = function (method, iteratee, callback) {
    var done = false;
    var pageCount = 0;
    var pagingToken = null;
    async.whilst(
        function () { return !done; },
        function (nextPage) {
            // console.log('page: ' + pageCount);
            subscriberModel.list(method, 2, pagingToken, function (err, subscribers, nextToken) {
                if (err) {
                    logme.error('Error listing page ' + pageCount + ' subscribers by ' + method + ': ' + err);
                    return nextPage(err);
                }
                // console.log(subscribers);

                pageCount++;
                async.eachLimit(subscribers, 1, function (subscriber, nextSubscriber) {

                    // get the forecast by zip
                    forecastClient.getForecastByZipCode(subscriber.zip, function (err, forecast) {
                        if (err) {
                            logme.error('Error fetching forecast for zip ' + subscriber.zip + ': ' + err);
                            nextSubscriber();
                        } else {
                            logme.info('Successful forecast for ' + subscriber.to + ' for zip ' + subscriber.zip);
                            // console.dir(forecast);
                            
                            iteratee(subscriber, forecast, nextSubscriber);
                        }
                    });
                }, function (err) {
                    if (err) {
                        logme.error('Error listing page ' + pageCount + ' subscribers by ' + method + ': ' + err);
                        pagingToken = false;
                        return nextPage(err);
                    }

                    pagingToken = nextToken;
                    if (nextToken === false) {
                        done = true;
                    }
                    nextPage();
                });
            });
        }, callback);
}

module.exports = function (app) {

    // email cron task
    app.get('/tasks/email', function (req, res, next) {
        console.dir(req.body);
        if (req.get('X-Appengine-Cron') != true) {
            logme.info('Illegal CRON request from the internets');
            //res.sendStatus(200);
            //return;
        }

        var mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_KEY, domain: process.env.MAILGUN_DOMAIN });

        eachSubscriptionForecast('email', function (subscriber, forecast, nextSubscriber) {
            var score = forecast.properties.code;
            if (score === 'low') score = 'good';

            var data = {
                from: 'Propeller <hello@propellerhealth.com>',
                to: subscriber.email,
                subject: 'Your local asthma forecast from Air Propeller',
                text: 'Testing some Mailgun awesomness!'
            };

            mailgun.messages().send(data, function (error, body) {
                // console.log(body);
                nextSubscriber();
            });
        }, function (err) {
            if (err) {
                logme.error('Error processing subscribers by email: ' + err);
            }
        });

        res.sendStatus(200);
    });

    // sms cron task
    app.get('/tasks/sms', function (req, res, next) {
        if (req.get('X-Appengine-Cron') != true) {
            logme.info('Illegal CRON request from the internets');
            //res.sendStatus(200);
            //return;
        }
        var client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

        eachSubscriptionForecast('sms', function (subscriber, forecast, nextSubscriber) {
            var score = forecast.properties.code;
            if (score === 'low') score = 'good';
            client.messages.create({
                body: 'Your local asthma conditions are ' + score + ' for ' + subscriber.zip + ' - Air by Propeller',
                to: '+1' + subscriber.to,
                from: process.env.TWILIO_NUMBER
            }).then(function (message) {
                console.log(message.sid);
                nextSubscriber();
            })
        }, function (err) {
            if (err) {
                logme.error('Error processing subscribers by sms: ' + err);
            }
        });
    
        res.sendStatus(200);
    });

};
