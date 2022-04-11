<template>
    <svg>
<!--      parcel drawn below the carrying drone-->
        <use v-if="hasParcel"
              :x="displayPosition.x +1"
              :y="displayPosition.y +1"
              :width="sizeParcel"
              :height="sizeParcel"
              :href="require('../../assets/entities.svg') + '#parcel-symbol'"
              fill="green"
              fill-opacity="0.8">
        </use>
        <use v-if="drone"
             :x="displayPosition.x"
             :y="displayPosition.y"
             :width="size"
             :height="size"
             :href="require('../../assets/entities.svg') + '#drone-symbol'"
             fill="red"
        >
        </use>
    </svg>
</template>

<script>
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
            },
            hasParcel: function() {
                return (this.$store.state.entities.drones[this.id].parcel != null);
            },
            sizeParcel: function() {
                return this.$store.state.settings.map.displaySize.parcel * (this.$store.state.settings.map.zoom.entities ? this.$store.state.settings.map.zoom.factor : 1.0);
            }
        }
    }
</script>
