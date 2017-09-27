var logme = require('logme');
var twilio = require('twilio');
const subscriber = require('../models/subscriber');

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
		msg = req.body["Body"].toLowerCase();
		if( msg === 'stop' ) {
			logme.info('turning off ' + phone);
			// strip off the +1 because that's how we're storing it
			var phone_subscriber = phone.replace("+1","");
			console.log("unsubscribing " + phone_subscriber);
			subscriber.delete(phone_subscriber, function(err) {
				message.body("Success! You are now unsubscribed from the service.");
				res.send(response.toString());
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
				subscriber.create(zip, function (err) {
					if (err) {
						message.body("Hmm. The robots broke! We'll need to take a closer look.");
						res.send(response.toString());
    					return res.sendStatus(201);
					} else {
						message.body("Success! You are now subscribed for forecasts near "+zip+". Enjoy.");
						logme.info(response.toString());
						res.send(response.toString());
    					return res.sendStatus(201);
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
