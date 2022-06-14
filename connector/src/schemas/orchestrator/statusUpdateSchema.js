module.exports = {
    "type": "object",
    "properties": {
        "boxId": {"type": "string", "format": "uuid"},
        "transportId": {"type": "string", "pattern": "^\\d{18}$"},
        "location": {
            "type": "object",
            "properties": {
                "platformId": {"type": "string", "format": "uuid"}
            },
            "required": ["platformId"],
            "additionalProperties": false
        },
        "state": {"type": "string", "enum": ["Unknown = 0", "TransportCreated", "WaitingForTransport", "InTransportInAir", "InTransport", "Delivered", "Completed", "Cancelled", "Failed"]}
    },
    "required": ["boxId", "transportId", "location", "state"],
    "additionalProperties": false
};
