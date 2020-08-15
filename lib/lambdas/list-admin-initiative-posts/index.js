"use strict";
var _dynamodbAutoMarshaller = require("@aws/dynamodb-auto-marshaller");
var AWS = require("aws-sdk");
AWS.config.update({ region: "eu-west-1" });
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var marshaller = new _dynamodbAutoMarshaller.Marshaller();
exports.handler = async (event) => {
  const user_id = event.sub;
  let params = {
    TableName: process.env.POSTS_TABLE,
    // IndexName: "creationDate",
    // ScanIndexForward: false,
    KeyConditionExpression: "pk = :pk and begins_with(id, :user_id)",
    ExpressionAttributeValues: {
      ":pk": { S: "help" },
      ":user_id": { S: user_id },
    },
  };

  if (
    event.hasOwnProperty("lastEvaluatedKey") &&
    event.lastEvaluatedKey.length > 0
  )
    params.ExclusiveStartKey = JSON.parse(
      decodeURIComponent(event.lastEvaluatedKey)
    );

  params.Limit = event.hasOwnProperty("limit") ? event.limit : 10;

  try {
    let result = await ddb.query(params).promise();
    result.Items = result.Items.map((item) => {
      return marshaller.unmarshallItem(item);
    });

    if (result.hasOwnProperty("LastEvaluatedKey"))
      result.LastEvaluatedKey = marshaller.unmarshallItem(
        result.LastEvaluatedKey
      );

    return {
      statusCode: 200,
      result,
    };
  } catch (e) {
    console.log("error", e);
    return {
      statusCode: 400,
      statusText: JSON.stringify(
        "Something went wrong" + e
      ),
    };
  }
};
