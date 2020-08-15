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
        this.createInitiativeFunction(initiativeApiResource); // POST
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
        this.listInitiativeCaesFunction(userCasesApiResource); // GET
        /* location api resource */
        const locationApiResource = this.api.root.addResource("locations");
        locationApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.ListLocationsFunction(locationApiResource); // GET
        /* category api resource */
        const categoriesApiResource = this.api.root.addResource("categories");
        categoriesApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.ListCategoriesFunction(categoriesApiResource); // GET
    }
    //dynamo db tables
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29zLWluaXRpYXRpdmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3MtaW5pdGlhdGl2ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsa0RBQWtEO0FBQ2xELGlEQUFpRDtBQUNqRCxnREFBZ0Q7QUFDaEQsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBeUM7QUFDekMsK0NBQStDO0FBQy9DLDhDQUE4QztBQUM5Qyw2QkFBNkI7QUFDN0IsNENBQXlDO0FBR3pDLE1BQWEseUJBQTBCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFZdEQsWUFBWSxLQUFvQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQVoxQixnQkFBVyxHQUFHLHNCQUFzQixDQUFDO1FBQ3JDLG9CQUFlLEdBQUcsMENBQTBDLENBQUM7UUFZM0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDN0QsVUFBVSxFQUFFLDhCQUE4QjtZQUMxQyxnQkFBZ0IsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBRTVCLENBQUM7SUFFRCxlQUFlO0lBQ2Ysa0JBQWtCO1FBQ2hCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJ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O1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFakQsZUFBZSxDQUFDLFNBQVMsQ0FDdkIsS0FBSyxFQUNMLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLEVBQzlDLFFBQVEsQ0FBQyxPQUFPLENBQ2pCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFyaUJELDhEQXFpQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcIkBhd3MtY2RrL2F3cy1keW5hbW9kYlwiO1xyXG5pbXBvcnQgKiBhcyBhcGlndyBmcm9tIFwiQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXlcIjtcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiQGF3cy1jZGsvYXdzLWNvZ25pdG9cIjtcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJAYXdzLWNkay9hd3MtaWFtXCI7XHJcbmltcG9ydCAqIGFzIHNlcyBmcm9tIFwiQGF3cy1jZGsvYXdzLXNlc1wiO1xyXG5pbXBvcnQgeyBEdXJhdGlvbiB9IGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XHJcbmltcG9ydCAqIGFzIGRlZmF1bHRzIGZyb20gXCIuLi9leHRyYXMvZGVmYXVsdHNcIjtcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gXCJAYXdzLWNkay9hd3MtbGFtYmRhXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgQnVja2V0IH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1zM1wiO1xyXG5pbXBvcnQgeyBTM0FwaURlZmluaXRpb24gfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXlcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTb3NsZWJhbm9uSW5pdGlhdGl2ZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBhY2Nlc3NLZXlJZCA9IFwiQUtJQVRGWTJOSzdIVVdaR0ZRS0tcIjtcclxuICBzZWNyZXRBY2Nlc3NLZXkgPSBcImNnRCtvMStPWVRCd0tRdS9hb3ljUGZ4ckxUSVg2czVVT2R0TnJqc0pcIjtcclxuXHJcbiAgYXBpOiBhcGlndy5SZXN0QXBpO1xyXG4gIGluaXRpYXRpdmVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIGNhc2VzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHNldHRpbmdzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIGF1dGhvcml6ZXI6IGFwaWd3LkNmbkF1dGhvcml6ZXI7XHJcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgYnVja2V0OiBCdWNrZXQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWd3LlJlc3RBcGkodGhpcywgXCJTT1NJbml0aWF0aXZlTGViYW5vbkFQSVwiKTtcclxuICAgIHRoaXMuYnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1idWNrZXRcIiwge1xyXG4gICAgICBidWNrZXROYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1idWNrZXRcIixcclxuICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY3JlYXRlSW5pdGlhdGl2ZUNvZ25pdG8oKTtcclxuICAgIHRoaXMuY3JlYXRlSW5pdGlhdGl2ZXN0YWJsZSgpO1xyXG4gICAgdGhpcy5jcmVhdGVDYXNlc1RhYmxlKCk7XHJcbiAgICB0aGlzLmNyZWF0ZVNldHRpbmdzdGFibGUoKTtcclxuICAgIHRoaXMuY3JlYXRlQVBJUmVzb3VyY2VzKCk7XHJcblxyXG4gIH1cclxuXHJcbiAgLy9hcGkgcmVzb3VyY2VzXHJcbiAgY3JlYXRlQVBJUmVzb3VyY2VzKCkge1xyXG4gICAgY29uc3QgaW5pdGlhdGl2ZUFwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShcImluaXRpYXRpdmVcIik7XHJcbiAgICBpbml0aWF0aXZlQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuY3JlYXRlSW5pdGlhdGl2ZUZ1bmN0aW9uKGluaXRpYXRpdmVBcGlSZXNvdXJjZSk7IC8vIFBPU1RcclxuXHJcbiAgICAvKiBjYXNlIGFwaSByZXNvdXJjZXMgKi9cclxuICAgIGNvbnN0IGNhc2VBcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoXCJjYXNlXCIpO1xyXG4gICAgY2FzZUFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJPUFRJT05TXCIsXHJcbiAgICAgIGRlZmF1bHRzLm1vY2tJbnRlZ3JhdGlvbixcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmNyZWF0ZUNhc2VGdW5jdGlvbihjYXNlQXBpUmVzb3VyY2UpO1xyXG4gICAgdGhpcy5kZWxldGVDYXNlRnVuY3Rpb24oY2FzZUFwaVJlc291cmNlKTtcclxuICAgIHRoaXMuZ2V0Q2FzZUZ1bmN0aW9uKGNhc2VBcGlSZXNvdXJjZSk7XHJcblxyXG4gICAgY29uc3QgbGlzdENhc2VzQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwiY2FzZXNcIik7XHJcbiAgICBsaXN0Q2FzZXNBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5saXN0Q2FzZXNGdW5jdGlvbihsaXN0Q2FzZXNBcGlSZXNvdXJjZSk7XHJcblxyXG4gICAgY29uc3QgdXNlckNhc2VzQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwidXNlcmNhc2VzXCIpO1xyXG4gICAgdXNlckNhc2VzQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMubGlzdEluaXRpYXRpdmVDYWVzRnVuY3Rpb24odXNlckNhc2VzQXBpUmVzb3VyY2UpOyAvLyBHRVRcclxuXHJcbiAgICAvKiBsb2NhdGlvbiBhcGkgcmVzb3VyY2UgKi9cclxuICAgIGNvbnN0IGxvY2F0aW9uQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwibG9jYXRpb25zXCIpO1xyXG4gICAgbG9jYXRpb25BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5MaXN0TG9jYXRpb25zRnVuY3Rpb24obG9jYXRpb25BcGlSZXNvdXJjZSk7IC8vIEdFVFxyXG4gICAgLyogY2F0ZWdvcnkgYXBpIHJlc291cmNlICovXHJcbiAgICBjb25zdCBjYXRlZ29yaWVzQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwiY2F0ZWdvcmllc1wiKTtcclxuICAgIGNhdGVnb3JpZXNBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5MaXN0Q2F0ZWdvcmllc0Z1bmN0aW9uKGNhdGVnb3JpZXNBcGlSZXNvdXJjZSk7IC8vIEdFVFxyXG4gIH1cclxuXHJcbiAgLy9keW5hbW8gZGIgdGFibGVzXHJcbiAgY3JlYXRlSW5pdGlhdGl2ZXN0YWJsZSgpOiB2b2lkIHtcclxuICAgIHRoaXMuaW5pdGlhdGl2ZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBcImluaXRpYXRpdmVzLXRhYmxlXCIsIHtcclxuICAgICAgdGFibGVOYW1lOiBcImluaXRpYXRpdmVzXCIsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiBcInBrXCIsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBcInNrXCIsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNyZWF0ZUNhc2VzVGFibGUoKTogdm9pZCB7XHJcbiAgICB0aGlzLmNhc2VzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgXCJjYXNlcy10YWJsZVwiLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogXCJjYXNlcy10YWJsZVwiLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJwa1wiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJpZFwiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmNhc2VzVGFibGUuYWRkTG9jYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogXCJ1cGRhdGVkRGF0ZVwiLFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJ1cGRhdGVkRGF0ZVwiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmNhc2VzVGFibGUuYWRkTG9jYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogXCJjYXRlZ29yeUlkXCIsXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBcImNhdGVnb3J5SWRcIixcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlU2V0dGluZ3N0YWJsZSgpOiB2b2lkIHtcclxuICAgIHRoaXMuc2V0dGluZ3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBcImluaXRpYXRpdmUtc2V0dGluZ3MtdGFibGVcIiwge1xyXG4gICAgICB0YWJsZU5hbWU6IFwiaW5pdGlhdGl2ZS1zZXR0aW5ncy10YWJsZVwiLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJwa1wiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJpZFwiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKiBjb2dpbnRvIGZvciBpbml0aWF0aXZlICovXHJcbiAgY3JlYXRlSW5pdGlhdGl2ZUNvZ25pdG8oKTogdm9pZCB7XHJcbiAgICBjb25zdCBjb25mU2V0ID0gbmV3IHNlcy5DZm5Db25maWd1cmF0aW9uU2V0KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1jb25mLXNldFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgbmFtZTogXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtc2VzLWNvbmYtc2V0XCIsXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInNvc2xlYmFub24taW5pdGlhdGl2ZS11c2VyLXBvb2xcIixcclxuICAgICAge1xyXG4gICAgICAgIHVzZXJQb29sTmFtZTogXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtdXNlci1wb29sXCIsXHJcbiAgICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgc2lnbkluQWxpYXNlczoge1xyXG4gICAgICAgICAgdXNlcm5hbWU6IGZhbHNlLFxyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgIGdpdmVuTmFtZTogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgZmFtaWx5TmFtZTogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgZW1haWw6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIHBob25lTnVtYmVyOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBhZGRyZXNzOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICBpbml0aWF0aXZlSWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IG11dGFibGU6IHRydWUgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhdXRvVmVyaWZ5OiB7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIHBob25lOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICAgIG1pbkxlbmd0aDogOCxcclxuICAgICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZURpZ2l0czogZmFsc2UsXHJcbiAgICAgICAgICByZXF1aXJlU3ltYm9sczogZmFsc2UsXHJcbiAgICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiBmYWxzZSxcclxuICAgICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBEdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gZW1haWxTZXR0aW5nczoge1xyXG4gICAgICAgIC8vICAgZnJvbTogXCJoZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgICAgIC8vICAgcmVwbHlUbzogXCJoZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgICAgIC8vIH0sXHJcbiAgICAgICAgc2lnbkluQ2FzZVNlbnNpdGl2ZTogdHJ1ZSxcclxuICAgICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgY2ZuVXNlclBvb2wgPSB0aGlzLnVzZXJQb29sLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNvZ25pdG8uQ2ZuVXNlclBvb2w7XHJcbiAgICAvLyBjZm5Vc2VyUG9vbC5lbWFpbENvbmZpZ3VyYXRpb24gPSB7XHJcbiAgICAvLyAgIGNvbmZpZ3VyYXRpb25TZXQ6IGNvbmZTZXQucmVmLFxyXG4gICAgLy8gICBlbWFpbFNlbmRpbmdBY2NvdW50OiBcIkRFVkVMT1BFUlwiLFxyXG4gICAgLy8gICBmcm9tOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAvLyAgIHJlcGx5VG9FbWFpbEFkZHJlc3M6IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgIC8vICAgc291cmNlQXJuOlxyXG4gICAgLy8gICAgIFwiYXJuOmF3czpzZXM6ZXUtd2VzdC0xOjIxODU2MTg2MTU4MzppZGVudGl0eS9oZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgLy8gfTtcclxuXHJcbiAgICB0aGlzLmF1dGhvcml6ZXIgPSBuZXcgYXBpZ3cuQ2ZuQXV0aG9yaXplcih0aGlzLCBcIkFQSUdhdGV3YXlBdXRob3JpemVyXCIsIHtcclxuICAgICAgbmFtZTogXCJjb2duaXRvLWF1dGhvcml6ZXJcIixcclxuICAgICAgaWRlbnRpdHlTb3VyY2U6IFwibWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb25cIixcclxuICAgICAgcHJvdmlkZXJBcm5zOiBbY2ZuVXNlclBvb2wuYXR0ckFybl0sXHJcbiAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVzdEFwaUlkLFxyXG4gICAgICB0eXBlOiBhcGlndy5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtY2xpZW50XCIsXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VyUG9vbENsaWVudE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLWNsaWVudFwiLFxyXG4gICAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcclxuICAgICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICAgIGNvbnN0IGlkZW50aXR5UG9vbCA9IG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtaWRlbnRpdHktcG9vbFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgaWRlbnRpdHlQb29sTmFtZTogXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtaWRlbnRpdHktcG9vbFwiLFxyXG4gICAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXHJcbiAgICAgICAgY29nbml0b0lkZW50aXR5UHJvdmlkZXJzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGNsaWVudElkOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICAgICAgICBwcm92aWRlck5hbWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xQcm92aWRlck5hbWUsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICAvLyBjb25zdCB1bmF1dGhlbnRpY2F0ZWRSb2xlID0gbmV3IGlhbS5Sb2xlKFxyXG4gICAgLy8gICB0aGlzLFxyXG4gICAgLy8gICBcIkNvZ25pdG9EZWZhdWx0VW5hdXRoZW50aWNhdGVkUm9sZVwiLFxyXG4gICAgLy8gICB7XHJcbiAgICAvLyAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkZlZGVyYXRlZFByaW5jaXBhbChcclxuICAgIC8vICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tXCIsXHJcbiAgICAvLyAgICAgICB7XHJcbiAgICAvLyAgICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgLy8gICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZFwiOiBpZGVudGl0eVBvb2wucmVmLFxyXG4gICAgLy8gICAgICAgICB9LFxyXG4gICAgLy8gICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjoge1xyXG4gICAgLy8gICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmFtclwiOiBcInVuYXV0aGVudGljYXRlZFwiLFxyXG4gICAgLy8gICAgICAgICB9LFxyXG4gICAgLy8gICAgICAgfSxcclxuICAgIC8vICAgICAgIFwic3RzOkFzc3VtZVJvbGVXaXRoV2ViSWRlbnRpdHlcIlxyXG4gICAgLy8gICAgICksXHJcbiAgICAvLyAgIH1cclxuICAgIC8vICk7XHJcbiAgICAvLyB1bmF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgLy8gICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgIC8vICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgIC8vICAgICBhY3Rpb25zOiBbXCJtb2JpbGVhbmFseXRpY3M6UHV0RXZlbnRzXCIsIFwiY29nbml0by1zeW5jOipcIl0sXHJcbiAgICAvLyAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgLy8gICB9KVxyXG4gICAgLy8gKTtcclxuXHJcbiAgICBjb25zdCBhdXRoZW50aWNhdGVkUm9sZSA9IG5ldyBpYW0uUm9sZShcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJDb2duaXRvRGVmYXVsdEF1dGhlbnRpY2F0ZWRSb2xlXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uRmVkZXJhdGVkUHJpbmNpcGFsKFxyXG4gICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb21cIixcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkXCI6IGlkZW50aXR5UG9vbC5yZWYsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIFwiRm9yQW55VmFsdWU6U3RyaW5nTGlrZVwiOiB7XHJcbiAgICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YW1yXCI6IFwiYXV0aGVudGljYXRlZFwiLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIFwic3RzOkFzc3VtZVJvbGVXaXRoV2ViSWRlbnRpdHlcIlxyXG4gICAgICAgICksXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgXCJtb2JpbGVhbmFseXRpY3M6UHV0RXZlbnRzXCIsXHJcbiAgICAgICAgICBcImNvZ25pdG8tc3luYzoqXCIsXHJcbiAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHk6KlwiLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBhdXRoZW50aWNhdGVkUm9sZS5hZGRUb1BvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXCJsYW1iZGE6SW52b2tlRnVuY3Rpb25cIl0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBkZWZhdWx0UG9saWN5ID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sUm9sZUF0dGFjaG1lbnQoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwiSWRlbnRpdHlQb29sUm9sZU1hcHBpbmdcIixcclxuICAgICAge1xyXG4gICAgICAgIGlkZW50aXR5UG9vbElkOiBpZGVudGl0eVBvb2wucmVmLFxyXG4gICAgICAgIHJvbGVzOiB7XHJcbiAgICAgICAgICAvLyB1bmF1dGhlbnRpY2F0ZWQ6IHVuYXV0aGVudGljYXRlZFJvbGUucm9sZUFybixcclxuICAgICAgICAgIGF1dGhlbnRpY2F0ZWQ6IGF1dGhlbnRpY2F0ZWRSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qIGluaXRpYXRpdmUgZnVuY3Rpb24gKi9cclxuICBjcmVhdGVJbml0aWF0aXZlRnVuY3Rpb24oaW5pdGlhdGl2ZUFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgcmVnaXN0ZXJJbml0aWF0aXZlID0gbmV3IGxhbWJkYS5GdW5jdGlvbihcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJyZWdpc3Rlci1pbml0aWF0aXZlXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBmdW5jdGlvbk5hbWU6IFwicmVnaXN0ZXItaW5pdGlhdGl2ZVwiLFxyXG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9yZWdpc3Rlci1pbml0aWF0aXZlXCIpXHJcbiAgICAgICAgKSxcclxuICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgSU5JVElBVElWRVNfVEFCTEU6IHRoaXMuaW5pdGlhdGl2ZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgICBVU0VSUE9PTF9JRDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgUkVHSU9OOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICAgIEFDQ0VTU19LRVlfSUQ6IHRoaXMuYWNjZXNzS2V5SWQsXHJcbiAgICAgICAgICBTRUNSRVRfQUNDRVNTX0tFWTogdGhpcy5zZWNyZXRBY2Nlc3NLZXksXHJcbiAgICAgICAgICBCVUNLRVRfTkFNRTogdGhpcy5idWNrZXQuYnVja2V0TmFtZVxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5pbml0aWF0aXZlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyZWdpc3RlckluaXRpYXRpdmUpO1xyXG4gICAgdGhpcy5idWNrZXQuZ3JhbnRSZWFkV3JpdGUocmVnaXN0ZXJJbml0aWF0aXZlKTtcclxuXHJcbiAgICBpbml0aWF0aXZlQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIlBPU1RcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24ocmVnaXN0ZXJJbml0aWF0aXZlLCB7fSksXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKiBjYXNlcyBmdW5jdGlvbiAqL1xyXG4gIGNyZWF0ZUNhc2VGdW5jdGlvbihhZG1pbkFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgcG9zdENhc2UgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwicG9zdC1jYXNlXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcInBvc3QtY2FzZVwiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvcG9zdC1jYXNlXCIpXHJcbiAgICAgICksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ0FTRVNfVEFCTEU6IHRoaXMuY2FzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNhc2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHBvc3RDYXNlKTtcclxuXHJcbiAgICBhZG1pbkFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJQT1NUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKHBvc3RDYXNlLCB7XHJcbiAgICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6XHJcbiAgICAgICAgICAne1xcblwicmVxdWVzdEJvZHlcIjogJGlucHV0LmJvZHksXFxuXCJzdWJcIjogXCIkY29udGV4dC5hdXRob3JpemVyLmNsYWltcy5zdWJcIlxcbn0nLFxyXG4gICAgICB9KSxcclxuICAgICAge1xyXG4gICAgICAgIC4uLmRlZmF1bHRzLm9wdGlvbnMsXHJcbiAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWd3LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXHJcbiAgICAgICAgYXV0aG9yaXplcjogeyBhdXRob3JpemVySWQ6IHRoaXMuYXV0aG9yaXplci5yZWYgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGRlbGV0ZUNhc2VGdW5jdGlvbihhZG1pbkFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgZ2V0VHlwZVBvc3RzID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImRlbGV0ZS1jYXNlXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImRlbGV0ZS1jYXNlXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9kZWxldGUtY2FzZVwiKVxyXG4gICAgICApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENBU0VTX1RBQkxFOiB0aGlzLmNhc2VzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmdyYW50V3JpdGVEYXRhKGdldFR5cGVQb3N0cyk7XHJcblxyXG4gICAgYWRtaW5BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiREVMRVRFXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGdldFR5cGVQb3N0cywge1xyXG4gICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBgXHJcbiAgICAgICAgICAgICNzZXQoJGhhc0lkID0gJGlucHV0LnBhcmFtcygnaWQnKSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIFwic3ViXCI6IFwiJGNvbnRleHQuYXV0aG9yaXplci5jbGFpbXMuc3ViXCJcclxuICAgICAgICAgICAgICAjaWYoJGhhc0lkICE9IFwiXCIpLCBcImlkXCIgOiBcIiRpbnB1dC5wYXJhbXMoJ2lkJylcIiNlbmRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgYCxcclxuICAgICAgfSksXHJcbiAgICAgIHtcclxuICAgICAgICAuLi5kZWZhdWx0cy5vcHRpb25zLFxyXG4gICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlndy5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxyXG4gICAgICAgIGF1dGhvcml6ZXI6IHsgYXV0aG9yaXplcklkOiB0aGlzLmF1dGhvcml6ZXIucmVmIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBsaXN0Q2FzZXNGdW5jdGlvbihsYXRlc3RQb3N0c0FwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgZ2V0TGF0ZXN0UG9zdHMgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwibGlzdC1jYXNlc1wiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJsaXN0LWNhc2VzXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9saXN0LWNhc2VzXCIpXHJcbiAgICAgICksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ0FTRVNfVEFCTEU6IHRoaXMuY2FzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgaWRlbnRpdHlQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2FzZXNUYWJsZS5ncmFudFJlYWREYXRhKGdldExhdGVzdFBvc3RzKTtcclxuXHJcbiAgICBnZXRMYXRlc3RQb3N0cy5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1wibGFtYmRhOkludm9rZUZ1bmN0aW9uXCIsIFwiY29nbml0by1pZHA6KlwiXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGxhdGVzdFBvc3RzQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkdFVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihnZXRMYXRlc3RQb3N0cywge1xyXG4gICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBgXHJcbiAgICAgICAgI3NldCgkaGFzTGFzdEV2YWx1YXRlZEtleSA9ICRpbnB1dC5wYXJhbXMoJ0xhc3RFdmFsdWF0ZWRLZXknKSlcclxuICAgICAgICAjc2V0KCRoYXNMaW1pdCA9ICRpbnB1dC5wYXJhbXMoJ2xpbWl0JykpXHJcbiAgICAgICAgI3NldCgkaGFzVHlwZUlkID0gJGlucHV0LnBhcmFtcygnY2F0ZWdvcnlJZCcpKVxyXG4gICAgICAgICNzZXQoJGhhc0tleXdvcmQgPSAkaW5wdXQucGFyYW1zKCdrZXl3b3JkJykpXHJcbiAgICAgICAge1xyXG4gICAgICAgICNpZigkaGFzTGltaXQgIT0gXCJcIikgXCJsaW1pdFwiIDogXCIkaW5wdXQucGFyYW1zKCdsaW1pdCcpXCIjZW5kXHJcbiAgICAgICAgI2lmKCRoYXNUeXBlSWQgIT0gXCJcIiksIFwidHlwZUlkXCIgOiBcIiRpbnB1dC5wYXJhbXMoJ2NhdGVnb3J5SWQnKVwiI2VuZFxyXG4gICAgICAgICNpZigkaGFzS2V5d29yZCAhPSBcIlwiKSwgXCJrZXl3b3JkXCIgOiBcIiRpbnB1dC5wYXJhbXMoJ2tleXdvcmQnKVwiI2VuZFxyXG4gICAgICAgICNpZigkaGFzTGFzdEV2YWx1YXRlZEtleSAhPSBcIlwiKSwgXCJMYXN0RXZhbHVhdGVkS2V5XCIgOiBcIiRpbnB1dC5wYXJhbXMoJ0xhc3RFdmFsdWF0ZWRLZXknKVwiI2VuZFxyXG4gICAgICAgIH1cclxuICAgICAgICBgLFxyXG4gICAgICB9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGxpc3RJbml0aWF0aXZlQ2Flc0Z1bmN0aW9uKGFkbWluQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBsaXN0SW5pdGlhdGl2ZUNhZXMgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwibGlzdC1pbml0aWF0aXZlLWNhc2VzXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImxpc3QtaW5pdGlhdGl2ZS1jYXNlc1wiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcclxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvbGlzdC1pbml0aWF0aXZlLWNhc2VzXCIpXHJcbiAgICAgICksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUE9TVFNfVEFCTEU6IHRoaXMuY2FzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNhc2VzVGFibGUuZ3JhbnRSZWFkRGF0YShsaXN0SW5pdGlhdGl2ZUNhZXMpO1xyXG5cclxuICAgIGFkbWluQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkdFVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihsaXN0SW5pdGlhdGl2ZUNhZXMsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogJ3tcXG5cInN1YlwiOiBcIiRjb250ZXh0LmF1dGhvcml6ZXIuY2xhaW1zLnN1YlwiXFxufScsXHJcbiAgICAgIH0pLFxyXG4gICAgICB7XHJcbiAgICAgICAgLi4uZGVmYXVsdHMub3B0aW9ucyxcclxuICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgICAgICBhdXRob3JpemVyOiB7IGF1dGhvcml6ZXJJZDogdGhpcy5hdXRob3JpemVyLnJlZiB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q2FzZUZ1bmN0aW9uKHBvc3RBcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGdldENhc2UgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwiZ2V0LWNhc2VcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwiZ2V0LWNhc2VcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL2dldC1jYXNlXCIpKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQT1NUU19UQUJMRTogdGhpcy5jYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2FzZXNUYWJsZS5ncmFudFJlYWREYXRhKGdldENhc2UpO1xyXG5cclxuICAgIHBvc3RBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiR0VUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGdldENhc2UsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogYFxyXG4gICAgICAgICAgI3NldCgkaGFzSWQgPSAkaW5wdXQucGFyYW1zKCdpZCcpKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAjaWYoJGhhc0lkICE9IFwiXCIpIFwiaWRcIiA6IFwiJGlucHV0LnBhcmFtcygnaWQnKVwiI2VuZFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIGAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyogbG9jYXRpb24gZnVuY3Rpb25zICovXHJcbiAgTGlzdExvY2F0aW9uc0Z1bmN0aW9uKGxvY2F0aW9uQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBsaXN0TG9jYXRpb25zID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImxpc3QtbG9jYXRpb25zXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImxpc3QtbG9jYXRpb25zXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9saXN0LWxvY2F0aW9uc1wiKVxyXG4gICAgICApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNFVFRJTkdTX1RBQkxFOiB0aGlzLnNldHRpbmdzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5zZXR0aW5nc1RhYmxlLmdyYW50UmVhZERhdGEobGlzdExvY2F0aW9ucyk7XHJcblxyXG4gICAgbG9jYXRpb25BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiR0VUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGxpc3RMb2NhdGlvbnMsIHt9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qIGNhdGVnb3J5IGZ1bmN0aW9ucyAqL1xyXG4gIExpc3RDYXRlZ29yaWVzRnVuY3Rpb24odHlwZUFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgbGlzdENhZ2V0b3JpZXMgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwibGlzdC1jYXRlZ29yaWVzXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImxpc3QtY2F0ZWdvcmllc1wiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvbGlzdC1jYXRlZ29yaWVzXCIpKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBTRVRUSU5HU19UQUJMRTogdGhpcy5zZXR0aW5nc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuc2V0dGluZ3NUYWJsZS5ncmFudFJlYWREYXRhKGxpc3RDYWdldG9yaWVzKTtcclxuXHJcbiAgICB0eXBlQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIkdFVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihsaXN0Q2FnZXRvcmllcywge30pLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG4iXX0=