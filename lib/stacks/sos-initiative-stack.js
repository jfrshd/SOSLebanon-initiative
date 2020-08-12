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
class SoslebanonInitiativeStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.accessKeyId = "AKIATFY2NK7HUWZGFQKK";
        this.secretAccessKey = "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";
        this.api = new apigw.RestApi(this, "SOSInitiativeLebanonAPI");
        this.createInitiativeCognito();
        this.createInitiativestable();
        this.createAPIResources();
    }
    createAPIResources() {
        const initiativeApiResource = this.api.root.addResource("initiative");
        initiativeApiResource.addMethod("OPTIONS", defaults.mockIntegration, defaults.options);
        this.createPostsFunction(initiativeApiResource); // POST
    }
    createPostsFunction(initiativeApiResource) {
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
            },
        });
        this.initiativesTable.grantReadWriteData(registerInitiative);
        initiativeApiResource.addMethod("POST", defaults.lambdaIntegration(registerInitiative, {}), defaults.options);
    }
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
        // this.authorizer = new apigw.CfnAuthorizer(this, "APIGatewayAuthorizer", {
        //   name: "cognito-authorizer",
        //   identitySource: "method.request.header.Authorization",
        //   providerArns: [cfnUserPool.attrArn],
        //   restApiId: this.api.restApiId,
        //   type: apigw.AuthorizationType.COGNITO,
        // });
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
}
exports.SoslebanonInitiativeStack = SoslebanonInitiativeStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29zLWluaXRpYXRpdmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3MtaW5pdGlhdGl2ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsa0RBQWtEO0FBQ2xELGlEQUFpRDtBQUNqRCxnREFBZ0Q7QUFDaEQsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBeUM7QUFDekMsK0NBQStDO0FBQy9DLDhDQUE4QztBQUM5Qyw2QkFBNkI7QUFFN0IsTUFBYSx5QkFBMEIsU0FBUSxHQUFHLENBQUMsS0FBSztJQVN0RCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBVDFCLGdCQUFXLEdBQUcsc0JBQXNCLENBQUM7UUFDckMsb0JBQWUsR0FBRywwQ0FBMEMsQ0FBQztRQVMzRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBQ0Qsa0JBQWtCO1FBQ2hCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3RFLHFCQUFxQixDQUFDLFNBQVMsQ0FDN0IsU0FBUyxFQUNULFFBQVEsQ0FBQyxlQUFlLEVBQ3hCLFFBQVEsQ0FBQyxPQUFPLENBQ2pCLENBQUM7UUFFRixJQUFJLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLE9BQU87SUFDMUQsQ0FBQztJQUNELG1CQUFtQixDQUFDLHFCQUFxQztRQUN2RCxN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QyxLQUFLO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDO1lBQ2xDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQ0gsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxDQUFDLDZCQUE2QixDQUM3RCxJQUFJLEVBQ0oseUJBQXlCLEVBQ3pCO1lBQ0UsY0FBYyxFQUFFLFlBQVksQ0FBQyxHQUFHO1lBQ2hDLEtBQUssRUFBRTtnQkFDTCxnREFBZ0Q7Z0JBQ2hELGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxPQUFPO2FBQ3pDO1NBQ0YsQ0FDRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBMU9ELDhEQTBPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiQGF3cy1jZGsvYXdzLWR5bmFtb2RiXCI7XHJcbmltcG9ydCAqIGFzIGFwaWd3IGZyb20gXCJAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheVwiO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gXCJAYXdzLWNkay9hd3MtY29nbml0b1wiO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcIkBhd3MtY2RrL2F3cy1pYW1cIjtcclxuaW1wb3J0ICogYXMgc2VzIGZyb20gXCJAYXdzLWNkay9hd3Mtc2VzXCI7XHJcbmltcG9ydCB7IER1cmF0aW9uIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcclxuaW1wb3J0ICogYXMgZGVmYXVsdHMgZnJvbSBcIi4uL2V4dHJhcy9kZWZhdWx0c1wiO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcIkBhd3MtY2RrL2F3cy1sYW1iZGFcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNvc2xlYmFub25Jbml0aWF0aXZlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGFjY2Vzc0tleUlkID0gXCJBS0lBVEZZMk5LN0hVV1pHRlFLS1wiO1xyXG4gIHNlY3JldEFjY2Vzc0tleSA9IFwiY2dEK28xK09ZVEJ3S1F1L2FveWNQZnhyTFRJWDZzNVVPZHROcmpzSlwiO1xyXG5cclxuICBhcGk6IGFwaWd3LlJlc3RBcGk7XHJcbiAgaW5pdGlhdGl2ZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgYXV0aG9yaXplcjogYXBpZ3cuQ2ZuQXV0aG9yaXplcjtcclxuICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ3cuUmVzdEFwaSh0aGlzLCBcIlNPU0luaXRpYXRpdmVMZWJhbm9uQVBJXCIpO1xyXG4gICAgdGhpcy5jcmVhdGVJbml0aWF0aXZlQ29nbml0bygpO1xyXG4gICAgdGhpcy5jcmVhdGVJbml0aWF0aXZlc3RhYmxlKCk7XHJcbiAgICB0aGlzLmNyZWF0ZUFQSVJlc291cmNlcygpO1xyXG4gIH1cclxuICBjcmVhdGVBUElSZXNvdXJjZXMoKSB7XHJcbiAgICBjb25zdCBpbml0aWF0aXZlQXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKFwiaW5pdGlhdGl2ZVwiKTtcclxuICAgIGluaXRpYXRpdmVBcGlSZXNvdXJjZS5hZGRNZXRob2QoXHJcbiAgICAgIFwiT1BUSU9OU1wiLFxyXG4gICAgICBkZWZhdWx0cy5tb2NrSW50ZWdyYXRpb24sXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5jcmVhdGVQb3N0c0Z1bmN0aW9uKGluaXRpYXRpdmVBcGlSZXNvdXJjZSk7IC8vIFBPU1RcclxuICB9XHJcbiAgY3JlYXRlUG9zdHNGdW5jdGlvbihpbml0aWF0aXZlQXBpUmVzb3VyY2U6IGFwaWd3LlJlc291cmNlKSB7XHJcbiAgICBjb25zdCByZWdpc3RlckluaXRpYXRpdmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInJlZ2lzdGVyLWluaXRpYXRpdmVcIixcclxuICAgICAge1xyXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogXCJyZWdpc3Rlci1pbml0aWF0aXZlXCIsXHJcbiAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXHJcbiAgICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFxyXG4gICAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGFzL3JlZ2lzdGVyLWluaXRpYXRpdmVcIilcclxuICAgICAgICApLFxyXG4gICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICBJTklUSUFUSVZFU19UQUJMRTogdGhpcy5pbml0aWF0aXZlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgIFVTRVJQT09MX0lEOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICBSRUdJT046IHRoaXMucmVnaW9uLFxyXG4gICAgICAgICAgQUNDRVNTX0tFWV9JRDogdGhpcy5hY2Nlc3NLZXlJZCxcclxuICAgICAgICAgIFNFQ1JFVF9BQ0NFU1NfS0VZOiB0aGlzLnNlY3JldEFjY2Vzc0tleSxcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuaW5pdGlhdGl2ZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmVnaXN0ZXJJbml0aWF0aXZlKTtcclxuXHJcbiAgICBpbml0aWF0aXZlQXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxyXG4gICAgICBcIlBPU1RcIixcclxuICAgICAgZGVmYXVsdHMubGFtYmRhSW50ZWdyYXRpb24ocmVnaXN0ZXJJbml0aWF0aXZlLCB7fSksXHJcbiAgICAgIGRlZmF1bHRzLm9wdGlvbnNcclxuICAgICk7XHJcbiAgfVxyXG4gIGNyZWF0ZUluaXRpYXRpdmVzdGFibGUoKTogdm9pZCB7XHJcbiAgICB0aGlzLmluaXRpYXRpdmVzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgXCJpbml0aWF0aXZlcy10YWJsZVwiLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogXCJpbml0aWF0aXZlc1wiLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJwa1wiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogXCJza1wiLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSLFxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgfSk7XHJcbiAgfVxyXG4gIGNyZWF0ZUluaXRpYXRpdmVDb2duaXRvKCk6IHZvaWQge1xyXG4gICAgY29uc3QgY29uZlNldCA9IG5ldyBzZXMuQ2ZuQ29uZmlndXJhdGlvblNldChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtY29uZi1zZXRcIixcclxuICAgICAge1xyXG4gICAgICAgIG5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLXNlcy1jb25mLXNldFwiLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtdXNlci1wb29sXCIsXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VyUG9vbE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLXVzZXItcG9vbFwiLFxyXG4gICAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICBnaXZlbk5hbWU6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGVtYWlsOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBwaG9uZU51bWJlcjogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgYWRkcmVzczogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgaW5pdGlhdGl2ZUlkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtdXRhYmxlOiB0cnVlIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXV0b1ZlcmlmeToge1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBwaG9uZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBhc3N3b3JkUG9saWN5OiB7XHJcbiAgICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogZmFsc2UsXHJcbiAgICAgICAgICB0ZW1wUGFzc3dvcmRWYWxpZGl0eTogRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGVtYWlsU2V0dGluZ3M6IHtcclxuICAgICAgICAvLyAgIGZyb206IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgICAgICAvLyAgIHJlcGx5VG86IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgICAgICAvLyB9LFxyXG4gICAgICAgIHNpZ25JbkNhc2VTZW5zaXRpdmU6IHRydWUsXHJcbiAgICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNmblVzZXJQb29sID0gdGhpcy51c2VyUG9vbC5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjb2duaXRvLkNmblVzZXJQb29sO1xyXG4gICAgLy8gY2ZuVXNlclBvb2wuZW1haWxDb25maWd1cmF0aW9uID0ge1xyXG4gICAgLy8gICBjb25maWd1cmF0aW9uU2V0OiBjb25mU2V0LnJlZixcclxuICAgIC8vICAgZW1haWxTZW5kaW5nQWNjb3VudDogXCJERVZFTE9QRVJcIixcclxuICAgIC8vICAgZnJvbTogXCJoZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgLy8gICByZXBseVRvRW1haWxBZGRyZXNzOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAvLyAgIHNvdXJjZUFybjpcclxuICAgIC8vICAgICBcImFybjphd3M6c2VzOmV1LXdlc3QtMToyMTg1NjE4NjE1ODM6aWRlbnRpdHkvaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgIC8vIH07XHJcblxyXG4gICAgLy8gdGhpcy5hdXRob3JpemVyID0gbmV3IGFwaWd3LkNmbkF1dGhvcml6ZXIodGhpcywgXCJBUElHYXRld2F5QXV0aG9yaXplclwiLCB7XHJcbiAgICAvLyAgIG5hbWU6IFwiY29nbml0by1hdXRob3JpemVyXCIsXHJcbiAgICAvLyAgIGlkZW50aXR5U291cmNlOiBcIm1ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uXCIsXHJcbiAgICAvLyAgIHByb3ZpZGVyQXJuczogW2NmblVzZXJQb29sLmF0dHJBcm5dLFxyXG4gICAgLy8gICByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlc3RBcGlJZCxcclxuICAgIC8vICAgdHlwZTogYXBpZ3cuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyxcclxuICAgIC8vIH0pO1xyXG5cclxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWNsaWVudFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgdXNlclBvb2xDbGllbnROYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1jbGllbnRcIixcclxuICAgICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXHJcbiAgICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBjb25zdCBpZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2woXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWlkZW50aXR5LXBvb2xcIixcclxuICAgICAge1xyXG4gICAgICAgIGlkZW50aXR5UG9vbE5hbWU6IFwic29zbGViYW5vbi1pbml0aWF0aXZlLWlkZW50aXR5LXBvb2xcIixcclxuICAgICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxyXG4gICAgICAgIGNvZ25pdG9JZGVudGl0eVByb3ZpZGVyczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBjbGllbnRJZDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgLy8gY29uc3QgdW5hdXRoZW50aWNhdGVkUm9sZSA9IG5ldyBpYW0uUm9sZShcclxuICAgIC8vICAgdGhpcyxcclxuICAgIC8vICAgXCJDb2duaXRvRGVmYXVsdFVuYXV0aGVudGljYXRlZFJvbGVcIixcclxuICAgIC8vICAge1xyXG4gICAgLy8gICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXHJcbiAgICAvLyAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbVwiLFxyXG4gICAgLy8gICAgICAge1xyXG4gICAgLy8gICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgIC8vICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWRcIjogaWRlbnRpdHlQb29sLnJlZixcclxuICAgIC8vICAgICAgICAgfSxcclxuICAgIC8vICAgICAgICAgXCJGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlXCI6IHtcclxuICAgIC8vICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJ1bmF1dGhlbnRpY2F0ZWRcIixcclxuICAgIC8vICAgICAgICAgfSxcclxuICAgIC8vICAgICAgIH0sXHJcbiAgICAvLyAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCJcclxuICAgIC8vICAgICApLFxyXG4gICAgLy8gICB9XHJcbiAgICAvLyApO1xyXG4gICAgLy8gdW5hdXRoZW50aWNhdGVkUm9sZS5hZGRUb1BvbGljeShcclxuICAgIC8vICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAvLyAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAvLyAgICAgYWN0aW9uczogW1wibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLCBcImNvZ25pdG8tc3luYzoqXCJdLFxyXG4gICAgLy8gICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgIC8vICAgfSlcclxuICAgIC8vICk7XHJcblxyXG4gICAgY29uc3QgYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgaWFtLlJvbGUoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwiQ29nbml0b0RlZmF1bHRBdXRoZW50aWNhdGVkUm9sZVwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkZlZGVyYXRlZFByaW5jaXBhbChcclxuICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tXCIsXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZFwiOiBpZGVudGl0eVBvb2wucmVmLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjoge1xyXG4gICAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmFtclwiOiBcImF1dGhlbnRpY2F0ZWRcIixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCJcclxuICAgICAgICApLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgIFwibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLFxyXG4gICAgICAgICAgXCJjb2duaXRvLXN5bmM6KlwiLFxyXG4gICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5OipcIixcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1wibGFtYmRhOkludm9rZUZ1bmN0aW9uXCJdLFxyXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZGVmYXVsdFBvbGljeSA9IG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIklkZW50aXR5UG9vbFJvbGVNYXBwaW5nXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBpZGVudGl0eVBvb2xJZDogaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICByb2xlczoge1xyXG4gICAgICAgICAgLy8gdW5hdXRoZW50aWNhdGVkOiB1bmF1dGhlbnRpY2F0ZWRSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgICBhdXRoZW50aWNhdGVkOiBhdXRoZW50aWNhdGVkUm9sZS5yb2xlQXJuLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG59XHJcbiJdfQ==