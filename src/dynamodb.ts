import {
    DeleteItemCommand,
    DeleteItemCommandInput,
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandInput,
    PutItemCommand,
    PutItemCommandInput,
    ScanCommand,
    ScanCommandInput,
    UpdateItemCommand,
    UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { getIamToken, Token } from './iam';
import {
    Event,
    DynamoDbCommand,
    PutItemContext,
    CommandContext,
    GetItemContext,
    UpdateItemContext,
    DeleteItemContext,
    ScanContext,
} from './event';

const error = (code: number, message: string) => ({
    statusCode: code,
    body: { message },
    isBase64Encoded: false,
});

const response = (body: any) => ({
    statusCode: 200,
    body,
    isBase64Encoded: false,
});

export const handler = async (event: Event): Promise<any> => {
    try {
        const context: CommandContext | undefined = event.requestContext.apiGateway?.operationContext;

        if (!context) {
            return error(500, 'undefined command context');
        }

        switch (context.command) {
            case DynamoDbCommand.PutItem:
                return response(await putItem(context, event.body));

            case DynamoDbCommand.GetItem:
                const getItemContext = context as GetItemContext;
                const item = await getItem(getItemContext);

                if (!item) {
                    return error(404, `there is no item with key ${getItemContext.key}`);
                }

                return response(item);

            case DynamoDbCommand.UpdateItem:
                return response(await updateItem(context as UpdateItemContext, event.body));

            case DynamoDbCommand.DeleteItem:
                return response(await deleteItem(context as DeleteItemContext));

            case DynamoDbCommand.Scan:
                return response(await scan(context as ScanContext));

            default:
                return error(500, `unknown command: ${context.command}`);
        }
    } catch (e) {
        const { message } = e as Error;

        console.error(`Error: ${message}`);

        return error(500, message);
    }
};

export const putItem = async (context: PutItemContext, item: any): Promise<any> => {
    const client = new DynamoDBClient({ endpoint: context.endpoint, region: process.env.REGION });

    const parsedItem = JSON.parse(item);

    const input: PutItemCommandInput = {
        TableName: context.tableName,
        Item: marshall(parsedItem),
    };

    await callWithToken(client, () => client.send(new PutItemCommand(input)));

    console.debug(`Put item to table ${context.tableName}`);

    return parsedItem;
};

export const getItem = async (context: GetItemContext): Promise<any> => {
    const client = new DynamoDBClient({ endpoint: context.endpoint, region: process.env.REGION });

    const input: GetItemCommandInput = {
        TableName: context.tableName,
        Key: marshall(JSON.parse(context.key)),
        ConsistentRead: true,
    };

    const output = await callWithToken(client, () => client.send(new GetItemCommand(input)));

    console.debug(`Got item with key ${context.key} from table ${context.tableName}`);

    return output?.Item ? unmarshall(output.Item) : undefined;
};

export const updateItem = async (context: UpdateItemContext, values: any): Promise<any> => {
    const client = new DynamoDBClient({ endpoint: context.endpoint, region: process.env.REGION });

    const input: UpdateItemCommandInput = {
        TableName: context.tableName,
        Key: marshall(JSON.parse(context.key)),
        ReturnValues: 'ALL_NEW',
    };

    if (context.updateExpression) {
        input.UpdateExpression = context.updateExpression;
    }

    if (context.expressionAttributeValues) {
        input.ExpressionAttributeValues = marshall(JSON.parse(context.expressionAttributeValues));
    }

    if (values) {
        const attributes = marshall(JSON.parse(values));

        input.AttributeUpdates = {};

        for (const [k, v] of Object.entries(attributes)) {
            input.AttributeUpdates[k] = { Action: 'PUT', Value: v };
        }
    }

    const output = await callWithToken(client, () => client.send(new UpdateItemCommand(input)));

    console.debug(`Updated item with key ${context.key} in table ${context.tableName}`);

    return output?.Attributes ? unmarshall(output.Attributes) : undefined;
};

export const deleteItem = async (context: DeleteItemContext): Promise<any> => {
    const client = new DynamoDBClient({ endpoint: context.endpoint, region: process.env.REGION });

    const input: DeleteItemCommandInput = {
        TableName: context.tableName,
        Key: marshall(JSON.parse(context.key)),
        ReturnValues: 'ALL_OLD',
    };

    const output = await callWithToken(client, () => client.send(new DeleteItemCommand(input)));

    console.debug(`Deleted item with key ${context.key} from table ${context.tableName}`);

    return output?.Attributes ? unmarshall(output.Attributes) : undefined;
};

export const scan = async (context: ScanContext): Promise<Array<any>> => {
    const client = new DynamoDBClient({ endpoint: context.endpoint, region: process.env.REGION });

    const input: ScanCommandInput = {
        TableName: context.tableName,
        ConsistentRead: true,
    };

    if (context.limit) {
        input.Limit = Number.parseInt(context.limit, 10);
    }

    if (context.exclusiveStartKey) {
        input.ExclusiveStartKey = marshall(JSON.parse(context.exclusiveStartKey));
    }

    const output = await callWithToken(client, () => client.send(new ScanCommand(input)));

    console.debug(`Got ${output.Count} items from table ${context.tableName}`);

    return output?.Items ? output.Items.map((item) => unmarshall(item)) : [];
};

const callWithToken = <T>(client: DynamoDBClient, operation: () => Promise<T>): Promise<T> => {
    client.middlewareStack.add(
        (next) => async (arguments_) => {
            const request = arguments_.request as HttpRequest;
            const token: Token = await getIamToken();

            request.headers.Authorization = `Bearer ${token.access_token}`;

            return next(arguments_);
        },
        {
            step: 'finalizeRequest',
        },
    );

    return operation.apply({});
};
