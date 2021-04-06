<template>
    <use v-if="drone"
         :x="displayPosition.x"
         :y="displayPosition.y"
         :width="size"
         :height="size"
         :href="require('../../../assets/entities.svg') + '#drone-symbol'"
         fill="red"
    >
    </use>
</template>

<script>
    const topology = require('../../topology');

    export default {
        name: 'Drone',
        props: {
            id: String
        },
        data: function () {
            return {

            }
        },
        computed: {
            drone: function() {
                return this.$store.state.entities.drones[this.id];
            },
            size: function() {
                return this.$store.state.settings.map.displaySize.drone * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
            },
            position: function() {
                return this.drone ? { cx: this.drone.position.x, cy: this.drone.position.y } : null;
            },
            displayPosition: function() {
                return this.position ? {
                    x: this.position.cx * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.x - (this.size / 2),
                    y: -this.position.cy * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y - (this.size / 2)
                } : null;
            }
        }
    }
</script>
