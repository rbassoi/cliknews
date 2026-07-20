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

# Setup MySQL user for ClikNews Tests
mysql -u root -e "CREATE USER 'cliknews_test'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';"
mysql -u root -e "GRANT ALL PRIVILEGES ON cliknews_test.* TO 'cliknews_test'@'localhost';"
mysql -u cliknews_test --password="$MYSQL_PASSWORD" -e "CREATE database cliknews_test;"

# Setup installation configuration
cat >> config/test.toml <<EOT
[www]
port=3000
[mysql]
user="cliknews_test"
password="$MYSQL_PASSWORD"
database="cliknews_test"
[testServer]
enabled=true
[seleniumWebDriver]
browser="phantomjs"
EOT

echo "Success! The test database has been created.";
