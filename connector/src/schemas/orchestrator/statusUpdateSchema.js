module.exports = {
	"type": "object",
	"properties": {
    "boxId": { "type": "string", "format": "uuid" },
	  "transportId": { "type": "string", "format": "uuid" },
    "location": {
      "type": "object",
      "properties": {
        "platformId": { "type": "string", "format": "uuid" }
      },
      "required": ["platformId"],
      "additionalProperties": false
    },
    "state": { "type": "string" }
	},
	"required": ["boxId", "transportId","location", "state"],
  "additionalProperties": false
};