'use strict';
const express = require('express');
const logme = require('logme');
const Joi = require('joi');
const subscriber = require('../models/subscriber');

const router = express.Router();

const ZIP_REGEX = /\d{5}(-\d{4})?/;
const PHONE_REGEX =//;

router.post('/subscribe', function (req, res, next) {
	const requestSchema = Joi.object().keys({
		zip: Joi.string().regex(ZIP_REGEX).required(),
		contact: [Joi.string().email().required(), Joi.string().regex(PHONE_REGEX).required()],
	});

	Joi.validate(request.body, requestSchema, function(err, value) {
		if (err) {
			let deets = err.details[0];
			return res.status(400).send({ id: deets.type, message: deets.message});
		} 

		subscriber.create(value, function (err) {
			if (err) {
				return res.status(500).send({ id: 'Internal Server Error', message: 'Internal Server Error'});
			} else {
				return res.sendStatus(201);
			}
		});
	});
});

router.post('/unsubscribe', function (req, res, next) {
	res.sendStatus(200);
});

module.exports = router;