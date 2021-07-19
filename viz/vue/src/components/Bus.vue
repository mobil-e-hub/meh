<template>
  <svg>
      <use v-if="bus"
           :x="displayPosition.x"
           :y="displayPosition.y"
           :width="size"
           :height="size"
           :href="require('../../assets/entities.svg') + '#bus-symbol'"
           fill="blue"
      >
      </use>

      <use v-if="hasParcel"
           :x="displayPosition.x +2"
           :y="displayPosition.y +8"
           :width="sizeParcel"
           :height="sizeParcel"
           :href="require('../../assets/entities.svg') + '#parcel-symbol'"
           fill="green"
           fill-opacity="0.8">

      </use>
  </svg>
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
        x: this.position.cx * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.x - (this.size / 4),
        y: -this.position.cy * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y - (this.size / 4)
      } : null;
    },
    hasParcel: function() {
        return (Object.keys(this.$store.state.entities.buses[this.id].parcels).length > 0 );
    },
    sizeParcel: function() {
        return this.$store.state.settings.map.displaySize.parcel * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
    }
  }
}
</script>
