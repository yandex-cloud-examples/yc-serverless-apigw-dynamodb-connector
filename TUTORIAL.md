## Сценарий по разработке и использованию пользовательской интеграции в Yandex API Gateway

В этом сценарии вы узнаете, как разработать собственную интеграцию для
сервиса [Yandex API Gateway](https://cloud.yandex.ru/docs/api-gateway/). Пользовательская интеграция представляет собой
функцию [Yandex Cloud Functions](https://cloud.yandex.ru/docs/functions/) или
контейнер [Yandex Serverless Containers](https://cloud.yandex.ru/services/serverless-containers), который предназначен
для решения типовой задачи и может быть сконфигурирован прямо в OpenAPI-спецификации API-шлюза для какой-либо
HTTP-операции. В данном сценарии вы напишете функцию-интеграцию к [YDB](https://ydb.tech) на языке typescript под среду
выполнения Node.js 16, которая позволит легко работать с базой данных прямо из API Gateway с
использованием [HTTP API](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/Welcome.html), совместимого
с [Amazon DynamoDB](https://aws.amazon.com/ru/dynamodb/). Разработанная интеграция будет применена для реализации
простого CRUD API по работе с базой данных фильмов, развернутой
в [Yandex Managed Service for YDB](https://cloud.yandex.ru/services/ydb).

### Настройка окружения

Подготовьте окружение,
выполнив [инструкцию](https://github.com/yandex-cloud/examples/blob/master/practicum/2021/scale-practicum-serverless/README.md)
.

### Реализация интеграции

1. [Скачайте](https://bb.yandex-team.ru/users/vvkuz/repos/apigw-dynamodb-connector) подготовленный проект.

В файле [`event.ts`](src/event.ts) уже написан интерфейс `Event`,
описывающий [структуру запроса](https://cloud.yandex.ru/docs/api-gateway/concepts/extensions/cloud-functions#request_v1)
, и интерфейс `RequestContext`, описывающий контекст запроса.
При [вызове](https://bb.yandex-team.ru/users/vvkuz/repos/apigw-dynamodb-connector/browse/src/dynamodb.ts#40) функции в
поле `requestContext.apiGateway.operationContext` объекта `event` будет передаваться контекст операции, определенный в
параметре [`context`](https://cloud.yandex.ru/docs/api-gateway/concepts/extensions/cloud-functions#parameters) в
OpenAPI-спецификации API-шлюза, вызывающего функцию-интеграцию. В случае реализации интеграции под serverless-контейнеры
контекст операции будет передаваться через специальный
заголовок [`X-Yc-ApiGateway-Operation-Context`](https://cloud.yandex.ru/docs/api-gateway/concepts/extensions/containers#parameters)
. Для спецификации формата контекста операции и работы с ним внутри функции в файле [`event.ts`](src/event.ts)
определены интерфейсы для основных команд Amazon DynamoDB и их параметров, которые будут реализованы в данной
интеграции:

```typescript
export type CommandContext = GetItemContext | PutItemContext | UpdateItemContext | DeleteItemContext | ScanContext;

export interface BaseCommandContext {
    endpoint: string,
    tableName: string
    command: DynamoDbCommand
}

export interface GetItemContext extends BaseCommandContext {
    key: string
}

export type PutItemContext = BaseCommandContext;

export interface UpdateItemContext extends BaseCommandContext {
    key: string,
    updateExpression?: string,
    expressionAttributeValues?: string,
}

export interface DeleteItemContext extends BaseCommandContext {
    key: string
}

export interface ScanContext extends BaseCommandContext {
    limit?: string
    exclusiveStartKey?: any
}

export enum DynamoDbCommand {
    PutItem = 'PutItem',
    GetItem = 'GetItem',
    UpdateItem = 'UpdateItem',
    DeleteItem = 'DeleteItem',
    Scan = 'Scan',
}

```

Реализация обработки вызова функции и основных команд находится в файле [`dynamodb.ts`](src/dynamodb.ts). Для
авторизации при запросах к YDB используется IAM-токены, получение которых реализовано в файле [`iam.ts`](src/iam.ts).

2. Откройте терминал и перейдите в корневую директорию проекта.

3. Установите необходимые проекту зависимости, выполнив команду `npm ci`.

4. Выполните компиляцию и сборку кода функции с помощью команды `npm run build`.

5. Выполните команду `npm run package` для упаковки собранного кода функции в zip-архив.

6. [Создайте](https://cloud.yandex.ru/docs/storage/operations/buckets/create) публичный бакет
   и [загрузите](https://cloud.yandex.ru/docs/storage/operations/objects/upload) в него полученный
   zip-архив `apigw-dynamodb-connector-0.0.1.zip` из директории [build](build).

### Создание CRUD API

Для развертывания CRUD API, использующего разработанную функцию-интеграцию будет использоваться
инструмент [Terraform](https://www.terraform.io). Для упрощения задачи был подготовлен
специальный [terraform-модуль](https://bb.yandex-team.ru/users/vvkuz/repos/serverless-ydb-api/browse), который позволит
создать в облаке все необходимые ресурсы, а именно сервисный аккаунт, базу данных YDB, функцию-интеграцию и API-шлюз.

1. Откройте терминал, создайте директорию `crud-api` и перейдите в нее.
2. Создайте файл `main.tf` и скопируйте в него следующую конфигурацию terraform-модуля, заполнив соответствующие поля:

```terraform
locals {
  cloud_id    = "<идентификатор облака>"
  folder_id   = "<идентификатор каталога>"
  oauth_token = "<oauth-токен: https://cloud.yandex.ru/docs/cli/operations/profile/profile-create#get-token>"
  zone        = "ru-central1-a"
}

module "crud-api" {
  source = "bb.yandex-team.ru/users/vvkuz/repos/serverless-ydb-api"

  folder_id                 = local.folder_id
  api_name                  = "movies-api"
  database_name             = "movies-db"
  service_account_name      = "movies-api-service-account"
  region                    = "ru-central1"
  openapi_spec              = "api.yaml"
  table_specs               = ["file://table.json"]
  database_connector_bucket = "<имя бакета, в котором хранится архив с функцией-интеграцией>"
  database_connector_object = "apigw-dynamodb-connector-0.0.1.zip"
}

terraform {
  required_providers {
    yandex = {
      source = "yandex-cloud/yandex"
    }
    null   = {
      source = "registry.terraform.io/hashicorp/null"
    }
  }
  required_version = ">= 0.13"
}

provider "yandex" {
  token     = local.oauth_token
  cloud_id  = local.cloud_id
  folder_id = local.folder_id
  zone      = local.zone
}

output "crud_api_domain" {
  value = module.crud-api.api_gateway_domain
}

```

3. Создайте файл `table.json` и скопируйте в него спецификацию схемы таблицы создаваемой YDB:

```json
{
  "TableName": "movie",
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "title",
      "AttributeType": "S"
    },
    {
      "AttributeName": "year",
      "AttributeType": "N"
    }
  ]
}

```

4. Создайте файл `api.yaml` и скопируйте в него OpenAPI-спецификацию создаваемого API-шлюза:

```yaml
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Movies API
x-yc-apigateway:
  service_account_id: ${SERVICE_ACCOUNT_ID}

paths:
  /movies:
    post:
      description: Create movie
      operationId: createMovie
      requestBody:
        description: Movie to create
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Movie'
      responses:
        '200':
          description: Created or updated movie
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Movie'
        default:
          description: error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${FUNCTION_ID}
        context:
          command: PutItem
          endpoint: ${DATABASE_ENDPOINT}
          tableName: movie
    get:
      description: Get movies
      operationId: getMovies
      parameters:
        - name: from
          in: query
          description: Identifier from which will be queried movies in ascending order
          required: true
          schema:
            type: string
        - name: limit
          in: query
          description: Maximum number of movies in response
          required: false
          schema:
            type: number
            default: 10
      responses:
        '200':
          description: Movies
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Movie'
        default:
          description: error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${FUNCTION_ID}
        context:
          command: Scan
          endpoint: ${DATABASE_ENDPOINT}
          tableName: movie
          limit: '{limit}'
          exclusiveStartKey: '{"id": "{from}"}'
  /movies/{movieId}:
    parameters:
      - name: movieId
        in: path
        description: Identifier of movie
        required: true
        schema:
          type: string
    get:
      description: Get movie by id
      operationId: getMovieById
      responses:
        '200':
          description: Movie
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Movie'
        default:
          description: error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${FUNCTION_ID}
        context:
          command: GetItem
          endpoint: ${DATABASE_ENDPOINT}
          tableName: movie
          key: '{"id": "{movieId}"}'
    put:
      description: Update movie by id
      operationId: updateMovieById
      requestBody:
        description: Movie or attributes to update
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Movie'
      responses:
        '200':
          description: Updated movie
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Movie'
        default:
          description: error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${FUNCTION_ID}
        context:
          command: UpdateItem
          endpoint: ${DATABASE_ENDPOINT}
          tableName: movie
          key: '{"id": "{movieId}"}'
    delete:
      description: Delete movie by id
      operationId: deleteMovieById
      responses:
        '200':
          description: Deleted movie
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Movie'
        default:
          description: error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${FUNCTION_ID}
        context:
          command: DeleteItem
          endpoint: ${DATABASE_ENDPOINT}
          tableName: movie
          key: '{"id": "{movieId}"}'
components:
  schemas:
    Movie:
      type: object
      required:
        - id
        - title
        - year
      properties:
        id:
          type: string
        title:
          type: string
        year:
          type: integer

    Error:
      type: object
      required:
        - message
      properties:
        message:
          type: string

```

5. Выполните команду `terraform init` для инициализации terraform.
6. Разверните все необходимые ресурсы с помощью команды `terraform apply`. В выводе команды в
   переменной `crud_api_domain` будет напечатан доменный адрес созданного API.
7. Для проверки работы созданного CRUD API выполните следующие примеры http-вызовов:

```shell
# Создание фильма
curl --location --request POST 'https://<crud_api_domain>/movies' \
--header 'Content-Type: application/json' \
--data-raw '{
    "id": "301",
    "title": "The Matrix",
    "year": 1999
}'

# Получение фильма
curl --location --request GET 'https://<crud_api_domain>/movies/301'

# Обновление фильма
curl --location --request PUT 'https://<crud_api_domain>/movies/301' \
--header 'Content-Type: application/json' \
--data-raw '{
    "title": "Матрица"
}'

# Создание фильма
curl --location --request POST 'https://<crud_api_domain>/movies' \
--header 'Content-Type: application/json' \
--data-raw '{
    "id": "299",
    "title": "The Matrix Reloaded",
    "year": 2003
}'

# Получение списка фильмов
curl --location --request GET 'https://<crud_api_domain>/movies?from=1&limit=5'

# Удаление фильма
curl --location --request DELETE 'https://<crud_api_domain>/movies/301' \
--data-raw ''
```