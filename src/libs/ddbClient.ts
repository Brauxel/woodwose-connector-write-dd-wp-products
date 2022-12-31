// Create the DynamoDB service client module using ES6 syntax.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
// Create an Amazon DynamoDB service client object.
export const ddbClient = new DynamoDBClient({
  region: process.env.DEFAULT_REGION,
})
