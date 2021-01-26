const express = require('express');
const http = require('http');
const WebSocket = require('ws');

let handler = null;

const port = 6969;
const wsServer = http.createServer(express);
const wss = new WebSocket.Server({ server: wsServer });
wss.on('connection', function connection(socket) {
    socket.on('message', function incoming(data) {
        if (handler) {
            handler(data);
        }
    })
});

wsServer.listen(port, function() {
    console.log(`WebSocket server is listening on port ${port}!`)
});

module.exports = {
    send(data) {
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    },

    setHandler(h) {
        handler = h;
    }
};
