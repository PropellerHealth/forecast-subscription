# Asthma Forecasting Subsciption Service
A NodeJS project, this service enables anyone to subscribe to a daily email or SMS that reports whether or not the asthma forecast is bad for a specified zipcode. 

The service uses the asthma forecast API developed by [https://propellerhealth.com](Propeller Health). You can learn more about Propeller's forecast service called, Air - [https://www.propellerhealth.com/air-by-propeller/]

## Email
The project defines a /subscribe and /unsubscribe endpoint for managing emails. Note, however, that this project has not yet created a web form for users to subscribe with. Propeller hosts a form separately on their primary marketing site.

The email delivery component is currently built using Mailgun.

## SMS
The project defines an /sms/message endpoint for managing subscription and unsubscription messages. The interface expects,
 * start <zipcode>
 * stop 
... to control the service for a subscriber. 

The SMS delivery component is currently built using Twilio.

# Google App Engine
The project is designed to be deployed on Google App Engine. It would be easy enough to port this over to a different cloud provider. The current implementation is tied to GAE primarily in two ways,

 1. Through the datastore implementation located in lib/models/subscriber.js and index.yaml
 1. Through the CRON implementation (a GAE service) located in cron.yaml

## Configuration
In order for the email and SMS services to operate, you will need to setup credentials for both Mailgun and Twilio. These are defined as `env_variables` in **app.yaml**. The app won't start without these defined. 

# Sending a test message
To send a test message to a subscriber about a specific zip, set the environment variables listed in  **app.yaml** `env_variables` and execute:
```
npm run send -- --to foo.bar@example.com --zip 53704
```
or
```
npm run send -- --to 5555555555 --zip 53704
```