<template>
    <div>
        <h1>Hello!</h1>
        <p>You are {{name}}!</p>
        <p>Drone: {{drone}}</p>
        <button ref="buttonStart" @click="clickSimulation">{{running ? 'Stop' : 'Start'}} simulation</button>
        <div style="padding: 20px">
            <svg style="height: 400px; width: 100%; border-style: dashed">
                <circle v-for="drone in drones" :key="drone.id" :id="drone.id" :cx="10 * drone.xcor" :cy="10 * drone.ycor" r="10" stroke="green" stroke-width="2" fill="yellow" />
            </svg>
        </div>
    </div>

</template>

<script>
    const axios = require('axios');

    module.exports = {
        data: function() {
            return {
                name: "Schatz",
                socket: null,
                drone: null,
                running: false,
                drones: null
            };
        },
        created: async function() {
            this.socket = new WebSocket('ws://localhost:6969');
            this.socket.onopen = () => {
                console.log('Connection opened!');
                this.socket.send('stop');
            };
            this.socket.onmessage = ({ data }) => { this.drones[0].xcor = data; };
            this.socket.onclose = function() {
                this.socket = null;
            }
        },
        mounted: async function () {
            try {
                this.name = (await axios.get('http://localhost:3000/name')).data;
                this.drones = (await axios.get('http://localhost:3000/drones')).data;
            }
            catch (err) {
                alert(err);
            }
        },
        methods: {
            clickSimulation: function() {
                this.socket.send(this.running ? 'stop' : 'start');
                this.running = !this.running;
            }
        }
    };
</script>
