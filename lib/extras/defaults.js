"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaIntegration = exports.mockIntegration = exports.options = exports.passQueryParamsModel = void 0;
const apigw = require("@aws-cdk/aws-apigateway");
exports.passQueryParamsModel = '#set($allParams = $input.params())\n{\n"body-json" : $input.json(\'$\'),\n"params" : {#foreach($type in $allParams.keySet())#set($params = $allParams.get($type))"$type":{#foreach($paramName in $params.keySet())    "$paramName" : "$util.escapeJavaScript($params.get($paramName))"#if($foreach.hasNext),#end#end}#if($foreach.hasNext),#end#end}}"';
exports.options = {
    methodResponses: [
        {
            statusCode: "200",
            responseModels: {
                "application/json": new apigw.EmptyModel(),
            },
            responseParameters: {
                "method.response.header.Access-Control-Allow-Headers": true,
                "method.response.header.Access-Control-Allow-Methods": true,
                "method.response.header.Access-Control-Allow-Origin": true,
            },
        },
    ],
};
exports.mockIntegration = new apigw.MockIntegration({
    integrationResponses: [
        {
            statusCode: "200",
            responseParameters: {
                "method.response.header.Access-Control-Allow-Headers": "'*'",
                "method.response.header.Access-Control-Allow-Methods": "'*'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
        },
    ],
    passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_MATCH,
    requestTemplates: {
        "application/json": '{"statusCode": 200}',
    },
});
exports.lambdaIntegration = (lambdaFN, requestTemplates) => {
    if (requestTemplates == {}) {
        return new apigw.LambdaIntegration(lambdaFN, {
            proxy: false,
            integrationResponses: [
                {
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": "'*'",
                        "method.response.header.Access-Control-Allow-Methods": "'*'",
                        "method.response.header.Access-Control-Allow-Origin": "'*'",
                    },
                },
            ],
            passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_MATCH,
        });
    }
    else {
        return new apigw.LambdaIntegration(lambdaFN, {
            proxy: false,
            requestTemplates: requestTemplates,
            integrationResponses: [
                {
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": "'*'",
                        "method.response.header.Access-Control-Allow-Methods": "'*'",
                        "method.response.header.Access-Control-Allow-Origin": "'*'",
                    },
                },
            ],
            passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_MATCH,
        });
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZWZhdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBaUQ7QUFHcEMsUUFBQSxvQkFBb0IsR0FDL0Isd1ZBQXdWLENBQUM7QUFFOVUsUUFBQSxPQUFPLEdBQUc7SUFDckIsZUFBZSxFQUFFO1FBQ2Y7WUFDRSxVQUFVLEVBQUUsS0FBSztZQUNqQixjQUFjLEVBQUU7Z0JBQ2Qsa0JBQWtCLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFO2FBQzNDO1lBQ0Qsa0JBQWtCLEVBQUU7Z0JBQ2xCLHFEQUFxRCxFQUFFLElBQUk7Z0JBQzNELHFEQUFxRCxFQUFFLElBQUk7Z0JBQzNELG9EQUFvRCxFQUFFLElBQUk7YUFDM0Q7U0FDRjtLQUNGO0NBQ0YsQ0FBQztBQUVXLFFBQUEsZUFBZSxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQztJQUN2RCxvQkFBb0IsRUFBRTtRQUNwQjtZQUNFLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLGtCQUFrQixFQUFFO2dCQUNsQixxREFBcUQsRUFBRSxLQUFLO2dCQUM1RCxxREFBcUQsRUFBRSxLQUFLO2dCQUM1RCxvREFBb0QsRUFBRSxLQUFLO2FBQzVEO1NBQ0Y7S0FDRjtJQUNELG1CQUFtQixFQUFFLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhO0lBQzVELGdCQUFnQixFQUFFO1FBQ2hCLGtCQUFrQixFQUFFLHFCQUFxQjtLQUMxQztDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsaUJBQWlCLEdBQUcsQ0FDL0IsUUFBbUIsRUFDbkIsZ0JBRUMsRUFDRCxFQUFFO0lBQ0YsSUFBSSxnQkFBZ0IsSUFBSSxFQUFFLEVBQUU7UUFDMUIsT0FBTyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUU7WUFDM0MsS0FBSyxFQUFFLEtBQUs7WUFDWixvQkFBb0IsRUFBRTtnQkFDcEI7b0JBQ0UsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLGtCQUFrQixFQUFFO3dCQUNsQixxREFBcUQsRUFBRSxLQUFLO3dCQUM1RCxxREFBcUQsRUFBRSxLQUFLO3dCQUM1RCxvREFBb0QsRUFBRSxLQUFLO3FCQUM1RDtpQkFDRjthQUNGO1lBQ0QsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLG1CQUFtQixDQUFDLGFBQWE7U0FDN0QsQ0FBQyxDQUFDO0tBQ0o7U0FBTTtRQUNMLE9BQU8sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFO1lBQzNDLEtBQUssRUFBRSxLQUFLO1lBQ1osZ0JBQWdCLEVBQUUsZ0JBQWdCO1lBQ2xDLG9CQUFvQixFQUFFO2dCQUNwQjtvQkFDRSxVQUFVLEVBQUUsS0FBSztvQkFDakIsa0JBQWtCLEVBQUU7d0JBQ2xCLHFEQUFxRCxFQUFFLEtBQUs7d0JBQzVELHFEQUFxRCxFQUFFLEtBQUs7d0JBQzVELG9EQUFvRCxFQUFFLEtBQUs7cUJBQzVEO2lCQUNGO2FBQ0Y7WUFDRCxtQkFBbUIsRUFBRSxLQUFLLENBQUMsbUJBQW1CLENBQUMsYUFBYTtTQUM3RCxDQUFDLENBQUM7S0FDSjtBQUNILENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFwaWd3IGZyb20gXCJAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheVwiO1xyXG5pbXBvcnQgeyBJRnVuY3Rpb24gfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWxhbWJkYVwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IHBhc3NRdWVyeVBhcmFtc01vZGVsID1cclxuICAnI3NldCgkYWxsUGFyYW1zID0gJGlucHV0LnBhcmFtcygpKVxcbntcXG5cImJvZHktanNvblwiIDogJGlucHV0Lmpzb24oXFwnJFxcJyksXFxuXCJwYXJhbXNcIiA6IHsjZm9yZWFjaCgkdHlwZSBpbiAkYWxsUGFyYW1zLmtleVNldCgpKSNzZXQoJHBhcmFtcyA9ICRhbGxQYXJhbXMuZ2V0KCR0eXBlKSlcIiR0eXBlXCI6eyNmb3JlYWNoKCRwYXJhbU5hbWUgaW4gJHBhcmFtcy5rZXlTZXQoKSkgICAgXCIkcGFyYW1OYW1lXCIgOiBcIiR1dGlsLmVzY2FwZUphdmFTY3JpcHQoJHBhcmFtcy5nZXQoJHBhcmFtTmFtZSkpXCIjaWYoJGZvcmVhY2guaGFzTmV4dCksI2VuZCNlbmR9I2lmKCRmb3JlYWNoLmhhc05leHQpLCNlbmQjZW5kfX1cIic7XHJcblxyXG5leHBvcnQgY29uc3Qgb3B0aW9ucyA9IHtcclxuICBtZXRob2RSZXNwb25zZXM6IFtcclxuICAgIHtcclxuICAgICAgc3RhdHVzQ29kZTogXCIyMDBcIixcclxuICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogbmV3IGFwaWd3LkVtcHR5TW9kZWwoKSxcclxuICAgICAgfSxcclxuICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogdHJ1ZSxcclxuICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiB0cnVlLFxyXG4gICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgXSxcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBtb2NrSW50ZWdyYXRpb24gPSBuZXcgYXBpZ3cuTW9ja0ludGVncmF0aW9uKHtcclxuICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xyXG4gICAge1xyXG4gICAgICBzdGF0dXNDb2RlOiBcIjIwMFwiLFxyXG4gICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIicqJ1wiLFxyXG4gICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiJyonXCIsXHJcbiAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIicqJ1wiLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICBdLFxyXG4gIHBhc3N0aHJvdWdoQmVoYXZpb3I6IGFwaWd3LlBhc3N0aHJvdWdoQmVoYXZpb3IuV0hFTl9OT19NQVRDSCxcclxuICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXHJcbiAgfSxcclxufSk7XHJcblxyXG5leHBvcnQgY29uc3QgbGFtYmRhSW50ZWdyYXRpb24gPSAoXHJcbiAgbGFtYmRhRk46IElGdW5jdGlvbixcclxuICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICBbY29udGVudFR5cGU6IHN0cmluZ106IHN0cmluZztcclxuICB9XHJcbikgPT4ge1xyXG4gIGlmIChyZXF1ZXN0VGVtcGxhdGVzID09IHt9KSB7XHJcbiAgICByZXR1cm4gbmV3IGFwaWd3LkxhbWJkYUludGVncmF0aW9uKGxhbWJkYUZOLCB7XHJcbiAgICAgIHByb3h5OiBmYWxzZSxcclxuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiBcIjIwMFwiLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiJyonXCIsXHJcbiAgICAgICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiJyonXCIsXHJcbiAgICAgICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCInKidcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ3cuUGFzc3Rocm91Z2hCZWhhdmlvci5XSEVOX05PX01BVENILFxyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBuZXcgYXBpZ3cuTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhRk4sIHtcclxuICAgICAgcHJveHk6IGZhbHNlLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiByZXF1ZXN0VGVtcGxhdGVzLFxyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IFwiMjAwXCIsXHJcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCInKidcIixcclxuICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCInKidcIixcclxuICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIicqJ1wiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBhcGlndy5QYXNzdGhyb3VnaEJlaGF2aW9yLldIRU5fTk9fTUFUQ0gsXHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcbiJdfQ==