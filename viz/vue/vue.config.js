const path = require('path')

module.exports = {
    // Basic path
    publicPath: process.env.NODE_ENV === 'production'
        ? './'
        : './',

    configureWebpack: {
        resolve: {
            alias: {
                '@a': path.resolve(__dirname, '../../assets')
            }
        },
    }
}