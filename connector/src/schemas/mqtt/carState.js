module.exports = {
  "$id": "https://ines-gpu-01.informatik.uni-mannheim.de/meh/schemas/mqtt/CarState.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CarState",
  "description": "JSON Schema for state update messages from the entities of type car. ",
  "required": ["id", "position", "speed", "parcels", "capacity", "state"],
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier of the entity."
    },
    "position": {
      "type": "object",
      "description": "The current location in the format {'lat': xx, 'lon': xx, 'alt': xx}"
    },
    "speed": {
      "type": "number",
      "description": "The (approximated) average speed that the entity moves at."
    },
    "parcels": {
      "type": "array",
      "description": "list with Parcel object(s), can be empty."
    },
    "capacity": {
      "type": "number",
      "description": "maximum capacity for parcels that can be carried simultaneously."

    },
    "state": {
      "type": "number",
      "description": "Current state of the car (idle / moving /... ) --> see: https://github.com/mobil-e-hub/meh/blob/master/sim/README.md#EntityStates"

    }
  }
}