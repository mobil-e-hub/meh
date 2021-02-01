const random = require('random');
const { v4: uuid } = require('uuid');

module.exports = {
    random: {
        key: (dict) => {
            if (!dict) {
                return null;
            }
            else {
                let keys = Object.keys(dict);
                return keys[random.int(0, keys.length - 1)];
            }
        },
        keys: (dict, draws=1, repeat=false) => {
            if (!dict) {
                return null;
            }
            else {
                let keys = Object.keys(dict);
                let result = [];
                for (let i = 0; i < draws && keys.length > 0; i++) {
                    let index = random.int(0, keys.length - 1);
                    result.push(keys[index]);
                    if (!repeat) {
                        keys.splice(index, 1);
                    }
                }
                return result;
            }
        },
        value: (dict) => {
            if (!dict) {
                return null;
            }
            else {
                let values = Object.values(dict);
                return values[random.int(0, values.length - 1)];
            }
        },
        choice: (array) => {
            if (!array) {
                return null;
            }
            else {
                return array[random.int(0, array.length - 1)];
            }
        },
        position: (range = 10) => {
            return {
                x: random.float(-range, range),
                y: random.float(-range, range),
                z: random.float(0, range),
            }
        },
        rand: random
    },
    uuid: () => {
        return uuid().substr(0, 8);
    }
};
