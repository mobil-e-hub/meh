<template>
    <line v-if="edge"
          :x1="displayPosition.x1"
          :y1="displayPosition.y1"
          :x2="displayPosition.x2"
          :y2="displayPosition.y2"
          stroke="lightgray"
          :stroke-width="width"
          :stroke-dasharray="dash"
    ></line>
</template>

<script>
    const topology = require('../../assets/topology');

    export default {
        name: 'Edge',
        props: {
            id: String
        },
        data: function () {
            return {

            }
        },
        computed: {
            edge: function() {
                return this.$store.state.topology.edges[this.id];
            },
            from: function() {
                return this.edge? this.$store.state.topology.nodes[this.edge.from] : null;
            },
            to: function() {
                return this.edge? this.$store.state.topology.nodes[this.edge.to] : null;
            },
            width: function() {
                return this.$store.state.settings.map.displaySize.edge * (this.$store.state.settings.map.zoom.topology ? this.$store.state.settings.map.zoom.factor : 1.0);
            },
            dash: function() {
                return this.edge.type === 'air' ? 1 : '';
            },
            position: function() {
                return this.from && this.to ? { x1: this.from.position.x, y1: this.from.position.y, x2: this.to.position.x, y2: this.to.position.y } : null;
            },
            displayPosition: function() {
                return this.position ? {
                    x1: this.position.x1 * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.x,
                    y1: -this.position.y1 * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y,
                    x2: this.position.x2 * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.x,
                    y2: -this.position.y2 * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y
                } : null;
            }
        }
    }
</script>
