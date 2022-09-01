export interface Event {
    resource: string;
    path: string;
    httpMethod: string;
    headers?: Record<string, string>;
    multiValueHeaders?: Record<string, string[]>;
    queryStringParameters?: Record<string, string>;
    multiValueQueryStringParameters?: Record<string, string[]>;
    requestContext: RequestContext;
    pathParameters?: Record<string, string>;
    body?: Body;
    isBase64Encoded?: boolean;
    parameters?: Record<string, string>;
    multiValueParameters?: Record<string, string[]>;
}

export interface RequestContext {
    identity: {
        sourceIp: string;
        userAgent: string;
    };
    httpMethod: string;
    requestId: string;
    requestTime: string;
    requestTimeEpoch: number;
    authorizer?: Record<string, any>;
    apiGateway?: {
        operationContext?: CommandContext
    };
}

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
