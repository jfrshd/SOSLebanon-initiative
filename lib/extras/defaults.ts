import * as apigw from "@aws-cdk/aws-apigateway";
import { IFunction } from "@aws-cdk/aws-lambda";

export const passQueryParamsModel =
  '#set($allParams = $input.params())\n{\n"body-json" : $input.json(\'$\'),\n"params" : {#foreach($type in $allParams.keySet())#set($params = $allParams.get($type))"$type":{#foreach($paramName in $params.keySet())    "$paramName" : "$util.escapeJavaScript($params.get($paramName))"#if($foreach.hasNext),#end#end}#if($foreach.hasNext),#end#end}}"';

export const options = {
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

export const mockIntegration = new apigw.MockIntegration({
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

export const lambdaIntegration = (
  lambdaFN: IFunction,
  requestTemplates: {
    [contentType: string]: string;
  }
) => {
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
  } else {
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
