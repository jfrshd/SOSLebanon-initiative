"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("@aws-cdk/core");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const apigw = require("@aws-cdk/aws-apigateway");
const cognito = require("@aws-cdk/aws-cognito");
const iam = require("@aws-cdk/aws-iam");
const ses = require("@aws-cdk/aws-ses");
const core_1 = require("@aws-cdk/core");
const defaults = require("../extras/defaults");
const lambda = require("@aws-cdk/aws-lambda");
const path = require("path");
const aws_s3_1 = require("@aws-cdk/aws-s3");
const dotenv = require("dotenv");
dotenv.config({ path: __dirname + "/../../.env" });
class SoslebanonInitiativeStack extends cdk.Stack {
    constructor(scope, id, props) {
        var _a, _b;
        super(scope, id, props);
        this.accessKeyId = (_a = process.env.ACCESS_KEY_ID, (_a !== null && _a !== void 0 ? _a : ""));
        this.secretAccessKey = (_b = process.env.SECRET_ACCESS_KEY, (_b !== null && _b !== void 0 ? _b : ""));
        this.api = new apigw.RestApi(this, "SOSInitiativeLebanonAPI");
        this.bucket = new aws_s3_1.Bucket(this, "soslebanon-initiative-bucket", {
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
        initiativeApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.createInitiativeFunction(initiativeApiResource);
        /* case api resources */
        const caseApiResource = this.api.root.addResource("case");
        caseApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.createCaseFunction(caseApiResource);
        this.deleteCaseFunction(caseApiResource);
        this.getCaseFunction(caseApiResource);
        const listCasesApiResource = this.api.root.addResource("cases");
        listCasesApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.listCasesFunction(listCasesApiResource);
        const userCasesApiResource = this.api.root.addResource("usercases");
        userCasesApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.listInitiativeCaesFunction(userCasesApiResource);
        /* location api resource */
        const locationApiResource = this.api.root.addResource("locations");
        locationApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.ListLocationsFunction(locationApiResource);
        /* category api resource */
        const categoriesApiResource = this.api.root.addResource("categories");
        categoriesApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.ListCategoriesFunction(categoriesApiResource);
    }
    /* dynamo db tables */
    createInitiativestable() {
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
    createCasesTable() {
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
    createSettingstable() {
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
    createInitiativeCognito() {
        const confSet = new ses.CfnConfigurationSet(this, "soslebanon-initiative-conf-set", {
            name: "soslebanon-initiative-ses-conf-set",
        });
        this.userPool = new cognito.UserPool(this, "soslebanon-initiative-user-pool", {
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
                tempPasswordValidity: core_1.Duration.days(7),
            },
            // emailSettings: {
            //   from: "helpdesk@soslebanon.com",
            //   replyTo: "helpdesk@soslebanon.com",
            // },
            signInCaseSensitive: true,
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
        });
        const cfnUserPool = this.userPool.node.defaultChild;
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
        const userPoolClient = new cognito.UserPoolClient(this, "soslebanon-initiative-client", {
            userPoolClientName: "soslebanon-initiative-client",
            generateSecret: false,
            userPool: this.userPool,
        });
        const identityPool = new cognito.CfnIdentityPool(this, "soslebanon-initiative-identity-pool", {
            identityPoolName: "soslebanon-initiative-identity-pool",
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });
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
        const authenticatedRole = new iam.Role(this, "CognitoDefaultAuthenticatedRole", {
            assumedBy: new iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
                StringEquals: {
                    "cognito-identity.amazonaws.com:aud": identityPool.ref,
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "authenticated",
                },
            }, "sts:AssumeRoleWithWebIdentity"),
        });
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "mobileanalytics:PutEvents",
                "cognito-sync:*",
                "cognito-identity:*",
            ],
            resources: ["*"],
        }));
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:InvokeFunction"],
            resources: ["*"],
        }));
        const defaultPolicy = new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoleMapping", {
            identityPoolId: identityPool.ref,
            roles: {
                // unauthenticated: unauthenticatedRole.roleArn,
                authenticated: authenticatedRole.roleArn,
            },
        });
    }
    /* initiative function */
    createInitiativeFunction(initiativeApiResource) {
        const registerInitiative = new lambda.Function(this, "register-initiative", {
            functionName: "register-initiative",
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/register-initiative")),
            environment: {
                INITIATIVES_TABLE: this.initiativesTable.tableName,
                USERPOOL_ID: this.userPool.userPoolId,
                REGION: this.region,
                ACCESS_KEY_ID: this.accessKeyId,
                SECRET_ACCESS_KEY: this.secretAccessKey,
                BUCKET_NAME: this.bucket.bucketName,
            },
        });
        this.initiativesTable.grantReadWriteData(registerInitiative);
        this.bucket.grantReadWrite(registerInitiative);
        initiativeApiResource.addMethod("POST", defaults.lambdaIntegration(registerInitiative, {}), defaults.options);
    }
    /* cases function */
    createCaseFunction(adminApiResource) {
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
        adminApiResource.addMethod("POST", defaults.lambdaIntegration(postCase, {
            "application/json": '{\n"requestBody": $input.body,\n"sub": "$context.authorizer.claims.sub"\n}',
        }), {
            ...defaults.options,
            authorizationType: apigw.AuthorizationType.COGNITO,
            authorizer: { authorizerId: this.authorizer.ref },
        });
    }
    deleteCaseFunction(adminApiResource) {
        const getTypePosts = new lambda.Function(this, "delete-case", {
            functionName: "delete-case",
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/delete-case")),
            environment: {
                CASES_TABLE: this.casesTable.tableName,
            },
        });
        this.casesTable.grantWriteData(getTypePosts);
        adminApiResource.addMethod("DELETE", defaults.lambdaIntegration(getTypePosts, {
            "application/json": `
            #set($hasId = $input.params('id'))
            {
              "sub": "$context.authorizer.claims.sub"
              #if($hasId != ""), "id" : "$input.params('id')"#end
            }
          `,
        }), {
            ...defaults.options,
            authorizationType: apigw.AuthorizationType.COGNITO,
            authorizer: { authorizerId: this.authorizer.ref },
        });
    }
    listCasesFunction(latestPostsApiResource) {
        const getLatestPosts = new lambda.Function(this, "list-cases", {
            functionName: "list-cases",
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/list-cases")),
            environment: {
                CASES_TABLE: this.casesTable.tableName,
                identityPoolId: this.userPool.userPoolId,
            },
        });
        this.casesTable.grantReadData(getLatestPosts);
        getLatestPosts.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:InvokeFunction", "cognito-idp:*"],
            resources: ["*"],
        }));
        latestPostsApiResource.addMethod("GET", defaults.lambdaIntegration(getLatestPosts, {
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
        }), defaults.options);
    }
    listInitiativeCaesFunction(adminApiResource) {
        const listInitiativeCaes = new lambda.Function(this, "list-initiative-cases", {
            functionName: "list-initiative-cases",
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/list-initiative-cases")),
            environment: {
                POSTS_TABLE: this.casesTable.tableName,
            },
        });
        this.casesTable.grantReadData(listInitiativeCaes);
        adminApiResource.addMethod("GET", defaults.lambdaIntegration(listInitiativeCaes, {
            "application/json": '{\n"sub": "$context.authorizer.claims.sub"\n}',
        }), {
            ...defaults.options,
            authorizationType: apigw.AuthorizationType.COGNITO,
            authorizer: { authorizerId: this.authorizer.ref },
        });
    }
    getCaseFunction(postApiResource) {
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
        postApiResource.addMethod("GET", defaults.lambdaIntegration(getCase, {
            "application/json": `
          #set($hasId = $input.params('id'))
          {
            #if($hasId != "") "id" : "$input.params('id')"#end
          }
        `,
        }), defaults.options);
    }
    /* location functions */
    ListLocationsFunction(locationApiResource) {
        const listLocations = new lambda.Function(this, "list-locations", {
            functionName: "list-locations",
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/list-locations")),
            environment: {
                SETTINGS_TABLE: this.settingsTable.tableName,
            },
        });
        this.settingsTable.grantReadData(listLocations);
        locationApiResource.addMethod("GET", defaults.lambdaIntegration(listLocations, {}), defaults.options);
    }
    /* category functions */
    ListCategoriesFunction(typeApiResource) {
        const listCagetories = new lambda.Function(this, "list-categories", {
            functionName: "list-categories",
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas/list-categories")),
            environment: {
                SETTINGS_TABLE: this.settingsTable.tableName,
            },
        });
        this.settingsTable.grantReadData(listCagetories);
        typeApiResource.addMethod("GET", defaults.lambdaIntegration(listCagetories, {}), defaults.options);
    }
}
exports.SoslebanonInitiativeStack = SoslebanonInitiativeStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29zLWluaXRpYXRpdmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3MtaW5pdGlhdGl2ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFxQztBQUNyQyxrREFBa0Q7QUFDbEQsaURBQWlEO0FBQ2pELGdEQUFnRDtBQUNoRCx3Q0FBd0M7QUFDeEMsd0NBQXdDO0FBQ3hDLHdDQUF5QztBQUN6QywrQ0FBK0M7QUFDL0MsOENBQThDO0FBQzlDLDZCQUE2QjtBQUM3Qiw0Q0FBeUM7QUFDekMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWpDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxHQUFHLGFBQWEsRUFBRSxDQUFDLENBQUM7QUFFbkQsTUFBYSx5QkFBMEIsU0FBUSxHQUFHLENBQUMsS0FBSztJQVl0RCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQXNCOztRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsV0FBVyxTQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSx1Q0FBSSxFQUFFLEVBQUEsQ0FBQztRQUNuRCxJQUFJLENBQUMsZUFBZSxTQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLHVDQUFJLEVBQUUsRUFBQSxDQUFDO1FBRTNELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQUMsSUFBSSxFQUFFLDhCQUE4QixFQUFFO1lBQzdELFVBQVUsRUFBRSwrQkFBK0I7WUFDM0MsZ0JBQWdCLEVBQUUsSUFBSTtTQUN2QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUMvQixJ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RUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FDbkQ7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsY0FBYyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUzthQUM3QztTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRWpELGVBQWUsQ0FBQyxTQUFTLENBQ3ZCLEtBQUssRUFDTCxRQUFRLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxFQUM5QyxRQUFRLENBQUMsT0FBTyxDQUNqQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBNWlCRCw4REE0aUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gXCJAYXdzLWNkay9hd3MtZHluYW1vZGJcIjtcclxuaW1wb3J0ICogYXMgYXBpZ3cgZnJvbSBcIkBhd3MtY2RrL2F3cy1hcGlnYXRld2F5XCI7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSBcIkBhd3MtY2RrL2F3cy1jb2duaXRvXCI7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tIFwiQGF3cy1jZGsvYXdzLWlhbVwiO1xyXG5pbXBvcnQgKiBhcyBzZXMgZnJvbSBcIkBhd3MtY2RrL2F3cy1zZXNcIjtcclxuaW1wb3J0IHsgRHVyYXRpb24gfSBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xyXG5pbXBvcnQgKiBhcyBkZWZhdWx0cyBmcm9tIFwiLi4vZXh0cmFzL2RlZmF1bHRzXCI7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tIFwiQGF3cy1jZGsvYXdzLWxhbWJkYVwiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IEJ1Y2tldCB9IGZyb20gXCJAYXdzLWNkay9hd3MtczNcIjtcclxuY29uc3QgZG90ZW52ID0gcmVxdWlyZShcImRvdGVudlwiKTtcclxuXHJcbmRvdGVudi5jb25maWcoeyBwYXRoOiBfX2Rpcm5hbWUgKyBcIi8uLi8uLi8uZW52XCIgfSk7XHJcblxyXG5leHBvcnQgY2xhc3MgU29zbGViYW5vbkluaXRpYXRpdmVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgYWNjZXNzS2V5SWQ6IHN0cmluZztcclxuICBzZWNyZXRBY2Nlc3NLZXk6IHN0cmluZztcclxuXHJcbiAgYXBpOiBhcGlndy5SZXN0QXBpO1xyXG4gIGluaXRpYXRpdmVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIGNhc2VzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHNldHRpbmdzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIGF1dGhvcml6ZXI6IGFwaWd3LkNmbkF1dGhvcml6ZXI7XHJcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgYnVja2V0OiBCdWNrZXQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICB0aGlzLmFjY2Vzc0tleUlkID0gcHJvY2Vzcy5lbnYuQUNDRVNTX0tFWV9JRCA/PyBcIlwiO1xyXG4gICAgdGhpcy5zZWNyZXRBY2Nlc3NLZXkgPSBwcm9jZXNzLmVudi5TRUNSRVRfQUNDRVNTX0tFWSA/PyBcIlwiO1xyXG5cclxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWd3LlJlc3RBcGkodGhpcywgXCJTT1NJbml0aWF0aXZlTGViYW5vbkFQSVwiKTtcclxuICAgIHRoaXMuYnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1idWNrZXRcIiwge1xyXG4gICAgICBidWNrZXROYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1idWNrZXQyXCIsXHJcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNyZWF0ZUluaXRpYXRpdmVDb2duaXRvKCk7XHJcbiAgICB0aGlzLmNyZWF0ZUluaXRpYXRpdmVzdGFibGUoKTtcclxuICAgIHRoaXMuY3JlYXRlQ2FzZXNUYWJsZSgpO1xyXG4gICAgdGhpcy5jcmVhdGVTZXR0aW5nc3RhYmxlKCk7XHJcbiAgICB0aGlzLmNyZWF0ZUFQSVJlc291cmNlcygpO1xyXG4gIH1cclxuXHJcbiAgLy9hcGkgcmVzb3VyY2VzXHJcbiAgY3JlYXRlQVBJUmVzb3VyY2VzKCkge1xyXG4gICAgY29uc3QgaW5pdGlhdGl2ZUFwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShcImluaXRpYXRpdmVcIik7XHJcbiAgICBpbml0aWF0aXZlQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuY3JlYXRlSW5pdGlhdGl2ZUZ1bmN0aW9uKGluaXRpYXRpdmVBcGlSZXNvdXJjZSk7XHJcblxyXG4gICAgLyogY2FzZSBhcGkgcmVzb3VyY2VzICovXHJcbiAgICBjb25zdCBjYXNlQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwiY2FzZVwiKTtcclxuICAgIGNhc2VBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5jcmVhdGVDYXNlRnVuY3Rpb24oY2FzZUFwaVJlc291cmNlKTtcclxuICAgIHRoaXMuZGVsZXRlQ2FzZUZ1bmN0aW9uKGNhc2VBcGlSZXNvdXJjZSk7XHJcbiAgICB0aGlzLmdldENhc2VGdW5jdGlvbihjYXNlQXBpUmVzb3VyY2UpO1xyXG5cclxuICAgIGNvbnN0IGxpc3RDYXNlc0FwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShcImNhc2VzXCIpO1xyXG4gICAgbGlzdENhc2VzQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMubGlzdENhc2VzRnVuY3Rpb24obGlzdENhc2VzQXBpUmVzb3VyY2UpO1xyXG5cclxuICAgIGNvbnN0IHVzZXJDYXNlc0FwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShcInVzZXJjYXNlc1wiKTtcclxuICAgIHVzZXJDYXNlc0FwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJPUFRJT05TXCIsXHJcbiAgICAgIGRlZmF1bHRzLm1vY2tJbnRlZ3JhdGlvbixcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmxpc3RJbml0aWF0aXZlQ2Flc0Z1bmN0aW9uKHVzZXJDYXNlc0FwaVJlc291cmNlKTtcclxuXHJcbiAgICAvKiBsb2NhdGlvbiBhcGkgcmVzb3VyY2UgKi9cclxuICAgIGNvbnN0IGxvY2F0aW9uQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwibG9jYXRpb25zXCIpO1xyXG4gICAgbG9jYXRpb25BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5MaXN0TG9jYXRpb25zRnVuY3Rpb24obG9jYXRpb25BcGlSZXNvdXJjZSk7XHJcbiAgICAvKiBjYXRlZ29yeSBhcGkgcmVzb3VyY2UgKi9cclxuICAgIGNvbnN0IGNhdGVnb3JpZXNBcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoXCJjYXRlZ29yaWVzXCIpO1xyXG4gICAgY2F0ZWdvcmllc0FwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJPUFRJT05TXCIsXHJcbiAgICAgIGRlZmF1bHRzLm1vY2tJbnRlZ3JhdGlvbixcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLkxpc3RDYXRlZ29yaWVzRnVuY3Rpb24oY2F0ZWdvcmllc0FwaVJlc291cmNlKTtcclxuICB9XHJcblxyXG4gIC8qIGR5bmFtbyBkYiB0YWJsZXMgKi9cclxuICBjcmVhdGVJbml0aWF0aXZlc3RhYmxlKCk6IHZvaWQge1xyXG4gICAgdGhpcy5pbml0aWF0aXZlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIFwiaW5pdGlhdGl2ZXMtdGFibGVcIiwge1xyXG4gICAgICB0YWJsZU5hbWU6IFwiaW5pdGlhdGl2ZXNcIixcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwicGtcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6IFwic2tcIixcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUixcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlQ2FzZXNUYWJsZSgpOiB2b2lkIHtcclxuICAgIHRoaXMuY2FzZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBcImNhc2VzLXRhYmxlXCIsIHtcclxuICAgICAgdGFibGVOYW1lOiBcImNhc2VzLXRhYmxlXCIsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiBcInBrXCIsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBcImlkXCIsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICB9KTtcclxuICAgIHRoaXMuY2FzZXNUYWJsZS5hZGRMb2NhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiBcInVwZGF0ZWREYXRlXCIsXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBcInVwZGF0ZWREYXRlXCIsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIHRoaXMuY2FzZXNUYWJsZS5hZGRMb2NhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiBcImNhdGVnb3J5SWRcIixcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6IFwiY2F0ZWdvcnlJZFwiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVTZXR0aW5nc3RhYmxlKCk6IHZvaWQge1xyXG4gICAgdGhpcy5zZXR0aW5nc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIFwic2V0dGluZ3MtdGFibGVcIiwge1xyXG4gICAgICB0YWJsZU5hbWU6IFwic2V0dGluZ3MtdGFibGVcIixcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwicGtcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6IFwiaWRcIixcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyogY29naW50byBmb3IgaW5pdGlhdGl2ZSAqL1xyXG4gIGNyZWF0ZUluaXRpYXRpdmVDb2duaXRvKCk6IHZvaWQge1xyXG4gICAgY29uc3QgY29uZlNldCA9IG5ldyBzZXMuQ2ZuQ29uZmlndXJhdGlvblNldChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtY29uZi1zZXRcIixcclxuICAgICAge1xyXG4gICAgICAgIG5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLXNlcy1jb25mLXNldFwiLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtdXNlci1wb29sXCIsXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VyUG9vbE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLXVzZXItcG9vbFwiLFxyXG4gICAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICBnaXZlbk5hbWU6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGVtYWlsOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBwaG9uZU51bWJlcjogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgYWRkcmVzczogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgaW5pdGlhdGl2ZUlkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtdXRhYmxlOiB0cnVlIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXV0b1ZlcmlmeToge1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBwaG9uZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBhc3N3b3JkUG9saWN5OiB7XHJcbiAgICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogZmFsc2UsXHJcbiAgICAgICAgICB0ZW1wUGFzc3dvcmRWYWxpZGl0eTogRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGVtYWlsU2V0dGluZ3M6IHtcclxuICAgICAgICAvLyAgIGZyb206IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgICAgICAvLyAgIHJlcGx5VG86IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgICAgICAvLyB9LFxyXG4gICAgICAgIHNpZ25JbkNhc2VTZW5zaXRpdmU6IHRydWUsXHJcbiAgICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNmblVzZXJQb29sID0gdGhpcy51c2VyUG9vbC5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjb2duaXRvLkNmblVzZXJQb29sO1xyXG4gICAgLy8gY2ZuVXNlclBvb2wuZW1haWxDb25maWd1cmF0aW9uID0ge1xyXG4gICAgLy8gICBjb25maWd1cmF0aW9uU2V0OiBjb25mU2V0LnJlZixcclxuICAgIC8vICAgZW1haWxTZW5kaW5nQWNjb3VudDogXCJERVZFTE9QRVJcIixcclxuICAgIC8vICAgZnJvbTogXCJoZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgLy8gICByZXBseVRvRW1haWxBZGRyZXNzOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAvLyAgIHNvdXJjZUFybjpcclxuICAgIC8vICAgICBcImFybjphd3M6c2VzOmV1LXdlc3QtMToyMTg1NjE4NjE1ODM6aWRlbnRpdHkvaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgIC8vIH07XHJcblxyXG4gICAgdGhpcy5hdXRob3JpemVyID0gbmV3IGFwaWd3LkNmbkF1dGhvcml6ZXIodGhpcywgXCJBUElHYXRld2F5QXV0aG9yaXplclwiLCB7XHJcbiAgICAgIG5hbWU6IFwiY29nbml0by1hdXRob3JpemVyXCIsXHJcbiAgICAgIGlkZW50aXR5U291cmNlOiBcIm1ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uXCIsXHJcbiAgICAgIHByb3ZpZGVyQXJuczogW2NmblVzZXJQb29sLmF0dHJBcm5dLFxyXG4gICAgICByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlc3RBcGlJZCxcclxuICAgICAgdHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWNsaWVudFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgdXNlclBvb2xDbGllbnROYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1jbGllbnRcIixcclxuICAgICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXHJcbiAgICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBjb25zdCBpZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2woXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWlkZW50aXR5LXBvb2xcIixcclxuICAgICAge1xyXG4gICAgICAgIGlkZW50aXR5UG9vbE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLWlkZW50aXR5LXBvb2xcIixcclxuICAgICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxyXG4gICAgICAgIGNvZ25pdG9JZGVudGl0eVByb3ZpZGVyczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBjbGllbnRJZDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgLy8gY29uc3QgdW5hdXRoZW50aWNhdGVkUm9sZSA9IG5ldyBpYW0uUm9sZShcclxuICAgIC8vICAgdGhpcyxcclxuICAgIC8vICAgXCJDb2duaXRvRGVmYXVsdFVuYXV0aGVudGljYXRlZFJvbGVcIixcclxuICAgIC8vICAge1xyXG4gICAgLy8gICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXHJcbiAgICAvLyAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbVwiLFxyXG4gICAgLy8gICAgICAge1xyXG4gICAgLy8gICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgIC8vICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWRcIjogaWRlbnRpdHlQb29sLnJlZixcclxuICAgIC8vICAgICAgICAgfSxcclxuICAgIC8vICAgICAgICAgXCJGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlXCI6IHtcclxuICAgIC8vICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJ1bmF1dGhlbnRpY2F0ZWRcIixcclxuICAgIC8vICAgICAgICAgfSxcclxuICAgIC8vICAgICAgIH0sXHJcbiAgICAvLyAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCJcclxuICAgIC8vICAgICApLFxyXG4gICAgLy8gICB9XHJcbiAgICAvLyApO1xyXG4gICAgLy8gdW5hdXRoZW50aWNhdGVkUm9sZS5hZGRUb1BvbGljeShcclxuICAgIC8vICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAvLyAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAvLyAgICAgYWN0aW9uczogW1wibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLCBcImNvZ25pdG8tc3luYzoqXCJdLFxyXG4gICAgLy8gICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgIC8vICAgfSlcclxuICAgIC8vICk7XHJcblxyXG4gICAgY29uc3QgYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgaWFtLlJvbGUoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwiQ29nbml0b0RlZmF1bHRBdXRoZW50aWNhdGVkUm9sZVwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkZlZGVyYXRlZFByaW5jaXBhbChcclxuICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tXCIsXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZFwiOiBpZGVudGl0eVBvb2wucmVmLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjoge1xyXG4gICAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmFtclwiOiBcImF1dGhlbnRpY2F0ZWRcIixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCJcclxuICAgICAgICApLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgIFwibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLFxyXG4gICAgICAgICAgXCJjb2duaXRvLXN5bmM6KlwiLFxyXG4gICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5OipcIixcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1wibGFtYmRhOkludm9rZUZ1bmN0aW9uXCJdLFxyXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZGVmYXVsdFBvbGljeSA9IG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIklkZW50aXR5UG9vbFJvbGVNYXBwaW5nXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBpZGVudGl0eVBvb2xJZDogaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICByb2xlczoge1xyXG4gICAgICAgICAgLy8gdW5hdXRoZW50aWNhdGVkOiB1bmF1dGhlbnRpY2F0ZWRSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgICBhdXRoZW50aWNhdGVkOiBhdXRoZW50aWNhdGVkUm9sZS5yb2xlQXJuLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKiBpbml0aWF0aXZlIGZ1bmN0aW9uICovXHJcbiAgY3JlYXRlSW5pdGlhdGl2ZUZ1bmN0aW9uKGluaXRpYXRpdmVBcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IHJlZ2lzdGVySW5pdGlhdGl2ZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwicmVnaXN0ZXItaW5pdGlhdGl2ZVwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBcInJlZ2lzdGVyLWluaXRpYXRpdmVcIixcclxuICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvcmVnaXN0ZXItaW5pdGlhdGl2ZVwiKVxyXG4gICAgICAgICksXHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgIElOSVRJQVRJVkVTX1RBQkxFOiB0aGlzLmluaXRpYXRpdmVzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgVVNFUlBPT0xfSUQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXHJcbiAgICAgICAgICBBQ0NFU1NfS0VZX0lEOiB0aGlzLmFjY2Vzc0tleUlkLFxyXG4gICAgICAgICAgU0VDUkVUX0FDQ0VTU19LRVk6IHRoaXMuc2VjcmV0QWNjZXNzS2V5LFxyXG4gICAgICAgICAgQlVDS0VUX05BTUU6IHRoaXMuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmluaXRpYXRpdmVzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJlZ2lzdGVySW5pdGlhdGl2ZSk7XHJcbiAgICB0aGlzLmJ1Y2tldC5ncmFudFJlYWRXcml0ZShyZWdpc3RlckluaXRpYXRpdmUpO1xyXG5cclxuICAgIGluaXRpYXRpdmVBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiUE9TVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihyZWdpc3RlckluaXRpYXRpdmUsIHt9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qIGNhc2VzIGZ1bmN0aW9uICovXHJcbiAgY3JlYXRlQ2FzZUZ1bmN0aW9uKGFkbWluQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBwb3N0Q2FzZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJwb3N0LWNhc2VcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwicG9zdC1jYXNlXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9wb3N0LWNhc2VcIikpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENBU0VTX1RBQkxFOiB0aGlzLmNhc2VzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShwb3N0Q2FzZSk7XHJcblxyXG4gICAgYWRtaW5BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiUE9TVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihwb3N0Q2FzZSwge1xyXG4gICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOlxyXG4gICAgICAgICAgJ3tcXG5cInJlcXVlc3RCb2R5XCI6ICRpbnB1dC5ib2R5LFxcblwic3ViXCI6IFwiJGNvbnRleHQuYXV0aG9yaXplci5jbGFpbXMuc3ViXCJcXG59JyxcclxuICAgICAgfSksXHJcbiAgICAgIHtcclxuICAgICAgICAuLi5kZWZhdWx0cy5vcHRpb25zLFxyXG4gICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlndy5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxyXG4gICAgICAgIGF1dGhvcml6ZXI6IHsgYXV0aG9yaXplcklkOiB0aGlzLmF1dGhvcml6ZXIucmVmIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBkZWxldGVDYXNlRnVuY3Rpb24oYWRtaW5BcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGdldFR5cGVQb3N0cyA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJkZWxldGUtY2FzZVwiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJkZWxldGUtY2FzZVwiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvZGVsZXRlLWNhc2VcIilcclxuICAgICAgKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDQVNFU19UQUJMRTogdGhpcy5jYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2FzZXNUYWJsZS5ncmFudFdyaXRlRGF0YShnZXRUeXBlUG9zdHMpO1xyXG5cclxuICAgIGFkbWluQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkRFTEVURVwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihnZXRUeXBlUG9zdHMsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogYFxyXG4gICAgICAgICAgICAjc2V0KCRoYXNJZCA9ICRpbnB1dC5wYXJhbXMoJ2lkJykpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBcInN1YlwiOiBcIiRjb250ZXh0LmF1dGhvcml6ZXIuY2xhaW1zLnN1YlwiXHJcbiAgICAgICAgICAgICAgI2lmKCRoYXNJZCAhPSBcIlwiKSwgXCJpZFwiIDogXCIkaW5wdXQucGFyYW1zKCdpZCcpXCIjZW5kXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIGAsXHJcbiAgICAgIH0pLFxyXG4gICAgICB7XHJcbiAgICAgICAgLi4uZGVmYXVsdHMub3B0aW9ucyxcclxuICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgICAgICBhdXRob3JpemVyOiB7IGF1dGhvcml6ZXJJZDogdGhpcy5hdXRob3JpemVyLnJlZiB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgbGlzdENhc2VzRnVuY3Rpb24obGF0ZXN0UG9zdHNBcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGdldExhdGVzdFBvc3RzID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImxpc3QtY2FzZXNcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwibGlzdC1jYXNlc1wiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvbGlzdC1jYXNlc1wiKVxyXG4gICAgICApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENBU0VTX1RBQkxFOiB0aGlzLmNhc2VzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIGlkZW50aXR5UG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNhc2VzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRMYXRlc3RQb3N0cyk7XHJcblxyXG4gICAgZ2V0TGF0ZXN0UG9zdHMuYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcImxhbWJkYTpJbnZva2VGdW5jdGlvblwiLCBcImNvZ25pdG8taWRwOipcIl0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBsYXRlc3RQb3N0c0FwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJHRVRcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24oZ2V0TGF0ZXN0UG9zdHMsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogYFxyXG4gICAgICAgICNzZXQoJGhhc0xhc3RFdmFsdWF0ZWRLZXkgPSAkaW5wdXQucGFyYW1zKCdMYXN0RXZhbHVhdGVkS2V5JykpXHJcbiAgICAgICAgI3NldCgkaGFzTGltaXQgPSAkaW5wdXQucGFyYW1zKCdsaW1pdCcpKVxyXG4gICAgICAgICNzZXQoJGhhc1R5cGVJZCA9ICRpbnB1dC5wYXJhbXMoJ2NhdGVnb3J5SWQnKSlcclxuICAgICAgICAjc2V0KCRoYXNLZXl3b3JkID0gJGlucHV0LnBhcmFtcygna2V5d29yZCcpKVxyXG4gICAgICAgIHtcclxuICAgICAgICAjaWYoJGhhc0xpbWl0ICE9IFwiXCIpIFwibGltaXRcIiA6IFwiJGlucHV0LnBhcmFtcygnbGltaXQnKVwiI2VuZFxyXG4gICAgICAgICNpZigkaGFzVHlwZUlkICE9IFwiXCIpLCBcInR5cGVJZFwiIDogXCIkaW5wdXQucGFyYW1zKCdjYXRlZ29yeUlkJylcIiNlbmRcclxuICAgICAgICAjaWYoJGhhc0tleXdvcmQgIT0gXCJcIiksIFwia2V5d29yZFwiIDogXCIkaW5wdXQucGFyYW1zKCdrZXl3b3JkJylcIiNlbmRcclxuICAgICAgICAjaWYoJGhhc0xhc3RFdmFsdWF0ZWRLZXkgIT0gXCJcIiksIFwiTGFzdEV2YWx1YXRlZEtleVwiIDogXCIkaW5wdXQucGFyYW1zKCdMYXN0RXZhbHVhdGVkS2V5JylcIiNlbmRcclxuICAgICAgICB9XHJcbiAgICAgICAgYCxcclxuICAgICAgfSksXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBsaXN0SW5pdGlhdGl2ZUNhZXNGdW5jdGlvbihhZG1pbkFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgbGlzdEluaXRpYXRpdmVDYWVzID0gbmV3IGxhbWJkYS5GdW5jdGlvbihcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJsaXN0LWluaXRpYXRpdmUtY2FzZXNcIixcclxuICAgICAge1xyXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogXCJsaXN0LWluaXRpYXRpdmUtY2FzZXNcIixcclxuICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvbGlzdC1pbml0aWF0aXZlLWNhc2VzXCIpXHJcbiAgICAgICAgKSxcclxuICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgUE9TVFNfVEFCTEU6IHRoaXMuY2FzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmNhc2VzVGFibGUuZ3JhbnRSZWFkRGF0YShsaXN0SW5pdGlhdGl2ZUNhZXMpO1xyXG5cclxuICAgIGFkbWluQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkdFVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihsaXN0SW5pdGlhdGl2ZUNhZXMsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogJ3tcXG5cInN1YlwiOiBcIiRjb250ZXh0LmF1dGhvcml6ZXIuY2xhaW1zLnN1YlwiXFxufScsXHJcbiAgICAgIH0pLFxyXG4gICAgICB7XHJcbiAgICAgICAgLi4uZGVmYXVsdHMub3B0aW9ucyxcclxuICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgICAgICBhdXRob3JpemVyOiB7IGF1dGhvcml6ZXJJZDogdGhpcy5hdXRob3JpemVyLnJlZiB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q2FzZUZ1bmN0aW9uKHBvc3RBcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGdldENhc2UgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwiZ2V0LWNhc2VcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwiZ2V0LWNhc2VcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL2dldC1jYXNlXCIpKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQT1NUU19UQUJMRTogdGhpcy5jYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2FzZXNUYWJsZS5ncmFudFJlYWREYXRhKGdldENhc2UpO1xyXG5cclxuICAgIHBvc3RBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiR0VUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGdldENhc2UsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogYFxyXG4gICAgICAgICAgI3NldCgkaGFzSWQgPSAkaW5wdXQucGFyYW1zKCdpZCcpKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAjaWYoJGhhc0lkICE9IFwiXCIpIFwiaWRcIiA6IFwiJGlucHV0LnBhcmFtcygnaWQnKVwiI2VuZFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIGAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyogbG9jYXRpb24gZnVuY3Rpb25zICovXHJcbiAgTGlzdExvY2F0aW9uc0Z1bmN0aW9uKGxvY2F0aW9uQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBsaXN0TG9jYXRpb25zID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImxpc3QtbG9jYXRpb25zXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImxpc3QtbG9jYXRpb25zXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9saXN0LWxvY2F0aW9uc1wiKVxyXG4gICAgICApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNFVFRJTkdTX1RBQkxFOiB0aGlzLnNldHRpbmdzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5zZXR0aW5nc1RhYmxlLmdyYW50UmVhZERhdGEobGlzdExvY2F0aW9ucyk7XHJcblxyXG4gICAgbG9jYXRpb25BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiR0VUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGxpc3RMb2NhdGlvbnMsIHt9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qIGNhdGVnb3J5IGZ1bmN0aW9ucyAqL1xyXG4gIExpc3RDYXRlZ29yaWVzRnVuY3Rpb24odHlwZUFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgbGlzdENhZ2V0b3JpZXMgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwibGlzdC1jYXRlZ29yaWVzXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImxpc3QtY2F0ZWdvcmllc1wiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvbGlzdC1jYXRlZ29yaWVzXCIpXHJcbiAgICAgICksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU0VUVElOR1NfVEFCTEU6IHRoaXMuc2V0dGluZ3NUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnNldHRpbmdzVGFibGUuZ3JhbnRSZWFkRGF0YShsaXN0Q2FnZXRvcmllcyk7XHJcblxyXG4gICAgdHlwZUFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJHRVRcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24obGlzdENhZ2V0b3JpZXMsIHt9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIl19