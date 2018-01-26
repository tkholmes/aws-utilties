// @ts-nocheck
const AWS = require('aws-sdk');

/**
 * Stops all EC2s that don't have the AutoMangeState=false tag set and that are running.
 */
exports.handler = function(event, context, callback) {
  let ec2 = new AWS.EC2({
    apiVersion: '2016-11-15',
    region: event.region
  });

  let params = {
    DryRun: false
  };

  ec2.describeInstances(params).promise()
    .then((instances) => {
      return filterRunningInstances(instances);
    })
    .then((instanceIds) => {
      params.InstanceIds = instanceIds;

      if (instanceIds.length > 0)
        return ec2.stopInstances(params).promise();
      else
        return Promise.resolve("No instances needed to be stopped.");
    })
    .then((output) => {
      callback(null, output);
    })
    .catch((error) => {
      callback(error);
    });
}

/**
 * Filters out objects that are running and don't have the AutoManageState=false tag set.
 * @param  {Object} data - Response from AWS EC2.describeInstances
 * @returns {Promise} Promise of an Array of EC2 InstanceIds to shutdown.
 */
function filterRunningInstances (data) {
  let instances = data.Reservations[0].Instances;
  let toBeShutdown = [];

  // Find all running instances that don't have the AutoManageState=false tag.
  for (let instance of instances) {
    if (instance.State.Name !== 'running')
      continue;

    if (hasTagValue(instance.Tags, 'AutoManageState', 'false'))
      continue;
    else
      toBeShutdown.push(instance.InstanceId);
  }

  return Promise.resolve(toBeShutdown);
}

/**
 * Determines whether a array of tagObjects has the given key/value.
 * @param  {} tagObjects
 * @param  {string} key
 * @param  {string} value
 */
function hasTagValue(tags, key, value) {
  for (let tag of tags) {
    if (tag.Key === key && tag.Value === value)
      return true;
  }

  return false;
}