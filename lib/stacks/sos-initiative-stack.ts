import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as cognito from "@aws-cdk/aws-cognito";
import * as iam from "@aws-cdk/aws-iam";
import * as ses from "@aws-cdk/aws-ses";
import { Duration } from "@aws-cdk/core";

export class SoslebanonInitiativeStack extends cdk.Stack {
  api: apigw.RestApi;
  postsTable: dynamodb.Table;
  settingsTable: dynamodb.Table;
  authorizer: apigw.CfnAuthorizer;
  userPool: cognito.UserPool;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.createInitiativeCognito();
  }

  createInitiativeCognito(): void {
    const confSet = new ses.CfnConfigurationSet(
      this,
      "soslebanon-initiative-conf-set",
      {
        name: "soslebanon-initiative-ses-conf-set",
      }
    );

    this.userPool = new cognito.UserPool(
      this,
      "soslebanon-initiative-user-pool",
      {
        userPoolName: "soslebanon-initiative-user-pool",
        selfSignUpEnabled: true,
        signInAliases: {
          username: false,
          email: true,
        },
        standardAttributes: {
          givenName: { mutable: true, required: true },
          familyName: { mutable: true, required: true },
          email: { mutable: true, required: true },
          phoneNumber: { mutable: true, required: true },
          address: { mutable: true, required: true },
        },
        customAttributes: {
          initiativeId: new cognito.StringAttribute({ mutable: true }),
        },
        autoVerify: {
          email: true,
          phone: true,
        },
        passwordPolicy: {
          minLength: 8,
          requireLowercase: false,
          requireDigits: false,
          requireSymbols: false,
          requireUppercase: false,
          tempPasswordValidity: Duration.days(7),
        },
        // emailSettings: {
        //   from: "helpdesk@soslebanon.com",
        //   replyTo: "helpdesk@soslebanon.com",
        // },
        signInCaseSensitive: true,
        accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      }
    );

    const cfnUserPool = this.userPool.node.defaultChild as cognito.CfnUserPool;
    // cfnUserPool.emailConfiguration = {
    //   configurationSet: confSet.ref,
    //   emailSendingAccount: "DEVELOPER",
    //   from: "helpdesk@soslebanon.com",
    //   replyToEmailAddress: "helpdesk@soslebanon.com",
    //   sourceArn:
    //     "arn:aws:ses:eu-west-1:218561861583:identity/helpdesk@soslebanon.com",
    // };

    // this.authorizer = new apigw.CfnAuthorizer(this, "APIGatewayAuthorizer", {
    //   name: "cognito-authorizer",
    //   identitySource: "method.request.header.Authorization",
    //   providerArns: [cfnUserPool.attrArn],
    //   restApiId: this.api.restApiId,
    //   type: apigw.AuthorizationType.COGNITO,
    // });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      "soslebanon-initiative-client",
      {
        userPoolClientName: "soslebanon-initiative-client",
        generateSecret: false,
        userPool: this.userPool,
      }
    );
    const identityPool = new cognito.CfnIdentityPool(
      this,
      "soslebanon-initiative-identity-pool",
      {
        identityPoolName: "soslebanon-initiative-identity-pool",
        allowUnauthenticatedIdentities: false,
        cognitoIdentityProviders: [
          {
            clientId: userPoolClient.userPoolClientId,
            providerName: this.userPool.userPoolProviderName,
          },
        ],
      }
    );
    // const unauthenticatedRole = new iam.Role(
    //   this,
    //   "CognitoDefaultUnauthenticatedRole",
    //   {
    //     assumedBy: new iam.FederatedPrincipal(
    //       "cognito-identity.amazonaws.com",
    //       {
    //         StringEquals: {
    //           "cognito-identity.amazonaws.com:aud": identityPool.ref,
    //         },
    //         "ForAnyValue:StringLike": {
    //           "cognito-identity.amazonaws.com:amr": "unauthenticated",
    //         },
    //       },
    //       "sts:AssumeRoleWithWebIdentity"
    //     ),
    //   }
    // );
    // unauthenticatedRole.addToPolicy(
    //   new PolicyStatement({
    //     effect: Effect.ALLOW,
    //     actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
    //     resources: ["*"],
    //   })
    // );

    const authenticatedRole = new iam.Role(
      this,
      "CognitoDefaultAuthenticatedRole",
      {
        assumedBy: new iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
      }
    );

    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*",
        ],
        resources: ["*"],
      })
    );

    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: ["*"],
      })
    );

    const defaultPolicy = new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleMapping",
      {
        identityPoolId: identityPool.ref,
        roles: {
          // unauthenticated: unauthenticatedRole.roleArn,
          authenticated: authenticatedRole.roleArn,
        },
      }
    );
  }
}
