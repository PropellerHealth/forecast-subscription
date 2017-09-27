var logme = require('logme');

module.exports = function(app) {

	// email cron task
	app.get('/tasks/email',function(req,res,next) {
		console.dir(req.body);
        if( req.get('X-Appengine-Cron') != true ) {
            logme.info('Illegal CRON request from the internets');
            res.sendStatus(200);
            return;
        }
        logme.info('Success');
    	res.sendStatus(200);
	});

    // sms cron task
	app.get('/tasks/sms',function(req,res,next) {
		console.dir(req.body);
        if( req.get('X-Appengine-Cron') != true ) {
            logme.info('Illegal CRON request from the internets');
            res.sendStatus(200);
            return;
        }
        logme.info('Success');
    	res.sendStatus(200);
	});

};
