'use strict';
const logme = require('logme');

// By default, the client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GCLOUD_PROJECT environment variable. See
// https://googlecloudplatform.github.io/gcloud-node/#/docs/google-cloud/latest/guides/authentication
// These environment variables are set automatically on Google App Engine
const Datastore = require('@google-cloud/datastore');

// Instantiate a datastore client
const datastore = Datastore();


/**
 * Insert a subscriber record into the database.
 *
 * @param {object} subscriber The subscriber record to insert.
 * @param {string} subscriber.zip
 * @param {string} subscriber.to
 * @param {string} subscriber.method
 */
module.exports.create = function createSubscriber(subscriber, callback) {
  datastore.save({
    key: datastore.key('subscriber'),
    data: subscriber
  }).then(function () {
    logme.info('succesfully created subscriber');
    callback(null, subscriber);
  }).catch(function (err) {
    logme.error('error creating subscriber: ' + err);
    callback(err);
  });
}

module.exports.findByEmail = function findSubscriberByEmail(subscriber, callback) {
  callback();
}

module.exports.findByPhone = function findSubscriberByPhone(subscriber, callback) {
  callback();
}

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

module.exports.delete = function deleteSubscriber(contact, callback) {
  const query = datastore.createQuery('subscriber').filter('to', '=', contact);
  datastore.runQuery(query, (err, entities, nextQuery) => {
    if(err) {
      callback(err);
      return;
    } else {
      entities.forEach(function(user) {
        user.key.delete();
      });
      callback();
    }
  });
}