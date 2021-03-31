<template>
    <use :x="topology.nodes[hub.position].x"
         :y="topology.nodes[hub.position].y"
         :width="10"
         :height="10"
         :href="require('../../../assets/entities.svg') + '#hub-symbol'"
         fill="green"
         v-b-popover.hover.right="`Hub ${id} (Parcels: ${stored})`"
         title="Hub details"
         transform="scale(1, -1)">
    </use>
</template>

<script>
    const topology = require('../../topology');

    export default {
        name: 'Hub',
        props: {
            hub: Object
        },
        data: function () {
            return {
                id: 1234,
                stored: 3,
                topology: topology
            }
        }
    }
</script>
