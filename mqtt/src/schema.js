module.exports = {
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "type": "array",
  "items": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "eventType": {
            "type": "string",
            "const": "Microsoft.EventGrid.SubscriptionValidationEvent"
          },
          "topic": {
            "type": "string"
          },
          "data": {
            "type": "object",
            "properties": {
              "validationCode": {
                "type": "string"
              }
            },
            "required": [
              "validationCode"
            ]
          }
        },
        "required": [
          "eventType",
          "data"
        ]
      },
      {
        "type": "object",
        "properties": {
          "eventType": {
            "type": "string",
            "const": "Portal_Echo"
          }
        },
        "required": [
          "eventType"
        ]
      },
      {
        "type": "object",
        "properties": {
          "eventType": {
            "type": "string",
            "const": "mobil-e-hub"
          },
          "dataVersion": {
            "type": "string",
            "enum": [
              "v1"
            ]
          },
          "subject": {
            "type": "string"
          },
          "data": {}
        },
        "required": [
          "eventType",
          "dataVersion",
          "subject",
          "data"
        ],
        "additionalProperties": false
      }
    ]
  }
};