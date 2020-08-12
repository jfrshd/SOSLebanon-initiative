const AWS = require("aws-sdk");
const short = require("short-uuid");
var _dynamodbAutoMarshaller = require("@aws/dynamodb-auto-marshaller");
var marshaller = new _dynamodbAutoMarshaller.Marshaller();
const region = "eu-west-1";
AWS.config.region = region;
const dynamodb = new AWS.DynamoDB();
const cognito = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});

exports.handler = async (event, context) => {
  const user_id = event.sub;
  event = event.requestBody;
  let uuid;
  try {
    if (event.id != '' && event.id != undefined) {
      uuid = event.id.split('#')[1];
      if (user_id != event.id.split('#')[0]) {
        return {
          statusCode: 401,
          statusText: JSON.stringify(
            "you are not authorized to perform this action"
          ),
        };
      }
    } else {
      uuid = short.generate();
    }

    let item = {};
    item.pk = "case";
    item.id = user_id + "#" + uuid; //sk1 sub#uuid
    item.updatedDate = Date.now(); //sk2 date_added
    item.user = user_id;

    item.contactName = event.contactName;
    item.contactEmail = event.contactEmail;
    item.contactPhone = event.contactPhone;
    item.category = event.category;
    item.location = event.location;
    item.description = event.description;
    item.helpDescription = event.helpDescription;
    item.facebookAccount = event.facebookAccount;
    item.instagramAccount = event.instagramAccount;
    item.twitterAccount = event.twitterAccount;
    item.linkedInAccount = event.linkedInAccount;
    item.image = event.image == undefined ? 'N/A' : event.image;
    item.keyword = event.keyword;
    item.fulfilled = event.fulfilled;
    item.active = event.active;
    
    const marshalledItem = marshaller.marshallItem(item);

    const params = {
      TableName: process.env.CASES_TABLE,
      Item: marshalledItem,
    };
    await dynamodb.putItem(params).promise();
    return {
      statusCode: 200,
      statusText: JSON.stringify("Success"),
    };
  }
  catch (e) {
    console.log("error", e);
    return {
      statusCode: 400,
      statusText: JSON.stringify(
        "Something went wrong" + e
      ),
    };
  }
};