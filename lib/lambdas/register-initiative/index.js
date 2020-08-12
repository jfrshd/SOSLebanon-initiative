const AWS = require("aws-sdk");
var short = require("short-uuid");
const sha1 = require("sha1");
// const sharp = require("sharp");
const fileType = require("file-type");
var _dynamodbAutoMarshaller = require("@aws/dynamodb-auto-marshaller");

AWS.config.update({ region: "eu-west-1" });

const s3 = new AWS.S3();
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var marshaller = new _dynamodbAutoMarshaller.Marshaller();

exports.handler = async (event) => {
  console.log("event:", event);

  if (event.password != event.confirmPassword) {
    return {
      statusCode: 200,
      body: JSON.stringify("Passwords don't match"),
    };
  }

  if (event.hasOwnProperty("profilePicture")) {
    if (event.changedPicture === true) {
      const fileName = event.name;
      //   const thumb = await resizeBaseImage(event.profilePicture);
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
    TemporaryPassword: event.password,
    UserAttributes: [
      { Name: "given_name", Value: event.leadName.split(" ")[0] },
      { Name: "family_name", Value: event.leadName.split(" ")[1] },
      { Name: "email", Value: event.email },
      { Name: "phone_number", Value: event.phone },
      { Name: "address", Value: event.phone },
      { Name: "email_verified", Value: "false" },
      { Name: "phone_number_verified", Value: "false" },
      {
        Name: "custom:initiativeId",
        Value: initiativeUUID,
      },
    ],
  };
  let newUser = await createUser(params);
  if (newUser) {
    // let sub;
    // newUser.User.Attributes.forEach((item) => {
    //   if (item.Name == "sub") {
    //     sub = item.Value;
    //   }
    // });
    console.log(await createInitiative(initiativeUUID, event));
  }
  const response = {
    statusCode: 200,
    body: JSON.stringify(newUser),
  };
  return response;
};

let createInitiative = async function (initiativeUUID, event) {
  let item = event;
  item.pk = initiativeUUID;
  item.sk = Date.now();
  console.log(item);
  const marshalledItem = marshaller.marshallItem(item);

  let params = {
    TableName: process.env.INITIATIVES_TABLE,
    Item: marshalledItem,
  };
  return await ddb.putItem(params).promise();
};

let createUser = async (params) => {
  return new Promise((resolve, reject) => {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
      {
        region: process.env.REGION,
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
      }
    );
    cognitoIdentityServiceProvider.adminCreateUser(params, function (
      error,
      data
    ) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

// let resizeBaseImage = async function (imageBase64) {
//   let parts = imageBase64.split(";");
//   let mimType = parts[0].split(":")[1];
//   let imageData = parts[1].split(",")[1];

//   var inputBuffer = new Buffer.from(imageData, "base64");

//   // if (!['png', 'jpg', 'jpeg', 'gif'].includes(imageData)) {
//   //     return imageBase64;
//   // }
//   let resizedImageBuffer = await sharp(inputBuffer).resize(100, 100).toBuffer();
//   let resizedImageData = resizedImageBuffer.toString("base64");
//   let resizedBase64 = `data:${mimType};base64,${resizedImageData}`;
//   return resizedBase64;
// };

let addPictureToS3 = async function (imageData, fileName) {
  let base64String = imageData;
  let img = base64String.split(",")[1];

  let buffer = new Buffer(img, "base64");
  let fileMime = fileType(buffer);

  let file = getFile(
    fileMime,
    buffer,
    "pmd-connect-app-media/users-profiles",
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

let getFile = function (fileMime, buffer, bucketName, fileName = null) {
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
