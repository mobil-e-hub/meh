module.exports = {
    topology: {
        nodes: {
            n00: {id: 'n00', position: {x: -50, y: 50, z: 0}, type: 'parking'},
            n01: {id: 'n01', position: {x: 0, y: 50, z: 0}, type: 'parking'},
            n02: {id: 'n02', position: {x: 50, y: 50, z: 0}, type: 'air'},
        },
        edges: {
            e00: {id: 'e00', from: 'n00', to: 'n01', type: 'road', distance: 50},
            e01: {id: 'e01', from: 'n02', to: 'n01', type: 'air', distance: 50},
            e02: {id: 'e02', from: 'n01', to: 'n02', type: 'air', distance: 50},

        },
        addresses: {
            a00: {id: 'a00', position: {x: -50, y: 55}, name: '5 Main St'},
            a01: {id: 'a01', position: {x: 0, y: 55}, name: '10 Main St'},
            a02: {id: 'a02', position: {x: 50, y: 55}, name: '15 Main St'}
        },
        customers: {
            c00: {id: 'c00', name: 'Outside', address: 'a00'},
            c01: {id: 'c01', name: 'Lab Area', address: 'a01'},
            c02: {id: 'c02', name: 'Roof Hub', address: 'a02'}
        }
    },
    entities: {
        //idea: if value is none --> generate randomly during init
        hubs: {
            h00: {id: 'h00', position: 'n02'},
        },
        drones: {
            d00: {id: 'd00', position: { x: 50, y: 50, z: 0 }}
        },
        cars: {
            v00: {id:'v00', position: {'x': -50, 'y': 50, 'z': 0}
            }
        },
        missions: {

        }
    }
};
