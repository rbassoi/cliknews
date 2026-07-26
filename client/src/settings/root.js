'use strict';

import React from "react";
import Update from "./Update";
import SendingDomains from "./SendingDomains";
import ApiKeys from "./ApiKeys";

function getMenus(t) {
    return {
        'settings': {
            title: t('globalSettings'),
            link: '/settings',
            resolve: {
                configItems: params => `rest/settings`
            },
            panelRender: props => <Update entity={props.resolved.configItems} />
        },
        'sending-domains': {
            title: t('sendingDomains'),
            link: '/sending-domains',
            panelRender: props => <SendingDomains/>
        },
        'api-keys': {
            title: t('apiKeys'),
            link: '/api-keys',
            panelRender: props => <ApiKeys/>
        }
    };
}

export default {
    getMenus
}
