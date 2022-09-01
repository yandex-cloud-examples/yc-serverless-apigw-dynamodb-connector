import path from 'path';

import { Configuration } from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const configuration: Configuration = {
    entry: {
        'apigw-dynamodb-connector': path.resolve('src/dynamodb.ts'),
    },
    resolve: {
        extensions: [
            '.ts',
            '.js',
        ],
    },
    output: {
        path: path.resolve('build'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
    },
    target: 'node',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    transpileOnly: true,
                },
            },
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin(),
    ],
};

export default configuration;
