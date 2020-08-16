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
        this.accessKeyId = "6r0d8f43ii7e8qq50rujql5kq4";
        this.secretAccessKey = "t9g4e475r7mujr9hleptcpqia5lcr3madrv4udvjp9baa7elkcu";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29zLWluaXRpYXRpdmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3MtaW5pdGlhdGl2ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsa0RBQWtEO0FBQ2xELGlEQUFpRDtBQUNqRCxnREFBZ0Q7QUFDaEQsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBeUM7QUFDekMsK0NBQStDO0FBQy9DLDhDQUE4QztBQUM5Qyw2QkFBNkI7QUFDN0IsNENBQXlDO0FBR3pDLE1BQWEseUJBQTBCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFZdEQsWUFBWSxLQUFvQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQVoxQixnQkFBVyxHQUFHLDRCQUE0QixDQUFDO1FBQzNDLG9CQUFlLEdBQUcscURBQXFELENBQUM7UUFZdEUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDN0QsVUFBVSxFQUFFLDhCQUE4QjtZQUMxQyxnQkFBZ0IsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBRTVCLENBQUM7SUFFRCxlQUFlO0lBQ2Ysa0JBQWtCO1FBQ2hCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJ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LGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVqRCxlQUFlLENBQUMsU0FBUyxDQUN2QixLQUFLLEVBQ0wsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsRUFDOUMsUUFBUSxDQUFDLE9BQU8sQ0FDakIsQ0FBQztJQUNKLENBQUM7Q0FFRjtBQXRpQkQsOERBc2lCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiQGF3cy1jZGsvYXdzLWR5bmFtb2RiXCI7XHJcbmltcG9ydCAqIGFzIGFwaWd3IGZyb20gXCJAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheVwiO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gXCJAYXdzLWNkay9hd3MtY29nbml0b1wiO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcIkBhd3MtY2RrL2F3cy1pYW1cIjtcclxuaW1wb3J0ICogYXMgc2VzIGZyb20gXCJAYXdzLWNkay9hd3Mtc2VzXCI7XHJcbmltcG9ydCB7IER1cmF0aW9uIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcclxuaW1wb3J0ICogYXMgZGVmYXVsdHMgZnJvbSBcIi4uL2V4dHJhcy9kZWZhdWx0c1wiO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcIkBhd3MtY2RrL2F3cy1sYW1iZGFcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBCdWNrZXQgfSBmcm9tIFwiQGF3cy1jZGsvYXdzLXMzXCI7XHJcbmltcG9ydCB7IFMzQXBpRGVmaW5pdGlvbiB9IGZyb20gXCJAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNvc2xlYmFub25Jbml0aWF0aXZlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGFjY2Vzc0tleUlkID0gXCI2cjBkOGY0M2lpN2U4cXE1MHJ1anFsNWtxNFwiO1xyXG4gIHNlY3JldEFjY2Vzc0tleSA9IFwidDlnNGU0NzVyN211anI5aGxlcHRjcHFpYTVsY3IzbWFkcnY0dWR2anA5YmFhN2Vsa2N1XCI7XHJcblxyXG4gIGFwaTogYXBpZ3cuUmVzdEFwaTtcclxuICBpbml0aWF0aXZlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBjYXNlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBzZXR0aW5nc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBhdXRob3JpemVyOiBhcGlndy5DZm5BdXRob3JpemVyO1xyXG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG4gIGJ1Y2tldDogQnVja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcbiAgICB0aGlzLmFwaSA9IG5ldyBhcGlndy5SZXN0QXBpKHRoaXMsIFwiU09TSW5pdGlhdGl2ZUxlYmFub25BUElcIik7XHJcbiAgICB0aGlzLmJ1Y2tldCA9IG5ldyBCdWNrZXQodGhpcywgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtYnVja2V0XCIsIHtcclxuICAgICAgYnVja2V0TmFtZTogXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtYnVja2V0XCIsXHJcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNyZWF0ZUluaXRpYXRpdmVDb2duaXRvKCk7XHJcbiAgICB0aGlzLmNyZWF0ZUluaXRpYXRpdmVzdGFibGUoKTtcclxuICAgIHRoaXMuY3JlYXRlQ2FzZXNUYWJsZSgpO1xyXG4gICAgdGhpcy5jcmVhdGVTZXR0aW5nc3RhYmxlKCk7XHJcbiAgICB0aGlzLmNyZWF0ZUFQSVJlc291cmNlcygpO1xyXG5cclxuICB9XHJcblxyXG4gIC8vYXBpIHJlc291cmNlc1xyXG4gIGNyZWF0ZUFQSVJlc291cmNlcygpIHtcclxuICAgIGNvbnN0IGluaXRpYXRpdmVBcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoXCJpbml0aWF0aXZlXCIpO1xyXG4gICAgaW5pdGlhdGl2ZUFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJPUFRJT05TXCIsXHJcbiAgICAgIGRlZmF1bHRzLm1vY2tJbnRlZ3JhdGlvbixcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmNyZWF0ZUluaXRpYXRpdmVGdW5jdGlvbihpbml0aWF0aXZlQXBpUmVzb3VyY2UpO1xyXG5cclxuICAgIC8qIGNhc2UgYXBpIHJlc291cmNlcyAqL1xyXG4gICAgY29uc3QgY2FzZUFwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShcImNhc2VcIik7XHJcbiAgICBjYXNlQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuY3JlYXRlQ2FzZUZ1bmN0aW9uKGNhc2VBcGlSZXNvdXJjZSk7XHJcbiAgICB0aGlzLmRlbGV0ZUNhc2VGdW5jdGlvbihjYXNlQXBpUmVzb3VyY2UpO1xyXG4gICAgdGhpcy5nZXRDYXNlRnVuY3Rpb24oY2FzZUFwaVJlc291cmNlKTtcclxuXHJcbiAgICBjb25zdCBsaXN0Q2FzZXNBcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoXCJjYXNlc1wiKTtcclxuICAgIGxpc3RDYXNlc0FwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJPUFRJT05TXCIsXHJcbiAgICAgIGRlZmF1bHRzLm1vY2tJbnRlZ3JhdGlvbixcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmxpc3RDYXNlc0Z1bmN0aW9uKGxpc3RDYXNlc0FwaVJlc291cmNlKTtcclxuXHJcbiAgICBjb25zdCB1c2VyQ2FzZXNBcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoXCJ1c2VyY2FzZXNcIik7XHJcbiAgICB1c2VyQ2FzZXNBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5saXN0SW5pdGlhdGl2ZUNhZXNGdW5jdGlvbih1c2VyQ2FzZXNBcGlSZXNvdXJjZSk7XHJcblxyXG4gICAgLyogbG9jYXRpb24gYXBpIHJlc291cmNlICovXHJcbiAgICBjb25zdCBsb2NhdGlvbkFwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShcImxvY2F0aW9uc1wiKTtcclxuICAgIGxvY2F0aW9uQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIk9QVElPTlNcIixcclxuICAgICAgZGVmYXVsdHMubW9ja0ludGVncmF0aW9uLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuTGlzdExvY2F0aW9uc0Z1bmN0aW9uKGxvY2F0aW9uQXBpUmVzb3VyY2UpO1xyXG4gICAgLyogY2F0ZWdvcnkgYXBpIHJlc291cmNlICovXHJcbiAgICBjb25zdCBjYXRlZ29yaWVzQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwiY2F0ZWdvcmllc1wiKTtcclxuICAgIGNhdGVnb3JpZXNBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5MaXN0Q2F0ZWdvcmllc0Z1bmN0aW9uKGNhdGVnb3JpZXNBcGlSZXNvdXJjZSk7XHJcbiAgfVxyXG5cclxuICAvKiBkeW5hbW8gZGIgdGFibGVzICovXHJcbiAgY3JlYXRlSW5pdGlhdGl2ZXN0YWJsZSgpOiB2b2lkIHtcclxuICAgIHRoaXMuaW5pdGlhdGl2ZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBcImluaXRpYXRpdmVzLXRhYmxlXCIsIHtcclxuICAgICAgdGFibGVOYW1lOiBcImluaXRpYXRpdmVzXCIsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiBcInBrXCIsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBcInNrXCIsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNyZWF0ZUNhc2VzVGFibGUoKTogdm9pZCB7XHJcbiAgICB0aGlzLmNhc2VzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgXCJjYXNlcy10YWJsZVwiLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogXCJjYXNlcy10YWJsZVwiLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJwa1wiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJpZFwiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmNhc2VzVGFibGUuYWRkTG9jYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogXCJ1cGRhdGVkRGF0ZVwiLFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJ1cGRhdGVkRGF0ZVwiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmNhc2VzVGFibGUuYWRkTG9jYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogXCJjYXRlZ29yeUlkXCIsXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBcImNhdGVnb3J5SWRcIixcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlU2V0dGluZ3N0YWJsZSgpOiB2b2lkIHtcclxuICAgIHRoaXMuc2V0dGluZ3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBcInNldHRpbmdzLXRhYmxlXCIsIHtcclxuICAgICAgdGFibGVOYW1lOiBcInNldHRpbmdzLXRhYmxlXCIsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiBcInBrXCIsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBcImlkXCIsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qIGNvZ2ludG8gZm9yIGluaXRpYXRpdmUgKi9cclxuICBjcmVhdGVJbml0aWF0aXZlQ29nbml0bygpOiB2b2lkIHtcclxuICAgIGNvbnN0IGNvbmZTZXQgPSBuZXcgc2VzLkNmbkNvbmZpZ3VyYXRpb25TZXQoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWNvbmYtc2V0XCIsXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1zZXMtY29uZi1zZXRcIixcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2woXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLXVzZXItcG9vbFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgdXNlclBvb2xOYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS11c2VyLXBvb2xcIixcclxuICAgICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBzaWduSW5BbGlhc2VzOiB7XHJcbiAgICAgICAgICB1c2VybmFtZTogZmFsc2UsXHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgZ2l2ZW5OYW1lOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBmYW1pbHlOYW1lOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBlbWFpbDogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgcGhvbmVOdW1iZXI6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGFkZHJlc3M6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgIGluaXRpYXRpdmVJZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbXV0YWJsZTogdHJ1ZSB9KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGF1dG9WZXJpZnk6IHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgcGhvbmU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgICAgbWluTGVuZ3RoOiA4LFxyXG4gICAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogZmFsc2UsXHJcbiAgICAgICAgICByZXF1aXJlRGlnaXRzOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IGZhbHNlLFxyXG4gICAgICAgICAgdGVtcFBhc3N3b3JkVmFsaWRpdHk6IER1cmF0aW9uLmRheXMoNyksXHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBlbWFpbFNldHRpbmdzOiB7XHJcbiAgICAgICAgLy8gICBmcm9tOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAgICAgLy8gICByZXBseVRvOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAgICAgLy8gfSxcclxuICAgICAgICBzaWduSW5DYXNlU2Vuc2l0aXZlOiB0cnVlLFxyXG4gICAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBjZm5Vc2VyUG9vbCA9IHRoaXMudXNlclBvb2wubm9kZS5kZWZhdWx0Q2hpbGQgYXMgY29nbml0by5DZm5Vc2VyUG9vbDtcclxuICAgIC8vIGNmblVzZXJQb29sLmVtYWlsQ29uZmlndXJhdGlvbiA9IHtcclxuICAgIC8vICAgY29uZmlndXJhdGlvblNldDogY29uZlNldC5yZWYsXHJcbiAgICAvLyAgIGVtYWlsU2VuZGluZ0FjY291bnQ6IFwiREVWRUxPUEVSXCIsXHJcbiAgICAvLyAgIGZyb206IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgIC8vICAgcmVwbHlUb0VtYWlsQWRkcmVzczogXCJoZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgLy8gICBzb3VyY2VBcm46XHJcbiAgICAvLyAgICAgXCJhcm46YXdzOnNlczpldS13ZXN0LTE6MjE4NTYxODYxNTgzOmlkZW50aXR5L2hlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAvLyB9O1xyXG5cclxuICAgIHRoaXMuYXV0aG9yaXplciA9IG5ldyBhcGlndy5DZm5BdXRob3JpemVyKHRoaXMsIFwiQVBJR2F0ZXdheUF1dGhvcml6ZXJcIiwge1xyXG4gICAgICBuYW1lOiBcImNvZ25pdG8tYXV0aG9yaXplclwiLFxyXG4gICAgICBpZGVudGl0eVNvdXJjZTogXCJtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvblwiLFxyXG4gICAgICBwcm92aWRlckFybnM6IFtjZm5Vc2VyUG9vbC5hdHRyQXJuXSxcclxuICAgICAgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZXN0QXBpSWQsXHJcbiAgICAgIHR5cGU6IGFwaWd3LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1jbGllbnRcIixcclxuICAgICAge1xyXG4gICAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtY2xpZW50XCIsXHJcbiAgICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxyXG4gICAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgY29uc3QgaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1pZGVudGl0eS1wb29sXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBpZGVudGl0eVBvb2xOYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1pZGVudGl0eS1wb29sXCIsXHJcbiAgICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcclxuICAgICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgY2xpZW50SWQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgICAgIHByb3ZpZGVyTmFtZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyTmFtZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICAgIC8vIGNvbnN0IHVuYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgaWFtLlJvbGUoXHJcbiAgICAvLyAgIHRoaXMsXHJcbiAgICAvLyAgIFwiQ29nbml0b0RlZmF1bHRVbmF1dGhlbnRpY2F0ZWRSb2xlXCIsXHJcbiAgICAvLyAgIHtcclxuICAgIC8vICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uRmVkZXJhdGVkUHJpbmNpcGFsKFxyXG4gICAgLy8gICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb21cIixcclxuICAgIC8vICAgICAgIHtcclxuICAgIC8vICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAvLyAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkXCI6IGlkZW50aXR5UG9vbC5yZWYsXHJcbiAgICAvLyAgICAgICAgIH0sXHJcbiAgICAvLyAgICAgICAgIFwiRm9yQW55VmFsdWU6U3RyaW5nTGlrZVwiOiB7XHJcbiAgICAvLyAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YW1yXCI6IFwidW5hdXRoZW50aWNhdGVkXCIsXHJcbiAgICAvLyAgICAgICAgIH0sXHJcbiAgICAvLyAgICAgICB9LFxyXG4gICAgLy8gICAgICAgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiXHJcbiAgICAvLyAgICAgKSxcclxuICAgIC8vICAgfVxyXG4gICAgLy8gKTtcclxuICAgIC8vIHVuYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAvLyAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgLy8gICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxyXG4gICAgLy8gICAgIGFjdGlvbnM6IFtcIm1vYmlsZWFuYWx5dGljczpQdXRFdmVudHNcIiwgXCJjb2duaXRvLXN5bmM6KlwiXSxcclxuICAgIC8vICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAvLyAgIH0pXHJcbiAgICAvLyApO1xyXG5cclxuICAgIGNvbnN0IGF1dGhlbnRpY2F0ZWRSb2xlID0gbmV3IGlhbS5Sb2xlKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIkNvZ25pdG9EZWZhdWx0QXV0aGVudGljYXRlZFJvbGVcIixcclxuICAgICAge1xyXG4gICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXHJcbiAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbVwiLFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWRcIjogaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXCJGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlXCI6IHtcclxuICAgICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJhdXRoZW50aWNhdGVkXCIsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiXHJcbiAgICAgICAgKSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBhdXRoZW50aWNhdGVkUm9sZS5hZGRUb1BvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICBcIm1vYmlsZWFuYWx5dGljczpQdXRFdmVudHNcIixcclxuICAgICAgICAgIFwiY29nbml0by1zeW5jOipcIixcclxuICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eToqXCIsXHJcbiAgICAgICAgXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcImxhbWJkYTpJbnZva2VGdW5jdGlvblwiXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGRlZmF1bHRQb2xpY3kgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJJZGVudGl0eVBvb2xSb2xlTWFwcGluZ1wiLFxyXG4gICAgICB7XHJcbiAgICAgICAgaWRlbnRpdHlQb29sSWQ6IGlkZW50aXR5UG9vbC5yZWYsXHJcbiAgICAgICAgcm9sZXM6IHtcclxuICAgICAgICAgIC8vIHVuYXV0aGVudGljYXRlZDogdW5hdXRoZW50aWNhdGVkUm9sZS5yb2xlQXJuLFxyXG4gICAgICAgICAgYXV0aGVudGljYXRlZDogYXV0aGVudGljYXRlZFJvbGUucm9sZUFybixcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyogaW5pdGlhdGl2ZSBmdW5jdGlvbiAqL1xyXG4gIGNyZWF0ZUluaXRpYXRpdmVGdW5jdGlvbihpbml0aWF0aXZlQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCByZWdpc3RlckluaXRpYXRpdmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInJlZ2lzdGVyLWluaXRpYXRpdmVcIixcclxuICAgICAge1xyXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogXCJyZWdpc3Rlci1pbml0aWF0aXZlXCIsXHJcbiAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL3JlZ2lzdGVyLWluaXRpYXRpdmVcIilcclxuICAgICAgICApLFxyXG4gICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICBJTklUSUFUSVZFU19UQUJMRTogdGhpcy5pbml0aWF0aXZlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgIFVTRVJQT09MX0lEOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICBSRUdJT046IHRoaXMucmVnaW9uLFxyXG4gICAgICAgICAgQUNDRVNTX0tFWV9JRDogdGhpcy5hY2Nlc3NLZXlJZCxcclxuICAgICAgICAgIFNFQ1JFVF9BQ0NFU1NfS0VZOiB0aGlzLnNlY3JldEFjY2Vzc0tleSxcclxuICAgICAgICAgIEJVQ0tFVF9OQU1FOiB0aGlzLmJ1Y2tldC5idWNrZXROYW1lXHJcbiAgICAgICAgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmluaXRpYXRpdmVzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJlZ2lzdGVySW5pdGlhdGl2ZSk7XHJcbiAgICB0aGlzLmJ1Y2tldC5ncmFudFJlYWRXcml0ZShyZWdpc3RlckluaXRpYXRpdmUpO1xyXG5cclxuICAgIGluaXRpYXRpdmVBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiUE9TVFwiLFxyXG4gICAgICBkZWZhdWx0cy5sYW1iZGFJbnRlZ3JhdGlvbihyZWdpc3RlckluaXRpYXRpdmUsIHt9KSxcclxuICAgICAgZGVmYXVsdHMub3B0aW9uc1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qIGNhc2VzIGZ1bmN0aW9uICovXHJcbiAgY3JlYXRlQ2FzZUZ1bmN0aW9uKGFkbWluQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBwb3N0Q2FzZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJwb3N0LWNhc2VcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwicG9zdC1jYXNlXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9wb3N0LWNhc2VcIilcclxuICAgICAgKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDQVNFU19UQUJMRTogdGhpcy5jYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2FzZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocG9zdENhc2UpO1xyXG5cclxuICAgIGFkbWluQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIlBPU1RcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24ocG9zdENhc2UsIHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjpcclxuICAgICAgICAgICd7XFxuXCJyZXF1ZXN0Qm9keVwiOiAkaW5wdXQuYm9keSxcXG5cInN1YlwiOiBcIiRjb250ZXh0LmF1dGhvcml6ZXIuY2xhaW1zLnN1YlwiXFxufScsXHJcbiAgICAgIH0pLFxyXG4gICAgICB7XHJcbiAgICAgICAgLi4uZGVmYXVsdHMub3B0aW9ucyxcclxuICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgICAgICBhdXRob3JpemVyOiB7IGF1dGhvcml6ZXJJZDogdGhpcy5hdXRob3JpemVyLnJlZiB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgZGVsZXRlQ2FzZUZ1bmN0aW9uKGFkbWluQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBnZXRUeXBlUG9zdHMgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwiZGVsZXRlLWNhc2VcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwiZGVsZXRlLWNhc2VcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL2RlbGV0ZS1jYXNlXCIpXHJcbiAgICAgICksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ0FTRVNfVEFCTEU6IHRoaXMuY2FzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNhc2VzVGFibGUuZ3JhbnRXcml0ZURhdGEoZ2V0VHlwZVBvc3RzKTtcclxuXHJcbiAgICBhZG1pbkFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJERUxFVEVcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24oZ2V0VHlwZVBvc3RzLCB7XHJcbiAgICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6IGBcclxuICAgICAgICAgICAgI3NldCgkaGFzSWQgPSAkaW5wdXQucGFyYW1zKCdpZCcpKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgXCJzdWJcIjogXCIkY29udGV4dC5hdXRob3JpemVyLmNsYWltcy5zdWJcIlxyXG4gICAgICAgICAgICAgICNpZigkaGFzSWQgIT0gXCJcIiksIFwiaWRcIiA6IFwiJGlucHV0LnBhcmFtcygnaWQnKVwiI2VuZFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICBgLFxyXG4gICAgICB9KSxcclxuICAgICAge1xyXG4gICAgICAgIC4uLmRlZmF1bHRzLm9wdGlvbnMsXHJcbiAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWd3LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXHJcbiAgICAgICAgYXV0aG9yaXplcjogeyBhdXRob3JpemVySWQ6IHRoaXMuYXV0aG9yaXplci5yZWYgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGxpc3RDYXNlc0Z1bmN0aW9uKGxhdGVzdFBvc3RzQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBnZXRMYXRlc3RQb3N0cyA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJsaXN0LWNhc2VzXCIsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBcImxpc3QtY2FzZXNcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL2xpc3QtY2FzZXNcIilcclxuICAgICAgKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDQVNFU19UQUJMRTogdGhpcy5jYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBpZGVudGl0eVBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0TGF0ZXN0UG9zdHMpO1xyXG5cclxuICAgIGdldExhdGVzdFBvc3RzLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXCJsYW1iZGE6SW52b2tlRnVuY3Rpb25cIiwgXCJjb2duaXRvLWlkcDoqXCJdLFxyXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgbGF0ZXN0UG9zdHNBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiR0VUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGdldExhdGVzdFBvc3RzLCB7XHJcbiAgICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6IGBcclxuICAgICAgICAjc2V0KCRoYXNMYXN0RXZhbHVhdGVkS2V5ID0gJGlucHV0LnBhcmFtcygnTGFzdEV2YWx1YXRlZEtleScpKVxyXG4gICAgICAgICNzZXQoJGhhc0xpbWl0ID0gJGlucHV0LnBhcmFtcygnbGltaXQnKSlcclxuICAgICAgICAjc2V0KCRoYXNUeXBlSWQgPSAkaW5wdXQucGFyYW1zKCdjYXRlZ29yeUlkJykpXHJcbiAgICAgICAgI3NldCgkaGFzS2V5d29yZCA9ICRpbnB1dC5wYXJhbXMoJ2tleXdvcmQnKSlcclxuICAgICAgICB7XHJcbiAgICAgICAgI2lmKCRoYXNMaW1pdCAhPSBcIlwiKSBcImxpbWl0XCIgOiBcIiRpbnB1dC5wYXJhbXMoJ2xpbWl0JylcIiNlbmRcclxuICAgICAgICAjaWYoJGhhc1R5cGVJZCAhPSBcIlwiKSwgXCJ0eXBlSWRcIiA6IFwiJGlucHV0LnBhcmFtcygnY2F0ZWdvcnlJZCcpXCIjZW5kXHJcbiAgICAgICAgI2lmKCRoYXNLZXl3b3JkICE9IFwiXCIpLCBcImtleXdvcmRcIiA6IFwiJGlucHV0LnBhcmFtcygna2V5d29yZCcpXCIjZW5kXHJcbiAgICAgICAgI2lmKCRoYXNMYXN0RXZhbHVhdGVkS2V5ICE9IFwiXCIpLCBcIkxhc3RFdmFsdWF0ZWRLZXlcIiA6IFwiJGlucHV0LnBhcmFtcygnTGFzdEV2YWx1YXRlZEtleScpXCIjZW5kXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgbGlzdEluaXRpYXRpdmVDYWVzRnVuY3Rpb24oYWRtaW5BcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGxpc3RJbml0aWF0aXZlQ2FlcyA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJsaXN0LWluaXRpYXRpdmUtY2FzZXNcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwibGlzdC1pbml0aWF0aXZlLWNhc2VzXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9saXN0LWluaXRpYXRpdmUtY2FzZXNcIilcclxuICAgICAgKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQT1NUU19UQUJMRTogdGhpcy5jYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2FzZXNUYWJsZS5ncmFudFJlYWREYXRhKGxpc3RJbml0aWF0aXZlQ2Flcyk7XHJcblxyXG4gICAgYWRtaW5BcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiR0VUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGxpc3RJbml0aWF0aXZlQ2Flcywge1xyXG4gICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiAne1xcblwic3ViXCI6IFwiJGNvbnRleHQuYXV0aG9yaXplci5jbGFpbXMuc3ViXCJcXG59JyxcclxuICAgICAgfSksXHJcbiAgICAgIHtcclxuICAgICAgICAuLi5kZWZhdWx0cy5vcHRpb25zLFxyXG4gICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlndy5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxyXG4gICAgICAgIGF1dGhvcml6ZXI6IHsgYXV0aG9yaXplcklkOiB0aGlzLmF1dGhvcml6ZXIucmVmIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBnZXRDYXNlRnVuY3Rpb24ocG9zdEFwaVJlc291cmNlOiBhcGlndy5SZXNvdXJjZSkge1xyXG4gICAgY29uc3QgZ2V0Q2FzZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJnZXQtY2FzZVwiLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogXCJnZXQtY2FzZVwiLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTJfWCxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2xhbWJkYXMvZ2V0LWNhc2VcIikpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFBPU1RTX1RBQkxFOiB0aGlzLmNhc2VzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jYXNlc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0Q2FzZSk7XHJcblxyXG4gICAgcG9zdEFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJHRVRcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24oZ2V0Q2FzZSwge1xyXG4gICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBgXHJcbiAgICAgICAgICAjc2V0KCRoYXNJZCA9ICRpbnB1dC5wYXJhbXMoJ2lkJykpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgICNpZigkaGFzSWQgIT0gXCJcIikgXCJpZFwiIDogXCIkaW5wdXQucGFyYW1zKCdpZCcpXCIjZW5kXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgYCxcclxuICAgICAgfSksXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKiBsb2NhdGlvbiBmdW5jdGlvbnMgKi9cclxuICBMaXN0TG9jYXRpb25zRnVuY3Rpb24obG9jYXRpb25BcGlSZXNvdXJjZTogYXBpZ3cuUmVzb3VyY2UpIHtcclxuICAgIGNvbnN0IGxpc3RMb2NhdGlvbnMgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwibGlzdC1sb2NhdGlvbnNcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwibGlzdC1sb2NhdGlvbnNcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXHJcbiAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL2xpc3QtbG9jYXRpb25zXCIpXHJcbiAgICAgICksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU0VUVElOR1NfVEFCTEU6IHRoaXMuc2V0dGluZ3NUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnNldHRpbmdzVGFibGUuZ3JhbnRSZWFkRGF0YShsaXN0TG9jYXRpb25zKTtcclxuXHJcbiAgICBsb2NhdGlvbkFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICAgXCJHRVRcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24obGlzdExvY2F0aW9ucywge30pLFxyXG4gICAgICBkZWZhdWx0cy5vcHRpb25zXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyogY2F0ZWdvcnkgZnVuY3Rpb25zICovXHJcbiAgTGlzdENhdGVnb3JpZXNGdW5jdGlvbih0eXBlQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCBsaXN0Q2FnZXRvcmllcyA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJsaXN0LWNhdGVnb3JpZXNcIiwge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IFwibGlzdC1jYXRlZ29yaWVzXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhcy9saXN0LWNhdGVnb3JpZXNcIikpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNFVFRJTkdTX1RBQkxFOiB0aGlzLnNldHRpbmdzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5zZXR0aW5nc1RhYmxlLmdyYW50UmVhZERhdGEobGlzdENhZ2V0b3JpZXMpO1xyXG5cclxuICAgIHR5cGVBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiR0VUXCIsXHJcbiAgICAgIGRlZmF1bHRzLmxhbWJkYUludGVncmF0aW9uKGxpc3RDYWdldG9yaWVzLCB7fSksXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcbiAgfVxyXG5cclxufVxyXG4iXX0=