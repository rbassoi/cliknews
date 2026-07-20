# ClikNews v2

[ClikNews](https://github.com/rbassoi/cliknews) is a self hosted newsletter application built on Node.js (v10+) and MySQL (v8+) or MariaDB (v10+).

# FIXME: The info below needs to be updated to v2 !!!


## Features

ClikNews supports subscriber list management, list segmentation, custom fields, email templates, large CSV list import files, etc.

Subscribe to ClikNews Newsletter [here](http://cliknews.org/subscription/EysIv8sAx) (uses ClikNews obviously)


## Contents

* [Official Partners](#official-partners)
* [Cons](#cons)
* [Requirements](#requirements)
* [Installation](#installation)
* [Upgrade](#upgrade)
* [Using Environment Variables](#using-environment-variables)
* [Subscription Widget](#subscription-widget)
* [Cloudron](#cloudron)
* [Bounce Handling](#bounce-handling)
* [Testing](#testing)
* [Translations](#translations)
* [License](#license)

## Official Partners

### iRedMail

![](https://cliknews.org/images/iredmail-logo-red-114.png)

[iRedMail](http://www.iredmail.org/) Free, open source mail server solution

### ZoneMTA

Check out [ZoneMTA](https://github.com/zone-eu/zone-mta) as an alternative self hosted MTA

## Cons

  * Beta-grade software. Might or might not work as expected. There are several users with list sizes between 100k and 1M and ClikNews seems to work for them but YMMV
  * Almost no documentation (there are some guides in the [Wiki](https://github.com/rbassoi/cliknews/wiki))

## Requirements

  * Nodejs v7+
  * MySQL v5.5 or MariaDB
  * Redis. Optional, disabled by default. Used for session storage and for caching state between multiple processes. If you do not have Redis enabled then you can only use a single sender process

## Installation

### Simple Install (Ubuntu)

You can download and run [install.sh](setup/install.sh) in your blank Ubuntu VPS to set up
ClikNews and all required dependencies (including MySQL). The installation script assumes a somewhat blank server, so if this is a machine you are already using for something else, you might want to skip the automatic install and proceed manually.

If you like living on the edge and feel adventurous you can run the installation script directly from your command line as root:

```
curl https://raw.githubusercontent.com/rbassoi/cliknews/master/setup/install.sh | sudo bash
```

Install script installs and sets up the following:

  * **Node.js** (version 6.x)
  * **MariaDB** (the default version from apt-get)
  * **ClikNews** (from the master branch) on port 80
  * **ImageMagick** (the default version from apt-get)
  * **UFW** firewall that blocks everything besides ports 22, 25, 80, 443
  * **[ZoneMTA](https://github.com/zone-eu/zone-mta)** to queue and deliver messages (**NB!** using ZoneMTA assumes that outgoing port 25 is open which might not be the case on some hosts like on the Google Cloud)
  * **Redis** server for session cache
  * **logrotate** to rotate ClikNews log files
  * **upstart** or **systemd** init script to automatically start and manage ClikNews process

After the install script has finished and you see a success message then you should have a ClikNews instance running at http://yourdomain.com

#### Next steps after installation

##### 1. Change admin password

Navigate to http://yourdomain.com where yourdomain.com is the address of your server. Click on the Sign In link in the right top corner of the page. Authenticate with the following credentials:

  * Username: **admin**
  * Password: **test**

Once authenticated, click on your username in the right top corner of the page and select "Account". Now you should be able to change your default password.

##### 2. Update page configuration

If signed in navigate to http://yourdomain.com/settings and check that all email addresses and domain names are correct. ClikNews default installation comes bundled with [ZoneMTA](https://github.com/zone-eu/zone-mta), so you should be able to send out messages right away. ZoneMTA even handles a lot of bounces (not all kind of bounces though) automatically so you do not have to change anything in the SMTP settings to get going.

##### 3. Set up SPF

If you are using the bundled ZoneMTA then you need to add your ClikNews host to the SPF DNS record of your sending domain. So if you are sending messages as "info@example.com" then the domain "example.com" should have a SPF DNS record that points to the IP address or hostname of your ClikNews host. Everything should work without the SPF record but setting it up correctly improves the deliverability a lot.

##### 4. Set up DKIM

If you are using the bundled ZoneMTA then you can provide a DKIM key to sign all outgoing messages. You can provide the DKIM private key in ClikNews Settings page. This key is only used by ZoneMTA, so if you are using some other provider then you check your providers' documentation to see how to set up DKIM. In case of ZoneMTA you only need to open ClikNews Settings page, scroll to DKIM config section and fill the fields for DKIM selector and DKIM private key. Everything should work without the DKIM signatures but setting it up correctly improves the deliverability a lot.

##### 5. Set up VERP

The bundled ZoneMTA can already handle a large amount of bounces if you use it to deliver messages but not all - namely such bounces that happen *after* the recipient MX accepts the message for local delivery. This might happen for example when a user exists, so the MX accepts the message but the quota for that user is checked only when actually storing the message to users' mailbox. Then a bounce message is generated and sent to the original sender which in your case is the mail address you are sending your list messages from. You can catch these messages and mark such recipients manually as bounced but alternatively you can set up a VERP based bounce handler that does this automatically. In this case the sender on the message envelope would not be your actual address but a rewritten bounce address that points to your ClikNews installation.

To set it up you need to create an additonal DNS MX entry for a bounce domain, eg "bounces.example.com" if you are sending from "example.com". This entry should point to your ClikNews server IP address. Next you should enable the VERP handling in ClikNews Settings page.

> As ZoneMTA uses envelope sender as the default for DKIM addresses, then if using VERP you need to set up DKIM to your bounce domain instead of sender domain and also store the DKIM key as "bouncedomain.selector.pem" in the ZoneMTA key folder.

If you do not use VERP with ZoneMTA then you should get notified most of the bounces so everything should mostly work without it

##### 6. Set up proper PTR record

If you are using the bundled ZoneMTA then you should make sure you are using a proper PTR record for your server. For example if you use DigitalOcean then PTR is set automatically (it's the droplet name, so make sure your droplet name is the same as the domain name you are running ClikNews from). If you use AWS then you can request setting up PTR records using [this form](https://portal.aws.amazon.com/gp/aws/html-forms-controller/contactus/ec2-email-limit-rdns-request) (requires authentication). Otherwise you would have to check from your service provider, hot to get the PTR record changed. Everything should work without the PTR record but setting it up correctly improves the deliverability a lot.

If you are using the builtin Zone-MTA, make sure the configured pool name matches the PTR record.

##### 7. Ready to send!

With proper SPF, DKIM and PTR records (DMARC wouldn't hurt either) I got perfect 10/10 score out from [MailTester](https://www.mail-tester.com/) when sending a campaign message to a MailTester test address. I did not have VERP turned on, so the sender address matched return path address.

#### Getting your head around DKIM, DMARK, SPF and PTR

DKIM, DMARK, SPF and PTR are DNS records which spam filters use to figure out if e-mails were really sent by you (and not by a spammer who tries to conceal his identity to be able to continue send bulks of e-mails people never subscribed for). Assuming that you use zone-mta and your e-mails are to originate from a ClikNews installation at `cliknews.example.com` and optionally from `mail.example.net`, to practically set all these records up you will need to:

1. generate genrate a private and public DKIM key

```sh
mkdir /opt/dkim-keys
chmod 700 /opt/dkim-keys
pushd /opt/dkim-keys
openssl genrsa -out cliknews.example.com.key 2048 # private key cliknews.example.com.key
openssl rsa -in cliknews.example.com.key -out cliknews.example.com.pub -pubout -outform PEM # public key cliknews.example.com.pub
```

2. add 3 new txt records for the cliknews.example.com that will most likely similar to the example below:

```
default._domainkey.cliknews.example.com     TXT    "k=rsa; p=[public key in one line];"
cliknews.example.com                        TXT    "v=spf1 mx a a:mail.example.net -all"
_dmarc.cliknews.example.com                 TXT    "v=DMARC1; p=reject"
```

(refer to a google search for a DKIM generator, SPF generator and DMARC genreator to get you up to speed). Configure your ClikNews settings accoring to this:

**DKIM domain:** cliknews.example.com
**DKIM selector:** default
**DKIM Private Key:** [copy and paste the private key in /opt/dkim-keys/cliknews.example.com.key]

The above steps will have the following effect:

- all messages sent by ClikNews / Zone-mta will be signed by the DKIM Private Key (the signature becomes a part of the e-mail)
- when a spamfilter encounters this signature, it will look for the **<DKIM selector>**._domainkey.**<DKIM domain>** TXT record, and use the public key stored there to verify that the signature is valid
- additionally, the spamfilter will look for a TXT SPF record and will look a if the e-mail was sent from the IP address of cliknews.example.com or mail.example.net.  If the sender IP or domain is different, it will discard the e-mail as spam.
- furthermore, the spamfilter looks for the DMARC record, which tells it what to do with mails that aren't signed with DKIM or which don't have a valid signature. The example above will tell the spamfilter to reject such a mail as well.

3. You are now almost set. To further confirm that you have full control over your network, the last step is to set up a PTR record, which will give the right answer for a reverse DNS lookup (answer to "what domain name is bound to IP address xxx.xxx.xxx.xxx). If you run your own DNS, you probably know it will look similar to this:

```
10.27/1.110.220.in-addr.arpa.   1800    PTR     cliknews.example.com.
```

If you run ClikNews on a VPS, you will have to find the PTR configuration somewhere in your administration interface or ask your provider to help you.


### Simple Install (Docker)
#### Requirements:

  * [Docker](https://www.docker.com/)
  * [Docker Compose](https://docs.docker.com/compose/)

#### Install:

* Download ClikNews files using git: `git clone git://github.com/rbassoi/cliknews.git` (or download [zipped repo](https://github.com/rbassoi/cliknews/archive/master.zip)) and open ClikNews folder `cd cliknews`
* **Note**: depending on how you have configured your system and Docker you may need to prepend the commands below with `sudo`.
* Copy the file `docker-compose.override.yml.tmpl` to `docker-compose.override.yml` and modify it if you need to.
* Bring up the stack with: `docker-compose up -d`, by default it will use the included `docker-compose.yml` file and override some configurations taken from the `docker-compose.override.yml` file.
* If you want to use only / copy the `docker-compose.yml` file (for example, if you were deploying with Rancher), you may need to first run `docker-compose build` to make sure your system has a Docker image `cliknews:latest`.
* Open [http://localhost:3000/](http://localhost:3000/) (change the host name `localhost` to the name of the host where you are deploying the system).
* Authenticate as user `admin` with password `test`
* Navigate to [http://localhost:3000/settings](http://localhost:3000/settings) and update service configuration.
* Navigate to [http://localhost:3000/users/account](http://localhost:3000/users/account) and update user information and password.

**Note**: If you need to add or modify custom configurations, copy the file `config/docker-production.toml.tmpl` to `config/production.toml` and modify as you need. By default, the Docker image will do just that, automatically, so you can bring up the stack and it will work with default configurations.
  

### Manual Install (any OS that supports Node.js)

  1. Download ClikNews files using git: `git clone git://github.com/rbassoi/cliknews.git` (or download [zipped repo](https://github.com/rbassoi/cliknews/archive/master.zip)) and open ClikNews folder `cd cliknews`
  2. Run `npm install --production` in the ClikNews folder to install required dependencies
  3. Copy [config/default.toml](config/default.toml) as `config/production.toml` and update MySQL and any other settings in it
  4. Run the server `NODE_ENV=production npm start`
  5. Open [http://localhost:3000/](http://localhost:3000/)
  6. Authenticate as `admin`:`test`
  7. Navigate to [http://localhost:3000/settings](http://localhost:3000/settings) and update service configuration
  8. Navigate to [http://localhost:3000/users/account](http://localhost:3000/users/account) and update user information and password

## Upgrade

  * Replace old files with new ones by running in the ClikNews folder `git pull origin master` if you used Git to set ClikNews up or just download [new files](https://github.com/rbassoi/cliknews/archive/master.zip) and replace old ones with these
  * Run `npm install --production` in the ClikNews folder

## Using Environment Variables

Some servers expose custom port and hostname options through environment variables. To support these, create a new configuration file `config/local.js`:

```
module.exports = {
    www: {
        port: process.env.OPENSHIFT_NODEJS_PORT,
        host: process.env.OPENSHIFT_NODEJS_IP
    }
};
```

ClikNews uses [node-config](https://github.com/lorenwest/node-config) for configuration management and thus the config files are loaded in the following order:

  1. default.toml
  2. {NODE_ENV}.toml (eg. development.toml or production.toml)
  3. local.js

### Running Behind Nginx Proxy

Edit [cliknews.nginx](setup/cliknews-nginx.conf) (update `server_name` directive) and copy it to `/etc/nginx/sites-enabled`

### Running as an Upstart Service in Ubuntu 14.04

Edit [cliknews.conf](setup/cliknews.conf) (update application folder) and copy it to `/etc/init`

## Subscription Widget

The (experimental) ClikNews Subscription Widget allows you to embed your sign-up forms on your website. To embed a Widget, you need to:

Enable cross-origin resource sharing in your `server/config/local.yaml` file (you may need to create it if it doesn't exist) and whitelist your site:

```
cors:
  # Allow subscription widgets to be embedded
  origins=['https://www.example.com']
```

Embed the widget code on your website using the untrusted endpoint:

```
<div data-cliknews-subscription-widget data-url="http://lists.example.com/subscription/Byf44R-og/widget">
    <a href="http://lists.example.com/subscription/Byf44R-og">Subscribe to our list</a>
</div>
<script src="http://lists.example.com/static/subscription/widget.js"></script>
```

## Cloudron

You can easily install and self-host ClikNews on the Cloudron to send newsletters from your custom domain:

[![Install](https://cloudron.io/img/button.svg)](https://cloudron.io/button.html?app=org.cliknews.cloudronapp)

The source code for the Cloudron app is [here](https://git.cloudron.io/cloudron/cliknews-app).

## Bounce Handling

ClikNews uses webhooks integration to detect bounces and spam complaints. Currently supported webhooks are:

  * **AWS SES** – create a SNS topic for complaints and bounces and use `http://domain/webhooks/aws` as the subscriber URL for these topics
  * **SparkPost** – use `http://domain/webhooks/sparkpost` as the webhook URL for bounces and complaints ([instructions](https://github.com/rbassoi/cliknews/wiki/Setting-up-Webhooks-for-SparkPost))
  * **SendGrid** – use `http://domain/webhooks/sendgrid` as the webhook URL for bounces and complaints ([instructions](https://github.com/rbassoi/cliknews/wiki/Setting-up-Webhooks-for-SendGrid))
  * **Mailgun** – use `http://domain/webhooks/mailgun` as the webhook URL for bounces and complaints ([instructions](https://github.com/rbassoi/cliknews/wiki/Setting-up-Webhooks-for-Mailgun))
  * **ZoneMTA** – use `http://domain/webhooks/zone-mta` as the webhook URL for bounces. If you install ClikNews with the included installation script then this route gets set up automatically during the installation process
  * **Postfix** – This is not a webhook but a TCP server on port 5699 to listen for piped Postfix logs. Enable it with the `[postfixBounce]` config option. To use it, pipe the log to that port using *tail*: `tail -F /var/log/mail.log | nc localhost 5699 -` (if ClikNews restarts then you need to re-establish the *tail* pipe), alternatively you could send the log with a cron job periodically `tail -n 100 | nc localhost 5699 -`.

Additionally ClikNews (v1.1+) is able to use VERP-based bounce handling. This would require to have a compatible SMTP relay (the services mentioned above strip out or block VERP addresses in the SMTP envelope) and you also need to set up special MX DNS name that points to your ClikNews installation server.

If using VERP with iRedMail, see [this post](http://www.iredmail.org/forum/post49325.html#p49325) for correct configuration as iRedMail blocks by default senders that do not match authentication username (VERP address and user account address are different).

## Testing

There is a built in /dev/null server in ClikNews that you can use to load test your installation. Check the `[testServer]` section in the configuration file for details. By default the test server is disabled. The server uses only cleartext connections, so select "Do not use encryption" in the encryption settings when setting up the server data in ClikNews.

Additionally you can generate CSV import files with fake subscriber data:

```
node setup/fakedata.js > somefile.csv
```

This command generates a CSV file with 100 000 subscriber accounts

## Translations

ClikNews is currently not translated but it supports translations. To add translations you first need to add translation support for the translatable strings. To test if strings are translatable or not, use a fake language with code "zz"

```toml
language="zz"
```

This would modify all input strings. If a string is not modified then it does not support translations.

![](https://cldup.com/qXxAbaq2F1.png)

### Translating JavaScript Files

To translate JavaScript strings you need to make sure that you have loaded the translating function `_` from *'./lib/translate.js'*. If you want to use variables in strings then you also need the *'util'* module.

```javascript
const _ = require('./path/to/lib/translate')._;
const util = require('util'); // optional
```

All you need to do to translate strings is to enclose these in the `_()` function

```javascript
let str1 = _('This string will be translated');
let str2 = util.format( _('My name is "%s"'), 'ClikNews');
```

### Translating Handlebars Files

Enclose translatable strings to `` tags

```handlebars
<p>
    ClikNews – the best newsletter app
</p>
```

### Managing Translations

* Translations are loaded from Gettext MO files. In order to generate such files you need a Gettext translations editor. [POEdit](https://poedit.net/) is a great choice.

* To create the translation catalog run `grunt` from command line. This fetches all translatable strings from JavaScript and Handlebars files and merges these into the translation catalog located at */languages/cliknews.pot*

* To add a new language use this catalog file as source. Once you want to update your translation file from the updated catalog, then select "Catalogue" -> "Update from POT file..." in POEdit and select cliknews.pot. This would merge all new translations from the POT file to your PO file.
 *If you have saved the PO file in [./languages](./languages) then POEdit should auto generate required MO file whenever you hit save for the PO file.

* Once you have a correct MO file in the languages folder, then edit ClikNews config and set ["language" option](https://github.com/rbassoi/cliknews/blob/ba8bd1212335cb9bd7ba094beb7b5400f35cae6c/config/default.toml#L30-L31) to your language name. If the value is "et" then ClikNews loads translations from ./languages/et.mo

> **NB!** For now translation settings are global, so if you have set a translation in config then this applies to all users. An user can't select another translation than the default even if there is a translation file. This is because current ClikNews code does not provide request context to functions and the functions generating strings do not know which language to use.

## License

  * Versions 1.22.0 and up **GPL-V3.0**
  * Versions 1.21.0 and up: **EUPL-1.1**
  * Versions 1.19.0 and up: **MIT**
  * Up to versions 1.18.0 **GPL-V3.0**
