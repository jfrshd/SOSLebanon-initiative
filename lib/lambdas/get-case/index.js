"use strict";
var _dynamodbAutoMarshaller = require("@aws/dynamodb-auto-marshaller");
var AWS = require("aws-sdk");
AWS.config.update({ region: "eu-west-1" });
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var marshaller = new _dynamodbAutoMarshaller.Marshaller();
exports.handler = async (event) => {
  const id = event.id;
  let params = {
    TableName: process.env.CASES_TABLE,
    // IndexName: "creationDate",
    // ScanIndexForward: false,
    KeyConditionExpression: "pk = :pk and id = :id",
    ExpressionAttributeValues: {
      ":pk": { S: "help" },
      ":id": { S: id },
    },
  };

  try {
    let result = await ddb.query(params).promise();
    result.Items = result.Items.map((item) => {
      return marshaller.unmarshallItem(item);
    });
    result = result.Count == 1 ? result.Items[0] : null;
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
