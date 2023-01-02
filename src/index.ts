import {
  BatchExecuteStatementCommand,
  BatchStatementRequest,
} from '@aws-sdk/client-dynamodb'
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda'
import { logger } from './utils/logger/buildLogger'
import { hydrateEnv } from './utils/secrets/hydrateEnv'
import {
  logAndReturnError,
  logAndThrowError,
} from './utils/logger/loggerHelpers'
import { validateSingleProductInBody } from './utils/validators/productDataValidators'
import { ddbDocClient } from './libs/ddbDocClient'
import { DynamoDBResponses, StatusCodes } from './types/dataTypes'
import { extractErrorsFromDynamoDbResponses } from './utils/dynamo-db/dataStructureUtils'

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err)
  process.exit(1)
})

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context
): Promise<APIGatewayProxyResultV2> => {
  logger.info(`Handler function called with event: ${JSON.stringify(event)}`)
  logger.info(
    `Handler function called with context: ${JSON.stringify(context)}`
  )
  await hydrateEnv()

  if (!event.body) {
    return logAndThrowError('Validation Error in provided event', {
      name: 'No arguments provided',
      message:
        'Please provide an array of products with all the required properties',
    })
  }

  if (
    event.requestContext.http.method !== 'POST' &&
    event.requestContext.http.method !== 'PATCH'
  ) {
    return logAndReturnError(`Please provide a valid http method`, {
      name: 'Only POST and PATCH are supported',
      message: `Please send a POST http request to add a new product and a PATCH http request to update existing products`,
    })
  }

  const parsedBody = JSON.parse(event.body)
  if (parsedBody.length === 0) {
    return logAndThrowError('Validation Error in provided products', {
      name: 'No new products provided',
      message:
        'Please provide an array of products with all the required properties',
    })
  }

  const Statements: BatchStatementRequest[] = []
  for (let index = 0; index < parsedBody.length; index++) {
    const validationResult = validateSingleProductInBody(
      parsedBody[index],
      index.toString()
    )

    if (validationResult.statusCode !== StatusCodes.SUCCESS) {
      return validationResult
    }

    const { id, slug, name, variations } = parsedBody[index]
    const currentDate = new Date().toISOString()
    if (event.requestContext.http.method === 'POST') {
      Statements.push({
        Statement:
          'INSERT INTO ' +
          process.env.WORDPRESS_PRODUCTS_TABLE_NAME +
          "  value  {'id':?, 'slug':?, 'variations':?, 'name':?, 'date_created_gmt':?, 'date_modified_gmt':?}",
        Parameters: [
          { S: id },
          { S: slug },
          { SS: variations },
          { S: name },
          {
            S: currentDate,
          },
          { S: currentDate },
        ],
      })
    }

    if (event.requestContext.http.method === 'PATCH') {
      Statements.push({
        Statement: `UPDATE ${process.env.WORDPRESS_PRODUCTS_TABLE_NAME} SET variations=?, name=?, date_modified_gmt=? WHERE id=? and slug=?`,
        Parameters: [
          { SS: variations },
          { S: name },
          { S: currentDate },
          { S: id },
          { S: slug },
        ],
      })
    }
  }

  const params = {
    Statements,
  }

  const data = await ddbDocClient.send(new BatchExecuteStatementCommand(params))
  const errors = extractErrorsFromDynamoDbResponses(
    data.Responses as DynamoDBResponses[]
  )
  if (errors.length > 0) {
    // TODO: Standardize the error response, also update logAndReturnError() function for an array of errors
    return {
      statusCode: StatusCodes.ERROR,
      body: JSON.stringify({
        errors,
      }),
    }
  }

  // TODO: Add error handling for the many different dynamo DB errors
  //   {
  //     "errorType": "ValidationException",
  //     "errorMessage": "1 validation error detected: Value '[]' at 'statements' failed to satisfy constraint: Member must have length greater than or equal to 1",
  //     "name": "ValidationException",
  //     "$fault": "client",
  //     "$metadata": {
  //         "httpStatusCode": 400,
  //         "requestId": "4FTE3TVOBKALDPF9S4406G2H97VV4KQNSO5AEMVJF66Q9ASUAAJG",
  //         "attempts": 1,
  //         "totalRetryDelay": 0
  //     },
  //     "__type": "com.amazon.coral.validate#ValidationException",
  //     "message": "1 validation error detected: Value '[]' at 'statements' failed to satisfy constraint: Member must have length greater than or equal to 1",
  //     "stack": [
  //         "ValidationException: 1 validation error detected: Value '[]' at 'statements' failed to satisfy constraint: Member must have length greater than or equal to 1",
  //         "    at t3 (/var/task/index.js:3:4637)",
  //         "    at K4 (/var/task/index.js:3:84994)",
  //         "    at processTicksAndRejections (node:internal/process/task_queues:96:5)",
  //         "    at async /var/task/index.js:1:13271",
  //         "    at async /var/task/index.js:14:4933",
  //         "    at async /var/task/index.js:3:302295",
  //         "    at async /var/task/index.js:3:284950",
  //         "    at async Runtime.hIe [as handler] (/var/task/index.js:56:28115)"
  //     ]
  // }

  return {
    statusCode: StatusCodes.SUCCESS,
    body: JSON.stringify({
      data: data,
    }),
  }
}
