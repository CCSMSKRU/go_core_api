const path = require('path')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const HTMLWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const isProd = process.env.NODE_ENV === 'production'
const isDev = !isProd

const buildForES5 = process.env.ES5 === 'true'
const target = process.env.TARGET || undefined

// const filename = ext => isDev ? `bundle.${ext}` : `bundle.[hash].${ext}`
const filename = ext => isDev
    ? `bundle.${ext}`
    : (buildForES5
            ? `indexES5.${ext}`
            : `index${target ? `.${target}` : ''}.${ext}`
    )

const jsLoaders = () => {
    const loaders = [
        {
            loader: 'babel-loader',
            options: {
                presets: [['@babel/preset-env', {
                    targets: {
                        node: "current"
                    },
                    modules: false
                }]],
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
    const res = []
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

module.exports = {
    context: path.resolve(__dirname, 'src'),
    mode: 'development',
    entry: ['@babel/polyfill', isDev ? './example.js' : './index.js'],
    output: {
        filename: filename('js'),
        path: path.resolve(__dirname, 'dist'),
        // library: {
        //     // name: 'initGoCoreQuery',
        //     // // type: 'commonjs-static',
        //     // // type: 'this',
        //     // type: 'commonjs2',
        //
        //     name:isDev ? undefined : (buildForES5 ? undefined : 'initGoCoreQuery'),
        //     type:isDev ? undefined : (buildForES5 ? undefined : 'commonjs2')
        //     // type:isDev ? undefined : (buildForES5 ? undefined : undefined)
        // },
        library: isDev ? undefined : (buildForES5 ? undefined : 'initGoCoreQuery'),
        libraryTarget: isDev ? undefined : (buildForES5 ? undefined : 'umd'),
        // filename: 'myLib.js',
        // globalObject: isDev ? undefined : (buildForES5 ? undefined : 'this'),
    },
    target,
    externals: isDev || buildForES5 ? undefined : {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
    },
    // externals: [nodeExternals()],
    // target: 'node', // use require() & use NodeJs CommonJS style
    // externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
    // externalsPresets: {
    //     node: true // in order to ignore built-in modules like path, fs, etc.
    // },
    resolve: {
        extensions: ['.js'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            // '@core': path.resolve(__dirname, 'src/core'),
        },
        // fallback: {
        //     // "fs": false,
        //     // "tls": false,
        //     // "net": false,
        //     // "path": false,
        //     // "zlib": false,
        //     "http": require.resolve("stream-http") ,
        //     "https": require.resolve("https-browserify") ,
        //     "buffer": require.resolve("buffer/"),
        //     // "stream": false,
        //     // "crypto": false,
        //     // "crypto-browserify": require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify
        // },
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
                test: /\.js$/,
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
