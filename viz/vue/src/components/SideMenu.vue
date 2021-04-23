<template>
    <div class="sidebar">
        <div class="sidebar-backdrop" @click="toggleSidebar"></div>
        <transition name="slide">
            <div v-if="this.$store.state.settings.sideMenuVisible" class="sidebar-panel mt-lg-4">
                <label class="mt-md-2 mb-auto" > <u> Settings: </u> </label>
                <ul>
                    <li>
                        <!-- ToggleButton - Stats Table-->
                        <template>
                            <label for="toggle_stats_btn" :class="{'active': this.display.statsTableVisible}" class="toggle__button">

                                <span  class="toggle__label"> Stats:   </span>

                                <input type="checkbox"  id="toggle_stats_btn"  v-model="toggleStatsTable" :disabled="true">
                                <span class="mr-auto toggle__switch"></span>
                            </label>
                        </template>
                    </li>
                    <li>
                        <!-- ToggleButton Toasts-->
                        <template>
                            <label for="toggle_toast_btn" :class="{'active': this.display.areToastsEnabled}" class="toggle__button">

                                <span  class="toggle__label"> Toasts: </span>
                                <input type="checkbox"  id="toggle_toast_btn"  v-model="toggleToasts" :disabled="true">
                                <span class="ml-auto toggle__switch"></span>
                            </label>
                        </template>
                        <ul>
                            <li>
                                <label for="checkbox_status" >Status  </label>
                                <input class="float-right" type="checkbox" id="checkbox_status" value="status" :disabled="true" v-model="this.display.enabledToastTypes">                                                    </li>
                            <li>
                                <label for="checkbox_routing" >Routing</label>
                                <input class="float-right" type="checkbox" id="checkbox_routing" value="routing" :disabled="true" v-model="this.display.enabledToastTypes">
                            </li>
                            <li>
                                <label for="checkbox_mission" >Missions</label>
                                <input class="float-right" type="checkbox" id="checkbox_mission" value="mission" :disabled="true" v-model="this.display.enabledToastTypes">
                            </li>
                        </ul>
                    </li>
                </ul>

            </div>
        </transition>
    </div>
</template>

<script>
    export default {
        name: "SideMenu",

        data: function () {
            return {
                display: {
                    statsTableVisible: false,
                    areToastsEnabled: false,
                }
            }
        },

        methods:      {
            toggleSidebar: function() {
                this.$store.commit('toggleSideMenu');
            },
        },

        computed: {
          toggleStatsTable: {
            get() {
              return this.display.statsTableVisible;
            },
            set(newValue) {
              this.display.statsTableVisible = newValue;
              // this.$emit('change', newValue);
            }
          },
          toggleToasts: {
            get() {
              return this.display.areToastsEnabled;
            },
            set(newValue) {
              this.display.areToastsEnabled = newValue;
              // this.$emit('change', newValue);
            }
          },
        },
    }
</script>

<style scoped>

/*    Sidebar_Menu*/

.slide-enter-active,
.slide-leave-active
{
  transition: transform 0.2s ease;
}
.slide-enter,
.slide-leave-to {
  transform: translateX(-100%);
  transition: all 150ms ease-in 0s
}
.sidebar-backdrop {
  background-color: rgba(19, 15, 64, 0.4);
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  cursor: pointer;
  z-index: 899;
}
.sidebar-panel {
  overflow-y: auto;
  background-color: #f8f9fa;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 999;
  padding: 3rem 20px 2rem 20px;
  width: 200px;
}

/*    Toggle Button in Sidemenu*/
.toggle__button {
  vertical-align: middle;
  user-select: none;
  cursor: pointer;
}
.toggle__button input[type="checkbox"] {
  opacity: 0;
  position: absolute;
  width: 1px;
  height: 1px;
}
.toggle__button .toggle__switch {
  display:inline-block;
  height:12px;
  border-radius:6px;
  width:40px;
  background: #BFCBD9;
  box-shadow: inset 0 0 1px #BFCBD9;
  position:relative;
  margin-left: 10px;
  transition: all .25s;
}
.toggle__button .toggle__switch::after,
.toggle__button .toggle__switch::before {
  content: "";
  position: absolute;
  display: block;
  height: 18px;
  width: 18px;
  border-radius: 50%;
  left: 0;
  top: -3px;
  transform: translateX(0);
  transition: all .25s cubic-bezier(.5, -.6, .5, 1.6);
}
.toggle__button .toggle__switch::after {
  background: #4D4D4D;
  box-shadow: 0 0 1px #666;
}
.toggle__button .toggle__switch::before {
  background: #4D4D4D;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.1);
  opacity:0;
}
.active .toggle__switch {
  background: #adedcb;
  box-shadow: inset 0 0 1px #adedcb;
}
.active .toggle__switch::after,
.active .toggle__switch::before{
  transform:translateX(22px);
}
.active .toggle__switch::after {
  /*left: 23px;*/
  background: #53B883;
  box-shadow: 0 0 1px #53B883;
}

</style>