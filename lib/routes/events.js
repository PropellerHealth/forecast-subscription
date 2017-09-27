var logme = require('logme');
var twilio = require('twilio');

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

		phone = req.body["From"];
		msg = req.body["Body"];
		if( msg.toLowerCase() === 'stop' ) {
			logme.info('turning off ' + phone);
			// todo : remove user from list
			var twiml = new twilio.TwimlResponse();
			twiml.message('Thanks for the text');
			res.type('text/xml');
			res.send(twiml.toString());
		}
  
	});
};
