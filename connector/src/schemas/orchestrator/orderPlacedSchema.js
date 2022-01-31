module.exports = {
	"type": "object",
	"properties": {
    "boxId": { "type": "string", "format": "uuid" },
	"transportId": { "type": "string", "format": "uuid" },
    "partnerId": { "type": "string", "format": "uuid" },
    "timestamp": { "type": "string", "format": "date-time" },
    "startLocation": {
      "type": "object",
      "properties": {
        "platformId": { "type": "string", "format": "uuid" }
      },
      "required": ["platformId"],
      "additionalProperties": false
    },
    "destinationLocation": {
      "type": "object",
      "properties": {
        "platformId": { "type": "string", "format": "uuid" }
      },
      "required": ["platformId"],
      "additionalProperties": false
    }
	},
	"required": ["boxId", "transportId","partnerId", "timestamp", "startLocation", "destinationLocation"],
  "additionalProperties": false
};