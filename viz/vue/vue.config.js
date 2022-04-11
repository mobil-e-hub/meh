var path = require('path')
module.exports = {
    // Basic path
    publicPath: process.env.NODE_ENV === 'production'
        ? './'
        : './',
    //
    // configureWebpack: {
    // resolve: {
    //   alias: {
    //     src: path.resolve(__dirname, 'src')
    //   }
    // },
}