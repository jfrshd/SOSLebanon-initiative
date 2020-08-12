var AWS = require("aws-sdk");
AWS.config.update({ region: "eu-west-1" });
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
exports.handler = async (event, context) => {
  const user_id = event.sub;
  const id = event.id;
  try {
    if (id != '' && id != undefined) {
      if (user_id != id.split('#')[0]) {
        return {
          statusCode: 401,
          statusText: JSON.stringify(
            "you are not authorized to perform this action"
          ),
        };
      }
    }
    
    await deletePost(id);

    return {
      statusCode: 200,
      statusText: JSON.stringify("Success"),
    }; 
  } catch (e) {
    console.log("error", e);
    return {
      statusCode: 401,
      statusText: JSON.stringify(
        "Something wrong happened while deleting case"
      ),
    };
  }
};

let deletePost = function (id) {
  let params = {
    TableName: process.env.CASES_TABLE,
    Key: {
      pk: { S: "help" },
      id: { S: id },
    },
  };
  return ddb.deleteItem(params).promise();
};
