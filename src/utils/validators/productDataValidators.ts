import { APIGatewayProxyResult } from 'aws-lambda'
import { EventBodyProduct, StatusCodes } from '../../types/dataTypes'
import { logAndReturnError } from '../logger/loggerHelpers'

export const validateSingleProductInBody = (
  product: EventBodyProduct,
  key: string
): APIGatewayProxyResult => {
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

  if (!product.variations) {
    return logAndReturnError(
      `No variations for the product at index ${key} with id ${product.id}`,
      {
        name: 'No variations provided',
        message: `Please provide an array of product variations IDs for the product at index ${key} with id ${product.id}`,
      }
    )

    //   Check that the variation has ids for products that exist here
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
