const path = require('path')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const HTMLWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const isProd = process.env.NODE_ENV === 'production'
const isDev = !isProd

const buildForES5 = process.env.ES5 === 'true'

// const filename = ext => isDev ? `bundle.${ext}` : `bundle.[hash].${ext}`
const filename = ext => isDev ? `bundle.${ext}` : (buildForES5 ? `indexES5.${ext}` : `index.${ext}`)

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
        library: isDev ? undefined : (buildForES5 ? undefined : 'initGoCoreQuery'),
        libraryTarget: isDev ? undefined : (buildForES5 ? undefined : 'commonjs2'),
        // filename: 'myLib.js',
        globalObject: isDev ? undefined : (buildForES5 ? undefined : 'this'),
    },
    target: isDev || buildForES5 ? undefined : "node",
    externals: isDev || buildForES5 ? undefined : {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
    },
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
                test: /\.js$/,
                exclude: /node_modules/,
                use: jsLoaders()

            },
            {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader?mimetype=image/svg+xml'},
            {test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader?mimetype=application/font-woff"},
            {test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader?mimetype=application/font-woff"},
            {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader?mimetype=application/octet-stream"},
            {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file-loader"}
        ],
    }
}
