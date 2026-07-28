'use strict';

/** Shared by contacts/AddToListModal.js and lists/subscriptions/AddFromContactsModal.js
 *  (both call server/models/contacts.js:addToList and get back the same result shape). */
export function formatAddToListResult(t, result) {
    let msg = t('contactsAddedToListCount', { count: result.added });

    if (result.alreadySubscribedEmails && result.alreadySubscribedEmails.length > 0) {
        msg += ' ' + t('alreadySubscribedEmails', { emails: result.alreadySubscribedEmails.join(', ') });
    }

    return msg;
}
