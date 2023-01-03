import { StatusCodes } from '../../types/dataTypes'
import { logger } from './buildLogger'

export const logAndThrowError = (error: Error) => {
  logger.error(new Error(JSON.stringify(error)))

  throw new Error(JSON.stringify(error))
}

export const logAndReturnError = (description: string, error: Error) => {
  logger.error(new Error(JSON.stringify(error)))

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
