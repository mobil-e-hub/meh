<template>
  <use v-if="bus"
       :x="displayPosition.x"
       :y="displayPosition.y"
       :width="size"
       :height="size"
       :href="require('../../assets/entities.svg') + '#bus-symbol'"
       fill="blue"
  >
  </use>
</template>

<script>
const topology = require('../../assets/topology');

export default {
  name: 'Bus',
  props: {
    id: String
  },
  data: function () {
    return {

    }
  },
  computed: {
    bus: function() {
      return this.$store.state.entities.buses[this.id];
    },
    size: function() {
      return this.$store.state.settings.map.displaySize.bus * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
    },
    position: function() {
      return this.bus ? { cx: this.bus.position.x, cy: this.bus.position.y } : null;
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
