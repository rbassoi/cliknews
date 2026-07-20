'use strict';

import React from "react";
import List from "./List";
import qs from 'querystringify';

function getMenus(t) {
    return {
        'contacts': {
            title: t('contacts'),
            link: '/contacts',
            panelRender: props => <List status={qs.parse(props.location.search).status}/>
        }
    };
}

export default {
    getMenus
}
