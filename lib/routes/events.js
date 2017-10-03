var logme = require('logme');
var twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;
const subscriber = require('../models/subscriber');
const sms = require('../sms');

module.exports = function(app) {

	//
	app.post('/forms/fixme',function(req,res,next) {
		console.dir(req.body);
    		res.sendStatus(200);
	});

	// inbound SMS message handler
	app.post('/sms/message', function(req,res,next) {
		console.dir(req.body);
		// validate it is in fact coming from twilio
		if( process.env.TWILIO_SID != req.body.AccountSid ) {
			logme.error('Invalid sender. It did not come from Twilio');
			res.sendStatus(500);
			return;
		}
		const MessagingResponse = twilio.twiml.MessagingResponse;				
		const response = new MessagingResponse();
		const message = response.message();

		phone = req.body["From"];
		// strip off the +1 because that's how we're storing it
		var phone_subscriber = phone.replace("+1","");
		msg = req.body["Body"].toLowerCase();
		if( msg === 'stop' ) {
			logme.info('turning off ' + phone);
			console.log("unsubscribing " + phone_subscriber);
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
			console.log(cmd);
			// assume a zipcode is second
			var zip = cmd[1];
			console.log(zip);
			if( /\d{5}(-\d{4})?/.test(zip) ) {
				console.log("found zip "+zip);
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
								sms.renderWelcome(phone_subscriber, done);
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
};
