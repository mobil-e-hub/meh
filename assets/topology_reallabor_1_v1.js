module.exports =
{
  "topology": {
    "nodes": {
      "n00": {
        "id": "n00",
        "position": {
          "lat": 49.40279,
          "long": 8.68937,
          "alt": 0.00000
        },
        "type": "air",
        "description": "kh-hub"
      },
      "n01": {
        "id": "n01",
        "position": {
          "lat": 49.40297,
          "long": 8.68862,
          "alt": 0.00000
        },
        "type": "air",
        "description": "kh-drone-shuttle"
      },
      "n02": {
        "id": "n02",
        "position": {
          "lat": 49.40315,
          "long": 8.68892,
          "alt": 0.00000
        },
        "type": "parking",
        "description": "kh-shuttle"
      },
      "n03": {
        "id": "n03",
        "position": {
          "lat": 49.40298,
          "long": 8.68932,
          "alt": 0.00000
        },
        "type": "air",
        "description": "kh-drone-shuttle-alt"
      },
      "n04": {
        "id": "n04",
        "position": {
          "lat": 49.36217,
          "long": 8.68606,
          "alt": 0.00000
        },
        "type": "air",
        "description": "lab-drone-shuttle"
      },
      "n05": {
        "id": "n05",
        "position": {
          "lat": 49.36221,
          "long": 8.68565,
          "alt": 0.00000
        },
        "type": "parking",
        "description": "lab-shuttle"
      },
      "n06": {
        "id": "n06",
        "position": {
          "lat": 49.36229,
          "long": 8.68662,
          "alt": 0.00000
        },
        "type": "air",
        "description": "lab-hub"
      },
      "n07": {
        "id": "n07",
        "position": {
          "lat": 49.36217,
          "long": 8.68627,
          "alt": 0.00000
        },
        "type": "air",
        "description": "lab-drone-shuttle-alt"
      }
    },
    "edges": {
      "e00": {
        "id": "e00",
        "from": "n00",
        "to": "n01",
        "type": "air",
        "distance": 10
      },
      "e01": {
        "id": "e01",
        "from": "n00",
        "to": "n02",
        "type": "air",
        "distance": 10
      },
      "e02": {
        "id": "e02",
        "from": "n00",
        "to": "n03",
        "type": "air",
        "distance": 10
      },
      "e03": {
        "id": "e03",
        "from": "n01",
        "to": "n00",
        "type": "air",
        "distance": 10
      },
      "e04": {
        "id": "e04",
        "from": "n01",
        "to": "n02",
        "type": "air",
        "distance": 10
      },
      "e05": {
        "id": "e05",
        "from": "n01",
        "to": "n03",
        "type": "air",
        "distance": 10
      },
      "e06": {
        "id": "e06",
        "from": "n02",
        "to": "n00",
        "type": "air",
        "distance": 10
      },
      "e07": {
        "id": "e07",
        "from": "n02",
        "to": "n01",
        "type": "air",
        "distance": 10
      },
      "e08": {
        "id": "e08",
        "from": "n02",
        "to": "n03",
        "type": "air",
        "distance": 10
      },
      "e09": {
        "id": "e09",
        "from": "n03",
        "to": "n00",
        "type": "air",
        "distance": 10
      },
      "e10": {
        "id": "e10",
        "from": "n03",
        "to": "n01",
        "type": "air",
        "distance": 10
      },
      "e11": {
        "id": "e11",
        "from": "n03",
        "to": "n02",
        "type": "air",
        "distance": 10
      },
      "e12": {
        "id": "e12",
        "from": "n02",
        "to": "n05",
        "type": "road",
        "distance": 1000
      },
      "e13": {
        "id": "e13",
        "from": "n04",
        "to": "n05",
        "type": "air",
        "distance": 10
      },
      "e14": {
        "id": "e14",
        "from": "n04",
        "to": "n06",
        "type": "air",
        "distance": 10
      },
      "e15": {
        "id": "e15",
        "from": "n04",
        "to": "n07",
        "type": "air",
        "distance": 10
      },
      "e16": {
        "id": "e16",
        "from": "n05",
        "to": "n04",
        "type": "air",
        "distance": 10
      },
      "e17": {
        "id": "e17",
        "from": "n05",
        "to": "n06",
        "type": "air",
        "distance": 10
      },
      "e18": {
        "id": "e18",
        "from": "n05",
        "to": "n07",
        "type": "air",
        "distance": 10
      },
      "e19": {
        "id": "e19",
        "from": "n06",
        "to": "n04",
        "type": "air",
        "distance": 10
      },
      "e20": {
        "id": "e20",
        "from": "n06",
        "to": "n05",
        "type": "air",
        "distance": 10
      },
      "e21": {
        "id": "e21",
        "from": "n06",
        "to": "n07",
        "type": "air",
        "distance": 10
      },
      "e22": {
        "id": "e22",
        "from": "n07",
        "to": "n04",
        "type": "air",
        "distance": 10
      },
      "e23": {
        "id": "e23",
        "from": "n07",
        "to": "n05",
        "type": "air",
        "distance": 10
      },
      "e24": {
        "id": "e24",
        "from": "n07",
        "to": "n06",
        "type": "air",
        "distance": 10
      }
    },
    "addresses": {
      "a00": {
        "id": "a00",
        "position": {
          "lat": 49.40226,
          "long": 8.68848,
          "alt": 0.00000
        },
        "name": "Landhausstr. 25, 69115 Heidelberg"
      },
      "a01": {
        "id": "a01",
        "position": {
          "lat": 49.36260,
          "long": 8.68672,
          "alt": 0.00000
        },
        "name": "Im Breitspiel 16, 69126 Heidelberg"
      }
    },
    "customers": {
      "c00": {
        "id": "c00",
        "name": "Krankenhaus St. Josef",
        "address": "a00"
      },
      "c01": {
        "id": "c01",
        "name": "Labor Limbach",
        "address": "a01"
      }
    }
  },
  "entities": {
    "hubs": {
      "h00": {
        "id": "h00",
        "position": "n00"
      },
      "h01": {
        "id": "h01",
        "position": "n06"
      }
    },
    "drones": {
      "d00": {
        "id": "d00",
        "position": {
          "lat": 49.40279,
          "long": 8.68937,
          "alt": 0.00000
        }
      },
      "d01": {
        "id": "d01",
        "position": {
          "lat": 49.36229,
          "long": 8.68662,
          "alt": 0.00000
        }
      }
    },
    "cars": {},
    "buses": {},
    "parcels": {},
    "missions": {}
  }
}
