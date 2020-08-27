import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as cognito from "@aws-cdk/aws-cognito";
import * as iam from "@aws-cdk/aws-iam";
import * as ses from "@aws-cdk/aws-ses";
import { Duration } from "@aws-cdk/core";
import * as defaults from "../extras/defaults";
import * as lambda from "@aws-cdk/aws-lambda";
import * as path from "path";
import { Bucket } from "@aws-cdk/aws-s3";
const dotenv = require("dotenv");

dotenv.config({ path: __dirname + "/../../.env" });

export class SoslebanonInitiativeStack extends cdk.Stack {
  accessKeyId: string;
  secretAccessKey: string;

  api: apigw.RestApi;
  initiativesTable: dynamodb.Table;
  casesTable: dynamodb.Table;
  settingsTable: dynamodb.Table;
  authorizer: apigw.CfnAuthorizer;
  userPool: cognito.UserPool;
  bucket: Bucket;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.accessKeyId = process.env.ACCESS_KEY_ID ?? "";
    this.secretAccessKey = process.env.SECRET_ACCESS_KEY ?? "";

    this.api = new apigw.RestApi(this, "SOSInitiativeLebanonAPI");
    this.bucket = new Bucket(this, "soslebanon-initiative-bucket", {
      bucketName: "soslebanon-initiative-bucket2",
      publicReadAccess: true,
    });

    this.createInitiativeCognito();
    this.createInitiativestable();
    this.createCasesTable();
    this.createSettingstable();
    this.createAPIResources();
  }

  //api resources
  createAPIResources() {
    const initiativeApiResource = this.api.root.addResource("initiative");
    initiativeApiResource.addMethod(
      "OPTIONS",
      defaults.mockIntegration,
      defaults.options
    );

    this.createInitiativeFunction(initiativeApiResource);

    /* case api resources */
    const caseApiResource = this.api.root.addResource("case");
    caseApiResource.addMethod(
      "OPTIONS",
      defaults.mockIntegration,
      defaults.options
    );

    this.createCaseFunction(caseApiResource);
    this.deleteCaseFunction(caseApiResource);
    this.getCaseFunction(caseApiResource);

    const listCasesApiResource = this.api.root.addResource("cases");
    listCasesApiResource.addMethod(
      "OPTIONS",
      defaults.mockIntegration,
      defaults.options
    );

    this.listCasesFunction(listCasesApiResource);

    const userCasesApiResource = this.api.root.addResource("usercases");
    userCasesApiResource.addMethod(
      "OPTIONS",
      defaults.mockIntegration,
      defaults.options
    );

    this.listInitiativeCaesFunction(userCasesApiResource);

    /* location api resource */
    const locationApiResource = this.api.root.addResource("locations");
    locationApiResource.addMethod(
      "OPTIONS",
      defaults.mockIntegration,
      defaults.options
    );

    this.ListLocationsFunction(locationApiResource);
    /* category api resource */
    const categoriesApiResource = this.api.root.addResource("categories");
    categoriesApiResource.addMethod(
      "OPTIONS",
      defaults.mockIntegration,
      defaults.options
    );

    this.ListCategoriesFunction(categoriesApiResource);
  }

  /* dynamo db tables */
  createInitiativestable(): void {
    this.initiativesTable = new dynamodb.Table(this, "initiatives-table", {
      tableName: "initiatives",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }

  createCasesTable(): void {
    this.casesTable = new dynamodb.Table(this, "cases-table", {
      tableName: "cases-table",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    this.casesTable.addLocalSecondaryIndex({
      indexName: "updatedDate",
      sortKey: {
        name: "updatedDate",
        type: dynamodb.AttributeType.NUMBER,
      },
    });
    this.casesTable.addLocalSecondaryIndex({
      indexName: "categoryId",
      sortKey: {
        name: "categoryId",
        type: dynamodb.AttributeType.STRING,
      },
    });
  }

  createSettingstable(): void {
    this.settingsTable = new dynamodb.Table(this, "settings-table", {
      tableName: "settings-table",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }

  /* coginto for initiative */
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

    this.authorizer = new apigw.CfnAuthorizer(this, "APIGatewayAuthorizer", {
      name: "cognito-authorizer",
      identitySource: "method.request.header.Authorization",
      providerArns: [cfnUserPool.attrArn],
      restApiId: this.api.restApiId,
      type: apigw.AuthorizationType.COGNITO,
    });

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

  /* initiative function */
  createInitiativeFunction(initiativeApiResource: apigw.Resource) {
    const registerInitiative = new lambda.Function(
      this,
      "register-initiative",
      {
        functionName: "register-initiative",
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambdas/register-initiative")
        ),
        environment: {
          INITIATIVES_TABLE: this.initiativesTable.tableName,
          USERPOOL_ID: this.userPool.userPoolId,
          REGION: this.region,
          ACCESS_KEY_ID: this.accessKeyId,
          SECRET_ACCESS_KEY: this.secretAccessKey,
          BUCKET_NAME: this.bucket.bucketName,
        },
      }
    );

    this.initiativesTable.grantReadWriteData(registerInitiative);
    this.bucket.grantReadWrite(registerInitiative);

    initiativeApiResource.addMethod(
      "POST",
      defaults.lambdaIntegration(registerInitiative, {}),
      defaults.options
    );
  }

  /* cases function */
  createCaseFunction(adminApiResource: apigw.Resource) {
    const postCase = new lambda.Function(this, "post-case", {
      functionName: "post-case",
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/post-case")),
      environment: {
        CASES_TABLE: this.casesTable.tableName,
      },
    });

    this.casesTable.grantReadWriteData(postCase);

    adminApiResource.addMethod(
      "POST",
      defaults.lambdaIntegration(postCase, {
        "application/json":
          '{\n"requestBody": $input.body,\n"sub": "$context.authorizer.claims.sub"\n}',
      }),
      {
        ...defaults.options,
        authorizationType: apigw.AuthorizationType.COGNITO,
        authorizer: { authorizerId: this.authorizer.ref },
      }
    );
  }

  deleteCaseFunction(adminApiResource: apigw.Resource) {
    const getTypePosts = new lambda.Function(this, "delete-case", {
      functionName: "delete-case",
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambdas/delete-case")
      ),
      environment: {
        CASES_TABLE: this.casesTable.tableName,
      },
    });

    this.casesTable.grantWriteData(getTypePosts);

    adminApiResource.addMethod(
      "DELETE",
      defaults.lambdaIntegration(getTypePosts, {
        "application/json": `
            #set($hasId = $input.params('id'))
            {
              "sub": "$context.authorizer.claims.sub"
              #if($hasId != ""), "id" : "$input.params('id')"#end
            }
          `,
      }),
      {
        ...defaults.options,
        authorizationType: apigw.AuthorizationType.COGNITO,
        authorizer: { authorizerId: this.authorizer.ref },
      }
    );
  }

  listCasesFunction(latestPostsApiResource: apigw.Resource) {
    const getLatestPosts = new lambda.Function(this, "list-cases", {
      functionName: "list-cases",
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambdas/list-cases")
      ),
      environment: {
        CASES_TABLE: this.casesTable.tableName,
        identityPoolId: this.userPool.userPoolId,
      },
    });

    this.casesTable.grantReadData(getLatestPosts);

    getLatestPosts.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction", "cognito-idp:*"],
        resources: ["*"],
      })
    );

    latestPostsApiResource.addMethod(
      "GET",
      defaults.lambdaIntegration(getLatestPosts, {
        "application/json": `
        #set($hasLastEvaluatedKey = $input.params('LastEvaluatedKey'))
        #set($hasLimit = $input.params('limit'))
        #set($hasTypeId = $input.params('categoryId'))
        #set($hasKeyword = $input.params('keyword'))
        {
        #if($hasLimit != "") "limit" : "$input.params('limit')"#end
        #if($hasTypeId != ""), "typeId" : "$input.params('categoryId')"#end
        #if($hasKeyword != ""), "keyword" : "$input.params('keyword')"#end
        #if($hasLastEvaluatedKey != ""), "LastEvaluatedKey" : "$input.params('LastEvaluatedKey')"#end
        }
        `,
      }),
      defaults.options
    );
  }

  listInitiativeCaesFunction(adminApiResource: apigw.Resource) {
    const listInitiativeCaes = new lambda.Function(
      this,
      "list-initiative-cases",
      {
        functionName: "list-initiative-cases",
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambdas/list-initiative-cases")
        ),
        environment: {
          POSTS_TABLE: this.casesTable.tableName,
        },
      }
    );

    this.casesTable.grantReadData(listInitiativeCaes);

    adminApiResource.addMethod(
      "GET",
      defaults.lambdaIntegration(listInitiativeCaes, {
        "application/json": '{\n"sub": "$context.authorizer.claims.sub"\n}',
      }),
      {
        ...defaults.options,
        authorizationType: apigw.AuthorizationType.COGNITO,
        authorizer: { authorizerId: this.authorizer.ref },
      }
    );
  }

  getCaseFunction(postApiResource: apigw.Resource) {
    const getCase = new lambda.Function(this, "get-case", {
      functionName: "get-case",
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/get-case")),
      environment: {
        POSTS_TABLE: this.casesTable.tableName,
      },
    });

    this.casesTable.grantReadData(getCase);

    postApiResource.addMethod(
      "GET",
      defaults.lambdaIntegration(getCase, {
        "application/json": `
          #set($hasId = $input.params('id'))
          {
            #if($hasId != "") "id" : "$input.params('id')"#end
          }
        `,
      }),
      defaults.options
    );
  }

  /* location functions */
  ListLocationsFunction(locationApiResource: apigw.Resource) {
    const listLocations = new lambda.Function(this, "list-locations", {
      functionName: "list-locations",
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambdas/list-locations")
      ),
      environment: {
        SETTINGS_TABLE: this.settingsTable.tableName,
      },
    });

    this.settingsTable.grantReadData(listLocations);

    locationApiResource.addMethod(
      "GET",
      defaults.lambdaIntegration(listLocations, {}),
      defaults.options
    );
  }

  /* category functions */
  ListCategoriesFunction(typeApiResource: apigw.Resource) {
    const listCagetories = new lambda.Function(this, "list-categories", {
      functionName: "list-categories",
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambdas/list-categories")
      ),
      environment: {
        SETTINGS_TABLE: this.settingsTable.tableName,
      },
    });

    this.settingsTable.grantReadData(listCagetories);

    typeApiResource.addMethod(
      "GET",
      defaults.lambdaIntegration(listCagetories, {}),
      defaults.options
    );
  }
}
