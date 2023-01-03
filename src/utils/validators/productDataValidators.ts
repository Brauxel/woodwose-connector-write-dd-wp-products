import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { APIGatewayProxyResult } from 'aws-lambda'
import { ddbDocClient } from '../../libs/ddbDocClient'
import { EventBodyProduct, StatusCodes } from '../../types/dataTypes'
import { logAndReturnError } from '../logger/loggerHelpers'

export const validateSingleProductInBody = async (
  product: EventBodyProduct,
  key: string
): Promise<APIGatewayProxyResult> => {
  if (!product.id) {
    return logAndReturnError(`No id for the product at index ${key}`, {
      name: 'No id provided',
      message: `Please provide an id for the product at index ${key}`,
    })
  }

  if (!product.slug) {
    return logAndReturnError(
      `No slug for the product at index ${key} with id ${product.id}`,
      {
        name: 'No slug provided',
        message: `Please provide a slug for the product at index ${key} with id ${product.id}`,
      }
    )
  }

  if (!product.variations || product.variations.length === 0) {
    return logAndReturnError(
      `No variations for the product at index ${key} with id ${product.id}`,
      {
        name: 'No variations provided',
        message: `Please provide an array of product variations IDs for the product at index ${key} with id ${product.id}`,
      }
    )
  } else {
    for (let i = 0; i < product.variations.length; i++) {
      const variationId = product.variations[i]
      const params = {
        TableName: process.env.WORDPRESS_PRODUCT_VARIATIONS_TABLE_NAME,
        ExpressionAttributeValues: {
          ':i': variationId,
        },
        KeyConditionExpression: 'id = :i',
      }
      const data = await ddbDocClient.send(new QueryCommand(params))
      if (data.Items && data.Items?.length === 0) {
        return logAndReturnError(`No variation data found for ${variationId}`, {
          name: `No product variation exists for the provided ID: ${variationId}`,
          message: `Please add the product variation with the ID ${variationId} first. After you've added all the required variations, we should be able to process the provided request`,
        })
      }
    }
  }

  if (!product.name) {
    return logAndReturnError(
      `No name for the product at index ${key} with id ${product.id}`,
      {
        name: 'No name provided',
        message: `Please provide a name for the product at index ${key} with id ${product.id}`,
      }
    )
  }

  return {
    statusCode: StatusCodes.SUCCESS,
    body: JSON.stringify({
      data: {},
    }),
  }
}
