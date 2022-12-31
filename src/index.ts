import {
  BatchExecuteStatementCommand,
  BatchStatementRequest,
} from '@aws-sdk/client-dynamodb'
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { logger } from './utils/logger/buildLogger'
import { hydrateEnv } from './utils/secrets/hydrateEnv'
import { logAndThrowError } from './utils/logger/loggerHelpers'
import { validateSingleProductInBody } from './utils/validators/productDataValidators'
import { ddbDocClient } from './libs/ddbDocClient'
import { DynamoDBResponses, StatusCodes } from './types/dataTypes'
import { extractErrorsFromDynamoDbResponses } from './utils/dynamo-db/dataStructureUtils'

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err)
  process.exit(1)
})

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  logger.info(`Handler function called with event: ${JSON.stringify(event)}`)
  await hydrateEnv()

  if (!event.body) {
    return logAndThrowError('Validation Error in provided event', {
      name: 'No arguments provided',
      message:
        'Please provide an array of products with all the required properties',
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

  return {
    statusCode: StatusCodes.SUCCESS,
    body: JSON.stringify({
      data: data,
    }),
  }
}
