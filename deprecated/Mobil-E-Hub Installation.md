# mobil-e-Hub: Intelligent Drone Logistics Network
Authors: 
- Michael Oesterle (michael.oesterle@uni-mannheim.de)
- Alexander Becker
- Tim Grams
- Johannes Pernpeintner

[![github pages](https://github.com/mobil-e-hub/meh/actions/workflows/github-pages.yml/badge.svg)](https://github.com/mobil-e-hub/meh/actions/workflows/github-pages.yml)

## Installation
The project Mobil-E-Hub can be found on the github link above. To run it, it has to be checked out or cloned first.
Before running the project, some additional software is required.

## NginX
The WebServer NginX can be installed using the following commands in the terminal.
```shell script
sudo apt update
sudo apt install nginx
```

Then, a file in the following directory needs to be created `/etc/nginx/sites-enabled/`.
It can be done using the following commands.
```shell script
cd /etc/nginx/sites-enabled
sudo "${EDITOR:-vi}" tutorial
```

The file has to contain the following input:
```shell script
server {
       listen 80;
       listen [::]:80;

       server_name example.ubuntu.com;

       root /var/www/tutorial;
       index index.html;

       location / {
               try_files $uri $uri/ =404;
       }
}
```
At least, restart NginX with the command
```shell script
sudo service nginx restart
```

NginX is now installed. To use the configurations for Mobil-E-Hub refer to the attached files. Copy it to the 
folder et/nginx/conf.d.
An nginx server forwards all requests from port 443 to the respective localhost ports that are listed here:

| Request URL | Forwarding Port  | Module | Notes  |
|---|---|---|---|
| `/meh/sim` | 3000 | Simulation |  | 
| `/meh/opt` | 3001 | Optimization engine |   |
| `/meh/connector` | 3004 | Connector | js module mqtt: bridge MQTT <-> HTTP  |
| `/meh/monitoring` | 4200 | Monitoring | Angular app  | 
| `/meh/viz` | 8080 | vizualization | Vue app  | 
| `/meh/git` | 8081 | updater.js | Webhook for master branch | 
| `/meh/mqtt`  | 9001  | MQTT broker (mosquitto)  |  websocket |

## Mosquitto
The mosquitto broker can be installed using the following commands:
```shell script
sudo apt update
sudo apt install -y mosquitto
```
Confirm the status with 
```shell script
sudo systemctl status mosquitto
```
Check the package is loaded and active!
Now the mosquitto broker can be started, stopped restarted
```shell script
sudo systemctl start mosquitto
sudo systemctl stop mosquitto
sudo systemctl restart mosquitto
```

The Mosquitto broker can be reached under `.../meh/mqtt` and the requests are forwarded by nginx 
over a websocket connection to localhost on 9001. 
The mosquitto installation can be found in the directory `C:\Program Files\mosquitto`, which also includes the configuration file `mosquitto.conf`.
The broker has an additional listener for pure mqtt protocol on port 1883. 

Clients need to authenticate themselves on connection with username and password. 
Valid username/password combinations are stored in the file `C:\Program Files\mosquitto\password_file`. 
The broker is configured to run as a background service, which ensures its automated launch at system startup. 
If a manual restart of the service is necessary this can be done with the command `net start mosquitto` from any directory, only the command prompt needs to be run as admin.
For debugging with console output it is also possible to stop this service with the command `net stop mosquitto` and start the broker with `mosquitto -v`. 

#### Testing
For a smoke test the broker installation comes with the mosquitto_pub and mosquitto_sub client utilities.  
To publish a message use the command `mosquitto_pub -h localhost -p [port] -u [username] -P [password] -t [topic] -m "[message]"`.
The subscriptions can be tested with the command `mosquitto_sub -h localhost -p [port] -t \[topic] -d`. In both cases the debug flag `-d` enable detailed logging. 

Testing the broker is also possible with an online MQTT client, e.g. [this one](http://www.hivemq.com/demos/websocket-client/).
To connect set host to `ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt` and port to `443`. After also entering username and password and checking the `SSL` checkbox, a click on the connect button will start the connection. 
The two panels below for publishing messages and subscription to topics can now be used for testing the broker, also from multiple webclients.


## Certbot
Cerbot is used to manage NginX Let's Encrypt certificates. It can be installed with following commands:
```shell script
sudo apt-get install certbot
sudo apt-get install python3-certbot-nginx
```
To run get a new certificate and configure it on the server, use
```shell script
sudo certbot run
```

To get a new certificate without configurating, use
```shell script
sudo certbot certonly
```

and to renew an existing certificate, use
```shell script
sudo certbot renew
```