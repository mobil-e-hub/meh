# mobil-e-Hub: Intelligent Drone Logistics Network
## Setup and Continuous Deployment
### Pre-requisites
It is assumed that you have the following applications installed on your machine:
- git
- nginx
- pm2
- mosquitto

### Setup
To set up a continuous deployment pipeline on a remote server, execute the following steps:

#### Project Folder
Select a project folder (we use the placeholder `<project_folder>` here) and create an environment variable:
```
$ nano ~/.bash_profile
>>> export MEH=<project_folder>/meh
```

#### git
Clone the remote repository to your server so that you can use the configuration files for the remaining steps:
```
$ cd <project_folder>
$ git clone https://github.com/mobil-e-hub/meh.git
```
Now your environment variable `$MEH` points to the root of the local repository.

#### nginx
Copy the configuration file from the repository to the default location:
```
$ cp $MEH/config/nginx.conf /etc/nginx/nginx.conf
```

Register _nginx_ as a system service:
```
$ systemctl start service nginx
```

#### pm2
Copy the configuration file from the repository to the default location:
```
$ cp $MEH/config/pm2.config.js /etc/nginx/nginx.conf
```

Register _pm2_ as a system service:

```
$ pm2 startup
```
and follow the instruction.

#### `.env` file
For obvious reasons, the `.env` file containing all environment variables is not part of the repository. You can either rename the file `<project_folder>/meh/sample.env` to `.env` and adjust the variables manually, or copy the `.env` file from another machine.

### Check
Make sure that everything is up and running:
```
$ pm2 monit
```

You should see the following services managed by _pm2_:

Name                | Port | Type
--------------------|------|-----
Simulator           | 3000 | node.js server
Optimization Engine | 3001 | flask server
[Visualization       | 3002 | Vue app]
MQTT Broker         | 3003 | Mosquitto
Monitoring          | 3004 | Angular app
Github Updater      | 3005 | node.js server

All these services are restarted when the system re-boots, as well as when there are updates on the remote repository.


### Deployment
To deploy, simply push your code to the `master` branch of the remote repository. This will trigger a deployment workflow with the following steps:
- Github sends a webhook action to your server, indicating that code has been pushed
- The _Github Updater_ service pulls the master branch and executes the actions described in the `/config/` files
- _pm2_ restarts all affected services