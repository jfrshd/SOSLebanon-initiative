const AWS = require("aws-sdk");
var short = require("short-uuid");
const sha1 = require("sha1");
const FileType = require("file-type");
var _dynamodbAutoMarshaller = require("@aws/dynamodb-auto-marshaller");
AWS.config.update({ region: "eu-west-1" });
const s3 = new AWS.S3();
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var marshaller = new _dynamodbAutoMarshaller.Marshaller();
exports.handler = async (event) => {
  console.log(event);
  if (event.hasOwnProperty("profilePicture")) {
    if (event.changedPicture === true) {
      const fileName = event.name;
      const thumb = event.profilePicture;
      const result = await addPictureToS3(thumb, fileName);
      event.profilePicture = await result.specs.full_path;
    }
  }
  const initiativeUUID = short.generate();

  var params = {
    UserPoolId: process.env.USERPOOL_ID,
    Username: event.email,
    DesiredDeliveryMediums: ["SMS", "EMAIL"],
    ForceAliasCreation: false,
    UserAttributes: [
      { Name: "given_name", Value: event.leadName.split(" ")[0] },
      { Name: "family_name", Value: event.leadName.split(" ")[1] },
      { Name: "email", Value: event.email },
      { Name: "phone_number", Value: event.phone.e164Number },
      { Name: "address", Value: '' },
      { Name: "email_verified", Value: "false" },
      { Name: "phone_number_verified", Value: "false" },
      {
        Name: "custom:initiativeId",
        Value: initiativeUUID,
      },
    ],
  };
  try {
    console.log("params", params);
    let newUser = await createUser(params);
    console.log("newUser", newUser);
    if (newUser) {
      const result = await createInitiative(initiativeUUID, event);
      if (result) {
        return {
          statusCode: 200,
          body: "Success",
        };
      } else {
        return {
          statusCode: 400,
          body: "Failed to insert to dynamodb",
        };
      }
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: e.message,
    };
  }
};
const createInitiative = async function (initiativeUUID, event) {
  let item = event;
  item.pk = initiativeUUID;
  item.sk = Date.now();
  const marshalledItem = marshaller.marshallItem(item);
  let params = {
    TableName: process.env.INITIATIVES_TABLE,
    Item: marshalledItem,
  };
  return await ddb.putItem(params).promise();
};

const createUser = async (params) => {
  return new Promise((resolve, reject) => {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
      {
        region: process.env.REGION,
      }
    );
    cognitoIdentityServiceProvider.adminCreateUser(params, function (
      error,
      data
    ) {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};
const addPictureToS3 = async function (imageData, fileName) {
  let base64String = imageData;
  let img = base64String.split(",")[1];
  let buffer = new Buffer(img, "base64");
  let fileMime = await FileType.fromBuffer(buffer);
  let file = getFile(
    fileMime,
    buffer,
    process.env.BUCKET_NAME + "/users-profiles",
    fileName
  );
  let params = file.params;
  let specs = file.uploadFile;
  if (!["png", "jpg", "jpeg", "gif"].includes(specs.ext)) {
    return;
  }
  let result = await s3.putObject(params).promise();
  return { result: result, specs: specs };
};
const getFile = function (fileMime, buffer, bucketName, fileName = null) {
  let fileExt = fileMime.ext;
  let hash = sha1(new Buffer(new Date().toString()));
  // let fileFullPath = hash + '.' + fileExt;;
  let fileNameU = fileName ? fileName : short.generate();
  let fileFullPath = fileNameU + "." + fileExt;
  let params = {
    Bucket: bucketName,
    Key: fileFullPath,
    Body: buffer,
  };
  let uploadFile = {
    size: buffer.toString("ascii").length,
    type: fileMime.mime,
    name: fileFullPath,
    full_path: fileFullPath,
    ext: fileExt,
  };
  return {
    params: params,
    uploadFile: uploadFile,
  };
};
