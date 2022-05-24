<template>
    <circle v-if="node" :r="r" :cx="displayPosition.cx" :cy="displayPosition.cy" fill="lightgray" >
        <title>Node {{ node.id }} ({{ node.type }})</title>
    </circle>
</template>

<script>

    export default {
        name: 'Node',
        props: {
            id: String
        },
        data: function () {
            return {

            }
        },
        computed: {
            node: function() {
                return this.$store.state.topology.nodes[this.id];
            },
            r: function() {
                return this.$store.state.settings.map.displaySize.node * (this.$store.state.settings.map.zoom.topology ? this.$store.state.settings.map.zoom.factor : 1.0);
            },
            position: function() {
                return this.node ? { cx: this.node.position.lat, cy: this.node.position.long } : null;
            },
            displayPosition: function() {
                return this.position ? {
                    cx: this.position.cx * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.x,
                    cy: -this.position.cy * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y
                } : null;
            }
        }
    }
</script>
