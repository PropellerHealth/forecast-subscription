'use strict';
const express = require('express');
const logme = require('logme');
const Joi = require('joi');
const subscriber = require('../models/subscriber');

const router = express.Router();

const ZIP_REGEX = /\d{5}(-\d{4})?/;
const PHONE_REGEX = /^[0-9]{10}$/;
// const PHONE_REGEX =/^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/;

router.post('/subscribe', function (req, res, next) {
	const requestSchema = Joi.object().keys({
		zip: Joi.string().regex(ZIP_REGEX).required(),
		to: [Joi.string().email().required(), Joi.string().regex(PHONE_REGEX).required()],
	});

	Joi.validate(req.body, requestSchema, function(err, value) {
		if (err) {
			let deets = err.details[0];
			return res.status(400).send({ id: deets.type, message: deets.message});
		} 
		
		value.method = value.to.indexOf('@' > 0) ? 'email' : 'sms';
		
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
	const requestSchema = Joi.object().keys({
		to: [Joi.string().email().required(), Joi.string().regex(PHONE_REGEX).required()],
	});
	Joi.validate(req.body, requestSchema, function(err, value) {
		if (err) {
			let deets = err.details[0];
			return res.status(400).send({ id: deets.type, message: deets.message});
		}
		
		subscriber.delete(value.to, function (err) {
			if (err) {
				return res.status(500).send({ id: 'Internal Server Error', message: 'Internal Server Error'});
			} else {
				return res.sendStatus(200);
			}
		});
	});
});

module.exports = router;