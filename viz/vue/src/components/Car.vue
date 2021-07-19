<template>
  <svg>
      <use v-if="car"
           :x="displayPosition.x"
           :y="displayPosition.y"
           :width="size"
           :height="size"
           :href="require('../../assets/entities.svg') + '#car-symbol'"
           fill="blue"
      >
      </use>
      <use v-if="hasParcel"
              :x="displayPosition.x +5"
              :y="displayPosition.y +5"
              :width="sizeParcel"
              :height="sizeParcel"
              :href="require('../../assets/entities.svg') + '#parcel-symbol'"
              fill="green"
              fill-opacity="0.8"
      >
      </use>
  </svg>
</template>

<script>
const topology = require('../../assets/topology');

export default {
  name: 'Car',
  props: {
    id: String
  },
  data: function () {
    return {

    }
  },
  computed: {
    car: function() {
      return this.$store.state.entities.cars[this.id];
    },
    size: function() {
      return this.$store.state.settings.map.displaySize.car * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
    },
    position: function() {
      return this.car ? { cx: this.car.position.x, cy: this.car.position.y } : null;
    },
    displayPosition: function() {
      return this.position ? {
        x: this.position.cx * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.x - (this.size / 2),
        y: -this.position.cy * this.$store.state.settings.map.zoom.factor + this.$store.state.settings.map.origin.y - (this.size / 2)
      } : null;
    },
    hasParcel: function() {
        return (this.$store.state.entities.cars[this.id].parcel != null);
    },
    sizeParcel: function() {
        return this.$store.state.settings.map.displaySize.parcel * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
    }
  }
}
</script>
