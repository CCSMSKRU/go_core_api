const path = require('path')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const HTMLWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const {ProvidePlugin} = require("webpack")

const isProd = process.env.NODE_ENV === 'production'
const isDev = !isProd

const buildForES5 = process.env.ES5 === 'true'
const target = process.env.TARGET || 'web'

// const filename = ext => isDev ? `bundle.${ext}` : `bundle.[hash].${ext}`
const filename = ext => isDev
    ? `bundle.${ext}`
    : (buildForES5
            ? `indexES5.${ext}`
            : (target === 'node' ? `index.node.${ext}` : `index.${ext}`)
    )

const jsLoaders = () => {
    const loaders = [
        {
            loader: 'babel-loader',
            options: {
                presets: [
                    ['@babel/preset-env', {
                        targets: buildForES5 
                            ? "> 0.25%, not dead, IE 11" 
                            : (target === 'node' ? { node: "current" } : "> 0.25%, not dead"),
                        useBuiltIns: buildForES5 ? 'entry' : false,
                        corejs: buildForES5 ? 3 : undefined,
                        modules: false
                    }],
                    '@babel/preset-typescript'
                ],
                plugins: ['@babel/plugin-proposal-class-properties', "@babel/plugin-proposal-optional-chaining"]
            }
        }
    ]

    if (isDev) {
        // loaders.push('eslint-loader')
    }
    return loaders
}

const plugins = () => {
    // const res = [new CleanWebpackPlugin()]
    const res = [
        new ProvidePlugin({
            process: target === 'node' ? 'process' : 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
    ]
    if (isDev) {
        res.push(
            new HTMLWebpackPlugin({
                template: 'index.html',
                minify: {
                    removeComments: isProd,
                    collapseWhitespace: isProd
                }
            })
        )
    }
    return res
}

const getExternals = () => {
    if (target === 'web') {
        return undefined
    }
    return {
        bufferutil: "commonjs bufferutil",
        "utf-8-validate": "commonjs utf-8-validate",
        crypto: 'commonjs crypto',
        http: 'commonjs http',
        https: 'commonjs https',
        stream: 'commonjs stream',
        net: 'commonjs net',
        tls: 'commonjs tls',
        url: 'commonjs url',
        events: 'commonjs events',
        // Добавьте socket.io-client если он не должен бандлиться для Node.js
        // "socket.io-client": "commonjs socket.io-client"
    }
}

module.exports = {
    context: path.resolve(__dirname, 'src'),
    mode: 'development',
    entry: ['@babel/polyfill', isDev ? './example.js' : (target === 'node' ? './index.ts' : './index.ts')],
    output: {
        filename: filename('js'),
        path: path.resolve(__dirname, 'dist'),
        library: 'initGoCoreQuery',
        libraryTarget: 'umd',
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
    target: target || 'web',  // target может быть 'node' или 'web', в зависимости от сборки
    externals: getExternals(),
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
        fallback: {
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "buffer": require.resolve("buffer/"),
            "stream": require.resolve("stream-browserify"),
            "crypto": require.resolve("crypto-browserify"),
            "url": require.resolve("url/"),
        }
    },
    devServer: {
        port: 3001,
        hot: isDev,
        host: '127.0.0.1'
    },
    devtool: isDev ? 'source-map' : false,
    plugins: plugins(),
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/i,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: isDev,
                            reloadAll: true
                        }
                    },
                    'css-loader',
                    'sass-loader',
                ],
            },
            {
                test: /\.(js|ts)$/,
                exclude: /node_modules/,
                use: jsLoaders()

            },
            {
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        mimetype: 'image/svg+xml'
                    }
                }
            },
            {
                test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        mimetype: 'application/font-woff'
                    }
                }
            },
            {
                test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        mimetype: 'application/font-woff'
                    }
                }
            },
            {
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        mimetype: 'application/octet-stream'
                    }
                }
            },
            {
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
                use: {
                    loader: 'file-loader'
                }
            },
            // {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader?mimetype=image/svg+xml'},
            // {test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader?mimetype=application/font-woff"},
            // {test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader?mimetype=application/font-woff"},
            // {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader?mimetype=application/octet-stream"},
            // {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader"}
        ],
    }
}
