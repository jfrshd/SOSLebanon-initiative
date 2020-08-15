"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoslebanonInitiativeStack = void 0;
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
class SoslebanonInitiativeStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.accessKeyId = "AKIATFY2NK7HUWZGFQKK";
        this.secretAccessKey = "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";
        this.api = new apigw.RestApi(this, "SOSInitiativeLebanonAPI");
        this.bucket = new aws_s3_1.Bucket(this, "soslebanon-initiative-bucket", {
            bucketName: "soslebanon-initiative-bucket",
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
        this.settingsTable = new dynamodb.Table(this, "initiative-settings-table", {
            tableName: "initiative-settings-table",
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
                BUCKET_NAME: this.bucket.bucketName
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29zLWluaXRpYXRpdmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3MtaW5pdGlhdGl2ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsa0RBQWtEO0FBQ2xELGlEQUFpRDtBQUNqRCxnREFBZ0Q7QUFDaEQsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBeUM7QUFDekMsK0NBQStDO0FBQy9DLDhDQUE4QztBQUM5Qyw2QkFBNkI7QUFDN0IsNENBQXlDO0FBR3pDLE1BQWEseUJBQTBCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFZdEQsWUFBWSxLQUFvQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQVoxQixnQkFBVyxHQUFHLHNCQUFzQixDQUFDO1FBQ3JDLG9CQUFlLEdBQUcsMENBQTBDLENBQUM7UUFZM0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDN0QsVUFBVSxFQUFFLDhCQUE4QjtZQUMxQyxnQkFBZ0IsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBRTVCLENBQUM7SUFFRCxlQUFlO0lBQ2Ysa0JBQWtCO1FBQ2hCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJ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LGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVqRCxlQUFlLENBQUMsU0FBUyxDQUN2QixLQUFLLEVBQ0wsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsRUFDOUMsUUFBUSxDQUFDLE9BQU8sQ0FDakIsQ0FBQztJQUNKLENBQUM7Q0FFRjtBQXRpQkQsOERBc2lCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiQGF3cy1jZGsvYXdzLWR5bmFtb2RiXCI7XHJcbmltcG9ydCAqIGFzIGFwaWd3IGZyb20gXCJAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheVwiO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gXCJAYXdzLWNkay9hd3MtY29nbml0b1wiO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcIkBhd3MtY2RrL2F3cy1pYW1cIjtcclxuaW1wb3J0ICogYXMgc2VzIGZyb20gXCJAYXdzLWNkay9hd3Mtc2VzXCI7XHJcbmltcG9ydCB7IER1cmF0aW9uIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcclxuaW1wb3J0ICogYXMgZGVmYXVsdHMgZnJvbSBcIi4uL2V4dHJhcy9kZWZhdWx0c1wiO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcIkBhd3MtY2RrL2F3cy1sYW1iZGFcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBCdWNrZXQgfSBmcm9tIFwiQGF3cy1jZGsvYXdzLXMzXCI7XHJcbmltcG9ydCB7IFMzQXBpRGVmaW5pdGlvbiB9IGZyb20gXCJAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNvc2xlYmFub25Jbml0aWF0aXZlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGFjY2Vzc0tleUlkID0gXCJBS0lBVEZZMk5LN0hVV1pHRlFLS1wiO1xyXG4gIHNlY3JldEFjY2Vzc0tleSA9IFwiY2dEK28xK09ZVEJ3S1F1L2FveWNQZnhyTFRJWDZzNVVPZHROcmpzSlwiO1xyXG5cclxuICBhcGk6IGFwaWd3LlJlc3RBcGk7XHJcbiAgaW5pdGlhdGl2ZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgY2FzZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgc2V0dGluZ3NUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgYXV0aG9yaXplcjogYXBpZ3cuQ2ZuQXV0aG9yaXplcjtcclxuICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcclxuICBidWNrZXQ6IEJ1Y2tldDtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ3cuUmVzdEFwaSh0aGlzLCBcIlNPU0luaXRpYXRpdmVMZWJhbm9uQVBJXCIpO1xyXG4gICAgdGhpcy5idWNrZXQgPSBuZXcgQnVja2V0KHRoaXMsIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWJ1Y2tldFwiLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLWJ1Y2tldFwiLFxyXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jcmVhdGVJbml0aWF0aXZlQ29nbml0bygpO1xyXG4gICAgdGhpcy5jcmVhdGVJbml0aWF0aXZlc3RhYmxlKCk7XHJcbiAgICB0aGlzLmNyZWF0ZUNhc2VzVGFibGUoKTtcclxuICAgIHRoaXMuY3JlYXRlU2V0dGluZ3N0YWJsZSgpO1xyXG4gICAgdGhpcy5jcmVhdGVBUElSZXNvdXJjZXMoKTtcclxuXHJcbiAgfVxyXG5cclxuICAvL2FwaSByZXNvdXJjZXNcclxuICBjcmVhdGVBUElSZXNvdXJjZXMoKSB7XHJcbiAgICBjb25zdCBpbml0aWF0aXZlQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwiaW5pdGlhdGl2ZVwiKTtcclxuICAgIGluaXRpYXRpdmVBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5jcmVhdGVJbml0aWF0aXZlRnVuY3Rpb24oaW5pdGlhdGl2ZUFwaVJlc291cmNlKTtcclxuXHJcbiAgICAvKiBjYXNlIGFwaSByZXNvdXJjZXMgKi9cclxuICAgIGNvbnN0IGNhc2VBcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoXCJjYXNlXCIpO1xyXG4gICAgY2FzZUFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJPUFRJT05TXCIsXHJcbiAgICAgIGRlZmF1bHRzLm1vY2tJbnRlZ3JhdGlvbixcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmNyZWF0ZUNhc2VGdW5jdGlvbihjYXNlQXBpUmVzb3VyY2UpO1xyXG4gICAgdGhpcy5kZWxldGVDYXNlRnVuY3Rpb24oY2FzZUFwaVJlc291cmNlKTtcclxuICAgIHRoaXMuZ2V0Q2FzZUZ1bmN0aW9uKGNhc2VBcGlSZXNvdXJjZSk7XHJcblxyXG4gICAgY29uc3QgbGlzdENhc2VzQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwiY2FzZXNcIik7XHJcbiAgICBsaXN0Q2FzZXNBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5saXN0Q2FzZXNGdW5jdGlvbihsaXN0Q2FzZXNBcGlSZXNvdXJjZSk7XHJcblxyXG4gICAgY29uc3QgdXNlckNhc2VzQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwidXNlcmNhc2VzXCIpO1xyXG4gICAgdXNlckNhc2VzQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMubGlzdEluaXRpYXRpdmVDYWVzRnVuY3Rpb24odXNlckNhc2VzQXBpUmVzb3VyY2UpO1xyXG5cclxuICAgIC8qIGxvY2F0aW9uIGFwaSByZXNvdXJjZSAqL1xyXG4gICAgY29uc3QgbG9jYXRpb25BcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoXCJsb2NhdGlvbnNcIik7XHJcbiAgICBsb2NhdGlvbkFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJPUFRJT05TXCIsXHJcbiAgICAgIGRlZmF1bHRzLm1vY2tJbnRlZ3JhdGlvbixcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLkxpc3RMb2NhdGlvbnNGdW5jdGlvbihsb2NhdGlvbkFwaVJlc291cmNlKTtcclxuICAgIC8qIGNhdGVnb3J5IGFwaSByZXNvdXJjZSAqL1xyXG4gICAgY29uc3QgY2F0ZWdvcmllc0FwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShcImNhdGVnb3JpZXNcIik7XHJcbiAgICBjYXRlZ29yaWVzQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuTGlzdENhdGVnb3JpZXNGdW5jdGlvbihjYXRlZ29yaWVzQXBpUmVzb3VyY2UpO1xyXG4gIH1cclxuXHJcbiAgLyogZHluYW1vIGRiIHRhYmxlcyAqL1xyXG4gIGNyZWF0ZUluaXRpYXRpdmVzdGFibGUoKTogdm9pZCB7XHJcbiAgICB0aGlzLmluaXRpYXRpdmVzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgXCJpbml0aWF0aXZlcy10YWJsZVwiLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogXCJpbml0aWF0aXZlc1wiLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJwa1wiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJza1wiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSLFxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVDYXNlc1RhYmxlKCk6IHZvaWQge1xyXG4gICAgdGhpcy5jYXNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIFwiY2FzZXMtdGFibGVcIiwge1xyXG4gICAgICB0YWJsZU5hbWU6IFwiY2FzZXMtdGFibGVcIixcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwicGtcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6IFwiaWRcIixcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmFkZExvY2FsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6IFwidXBkYXRlZERhdGVcIixcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6IFwidXBkYXRlZERhdGVcIixcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUixcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmFkZExvY2FsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6IFwiY2F0ZWdvcnlJZFwiLFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJjYXRlZ29yeUlkXCIsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNyZWF0ZVNldHRpbmdzdGFibGUoKTogdm9pZCB7XHJcbiAgICB0aGlzLnNldHRpbmdzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgXCJpbml0aWF0aXZlLXNldHRpbmdzLXRhYmxlXCIsIHtcclxuICAgICAgdGFibGVOYW1lOiBcImluaXRpYXRpdmUtc2V0dGluZ3MtdGFibGVcIixcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwicGtcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6IFwiaWRcIixcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyogY29naW50byBmb3IgaW5pdGlhdGl2ZSAqL1xyXG4gIGNyZWF0ZUluaXRpYXRpdmVDb2duaXRvKCk6IHZvaWQge1xyXG4gICAgY29uc3QgY29uZlNldCA9IG5ldyBzZXMuQ2ZuQ29uZmlndXJhdGlvblNldChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtY29uZi1zZXRcIixcclxuICAgICAge1xyXG4gICAgICAgIG5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLXNlcy1jb25mLXNldFwiLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtdXNlci1wb29sXCIsXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VyUG9vbE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLXVzZXItcG9vbFwiLFxyXG4gICAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICBnaXZlbk5hbWU6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGVtYWlsOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBwaG9uZU51bWJlcjogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgYWRkcmVzczogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgaW5pdGlhdGl2ZUlkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtdXRhYmxlOiB0cnVlIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXV0b1ZlcmlmeToge1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBwaG9uZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBhc3N3b3JkUG9saWN5OiB7XHJcbiAgICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogZmFsc2UsXHJcbiAgICAgICAgICB0ZW1wUGFzc3dvcmRWYWxpZGl0eTogRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGVtYWlsU2V0dGluZ3M6IHtcclxuICAgICAgICAvLyAgIGZyb206IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgICAgICAvLyAgIHJlcGx5VG86IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgICAgICAvLyB9LFxyXG4gICAgICAgIHNpZ25JbkNhc2VTZW5zaXRpdmU6IHRydWUsXHJcbiAgICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNmblVzZXJQb29sID0gdGhpcy51c2VyUG9vbC5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjb2duaXRvLkNmblVzZXJQb29sO1xyXG4gICAgLy8gY2ZuVXNlclBvb2wuZW1haWxDb25maWd1cmF0aW9uID0ge1xyXG4gICAgLy8gICBjb25maWd1cmF0aW9uU2V0OiBjb25mU2V0LnJlZixcclxuICAgIC8vICAgZW1haWxTZW5kaW5nQWNjb3VudDogXCJERVZFTE9QRVJcIixcclxuICAgIC8vICAgZnJvbTogXCJoZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgLy8gICByZXBseVRvRW1haWxBZGRyZXNzOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAvLyAgIHNvdXJjZUFybjpcclxuICAgIC8vICAgICBcImFybjphd3M6c2VzOmV1LXdlc3QtMToyMTg1NjE4NjE1ODM6aWRlbnRpdHkvaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgIC8vIH07XHJcblxyXG4gICAgdGhpcy5hdXRob3JpemVyID0gbmV3IGFwaWd3LkNmbkF1dGhvcml6ZXIodGhpcywgXCJBUElHYXRld2F5QXV0aG9yaXplclwiLCB7XHJcbiAgICAgIG5hbWU6IFwiY29nbml0by1hdXRob3JpemVyXCIsXHJcbiAgICAgIGlkZW50aXR5U291cmNlOiBcIm1ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uXCIsXHJcbiAgICAgIHByb3ZpZGVyQXJuczogW2NmblVzZXJQb29sLmF0dHJBcm5dLFxyXG4gICAgICByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlc3RBcGlJZCxcclxuICAgICAgdHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWNsaWVudFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgdXNlclBvb2xDbGllbnROYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1jbGllbnRcIixcclxuICAgICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXHJcbiAgICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBjb25zdCBpZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2woXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWlkZW50aXR5LXBvb2xcIixcclxuICAgICAge1xyXG4gICAgICAgIGlkZW50aXR5UG9vbE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLWlkZW50aXR5LXBvb2xcIixcclxuICAgICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxyXG4gICAgICAgIGNvZ25pdG9JZGVudGl0eVByb3ZpZGVyczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBjbGllbnRJZDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgLy8gY29uc3QgdW5hdXRoZW50aWNhdGVkUm9sZSA9IG5ldyBpYW0uUm9sZShcclxuICAgIC8vICAgdGhpcyxcclxuICAgIC8vICAgXCJDb2duaXRvRGVmYXVsdFVuYXV0aGVudGljYXRlZFJvbGVcIixcclxuICAgIC8vICAge1xyXG4gICAgLy8gICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXHJcbiAgICAvLyAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbVwiLFxyXG4gICAgLy8gICAgICAge1xyXG4gICAgLy8gICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgIC8vICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWRcIjogaWRlbnRpdHlQb29sLnJlZixcclxuICAgIC8vICAgICAgICAgfSxcclxuICAgIC8vICAgICAgICAgXCJGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlXCI6IHtcclxuICAgIC8vICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJ1bmF1dGhlbnRpY2F0ZWRcIixcclxuICAgIC8vICAgICAgICAgfSxcclxuICAgIC8vICAgICAgIH0sXHJcbiAgICAvLyAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCJcclxuICAgIC8vICAgICApLFxyXG4gICAgLy8gICB9XHJcbiAgICAvLyApO1xyXG4gICAgLy8gdW5hdXRoZW50aWNhdGVkUm9sZS5hZGRUb1BvbGljeShcclxuICAgIC8vICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAvLyAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAvLyAgICAgYWN0aW9uczogW1wibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLCBcImNvZ25pdG8tc3luYzoqXCJdLFxyXG4gICAgLy8gICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgIC8vICAgfSlcclxuICAgIC8vICk7XHJcblxyXG4gICAgY29uc3QgYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgaWFtLlJvbGUoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwiQ29nbml0b0RlZmF1bHRBdXRoZW50aWNhdGVkUm9sZVwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkZlZGVyYXRlZFByaW5jaXBhbChcclxuICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tXCIsXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZFwiOiBpZGVudGl0eVBvb2wucmVmLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjoge1xyXG4gICAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmFtclwiOiBcImF1dGhlbnRpY2F0ZWRcIixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCJcclxuICAgICAgICApLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgIFwibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLFxyXG4gICAgICAgICAgXCJjb2duaXRvLXN5bmM6KlwiLFxyXG4gICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5OipcIixcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1wibGFtYmRhOkludm9rZUZ1bmN0aW9uXCJdLFxyXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZGVmYXVsdFBvbGljeSA9IG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIklkZW50aXR5UG9vbFJvbGVNYXBwaW5nXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBpZGVudGl0eVBvb2xJZDogaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICByb2xlczoge1xyXG4gICAgICAgICAgLy8gdW5hdXRoZW50aWNhdGVkOiB1bmF1dGhlbnRpY2F0ZWRSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgICBhdXRoZW50aWNhdGVkOiBhdXRoZW50aWNhdGVkUm9sZS5yb2xlQXJuLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKiBpbml0aWF0aXZlIGZ1bmN0aW9uICovXHJcbiAgY3JlYXRlSW5pdGlhdGl2ZUZ1bmN0aW9uKGluaXRpYXRpdmVBcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IHJlZ2lzdGVySW5pdGlhdGl2ZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwicmVnaXN0ZXItaW5pdGlhdGl2ZVwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBcInJlZ2lzdGVyLWluaXRpYXRpdmVcIixcclxuICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvcmVnaXN0ZXItaW5pdGlhdGl2ZVwiKVxyXG4gICAgICAgICksXHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgIElOSVRJQVRJVkVTX1RBQkxFOiB0aGlzLmluaXRpYXRpdmVzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgVVNFUlBPT0xfSUQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXHJcbiAgICAgICAgICBBQ0NFU1NfS0VZX0lEOiB0aGlzLmFjY2Vzc0tleUlkLFxyXG4gICAgICAgICAgU0VDUkVUX0FDQ0VTU19LRVk6IHRoaXMuc2VjcmV0QWNjZXNzS2V5LFxyXG4gICAgICAgICAgQlVDS0VUX05BTUU6IHRoaXMuYnVja2V0LmJ1Y2tldE5hbWVcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuaW5pdGlhdGl2ZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmVnaXN0ZXJJbml0aWF0aXZlKTtcclxuICAgIHRoaXMuYnVja2V0LmdyYW50UmVhZFdyaXRlKHJlZ2lzdGVySW5pdGlhdGl2ZSk7XHJcblxyXG4gICAgaW5pdGlhdGl2ZUFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJQT1NUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKHJlZ2lzdGVySW5pdGlhdGl2ZSwge30pLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyogY2FzZXMgZnVuY3Rpb24gKi9cclxuICBjcmVhdGVDYXNlRnVuY3Rpb24oYWRtaW5BcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IHBvc3RDYXNlID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcInBvc3QtY2FzZVwiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJwb3N0LWNhc2VcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL3Bvc3QtY2FzZVwiKVxyXG4gICAgICApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENBU0VTX1RBQkxFOiB0aGlzLmNhc2VzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShwb3N0Q2FzZSk7XHJcblxyXG4gICAgYWRtaW5BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiUE9TVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihwb3N0Q2FzZSwge1xyXG4gICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOlxyXG4gICAgICAgICAgJ3tcXG5cInJlcXVlc3RCb2R5XCI6ICRpbnB1dC5ib2R5LFxcblwic3ViXCI6IFwiJGNvbnRleHQuYXV0aG9yaXplci5jbGFpbXMuc3ViXCJcXG59JyxcclxuICAgICAgfSksXHJcbiAgICAgIHtcclxuICAgICAgICAuLi5kZWZhdWx0cy5vcHRpb25zLFxyXG4gICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlndy5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxyXG4gICAgICAgIGF1dGhvcml6ZXI6IHsgYXV0aG9yaXplcklkOiB0aGlzLmF1dGhvcml6ZXIucmVmIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBkZWxldGVDYXNlRnVuY3Rpb24oYWRtaW5BcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGdldFR5cGVQb3N0cyA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJkZWxldGUtY2FzZVwiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJkZWxldGUtY2FzZVwiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvZGVsZXRlLWNhc2VcIilcclxuICAgICAgKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDQVNFU19UQUJMRTogdGhpcy5jYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2FzZXNUYWJsZS5ncmFudFdyaXRlRGF0YShnZXRUeXBlUG9zdHMpO1xyXG5cclxuICAgIGFkbWluQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkRFTEVURVwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihnZXRUeXBlUG9zdHMsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogYFxyXG4gICAgICAgICAgICAjc2V0KCRoYXNJZCA9ICRpbnB1dC5wYXJhbXMoJ2lkJykpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBcInN1YlwiOiBcIiRjb250ZXh0LmF1dGhvcml6ZXIuY2xhaW1zLnN1YlwiXHJcbiAgICAgICAgICAgICAgI2lmKCRoYXNJZCAhPSBcIlwiKSwgXCJpZFwiIDogXCIkaW5wdXQucGFyYW1zKCdpZCcpXCIjZW5kXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIGAsXHJcbiAgICAgIH0pLFxyXG4gICAgICB7XHJcbiAgICAgICAgLi4uZGVmYXVsdHMub3B0aW9ucyxcclxuICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgICAgICBhdXRob3JpemVyOiB7IGF1dGhvcml6ZXJJZDogdGhpcy5hdXRob3JpemVyLnJlZiB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgbGlzdENhc2VzRnVuY3Rpb24obGF0ZXN0UG9zdHNBcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGdldExhdGVzdFBvc3RzID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImxpc3QtY2FzZXNcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwibGlzdC1jYXNlc1wiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvbGlzdC1jYXNlc1wiKVxyXG4gICAgICApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENBU0VTX1RBQkxFOiB0aGlzLmNhc2VzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIGlkZW50aXR5UG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNhc2VzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRMYXRlc3RQb3N0cyk7XHJcblxyXG4gICAgZ2V0TGF0ZXN0UG9zdHMuYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcImxhbWJkYTpJbnZva2VGdW5jdGlvblwiLCBcImNvZ25pdG8taWRwOipcIl0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBsYXRlc3RQb3N0c0FwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJHRVRcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24oZ2V0TGF0ZXN0UG9zdHMsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogYFxyXG4gICAgICAgICNzZXQoJGhhc0xhc3RFdmFsdWF0ZWRLZXkgPSAkaW5wdXQucGFyYW1zKCdMYXN0RXZhbHVhdGVkS2V5JykpXHJcbiAgICAgICAgI3NldCgkaGFzTGltaXQgPSAkaW5wdXQucGFyYW1zKCdsaW1pdCcpKVxyXG4gICAgICAgICNzZXQoJGhhc1R5cGVJZCA9ICRpbnB1dC5wYXJhbXMoJ2NhdGVnb3J5SWQnKSlcclxuICAgICAgICAjc2V0KCRoYXNLZXl3b3JkID0gJGlucHV0LnBhcmFtcygna2V5d29yZCcpKVxyXG4gICAgICAgIHtcclxuICAgICAgICAjaWYoJGhhc0xpbWl0ICE9IFwiXCIpIFwibGltaXRcIiA6IFwiJGlucHV0LnBhcmFtcygnbGltaXQnKVwiI2VuZFxyXG4gICAgICAgICNpZigkaGFzVHlwZUlkICE9IFwiXCIpLCBcInR5cGVJZFwiIDogXCIkaW5wdXQucGFyYW1zKCdjYXRlZ29yeUlkJylcIiNlbmRcclxuICAgICAgICAjaWYoJGhhc0tleXdvcmQgIT0gXCJcIiksIFwia2V5d29yZFwiIDogXCIkaW5wdXQucGFyYW1zKCdrZXl3b3JkJylcIiNlbmRcclxuICAgICAgICAjaWYoJGhhc0xhc3RFdmFsdWF0ZWRLZXkgIT0gXCJcIiksIFwiTGFzdEV2YWx1YXRlZEtleVwiIDogXCIkaW5wdXQucGFyYW1zKCdMYXN0RXZhbHVhdGVkS2V5JylcIiNlbmRcclxuICAgICAgICB9XHJcbiAgICAgICAgYCxcclxuICAgICAgfSksXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBsaXN0SW5pdGlhdGl2ZUNhZXNGdW5jdGlvbihhZG1pbkFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgbGlzdEluaXRpYXRpdmVDYWVzID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImxpc3QtaW5pdGlhdGl2ZS1jYXNlc1wiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJsaXN0LWluaXRpYXRpdmUtY2FzZXNcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL2xpc3QtaW5pdGlhdGl2ZS1jYXNlc1wiKVxyXG4gICAgICApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFBPU1RTX1RBQkxFOiB0aGlzLmNhc2VzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmdyYW50UmVhZERhdGEobGlzdEluaXRpYXRpdmVDYWVzKTtcclxuXHJcbiAgICBhZG1pbkFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJHRVRcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24obGlzdEluaXRpYXRpdmVDYWVzLCB7XHJcbiAgICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6ICd7XFxuXCJzdWJcIjogXCIkY29udGV4dC5hdXRob3JpemVyLmNsYWltcy5zdWJcIlxcbn0nLFxyXG4gICAgICB9KSxcclxuICAgICAge1xyXG4gICAgICAgIC4uLmRlZmF1bHRzLm9wdGlvbnMsXHJcbiAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWd3LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXHJcbiAgICAgICAgYXV0aG9yaXplcjogeyBhdXRob3JpemVySWQ6IHRoaXMuYXV0aG9yaXplci5yZWYgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGdldENhc2VGdW5jdGlvbihwb3N0QXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBnZXRDYXNlID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImdldC1jYXNlXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImdldC1jYXNlXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9nZXQtY2FzZVwiKSksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUE9TVFNfVEFCTEU6IHRoaXMuY2FzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNhc2VzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRDYXNlKTtcclxuXHJcbiAgICBwb3N0QXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkdFVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihnZXRDYXNlLCB7XHJcbiAgICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6IGBcclxuICAgICAgICAgICNzZXQoJGhhc0lkID0gJGlucHV0LnBhcmFtcygnaWQnKSlcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgI2lmKCRoYXNJZCAhPSBcIlwiKSBcImlkXCIgOiBcIiRpbnB1dC5wYXJhbXMoJ2lkJylcIiNlbmRcclxuICAgICAgICAgIH1cclxuICAgICAgICBgLFxyXG4gICAgICB9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qIGxvY2F0aW9uIGZ1bmN0aW9ucyAqL1xyXG4gIExpc3RMb2NhdGlvbnNGdW5jdGlvbihsb2NhdGlvbkFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgbGlzdExvY2F0aW9ucyA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJsaXN0LWxvY2F0aW9uc1wiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJsaXN0LWxvY2F0aW9uc1wiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvbGlzdC1sb2NhdGlvbnNcIilcclxuICAgICAgKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBTRVRUSU5HU19UQUJMRTogdGhpcy5zZXR0aW5nc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuc2V0dGluZ3NUYWJsZS5ncmFudFJlYWREYXRhKGxpc3RMb2NhdGlvbnMpO1xyXG5cclxuICAgIGxvY2F0aW9uQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkdFVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihsaXN0TG9jYXRpb25zLCB7fSksXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKiBjYXRlZ29yeSBmdW5jdGlvbnMgKi9cclxuICBMaXN0Q2F0ZWdvcmllc0Z1bmN0aW9uKHR5cGVBcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGxpc3RDYWdldG9yaWVzID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImxpc3QtY2F0ZWdvcmllc1wiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJsaXN0LWNhdGVnb3JpZXNcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL2xpc3QtY2F0ZWdvcmllc1wiKSksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU0VUVElOR1NfVEFCTEU6IHRoaXMuc2V0dGluZ3NUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnNldHRpbmdzVGFibGUuZ3JhbnRSZWFkRGF0YShsaXN0Q2FnZXRvcmllcyk7XHJcblxyXG4gICAgdHlwZUFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJHRVRcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24obGlzdENhZ2V0b3JpZXMsIHt9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcbiAgXHJcbn1cclxuIl19