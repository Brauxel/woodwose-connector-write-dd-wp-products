import { StatusCodes } from '../../types/dataTypes'
import { logger } from './buildLogger'

export const logAndThrowError = (message: string, error: Error) => {
  logger.error(message, new Error(`${JSON.stringify(error)}`))

  throw new Error(message)
}

export const logAndReturnError = (description: string, error: Error) => {
  logger.error(description, new Error(`${JSON.stringify(error)}`))

  return {
    statusCode: StatusCodes.ERROR,
    body: JSON.stringify({
      errors: {
        description,
        error,
      },
    }),
  }
}
