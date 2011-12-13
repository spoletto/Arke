
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
./configure --prefix=/usr
make
sudo make install

# Install npm.
cd ~
git clone http://github.com/isaacs/npm.git
cd npm
sudo make install

# Install the node modules we'll need.
cd ~
npm install express connect-form bcrypt assert mongoose

# Install nginx.
sudo apt-get install nginx

# Download the nginx configuration file.
sudo wget --output-document=/etc/nginx/sites-enabled/default https://raw.github.com/spoletto/SolveJS/master/server_deployment/nginx.conf
sudo /etc/init.d/nginx restart

# Set up git remote master.
mkdir ~/www
cd ~/www
mkdir ~/repo
cd ~/repo
git init --bare

# Create git hook
cat > hooks/post-receive << EOF

#!/bin/sh
GIT_WORK_TREE=/root/www
export GIT_WORK_TREE
git checkout -f
sudo supervisorctl restart node
EOF

chmod +x hooks/post-receive

# Install MongoDB
cd ~
curl http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-2.0.1.tgz > mongo.tgz
tar xzf mongo.tgz
sudo mkdir -p /data/db
sudo chown `id -u` /data/db

# Install supervisor
sudo apt-get install python-setuptools
sudo easy_install supervisor

# Install it as a service
curl https://raw.github.com/gist/176149/88d0d68c4af22a7474ad1d011659ea2d27e35b8d/supervisord.sh > supervisord
chmod +x supervisord
sudo mv supervisord /etc/init.d/supervisord

# Download the supervisor configuration file.
sudo wget --output-document=/etc/supervisord.conf https://raw.github.com/spoletto/SolveJS/master/server_deployment/supervisord.conf
supervisorctl reload
