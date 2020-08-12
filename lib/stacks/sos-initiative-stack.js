"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("@aws-cdk/core");
const cognito = require("@aws-cdk/aws-cognito");
const iam = require("@aws-cdk/aws-iam");
const ses = require("@aws-cdk/aws-ses");
const core_1 = require("@aws-cdk/core");
class SoslebanonInitiativeStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.createInitiativeCognito();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29zLWluaXRpYXRpdmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3MtaW5pdGlhdGl2ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFxQztBQUdyQyxnREFBZ0Q7QUFDaEQsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBeUM7QUFFekMsTUFBYSx5QkFBMEIsU0FBUSxHQUFHLENBQUMsS0FBSztJQU90RCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCx1QkFBdUI7UUFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsbUJBQW1CLENBQ3pDLElBQUksRUFDSixnQ0FBZ0MsRUFDaEM7WUFDRSxJQUFJLEVBQUUsb0NBQW9DO1NBQzNDLENBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUNsQyxJQUFJLEVBQ0osaUNBQWlDLEVBQ2pDO1lBQ0UsWUFBWSxFQUFFLGlDQUFpQztZQUMvQyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGFBQWEsRUFBRTtnQkFDYixRQUFRLEVBQUUsS0FBSztnQkFDZixLQUFLLEVBQUUsSUFBSTthQUNaO1lBQ0Qsa0JBQWtCLEVBQUU7Z0JBQ2xCLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtnQkFDNUMsVUFBVSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO2dCQUM3QyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Z0JBQ3hDLFdBQVcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtnQkFDOUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO2FBQzNDO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLFlBQVksRUFBRSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDN0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELGNBQWMsRUFBRTtnQkFDZCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxLQUFLO2dCQUN2QixhQUFhLEVBQUUsS0FBSztnQkFDcEIsY0FBYyxFQUFFLEtBQUs7Z0JBQ3JCLGdCQUFnQixFQUFFLEtBQUs7Z0JBQ3ZCLG9CQUFvQixFQUFFLGVBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ3ZDO1lBQ0QsbUJBQW1CO1lBQ25CLHFDQUFxQztZQUNyQyx3Q0FBd0M7WUFDeEMsS0FBSztZQUNMLG1CQUFtQixFQUFFLElBQUk7WUFDekIsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsVUFBVTtTQUNwRCxDQUNGLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFtQyxDQUFDO1FBQzNFLHFDQUFxQztRQUNyQyxtQ0FBbUM7UUFDbkMsc0NBQXNDO1FBQ3RDLHFDQUFxQztRQUNyQyxvREFBb0Q7UUFDcEQsZUFBZTtRQUNmLDZFQUE2RTtRQUM3RSxLQUFLO1FBRUwsNEVBQTRFO1FBQzVFLGdDQUFnQztRQUNoQywyREFBMkQ7UUFDM0QseUNBQXlDO1FBQ3pDLG1DQUFtQztRQUNuQywyQ0FBMkM7UUFDM0MsTUFBTTtRQUVOLE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FDL0MsSUFBSSxFQUNKLDhCQUE4QixFQUM5QjtZQUNFLGtCQUFrQixFQUFFLDhCQUE4QjtZQUNsRCxjQUFjLEVBQUUsS0FBSztZQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7U0FDeEIsQ0FDRixDQUFDO1FBQ0YsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUM5QyxJQUFJLEVBQ0oscUNBQXFDLEVBQ3JDO1lBQ0UsZ0JBQWdCLEVBQUUscUNBQXFDO1lBQ3ZELDhCQUE4QixFQUFFLEtBQUs7WUFDckMsd0JBQXdCLEVBQUU7Z0JBQ3hCO29CQUNFLFFBQVEsRUFBRSxjQUFjLENBQUMsZ0JBQWdCO29CQUN6QyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0I7aUJBQ2pEO2FBQ0Y7U0FDRixDQUNGLENBQUM7UUFDRiw0Q0FBNEM7UUFDNUMsVUFBVTtRQUNWLHlDQUF5QztRQUN6QyxNQUFNO1FBQ04sNkNBQTZDO1FBQzdDLDBDQUEwQztRQUMxQyxVQUFVO1FBQ1YsMEJBQTBCO1FBQzFCLG9FQUFvRTtRQUNwRSxhQUFhO1FBQ2Isc0NBQXNDO1FBQ3RDLHFFQUFxRTtRQUNyRSxhQUFhO1FBQ2IsV0FBVztRQUNYLHdDQUF3QztRQUN4QyxTQUFTO1FBQ1QsTUFBTTtRQUNOLEtBQUs7UUFDTCxtQ0FBbUM7UUFDbkMsMEJBQTBCO1FBQzFCLDRCQUE0QjtRQUM1QixnRUFBZ0U7UUFDaEUsd0JBQXdCO1FBQ3hCLE9BQU87UUFDUCxLQUFLO1FBRUwsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQ3BDLElBQUksRUFDSixpQ0FBaUMsRUFDakM7WUFDRSxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQ25DLGdDQUFnQyxFQUNoQztnQkFDRSxZQUFZLEVBQUU7b0JBQ1osb0NBQW9DLEVBQUUsWUFBWSxDQUFDLEdBQUc7aUJBQ3ZEO2dCQUNELHdCQUF3QixFQUFFO29CQUN4QixvQ0FBb0MsRUFBRSxlQUFlO2lCQUN0RDthQUNGLEVBQ0QsK0JBQStCLENBQ2hDO1NBQ0YsQ0FDRixDQUFDO1FBRUYsaUJBQWlCLENBQUMsV0FBVyxDQUMzQixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AsMkJBQTJCO2dCQUMzQixnQkFBZ0I7Z0JBQ2hCLG9CQUFvQjthQUNyQjtZQUNELFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQ0gsQ0FBQztRQUVGLGlCQUFpQixDQUFDLFdBQVcsQ0FDM0IsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUM7WUFDbEMsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FDSCxDQUFDO1FBRUYsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsNkJBQTZCLENBQzdELElBQUksRUFDSix5QkFBeUIsRUFDekI7WUFDRSxjQUFjLEVBQUUsWUFBWSxDQUFDLEdBQUc7WUFDaEMsS0FBSyxFQUFFO2dCQUNMLGdEQUFnRDtnQkFDaEQsYUFBYSxFQUFFLGlCQUFpQixDQUFDLE9BQU87YUFDekM7U0FDRixDQUNGLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFwTEQsOERBb0xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gXCJAYXdzLWNkay9hd3MtZHluYW1vZGJcIjtcclxuaW1wb3J0ICogYXMgYXBpZ3cgZnJvbSBcIkBhd3MtY2RrL2F3cy1hcGlnYXRld2F5XCI7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSBcIkBhd3MtY2RrL2F3cy1jb2duaXRvXCI7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tIFwiQGF3cy1jZGsvYXdzLWlhbVwiO1xyXG5pbXBvcnQgKiBhcyBzZXMgZnJvbSBcIkBhd3MtY2RrL2F3cy1zZXNcIjtcclxuaW1wb3J0IHsgRHVyYXRpb24gfSBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNvc2xlYmFub25Jbml0aWF0aXZlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGFwaTogYXBpZ3cuUmVzdEFwaTtcclxuICBwb3N0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBzZXR0aW5nc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBhdXRob3JpemVyOiBhcGlndy5DZm5BdXRob3JpemVyO1xyXG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcbiAgICB0aGlzLmNyZWF0ZUluaXRpYXRpdmVDb2duaXRvKCk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVJbml0aWF0aXZlQ29nbml0bygpOiB2b2lkIHtcclxuICAgIGNvbnN0IGNvbmZTZXQgPSBuZXcgc2VzLkNmbkNvbmZpZ3VyYXRpb25TZXQoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLWNvbmYtc2V0XCIsXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1zZXMtY29uZi1zZXRcIixcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2woXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwic29zbGViYW5vbi1pbml0aWF0aXZlLXVzZXItcG9vbFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgdXNlclBvb2xOYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS11c2VyLXBvb2xcIixcclxuICAgICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBzaWduSW5BbGlhc2VzOiB7XHJcbiAgICAgICAgICB1c2VybmFtZTogZmFsc2UsXHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgZ2l2ZW5OYW1lOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBmYW1pbHlOYW1lOiB7IG11dGFibGU6IHRydWUsIHJlcXVpcmVkOiB0cnVlIH0sXHJcbiAgICAgICAgICBlbWFpbDogeyBtdXRhYmxlOiB0cnVlLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgcGhvbmVOdW1iZXI6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICAgIGFkZHJlc3M6IHsgbXV0YWJsZTogdHJ1ZSwgcmVxdWlyZWQ6IHRydWUgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgIGluaXRpYXRpdmVJZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbXV0YWJsZTogdHJ1ZSB9KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGF1dG9WZXJpZnk6IHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgcGhvbmU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgICAgbWluTGVuZ3RoOiA4LFxyXG4gICAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogZmFsc2UsXHJcbiAgICAgICAgICByZXF1aXJlRGlnaXRzOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IGZhbHNlLFxyXG4gICAgICAgICAgdGVtcFBhc3N3b3JkVmFsaWRpdHk6IER1cmF0aW9uLmRheXMoNyksXHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBlbWFpbFNldHRpbmdzOiB7XHJcbiAgICAgICAgLy8gICBmcm9tOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAgICAgLy8gICByZXBseVRvOiBcImhlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAgICAgLy8gfSxcclxuICAgICAgICBzaWduSW5DYXNlU2Vuc2l0aXZlOiB0cnVlLFxyXG4gICAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBjZm5Vc2VyUG9vbCA9IHRoaXMudXNlclBvb2wubm9kZS5kZWZhdWx0Q2hpbGQgYXMgY29nbml0by5DZm5Vc2VyUG9vbDtcclxuICAgIC8vIGNmblVzZXJQb29sLmVtYWlsQ29uZmlndXJhdGlvbiA9IHtcclxuICAgIC8vICAgY29uZmlndXJhdGlvblNldDogY29uZlNldC5yZWYsXHJcbiAgICAvLyAgIGVtYWlsU2VuZGluZ0FjY291bnQ6IFwiREVWRUxPUEVSXCIsXHJcbiAgICAvLyAgIGZyb206IFwiaGVscGRlc2tAc29zbGViYW5vbi5jb21cIixcclxuICAgIC8vICAgcmVwbHlUb0VtYWlsQWRkcmVzczogXCJoZWxwZGVza0Bzb3NsZWJhbm9uLmNvbVwiLFxyXG4gICAgLy8gICBzb3VyY2VBcm46XHJcbiAgICAvLyAgICAgXCJhcm46YXdzOnNlczpldS13ZXN0LTE6MjE4NTYxODYxNTgzOmlkZW50aXR5L2hlbHBkZXNrQHNvc2xlYmFub24uY29tXCIsXHJcbiAgICAvLyB9O1xyXG5cclxuICAgIC8vIHRoaXMuYXV0aG9yaXplciA9IG5ldyBhcGlndy5DZm5BdXRob3JpemVyKHRoaXMsIFwiQVBJR2F0ZXdheUF1dGhvcml6ZXJcIiwge1xyXG4gICAgLy8gICBuYW1lOiBcImNvZ25pdG8tYXV0aG9yaXplclwiLFxyXG4gICAgLy8gICBpZGVudGl0eVNvdXJjZTogXCJtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvblwiLFxyXG4gICAgLy8gICBwcm92aWRlckFybnM6IFtjZm5Vc2VyUG9vbC5hdHRyQXJuXSxcclxuICAgIC8vICAgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZXN0QXBpSWQsXHJcbiAgICAvLyAgIHR5cGU6IGFwaWd3LkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE8sXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1jbGllbnRcIixcclxuICAgICAge1xyXG4gICAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogXCJzb3NsZWJhbm9uLWluaXRpYXRpdmUtY2xpZW50XCIsXHJcbiAgICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxyXG4gICAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgY29uc3QgaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1pZGVudGl0eS1wb29sXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBpZGVudGl0eVBvb2xOYW1lOiBcInNvc2xlYmFub24taW5pdGlhdGl2ZS1pZGVudGl0eS1wb29sXCIsXHJcbiAgICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcclxuICAgICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgY2xpZW50SWQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgICAgIHByb3ZpZGVyTmFtZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyTmFtZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICAgIC8vIGNvbnN0IHVuYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgaWFtLlJvbGUoXHJcbiAgICAvLyAgIHRoaXMsXHJcbiAgICAvLyAgIFwiQ29nbml0b0RlZmF1bHRVbmF1dGhlbnRpY2F0ZWRSb2xlXCIsXHJcbiAgICAvLyAgIHtcclxuICAgIC8vICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uRmVkZXJhdGVkUHJpbmNpcGFsKFxyXG4gICAgLy8gICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb21cIixcclxuICAgIC8vICAgICAgIHtcclxuICAgIC8vICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAvLyAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkXCI6IGlkZW50aXR5UG9vbC5yZWYsXHJcbiAgICAvLyAgICAgICAgIH0sXHJcbiAgICAvLyAgICAgICAgIFwiRm9yQW55VmFsdWU6U3RyaW5nTGlrZVwiOiB7XHJcbiAgICAvLyAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YW1yXCI6IFwidW5hdXRoZW50aWNhdGVkXCIsXHJcbiAgICAvLyAgICAgICAgIH0sXHJcbiAgICAvLyAgICAgICB9LFxyXG4gICAgLy8gICAgICAgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiXHJcbiAgICAvLyAgICAgKSxcclxuICAgIC8vICAgfVxyXG4gICAgLy8gKTtcclxuICAgIC8vIHVuYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAvLyAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgLy8gICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxyXG4gICAgLy8gICAgIGFjdGlvbnM6IFtcIm1vYmlsZWFuYWx5dGljczpQdXRFdmVudHNcIiwgXCJjb2duaXRvLXN5bmM6KlwiXSxcclxuICAgIC8vICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAvLyAgIH0pXHJcbiAgICAvLyApO1xyXG5cclxuICAgIGNvbnN0IGF1dGhlbnRpY2F0ZWRSb2xlID0gbmV3IGlhbS5Sb2xlKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIkNvZ25pdG9EZWZhdWx0QXV0aGVudGljYXRlZFJvbGVcIixcclxuICAgICAge1xyXG4gICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXHJcbiAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbVwiLFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWRcIjogaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXCJGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlXCI6IHtcclxuICAgICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJhdXRoZW50aWNhdGVkXCIsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiXHJcbiAgICAgICAgKSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBhdXRoZW50aWNhdGVkUm9sZS5hZGRUb1BvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICBcIm1vYmlsZWFuYWx5dGljczpQdXRFdmVudHNcIixcclxuICAgICAgICAgIFwiY29nbml0by1zeW5jOipcIixcclxuICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eToqXCIsXHJcbiAgICAgICAgXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcImxhbWJkYTpJbnZva2VGdW5jdGlvblwiXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGRlZmF1bHRQb2xpY3kgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJJZGVudGl0eVBvb2xSb2xlTWFwcGluZ1wiLFxyXG4gICAgICB7XHJcbiAgICAgICAgaWRlbnRpdHlQb29sSWQ6IGlkZW50aXR5UG9vbC5yZWYsXHJcbiAgICAgICAgcm9sZXM6IHtcclxuICAgICAgICAgIC8vIHVuYXV0aGVudGljYXRlZDogdW5hdXRoZW50aWNhdGVkUm9sZS5yb2xlQXJuLFxyXG4gICAgICAgICAgYXV0aGVudGljYXRlZDogYXV0aGVudGljYXRlZFJvbGUucm9sZUFybixcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxufVxyXG4iXX0=