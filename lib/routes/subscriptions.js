'use strict';
const async = require('async');
const express = require('express');
const logme = require('logme');
const Joi = require('joi');
var forecastClient = require('asthma-forecast')();
const subscriber = require('../models/subscriber');
const email = require('../email');
const sms = require('../sms');
var twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;
const router = express.Router();

const ZIP_REGEX = /\d{5}(-\d{4})?/;
const PHONE_REGEX = /^[0-9]{10}$/;
// const PHONE_REGEX =/^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/;

router.post('/subscribe', function (req, res, next) {
	const requestSchema = Joi.object().keys({
		zip: Joi.string().regex(ZIP_REGEX).required(),
		to: [Joi.string().email().required(), Joi.string().regex(PHONE_REGEX).required()],
	});

	Joi.validate(req.body, requestSchema, (err, value) => {
		if (err) {
			let deets = err.details[0];
			return res.status(400).send({ id: deets.type, message: deets.message});
		} 
		
		value.method = value.to.indexOf('@') >= 0 ? 'email' : 'sms';

		async.series([
			function create(next) {
				subscriber.create(value, next);
			},
			function notify(next) {
				if (value.method === 'email') {
					email.sendWelcome(value.to, next);
				} else {
					async.series([
						function sendWelcome(nextSmsMsg) {
							console.log('1');
							sms.sendWelcome(value.to, value.zip, nextSmsMsg);
						},
						function sendForecast(nextSmsMsg) {
							console.log('2');
							 // get the forecast by zip
							forecastClient.getForecastByZipCode(value.zip, function (err, forecast) {
								if (err) {
									logme.error('Error fetching forecast for zip ' + value.zip + ': ' + err);
									return nextSmsMsg();
								} 

								logme.info('Successful forecast for ' + value.to + ' for zip ' + value.zip);
								console.dir(forecast);

								if (!forecast.properties) {
									logme.error('missing forecast.properties: ' + forecast);
									return nextSmsMsg();
								}
								if (forecast.properties.code === 'low') {
									logme.debug('skipping good forecast: ');
									return nextSmsMsg();
								}

								// render the template
								sms.sendForecast(value.to, forecast.properties.code, value.zip, nextSmsMsg);
							});
						},
						function sendInstructions(nextSmsMsg) {
							console.log('3');
							sms.sendInstructions(value.to, nextSmsMsg);
						}, 
					], next);	
				}
			}
		], (err) => {
			if (err) {
				logme.error('Error during subscribe: ' + err);
				return res.status(500).send({ id: 'Internal Server Error', message: 'Internal Server Error'});
			}  

			res.sendStatus(201);
		});
	});
});

router.post('/unsubscribe', function (req, res, next) {
	const requestSchema = Joi.object().keys({
		to: [Joi.string().email().required(), Joi.string().regex(PHONE_REGEX).required()],
	});
	Joi.validate(req.body, requestSchema, (err, value) => {
		if (err) {
			let deets = err.details[0];
			return res.status(400).send({ id: deets.type, message: deets.message});
		}
		
		let to = value.to;
		async.series([
			function unsubscribe(next) {
				subscriber.delete(to, next);
			},
			function notify(next) {
				let isEmail = to.indexOf('@') >= 0;
				if (isEmail) {
					email.sendUnsubscribe(to, next);
				} else {
					// TODO: notify of unsubscription via SMS
					next();
				}
			}
		],(err)=>{
			if (err) {
				logme.error('Error during unsubscribe: ' + err);
				return res.status(500).send({ id: 'Internal Server Error', message: 'Internal Server Error'});
			}

			res.sendStatus(200);
		});
	});
});

// inbound SMS message handler
router.post('/sms/message', function (req, res, next) {
	// validate it is in fact coming from twilio
	if( process.env.TWILIO_SID != req.body.AccountSid ) {
		logme.error('Invalid sender. It did not come from Twilio');
		res.sendStatus(500);
		return;
	}
	const MessagingResponse = twilio.twiml.MessagingResponse;
	const response = new MessagingResponse();
	const message = response.message();

	var phone = req.body["From"];
	// strip off the +1 because that's how we're storing it
	var phone_subscriber = phone.replace("+1","");
	var msg = req.body["Body"].toLowerCase();
	if( msg === 'stop' ) {
		logme.info('turning off ' + phone);
		subscriber.delete(phone_subscriber, function(err) {
			if (err) {
				logme.error("Error during sms subscriber delete: " + err);
				res.send(response.toString());
				return;
			}

			sms.renderUnsubscribe(phone_subscriber, function(err, text) {
				if (err) {
					logme.error("Error rendering sms unsubscribe template: " + err);
					return res.send(response.toString());
				}

				message.body(text);
				return res.send(response.toString());
			});
		})
	} else if( msg.indexOf('start') >= 0 ) {
		var cmd = msg.split(' ');
		// assume a zipcode is second
		var zip = cmd[1];
		if( /\d{5}(-\d{4})?/.test(zip) ) {
			// success
			// add user
			subscriber.create({method:'sms',zip:zip,to:phone_subscriber}, function (err) {
				if (err) {
					message.body("Hmm. The robots broke! We'll need to take a closer look.");
					res.send(response.toString());
					return res.sendStatus(201);
				} else {
					async.parallel({
						welcome: function (done) {
							sms.renderWelcome(phone_subscriber, zip, done);
						},
						forecast: function (done) {
								// get the forecast by zip
								forecastClient.getForecastByZipCode(zip, function (err, forecast) {
								if (err) {
									logme.error('Error fetching forecast for zip ' + zip + ': ' + err);
									return done();
								}

								if (!forecast.properties) {
									logme.error('missing forecast.properties: ' + forecast);
									return done();
								}
								logme.info('Successful forecast for ' + phone_subscriber + ' for zip ' + zip);
								if (forecast.properties.code === 'low') {
									logme.debug('skipping good forecast: ');
									return done();
								}

								// render the template
								sms.renderForecast(phone_subscriber, forecast.properties.code, zip, done);
							});
						},
						instructions: function (done) {
							sms.renderInstructions(phone_subscriber, done);
						},
					},function(err, results) {
						if (err) {
							logme.error('Error rendering sms welcome messages: ' + err);
							return res.send(response.toString());
						}

						// message 1
						message.body(results.welcome);

						// message 2 (optional)
						if (results.forecast && results.forecast.length > 0) {
							response.message(results.forecast);
						}

						// message 3
						response.message(results.instructions);

						logme.info(response.toString());
						res.send(response.toString());
						return res.sendStatus(201);
					});
				}
			});
		} else {
			message.body("Hmm. I don't see a valid zipcode. Example : start 53711.");
			console.log(response.toString());
			res.send(response.toString());
		}
	} else {
		message.body("Hmm. I don't understand. You can send START <zipcode> or STOP to turn it off.");
		console.log(response.toString());
		res.send(response.toString());
	}
});

module.exports = router;