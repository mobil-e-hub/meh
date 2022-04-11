<!--TODO was muss hier rein???-->
<template>
  <use v-if="address"
       :x="displayPosition.x"
       :y="displayPosition.y"
       :width="size"
       :height="size"
       :href="require('../../assets/entities.svg') + '#address-symbol'"
       fill="purple"
  >
  </use>
</template>

<script>
export default {
  name: 'Address',
  props: {
    id: String
  },
  data: function () {
    return {

    }
  },
  computed: {
    address: function() {
      return this.$store.state.entities.addresses[this.id];
    },
    size: function() {
      return this.$store.state.settings.map.displaySize.address * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
    },
    position: function() {
      return this.address ? { cx: this.address.position.x, cy: this.address.position.y } : null;
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
