'use strict';

import React from "react";
import PendingAccounts from "./PendingAccounts";

function getMenus(t) {
    return {
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
