module.exports = {
  "$id": "https://ines-gpu-01.informatik.uni-mannheim.de/meh/schemas/mqtt/HubState.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "HubState",
  "description": "JSON Schema for state update messages from the entities of type hub. ",
  "required": ["id", "position", "capacity", "parcels", "transactions"],
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier of the hub."
    },
    "position": {
      "type": "string",
      "description": "The id of the node where the hub is positioned",
    },
    "capacity": {
      "type": "number",
      "description": "The maximum number of parcels that can simultaneously be stored at the hub ."
    },
    "parcels": {
      "type": ["object", "null"],
      "description": "Parcel object or null"
    },
    "transactions": {
      "type": ["object", "null"],
      "description": "Transactions object {id: transaction} or null"
      }
  },
  "additionalProperties": false
}