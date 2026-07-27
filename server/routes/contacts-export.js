'use strict';

const passport = require('../lib/passport');
const router = require('../lib/router-async').create();
const contacts = require('../models/contacts');
const stringify = require('csv-stringify')
const moment = require('moment');
const {SubscriptionStatus} = require('../../shared/lists');

router.getAsync('/', passport.loggedIn, async (req, res) => {
    const statusStrings = {
        [SubscriptionStatus.SUBSCRIBED]: 'subscribed',
        [SubscriptionStatus.UNSUBSCRIBED]: 'unsubscribed',
        [SubscriptionStatus.BOUNCED]: 'bounced',
        [SubscriptionStatus.COMPLAINED]: 'complained'
    };

    const status = req.query.status;

    const columns = [
        {key: 'email', header: 'EMAIL'},
        {key: 'status', header: 'STATUS'},
        {key: 'lists', header: 'LISTS'},
        {key: 'created', header: 'CREATED'}
    ];

    const headers = {
        'Content-Disposition': `attachment;filename=contacts-${moment().toISOString()}.csv`,
        'Content-Type': 'text/csv'
    };

    res.set(headers);

    const stringifier = stringify({
        columns,
        header: true,
        delimiter: ','
    });

    stringifier.pipe(res);

    for await (const contact of contacts.contactsIterator(req.context, status)) {
        contact.status = statusStrings[contact.status];
        // csv-stringify's default cast turns a Date object into its epoch-millis
        // number instead of a readable string, so format it explicitly.
        contact.created = contact.created ? moment(contact.created).toISOString() : '';

        stringifier.write(contact);
    }

    stringifier.end();
});

module.exports = router;
