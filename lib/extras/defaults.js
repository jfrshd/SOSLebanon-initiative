"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZWZhdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlEQUFpRDtBQUdwQyxRQUFBLG9CQUFvQixHQUMvQix3VkFBd1YsQ0FBQztBQUU5VSxRQUFBLE9BQU8sR0FBRztJQUNyQixlQUFlLEVBQUU7UUFDZjtZQUNFLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLGNBQWMsRUFBRTtnQkFDZCxrQkFBa0IsRUFBRSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7YUFDM0M7WUFDRCxrQkFBa0IsRUFBRTtnQkFDbEIscURBQXFELEVBQUUsSUFBSTtnQkFDM0QscURBQXFELEVBQUUsSUFBSTtnQkFDM0Qsb0RBQW9ELEVBQUUsSUFBSTthQUMzRDtTQUNGO0tBQ0Y7Q0FDRixDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDO0lBQ3ZELG9CQUFvQixFQUFFO1FBQ3BCO1lBQ0UsVUFBVSxFQUFFLEtBQUs7WUFDakIsa0JBQWtCLEVBQUU7Z0JBQ2xCLHFEQUFxRCxFQUFFLEtBQUs7Z0JBQzVELHFEQUFxRCxFQUFFLEtBQUs7Z0JBQzVELG9EQUFvRCxFQUFFLEtBQUs7YUFDNUQ7U0FDRjtLQUNGO0lBQ0QsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLG1CQUFtQixDQUFDLGFBQWE7SUFDNUQsZ0JBQWdCLEVBQUU7UUFDaEIsa0JBQWtCLEVBQUUscUJBQXFCO0tBQzFDO0NBQ0YsQ0FBQyxDQUFDO0FBRVUsUUFBQSxpQkFBaUIsR0FBRyxDQUMvQixRQUFtQixFQUNuQixnQkFFQyxFQUNELEVBQUU7SUFDRixJQUFJLGdCQUFnQixJQUFJLEVBQUUsRUFBRTtRQUMxQixPQUFPLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRTtZQUMzQyxLQUFLLEVBQUUsS0FBSztZQUNaLG9CQUFvQixFQUFFO2dCQUNwQjtvQkFDRSxVQUFVLEVBQUUsS0FBSztvQkFDakIsa0JBQWtCLEVBQUU7d0JBQ2xCLHFEQUFxRCxFQUFFLEtBQUs7d0JBQzVELHFEQUFxRCxFQUFFLEtBQUs7d0JBQzVELG9EQUFvRCxFQUFFLEtBQUs7cUJBQzVEO2lCQUNGO2FBQ0Y7WUFDRCxtQkFBbUIsRUFBRSxLQUFLLENBQUMsbUJBQW1CLENBQUMsYUFBYTtTQUM3RCxDQUFDLENBQUM7S0FDSjtTQUFNO1FBQ0wsT0FBTyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUU7WUFDM0MsS0FBSyxFQUFFLEtBQUs7WUFDWixnQkFBZ0IsRUFBRSxnQkFBZ0I7WUFDbEMsb0JBQW9CLEVBQUU7Z0JBQ3BCO29CQUNFLFVBQVUsRUFBRSxLQUFLO29CQUNqQixrQkFBa0IsRUFBRTt3QkFDbEIscURBQXFELEVBQUUsS0FBSzt3QkFDNUQscURBQXFELEVBQUUsS0FBSzt3QkFDNUQsb0RBQW9ELEVBQUUsS0FBSztxQkFDNUQ7aUJBQ0Y7YUFDRjtZQUNELG1CQUFtQixFQUFFLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhO1NBQzdELENBQUMsQ0FBQztLQUNKO0FBQ0gsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBpZ3cgZnJvbSBcIkBhd3MtY2RrL2F3cy1hcGlnYXRld2F5XCI7XHJcbmltcG9ydCB7IElGdW5jdGlvbiB9IGZyb20gXCJAYXdzLWNkay9hd3MtbGFtYmRhXCI7XHJcblxyXG5leHBvcnQgY29uc3QgcGFzc1F1ZXJ5UGFyYW1zTW9kZWwgPVxyXG4gICcjc2V0KCRhbGxQYXJhbXMgPSAkaW5wdXQucGFyYW1zKCkpXFxue1xcblwiYm9keS1qc29uXCIgOiAkaW5wdXQuanNvbihcXCckXFwnKSxcXG5cInBhcmFtc1wiIDogeyNmb3JlYWNoKCR0eXBlIGluICRhbGxQYXJhbXMua2V5U2V0KCkpI3NldCgkcGFyYW1zID0gJGFsbFBhcmFtcy5nZXQoJHR5cGUpKVwiJHR5cGVcIjp7I2ZvcmVhY2goJHBhcmFtTmFtZSBpbiAkcGFyYW1zLmtleVNldCgpKSAgICBcIiRwYXJhbU5hbWVcIiA6IFwiJHV0aWwuZXNjYXBlSmF2YVNjcmlwdCgkcGFyYW1zLmdldCgkcGFyYW1OYW1lKSlcIiNpZigkZm9yZWFjaC5oYXNOZXh0KSwjZW5kI2VuZH0jaWYoJGZvcmVhY2guaGFzTmV4dCksI2VuZCNlbmR9fVwiJztcclxuXHJcbmV4cG9ydCBjb25zdCBvcHRpb25zID0ge1xyXG4gIG1ldGhvZFJlc3BvbnNlczogW1xyXG4gICAge1xyXG4gICAgICBzdGF0dXNDb2RlOiBcIjIwMFwiLFxyXG4gICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBuZXcgYXBpZ3cuRW1wdHlNb2RlbCgpLFxyXG4gICAgICB9LFxyXG4gICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiB0cnVlLFxyXG4gICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IHRydWUsXHJcbiAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICBdLFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vY2tJbnRlZ3JhdGlvbiA9IG5ldyBhcGlndy5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXHJcbiAgICB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IFwiMjAwXCIsXHJcbiAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xyXG4gICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiJyonXCIsXHJcbiAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCInKidcIixcclxuICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiJyonXCIsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIF0sXHJcbiAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ3cuUGFzc3Rocm91Z2hCZWhhdmlvci5XSEVOX05PX01BVENILFxyXG4gIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgIFwiYXBwbGljYXRpb24vanNvblwiOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICB9LFxyXG59KTtcclxuXHJcbmV4cG9ydCBjb25zdCBsYW1iZGFJbnRlZ3JhdGlvbiA9IChcclxuICBsYW1iZGFGTjogSUZ1bmN0aW9uLFxyXG4gIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgIFtjb250ZW50VHlwZTogc3RyaW5nXTogc3RyaW5nO1xyXG4gIH1cclxuKSA9PiB7XHJcbiAgaWYgKHJlcXVlc3RUZW1wbGF0ZXMgPT0ge30pIHtcclxuICAgIHJldHVybiBuZXcgYXBpZ3cuTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhRk4sIHtcclxuICAgICAgcHJveHk6IGZhbHNlLFxyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IFwiMjAwXCIsXHJcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCInKidcIixcclxuICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCInKidcIixcclxuICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIicqJ1wiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBhcGlndy5QYXNzdGhyb3VnaEJlaGF2aW9yLldIRU5fTk9fTUFUQ0gsXHJcbiAgICB9KTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIG5ldyBhcGlndy5MYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFGTiwge1xyXG4gICAgICBwcm94eTogZmFsc2UsXHJcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHJlcXVlc3RUZW1wbGF0ZXMsXHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogXCIyMDBcIixcclxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIicqJ1wiLFxyXG4gICAgICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIicqJ1wiLFxyXG4gICAgICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiJyonXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6IGFwaWd3LlBhc3N0aHJvdWdoQmVoYXZpb3IuV0hFTl9OT19NQVRDSCxcclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuIl19