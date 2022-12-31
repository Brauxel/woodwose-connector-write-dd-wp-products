import { DynamoDBResponses } from '../../types/dataTypes'

export const extractErrorsFromDynamoDbResponses = (
  responses: DynamoDBResponses[]
) => {
  const errorMessages = responses.filter((response) => {
    return !!response.Error
  })

  return errorMessages
}
