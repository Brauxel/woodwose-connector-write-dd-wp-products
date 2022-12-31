export interface DynamoDbWordPressProduct {
  id: string
  slug: string
  name: string
  variations: Set<string>
  date_created_gmt: string
  date_modified_gmt: string
}

export interface DynamoDBWordPressProductVariation {
  id: string
  sku: string
  price: number
  quantity: number
  size: string
  permalink: string
  date_created_gmt: string
  date_modified_gmt: string
}

export interface EventBodyProduct
  extends Omit<
    DynamoDbWordPressProduct,
    'variations' | 'date_created_gmt' | 'date_modified_gmt'
  > {
  variations: string[]
}

export enum StatusCodes {
  ERROR = 400,
  SUCCESS = 200,
}

export interface DynamoDBError {
  Code?: string
  Message: string
}

export interface DynamoDBResponses {
  TableName: string
  Error?: DynamoDBError
}
