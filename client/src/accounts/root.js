'use strict';

import React from "react";
import PendingAccounts from "./PendingAccounts";
import AllAccounts from "./AllAccounts";

function getMenus(t) {
    return {
        'accounts': {
            title: t('accounts'),
            link: '/accounts',
            panelRender: props => <AllAccounts/>
        },
        'pending-accounts': {
            title: t('pendingAccounts'),
            link: '/pending-accounts',
            panelRender: props => <PendingAccounts/>
        }
    };
}

export default {
    getMenus
}
