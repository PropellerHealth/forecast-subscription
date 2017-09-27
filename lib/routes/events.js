var logme = require('logme');

module.exports = function(app) {

	//
	app.post('/forms/fixme',function(req,res,next) {
		console.dir(req.body);
    		res.sendStatus(200);
	});

};
