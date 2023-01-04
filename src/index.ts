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
import { logAndReturnError } from './utils/logger/loggerHelpers'
import { validateSingleProductInBody } from './utils/validators/productDataValidators'
import { ddbDocClient } from './libs/ddbDocClient'
import { DynamoDBResponses, StatusCodes } from './types/dataTypes'
import { extractErrorsFromDynamoDbResponses } from './utils/dynamo-db/dataStructureUtils'

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err)
  process.exit(1)
})

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  logger.info(`Handler function called with event: ${JSON.stringify(event)}`)

  try {
    await hydrateEnv()
  } catch (error) {
    const { message } = error as Error
    const parsedMessage = JSON.parse(message)
    return logAndReturnError(parsedMessage.message, parsedMessage)
  }

  if (!event.body) {
    return logAndReturnError('Validation Error in provided event', {
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
    return logAndReturnError('Validation Error in provided products', {
      name: 'No new products provided',
      message:
        'Please provide an array of products with all the required properties',
    })
  }

  const Statements: BatchStatementRequest[] = []
  for (let index = 0; index < parsedBody.length; index++) {
    const validationResult = await validateSingleProductInBody(
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
        Statement: `UPDATE ${process.env.WORDPRESS_PRODUCTS_TABLE_NAME} SET "variations"=?, "name"=?, "date_modified_gmt"=? WHERE "id"=? and "slug"=?`,
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

  return {
    statusCode: StatusCodes.SUCCESS,
    body: JSON.stringify({
      data: data,
    }),
  }
}
