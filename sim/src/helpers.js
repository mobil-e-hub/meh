const random = require('random');
const { v4: uuid } = require('uuid');

// Internal modules
const scenario = JSON.parse(readFileSync('assets/showcase_0.json'));

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
            };
        },
        // TODO refactor! --> doesnt belong here
//        droneHub: () => {
//           let d = Object.values(scenario.topology.nodes).filter(n => n["type"] === 'parking' || n["type"] === 'air');
//           return d[Math.floor(Math.random() * (d.length-1))];
//       },
//       roadHub: () => {
//           let d = Object.values(scenario.topology.nodes).filter(n => n["type"] === 'parking' || n["type"] === 'road');
//           return d[Math.floor(Math.random() * (d.length-1))];
//        },
        rand: random
    },
    uuid: () => {
        return uuid().substr(0, 8);
    },
    dist2d: (a, b) => {
        console.log(a, b);
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    },
    dist3d: (a, b) => {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    }
};
