# Install the essentials.
sudo apt-get update
sudo apt-get -y upgrade
sudo apt-get install -y rcconf
sudo apt-get install -y build-essential
sudo apt-get install -y libssl-dev
sudo apt-get install -y git-core

# Install Node.
wget http://nodejs.org/dist/node-latest.tar.gz
tar xzf node-latest.tar.gz
cd node-v0.6.4
sudo ./configure --prefix=/usr
make
sudo make install

# Install npm.
cd ~
git clone http://github.com/isaacs/npm.git
cd npm
sudo make install

# Install the node modules we'll need.
cd ~
npm install socket.io express connect formidable connect-form bcrypt assert validator now underscore node-uuid redis

# Set up git remote master.
mkdir ~/www
cd ~/www
mkdir ~/repo
cd ~/repo
git init --bare

# Create git hook
cat > hooks/post-receive << EOF

#!/bin/sh
GIT_WORK_TREE=~/www
export GIT_WORK_TREE
git checkout -f
sudo /sbin/stop nodeServer
sudo /sbin/start nodeServer
EOF

chmod +x hooks/post-receive

# Install Upstart
sudo apt-get install -y upstart

cat > /tmp/nodeServer.conf << EOF
#!upstart
description "node.js server"
author      "spoletto"

start on startup
stop on shutdown

script
	export HOME="/home/ubuntu"

	exec sudo node /home/ubuntu/www/server.js >> /var/log/node.log 2>&1
end script
EOF

sudo mv /tmp/nodeServer.conf /etc/init/nodeServer.conf
sudo chown root /etc/init/nodeServer.conf
sudo chmod 700 /etc/init/nodeServer.conf

# Install Redis
sudo apt-get install -y redis-server
sudo update-rc.d redis-server disable
sudo wget --output-document=/etc/redis/redis.conf https://raw.github.com/spoletto/SolveJS/master/server_deployment/redis.conf

cat > /tmp/redis.conf << EOF
#!upstart
description "redis server"
author      "spoletto"

start on runlevel [23]
stop on shutdown

exec sudo -u redis /usr/bin/redis-server /etc/redis/redis.conf

respawn
EOF

sudo mv /tmp/redis.conf /etc/init/redis-server.conf
sudo start redis-server

# Install Monit
sudo apt-get install -y monit

cat > /tmp/monitrc << EOF
#!monit
set logfile /var/log/monit.log

check host nodejs with address 127.0.0.1
    start program = "/sbin/start nodeServer"
    stop program  = "/sbin/stop nodeServer"
    if failed port 80 protocol HTTP
        request /
        with timeout 10 seconds
        then restart
EOF
sudo mv /tmp/monitrc /etc/monit/monitrc
sudo chown root /etc/monit/monitrc
sudo chmod 700 /etc/monit/monitrc

# Run the server.
sudo start nodeServer
sudo monit -d 60 -c /etc/monit/monitrc
