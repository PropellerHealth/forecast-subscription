var logme = require('logme');
var mailgun = require('mailgun-js')({apiKey: process.env.MAILGUN_KEY, domain: process.env.MAILGUN_DOMAIN});
var emailTemplates = require('email-templates');
var Handlebars    = require('handlebars');
var path = require('path');
var fs              = require('fs');
var constants = require('./constants');

emailTemplates.requires.handlebars = Handlebars;
let EmailTemplate = emailTemplates.EmailTemplate;

Handlebars.registerHelper('CURRENT_YEAR', function() {
    return (new Date()).getFullYear();
});

for (let key in constants) {
    Handlebars.registerHelper(key, function() {
        return constants[key];
    });
}

function registerPartial(path, name) {
    let data = fs.readFileSync(path, 'utf8');
    let template = Handlebars.compile(data);
    Handlebars.registerPartial(name, template);
}

let partialsDir = path.join(__dirname, 'templates', 'partials', 'email');
registerPartial(path.join(partialsDir, 'header', 'html.hbs'), 'header_html');
registerPartial(path.join(partialsDir, 'footer', 'html.hbs'), 'footer_html');
registerPartial(path.join(partialsDir, 'header', 'text.hbs'), 'header_text');
registerPartial(path.join(partialsDir, 'footer', 'text.hbs'), 'footer_text');

function send(toEmail, templateResult, callback) {
    var data = {
        from: 'Propeller <hello@propellerhealth.com>',
        to: toEmail,
        subject: templateResult.subject,
        text: templateResult.text,
        html: templateResult.html
      };

    mailgun.messages().send(data, function (error, body) {
        console.log(body);
        callback(error);
    });
}

function render(name, toEmail, templateVars, callback) {
    let templateOptions = {
        sassOptions: {
            includePaths: [path.join(__dirname, 'templates')]
        }
    };
    let templatePath = path.join(__dirname, 'templates', 'email', name);
    let template = new EmailTemplate(templatePath, templateOptions);
    template.render(templateVars, function(err, result){
        if(err) {
            callback(err);
        } else {
            send(toEmail, result, function(err) {
                callback(err);
            });
        }
    });
}

module.exports.sendForecast = function(toEmail, forecast, zip, callback) {
    let templateVars = {
        isForecastPoor: forecast === 'poor',
        zip: zip,
        toEmail: toEmail
    }
    render('forecast', toEmail, templateVars, callback);
};

module.exports.sendWelcome = function(toEmail, callback) {
    let templateVars = {
        toEmail: toEmail
    };
    render('welcome', toEmail, templateVars, callback);
};

module.exports.sendUnsubscribe = function(toEmail, callback) {
    let templateVars = {
        toEmail: toEmail
    };

    render('unsubscribe', toEmail, templateVars, callback);
};