const AWS = require("aws-sdk");
const sharp = require("sharp");
const s3 = new AWS.S3();
var short = require("short-uuid");
const sha1 = require("sha1");
AWS.config.update({ region: "eu-west-1" });
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

const fileType = require("file-type");
exports.handler = async (event) => {
  console.log("event:", event);
  event = {
    initiativeName: "",
    picture: "",
    changedPicture: true,
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    leadName: "",
    categories: "",
    description: "",
    locations: "",
    facebook: "",
    instagram: "",
    twitter: "",
    linkedIn: "",
  };

  if( password != confirmPassword){
      return {
        statusCode: 200,
        body: JSON.stringify('Passwords don\'t match'),
      };
  }

  if (event.picture) {
    if (event.changedPicture === true) {
      const fileName = event.initiativeName;
      const thumb = await resizeBaseImage(event.picture);
      const result = await addPictureToS3(thumb, fileName);
      event.picture = await result.specs.full_path;
    }
  }
  var params = {
    UserPoolId: process.env.USERPOOL_ID,
    Username: event.email,
    DesiredDeliveryMediums: ["SMS", "EMAIL"],
    ForceAliasCreation: false,
    TemporaryPassword: event.password,
    UserAttributes: [
      // { Name: "name", Value: event.name },
      { Name: "email", Value: event.email },
      { Name: "phone_number", Value: event.phone_number },
      { Name: "email_verified", Value: "true" },
      { Name: "phone_number_verified", Value: "true" },
      // { Name: "custom:pmdCode", Value: event['custom:pmdCode'] },
      // { Name: "custom:syndicateId", Value: event['custom:syndicateId'] },
      // { Name: "custom:location", Value: event['custom:location'] },
      // { Name: "custom:parentAccount", Value: event['custom:parentAccount'] },
      // { Name: "custom:deviceId", Value: event['custom:deviceId'] ? event['custom:deviceId'] : '' },
      // { Name: "custom:accessRole", Value: event['custom:accessRole'] },
      // { Name: "custom:parentAccount", Value: event['custom:parentAccount'] ? event['custom:parentAccount'] : '' },
      // { Name: "custom:deviceToken", Value: event['custom:deviceToken'] ? event['custom:deviceToken'] : '' },
      {
        Name: "custom:PharmacyPhoneNumber",
        Value: event["custom:PharmacyPhoneNumber"]
          ? event["custom:PharmacyPhoneNumber"]
          : "",
      },
      {
        Name: "custom:pharmacistName",
        Value: event["custom:pharmacistName"]
          ? event["custom:pharmacistName"]
          : "",
      },
      {
        Name: "custom:pharmacyName",
        Value: event["custom:pharmacyName"] ? event["custom:pharmacyName"] : "",
      },
      // { Name: "custom:pmdPharmacyCode", Value: event.username },
      {
        Name: "custom:pmdPharmacyCode",
        Value: event["custom:pmdPharmacyCode"]
          ? event["custom:pmdPharmacyCode"]
          : "",
      },
      {
        Name: "custom:syndicateNumber",
        Value: event["custom:syndicateNumber"]
          ? event["custom:syndicateNumber"]
          : "",
      },
      {
        Name: "custom:vatNumber",
        Value: event["custom:vatNumber"] ? event["custom:vatNumber"] : "",
      },
      { Name: "picture", Value: event.picture ? event.picture : "no-image" },
      { Name: "custom:isBanned", Value: "NO" },

      {
        Name: "custom:canReward",
        Value: event["custom:canReward"]
          ? event["custom:canReward"]
            ? "YES"
            : "NO"
          : "NO",
      },
      {
        Name: "custom:canBalance",
        Value: event["custom:canBalance"]
          ? event["custom:canBalance"]
            ? "YES"
            : "NO"
          : "NO",
      },
      {
        Name: "custom:canSurvey",
        Value: event["custom:canSurvey"]
          ? event["custom:canSurvey"]
            ? "YES"
            : "NO"
          : "NO",
      },
      {
        Name: "custom:isAdmin",
        Value: event["custom:isAdmin"] ? event["custom:isAdmin"] : "NO",
      },
      { Name: "custom:empId", Value: event.empId ? event.empId : "" },
    ],
  };

  let newUser = await createUser(params);
  console.log("newUser:", newUser);
  if (newUser) {
    let sub;
    newUser.User.Attributes.forEach((item) => {
      if (item.Name == "sub") {
        sub = item.Value;
      }
    });
    await createUserInfotTable(
      sub,
      event.email,
      event.phone_number,
      event["custom:pharmacistName"],
      event["custom:pharmacyName"],
      event["custom:syndicateNumber"],
      event["custom:pmdPharmacyCode"],
      event["custom:PharmacyPhoneNumber"],
      event["custom:isAdmin"],
      event.empId
    );
  }
  try {
    if (event["custom:isAdmin"] === "YES") {
      await assignUserToGroup(event, "admins");
    } else {
      await assignUserToGroup(event, "employees");
    }
  } catch (err) {
    console.log("--- cant add to group:", err);
  }
  // return newUser;
  // TODO implement
  const response = {
    statusCode: 200,
    body: JSON.stringify(newUser),
  };
  return response;
};

let createUser = async (params) => {
  return new Promise((resolve, reject) => {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
      {
        region: "eu-west-1",
        accessKeyId: "AKIAUT6ALTW6GWAZ7W7X",
        secretAccessKey: "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",
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

let assignUserToGroup = async (event, groupName) => {
  let params = {
    GroupName: groupName,
    Username: event.username,
    UserPoolId: "eu-west-1_6p16GHYbH",
  };
  return new Promise((resolve, reject) => {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
      {
        region: "eu-west-1",
        accessKeyId: "AKIAUT6ALTW6GWAZ7W7X",
        secretAccessKey: "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",
      }
    );
    cognitoIdentityServiceProvider.adminAddUserToGroup(params, function (
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

let revokeUserFromGroup = async (event) => {
  let params = {
    GroupName: event.oldAccessRole,
    Username: event.username,
    // "UserPoolId": "eu-west-1_2nqygVXiS",
    UserPoolId: "eu-west-1_6p16GHYbH",
  };
  return new Promise((resolve, reject) => {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
      {
        region: "eu-west-1",
        accessKeyId: "AKIAUT6ALTW6GWAZ7W7X",
        secretAccessKey: "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",
      }
    );
    cognitoIdentityServiceProvider.adminRemoveUserFromGroup(params, function (
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

let resizeBaseImage = async function (imageBase64) {
  let parts = imageBase64.split(";");
  let mimType = parts[0].split(":")[1];
  let imageData = parts[1].split(",")[1];

  var inputBuffer = new Buffer.from(imageData, "base64");

  // if (!['png', 'jpg', 'jpeg', 'gif'].includes(imageData)) {
  //     return imageBase64;
  // }
  let resizedImageBuffer = await sharp(inputBuffer).resize(100, 100).toBuffer();
  let resizedImageData = resizedImageBuffer.toString("base64");
  let resizedBase64 = `data:${mimType};base64,${resizedImageData}`;
  return resizedBase64;
};

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

let createUserInfotTable = async function (
  sub,
  email,
  phoneNumber,
  pharmacistName,
  pharmacyName,
  syndicateRegistrationNumber,
  pmdPharmacyCode,
  pharmacyPhoneNumber,
  isAdmin,
  empId
) {
  if (isAdmin === "YES") {
    let sk = pmdPharmacyCode;
    let params = {
      TableName: "pmd-connect-app-user-info",
      Item: {
        pk: { S: "userLoyalty" },
        sk: { S: sk },
        sk2: { S: "active#" + sk },
        loyaltyPoints: { N: "0" },
        status: { S: "active" },
        user: {
          M: {
            pharmacistName: {
              S: pharmacistName,
            },
            pharmacyName: {
              S: pharmacyName,
            },
            syndicateRegistrationNumber: {
              S: syndicateRegistrationNumber,
            },
            email: {
              S: email,
            },
            phone_number: {
              S: phoneNumber,
            },
            pmdPharmacyCode: {
              S: pmdPharmacyCode,
            },
            pharmacyPhoneNumber: {
              S: pharmacyPhoneNumber,
            },
            sub: {
              S: sub,
            },
          },
        },
      },
    };
    await ddb.putItem(params).promise();
    // params = {
    //     TableName: 'pmd-connect-app-user-info',
    //     Item: {
    //       "pk": { S: 'user-info' },
    //       "sk": { S: sk },
    //       "sk2": { S: 'active#' + sk },
    //       "myBalance": { N: "0" },
    //       "status": { S: 'active' },
    //       "initial": { BOOL : true },
    //       "firstDueInvoiceDate": { S: '-' },
    //       "lastInvoiceDate": { S: '-' },
    //       "lastPaymentInvoiceDate": { S: '-' },
    //       "pmdCode": { S: pmdPharmacyCode },
    //       "user": {
    //         "M": {
    //           "pharmacistName": {
    //             "S": pharmacistName
    //           },
    //           "pharmacyName": {
    //             "S": pharmacyName
    //           },
    //           "syndicateRegistrationNumber": {
    //             "S": syndicateRegistrationNumber
    //           },
    //           "email": {
    //             "S": email
    //           },
    //           "phone_number": {
    //             "S": phoneNumber
    //           },
    //           "pmdPharmacyCode": {
    //             "S": pmdPharmacyCode
    //           },
    //           "pharmacyPhoneNumber": {
    //             "S": pharmacyPhoneNumber
    //           },
    //           "sub": {
    //             "S": sub
    //           }
    //         }
    //       },
    //     }
    // }
    // let result = await ddb.putItem(params).promise();
  }
};
