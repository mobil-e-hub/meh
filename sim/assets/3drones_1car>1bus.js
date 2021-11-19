module.exports = {
    _description: "Scenario with one car and one bus + 3 drones, car is better positioned and should deliver the parcel",
    topology: {
        nodes: {
            n00: {id: 'n00', position: {x: -50, y: 50, z: 0}, type: 'parking'},
            n01: {id: 'n01', position: {x: -50, y: -50, z: 0}, type: 'parking'},
            n02: {id: 'n02', position: {x: 50, y: -50, z: 0}, type: 'road'},
            n03: {id: 'n03', position: {x: 50, y: 50, z: 0}, type: 'road'},
            n04: {id: 'n04', position: {x: -50, y: 60, z: 0}, type: 'air'},
            n05: {id: 'n05', position: {x: -60, y: 60, z: 0}, type: 'air'},
            n06: {id: 'n06', position: {x: -60, y: 50, z: 0}, type: 'air'},
            n07: {id: 'n07', position: {x: -60, y: -60, z: 0}, type: 'air'},
            n08: {id: 'n08', position: {x: 0, y: 0, z: 0}, type: 'road'},
            n09: {id: 'n09', position: {x: 50, y: 0, z: 0}, type: 'parking'},
            n10: {id: 'n10', position: {x: 60, y: 0, z: 0}, type: 'air'}
        },
        edges: {
            e00: {id: 'e00', from: 'n00', to: 'n01', type: 'road', distance: 100},
            e01: {id: 'e01', from: 'n01', to: 'n02', type: 'road', distance: 100},
            e02: {id: 'e02', from: 'n02', to: 'n09', type: 'road', distance: 50},
            e03: {id: 'e03', from: 'n03', to: 'n00', type: 'road', distance: 100},
            e04: {id: 'e04', from: 'n00', to: 'n04', type: 'air', distance: 10},
            e05: {id: 'e05', from: 'n04', to: 'n05', type: 'air', distance: 10},
            e06: {id: 'e06', from: 'n05', to: 'n06', type: 'air', distance: 10},
            e07: {id: 'e07', from: 'n06', to: 'n00', type: 'air', distance: 10},
            e08: {id: 'e08', from: 'n01', to: 'n07', type: 'air', distance: 14},
            e09: {id: 'e09', from: 'n07', to: 'n01', type: 'air', distance: 14},
            e10: {id: 'e10', from: 'n09', to: 'n03', type: 'road', distance: 50},
            e11: {id: 'e11', from: 'n00', to: 'n08', type: 'road', distance: 71},
            e12: {id: 'e12', from: 'n08', to: 'n01', type: 'road', distance: 71},
            e13: {id: 'e13', from: 'n08', to: 'n09', type: 'road', distance: 50},
            e14: {id: 'e14', from: 'n09', to: 'n10', type: 'air', distance: 10},
            e15: {id: 'e15', from: 'n10', to: 'n09', type: 'air', distance: 10}
        },
        addresses: {
            a00: {id: 'a00', position: {x: -50, y: 55}, name: '5 Main St'},
            a01: {id: 'a01', position: {x: 0, y: 55}, name: '10 Main St'},
            a02: {id: 'a02', position: {x: 50, y: 55}, name: '15 Main St'},
            a03: {id: 'a03', position: {x: -50, y: -55}, name: '5 Second St'},
            a04: {id: 'a04', position: {x: 0, y: -55}, name: '10 Second St'},
            a05: {id: 'a05', position: {x: 50, y: -55}, name: '15 Second St'}
        },
        customers: {
            c00: {id: 'c00', name: 'Awesome Cake Bakery', address: 'a00'},
            c01: {id: 'c01', name: 'Miss Scarlett', address: 'a02'},
            c02: {id: 'c02', name: 'Professor Plum', address: 'a04'},
            c03: {id: 'c03', name: 'Mrs. Peacock', address: 'a03'},
            c04: {id: 'c04', name: 'Colonel Mustard', address: 'a05'},
            c05: {id: 'c05', name: 'CVS Pharmacy', address: 'a05'},
            c06: {id: 'c06', name: 'Burger King', address: 'a05'},
            c07: {id: 'c07', name: `St John's Hospital`, address: 'a05'}
        }
    },
    entities: {
        //idea: if value is none --> generate randomly during init
        hubs: {
            h00: {id: 'h00', position: 'n05'},
            h01: {id: 'h01', position: 'n07'},
            h02: {id: null, position: null},
        },
        drones: {
            d00: {id: 'd00', position: { x: -50, y: 60, z: 0 }},
            d01: {id: 'd01', position: { x: -60, y: -60, z: 0 }},
            d02: {id: null, position: null}
        },
        cars: {
            v00: {id:'v00', position: {'x': 50, 'y': 50, 'z': 0}}
        },
        buses: {
            v01: {id:'v01', position:{'x': 50, 'y': -50, 'z': 0},
                route: [
                    {node: 'n02', position: {x: 50, y: -50, z: 0}, time: 12},
                    {node: 'n09', position: {x: 50, y: 0, z: 0}, time: 6},
                    {node: 'n03', position: {x: 50, y: 50, z: 0}, time: 12},
                    {node: 'n00', position: {x: -50, y: 50, z: 0}, time: 10},
                    {node: 'n01', position: {x: -50, y: -50, z: 0}, time: 18}
                ],
            }
        },
        parcels: {
            p00: {id:'p00', carrier: {type: 'hub', id: 'h01'}, destination: {type: 'hub', id: 'h00'}}
        },
        missions: {

        }
    }
};
