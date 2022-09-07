// External modules
const { v4: UUID } = require('uuid');

// Internal modules

// Plugin definition
export default {
    install: (app, options) => {
        app.prototype.$uuid = () => {
            return UUID().substr(0, 8);
        };
    }
}
