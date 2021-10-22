<template>
  <svg>
      <use v-if="hasParcel"
                :x="displayPosition.x + 5"
                :y="displayPosition.y +1"
                :width="sizeParcel"
                :height="sizeParcel"
                :href="require('../../assets/entities.svg') + '#parcel-symbol'"
                fill="green"
                fill-opacity="0.8">
      </use>
      <use v-if="hub && node" :x="displayPosition.x" :y="displayPosition.y" :width="size" :height="size" :href="require('../../assets/entities.svg') + '#hub-symbol'" :fill="fill">
          <title>Hub {{ hub.id }} (Parcels: {{ Object.keys(hub.parcels).length }})</title>
      </use>
</svg>
</template>

<script>
    const topology = require('../../assets/topology');

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
                    y: -this.position.cy * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y - (this.size / 2)
                } : null;
            },
            hasParcel: function() {
                return (Object.keys(this.$store.state.entities.hubs[this.id].parcels).length > 0);
            },
            sizeParcel: function() {
                return this.$store.state.settings.map.displaySize.parcel * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
            }
        }
    }
</script>
