module.exports = {
  "$id": "https://ines-gpu-01.informatik.uni-mannheim.de/meh/schemas/mqtt/ParcelState.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ParcelState",
  "description": "JSON Schema for state update messages from the entities of type parcel (sent by the carrying entity). ",
  "required": ["id", "carrier", "destination"],
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier of the parcel."
    },
    "carrier": {
      "type": "object",
      "description": "The entity currently carrying the parcel.",
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier of the carrier entity."
        },
        "type": {
          "type": "string",
          "description": "The entity type of the carrier"
        }
      }
    },
    "destination": {
      "type": "object",
      "description": "The entity currently carrying the parcel.",
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier of the carrier entity."
        },
        "type": {
          "type": "string",
          "description": "The entity type of the carrier"
        }
      }
    },
    "allowAdditionalProperties": false
  }
}