#!/bin/bash

# This installation script works on Ubuntu 14.04 and 16.04
# Run as root!

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

set -e

export DEBIAN_FRONTEND=noninteractive

MYSQL_PASSWORD=`pwgen 12 -1`

# Setup MySQL user for Cliker Tests
mysql -u root -e "CREATE USER 'cliker_test'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';"
mysql -u root -e "GRANT ALL PRIVILEGES ON cliker_test.* TO 'cliker_test'@'localhost';"
mysql -u cliker_test --password="$MYSQL_PASSWORD" -e "CREATE database cliker_test;"

# Setup installation configuration
cat >> config/test.toml <<EOT
[www]
port=3000
[mysql]
user="cliker_test"
password="$MYSQL_PASSWORD"
database="cliker_test"
[testServer]
enabled=true
[seleniumWebDriver]
browser="phantomjs"
EOT

echo "Success! The test database has been created.";
