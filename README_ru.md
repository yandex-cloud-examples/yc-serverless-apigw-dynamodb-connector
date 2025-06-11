## Коннектор DynamoDB для Yandex API Gateway

Функция Yandex Cloud Functions для интеграции [Yandex API Gateway](https://cloud.yandex.ru/services/api-gateway) с БД, совместимыми с API [DynamoDB](https://aws.amazon.com/ru/dynamodb/)
.

Коннектор реализует следующие команды и параметры DynamoDB:

- [GetItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html)
    * TableName
    * Ключ
- [PutItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html)
    * TableName
    * Элемент
- [UpdateItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html)
    * TableName
    * Ключ
    * UpdateExpression
    * ExpressionAttributeValues
- [DeleteItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html)
    * TableName
    * Ключ
- [Scan](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html)
    * TableName
    * Limit
    * ExclusiveStartKey

Для начала работы изучите [эти примеры](examples).
