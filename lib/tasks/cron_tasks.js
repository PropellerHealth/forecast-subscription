var logme = require('logme');
var forecast = require('asthma-forecast')();
var twilio = require('twilio');
var mailgunJS = require('mailgun-js');


module.exports = function(app) {

	// email cron task
	app.get('/tasks/email',function(req,res,next) {
		console.dir(req.body);
        if( req.get('X-Appengine-Cron') != true ) {
            logme.info('Illegal CRON request from the internets');
            //res.sendStatus(200);
            //return;
        }
        // get the forecast by zip
        forecast.getForecastByZipCode("53121", function(err, forecast) {
            console.dir(forecast);
            var score = forecast.properties.code;
            if( score === 'low' ) score = 'good';

            var mailgun = require('mailgun-js')({apiKey: process.env.MAILGUN_KEY, process.env.domain: MAILGUN_DOMAIN});        
            var data = {
              from: 'Propeller <hello@propellerhealth.com>',
              to: 'gtracy@gmail.com',
              subject: 'Your local asthma forecast from Air Propeller',
              text: 'Testing some Mailgun awesomness!'
            };
            
            mailgun.messages().send(data, function (error, body) {
                console.log(body);
                res.sendStatus(200);
            });
        });        
	});

    // sms cron task
	app.get('/tasks/sms',function(req,res,next) {
        if( req.get('X-Appengine-Cron') != true ) {
            logme.info('Illegal CRON request from the internets');
            //res.sendStatus(200);
            //return;
        }

        var client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
		
        // get the forecast by zip
        forecast.getForecastByZipCode("53121", function(err, forecast) {
            console.dir(forecast);
            var score = forecast.properties.code;
            if( score === 'low' ) score = 'good';
            client.messages.create({
                body: 'Your local asthma conditions are ' + score + ' - Air by Propeller',
                to: '+16083152344',
                from: '+16083835106'
            })
            .then((message) => console.log(message.sid));
            res.sendStatus(200);
        });        
	});

};
