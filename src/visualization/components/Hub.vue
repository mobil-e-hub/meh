<template>
    <use v-if="hub && node" :x="displayPosition.x" :y="displayPosition.y" :width="size" :height="size" :href="require('../../../assets/entities.svg') + '#hub-symbol'" :fill="fill">
        <title>Hub {{ hub.id }} (Parcels: {{ Object.keys(hub.parcels).length }})</title>
    </use>
</template>

<script>
    const topology = require('../../topology');

    export default {
        name: 'Hub',
        props: {
            id: String
        },
        data: function () {
            return {

            }
        },
        computed: {
            hub: function() {
                return this.$store.state.entities.hubs[this.id];
            },
            node: function() {
                return this.$store.state.topology.nodes[this.hub.position];
            },
            size: function() {
                return this.$store.state.settings.map.displaySize.hub * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
            },
            fill: function() {
                return 'green';
            },
            position: function() {
                return this.node ? { cx: this.node.position.x, cy: this.node.position.y } : null;
            },
            displayPosition: function() {
                return this.position ? {
                    x: this.position.cx * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.x - (this.size / 2),
                    y: this.position.cy * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y - (this.size / 2)
                } : null;
            }
        }
    }
</script>
