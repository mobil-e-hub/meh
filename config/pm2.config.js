module.exports = {
    apps : [
        // {
        //     name: "sim",
        //     script: "./sim/src/server.js",
        //     watch: true,
        //     restart_delay: 3000

        // },
        {
            name: "opt",
            script: "./opt/src/server.py",
            interpreter: "python3",
            watch: true,
            restart_delay: 3000
        },
        // {
        //     name: "viz",
        //     script: "cd viz && vue-cli-service serve",
        //     watch: false,
        //     // restart_delay: 3000

        // },
        {
            name: "mqtt",
            script: "mosquitto",
            // watch: true,
            // restart_delay: 3000

        },
        // {
        //     name: "monitoring",
        //     script: "cd monitoring && ng serve --live-reload=false",
        //     watch: true,
        //     restart_delay: 3000

        // },
        {
            name: "git",
            script: "./git/src/server.js",
            watch: true,
            restart_delay: 3000

        }
    ]
}