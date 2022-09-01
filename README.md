## DynamoDB Connector for Yandex API Gateway

Yandex Function for integration [Yandex API Gateway](https://cloud.yandex.ru/services/api-gateway)
with [DynamoDB](https://aws.amazon.com/ru/dynamodb/) API-compatible databases.

Connector implements next DynamoDB commands and their parameters:

- [GetItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html)
    * TableName
    * Key
- [PutItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html)
    * TableName
    * Item
- [UpdateItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html)
    * TableName
    * Key
    * UpdateExpression
    * ExpressionAttributeValues
- [DeleteItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html)
    * TableName
    * Key
- [Scan](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html)
    * TableName
    * Limit
    * ExclusiveStartKey

To start using, look at the [examples](examples).
