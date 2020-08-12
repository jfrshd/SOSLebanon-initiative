global.fetch = require("node-fetch");
const {
  CognitoUserSession,
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} = require("amazon-cognito-identity-js");
const AWS = require("aws-sdk");

const POOL_DATA = {
  UserPoolId: "eu-west-1_YmqI44Qj4",
  ClientId: "5etp2ee2aqe0utmsoqj3qaeg91",
  // IdentityPoolID: 'eu-west-1:37caf79b-917c-401e-b13a-25c663a7108e',
  // YOUR_USER_POOL_ID_IDP: 'cognito-idp.eu-west-1.amazonaws.com/eu-west-1_1NLLUq3Th'
};

const userPool = new CognitoUserPool(POOL_DATA);
const region = "eu-west-1";

function signIn(username, password, fn) {
  const authData = {
    Username: username,
    Password: password,
  };
  const authDetails = new AuthenticationDetails(authData);
  const userData = {
    Username: username,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);
  const that = this;
  cognitoUser.authenticateUser(authDetails, {
    onSuccess(result) {
      // console.log(result);
      console.log("signIn succeeded");
      fn(username);
    },
    onFailure(err) {
      console.log(err);
    },
  });
}

function call(username) {
  const data = {
    UserPoolId: POOL_DATA.UserPoolId,
    ClientId: POOL_DATA.ClientId,
    Paranoia: 8,
  };

  const userPool = new CognitoUserPool(data);
  const cognitoUser = userPool.getCurrentUser();

  try {
    if (cognitoUser != null) {
      cognitoUser.getSession((_err, session) => {
        if (_err) {
          console.log("error", _err);
        }
        console.log(session.getIdToken().getJwtToken());
      });
    } else {
      console.log("cognitoUser null");
    }
  } catch (e) {
    console.log(e);
    console.log("error", e);
  }
}

signIn("jfrshd94@gmail.com", "jaafar179", call);
