'use strict';
const _ = require('underscore');
const async = require('async');
const winston = require('winston');

// By default, the client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GCLOUD_PROJECT environment variable. See
// https://googlecloudplatform.github.io/gcloud-node/#/docs/google-cloud/latest/guides/authentication
// These environment variables are set automatically on Google App Engine
const Datastore = require('@google-cloud/datastore');

// Instantiate a datastore client
const datastore = Datastore();

const findOne = function fineOneSubscriber(subscriber, callback) {
  const q = datastore.createQuery('subscriber')
    .filter('to', '=', subscriber.to)
    .filter('zip', '=', subscriber.zip)
    .filter('method', '=', subscriber.method)
    .limit(1);
  
  datastore.runQuery(q, (err, entities, info) => {
    if (err) {
      return callback(err);
    }
    if (entities && entities.length > 0) {
      callback(null, entities[0]);
    } else {
      callback(null, null);
    }
  });
};

/**
 * Insert a subscriber record into the database.
 *
 * @param {object} subscriber The subscriber record to insert.
 * @param {string} subscriber.zip
 * @param {string} subscriber.to
 * @param {string} subscriber.method
 */
module.exports.create = function createSubscriber(subscriber, callback) {
  async.waterfall([
    function findSubscriber(next) {
      findOne(subscriber, (err, existingSubscriber) => {
        next(err, existingSubscriber);
      });
    },
    function save(existingSubscriber, next) {
      if (!_.isNull(existingSubscriber)) {
        return next(null);
      }

      let data = _.defaults(subscriber, {
        created: new Date()
      });
    
      datastore.save({
        key: datastore.key('subscriber'),
        data: data
      }, next);
    }
  ],(err) => {
    if (err) {
      winston.error('error creating subscriber: ' + err);
      return callback(err);
    }

    winston.info('succesfully created subscriber');
    callback(null, subscriber);
  });
}

module.exports.findOne = findOne;

module.exports.list = function listSubscribers(method, limit, token, callback) {
  const q = datastore.createQuery('subscriber')
    .filter('method', '=', method)
    .limit(limit)
    .start(token);

  datastore.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      callback(err);
      return;
    }
    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    callback(null, entities, hasMore);
  });
}

module.exports.delete = function deleteSubscriber(to, callback) {
  const query = datastore.createQuery('subscriber').filter('to', '=', to);
  datastore.runQuery(query, (err, entities, nextQuery) => {
    if (err) {
      winston.error('datastore error during find for delete: ' + err);
      return callback(err);
    }

    // batch delete
    let keys = entities.map((user) => { return user[Datastore.KEY]; });
    datastore.delete(keys, function (err) {
      if (err) {
        winston.error('datastore error during delete subscribers: ' + err);
        return callback(err);
      }

      winston.info('successfully deleted subscriber(s)');   
      callback();
    });
  });
}