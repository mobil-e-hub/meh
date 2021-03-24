module.exports = {
    nodes: {
        n00: { id: 'n00', position: { x: -50, y: 50, z: 0 }, type: 'parking' },
        n01: { id: 'n01', position: { x: -50, y: -50, z: 0 }, type: 'parking' },
        n02: { id: 'n02', position: { x: 50, y: -50, z: 0 }, type: 'road' },
        n03: { id: 'n03', position: { x: 50, y: 50, z: 0 }, type: 'road' },
        n04: { id: 'n04', position: { x: -50, y: 60, z: 0 }, type: 'air' },
        n05: { id: 'n05', position: { x: -60, y: 60, z: 0 }, type: 'air' },
        n06: { id: 'n06', position: { x: -60, y: 50, z: 0 }, type: 'air' },
        n07: { id: 'n07', position: { x: -60, y: -60, z: 0 }, type: 'air' },
        n08: { id: 'n08', position: { x: 0, y: 0, z: 0 }, type: 'road' },
        n09: { id: 'n09', position: { x: 50, y: 0, z: 0 }, type: 'parking' },
        n10: { id: 'n10', position: { x: 60, y: 0, z: 0 }, type: 'air' }
    },
    edges: {
        e00: { id: 'e00', from: 'n00', to: 'n01', type: 'road', distance: 100 },
        e01: { id: 'e01', from: 'n01', to: 'n02', type: 'road', distance: 100 },
        e02: { id: 'e02', from: 'n02', to: 'n09', type: 'road', distance: 50 },
        e10: { id: 'e10', from: 'n09', to: 'n03', type: 'road', distance: 50 },
        e03: { id: 'e03', from: 'n03', to: 'n00', type: 'road', distance: 100 },
        e04: { id: 'e04', from: 'n00', to: 'n04', type: 'air', distance: 10 },
        e05: { id: 'e05', from: 'n04', to: 'n05', type: 'air', distance: 10 },
        e06: { id: 'e06', from: 'n05', to: 'n06', type: 'air', distance: 10 },
        e07: { id: 'e07', from: 'n06', to: 'n00', type: 'air', distance: 10 },
        e08: { id: 'e08', from: 'n01', to: 'n07', type: 'air', distance: 14 },
        e09: { id: 'e09', from: 'n07', to: 'n01', type: 'air', distance: 14 },
        e11: { id: 'e11', from: 'n00', to: 'n08', type: 'air', distance: 71 },
        e12: { id: 'e12', from: 'n08', to: 'n01', type: 'air', distance: 71 },
        e13: { id: 'e13', from: 'n08', to: 'n09', type: 'air', distance: 50 },
        e14: { id: 'e14', from: 'n09', to: 'n10', type: 'air', distance: 10 },
        e15: { id: 'e15', from: 'n10', to: 'n09', type: 'air', distance: 10 }
    }
};
