'use strict';

import React from 'react';
import Login from './Login';
import SignUp from './SignUp';
import Reset from './Forgot';
import ResetLink from './Reset';
import clikerConfig from 'clikerConfig';


function getMenus(t) {
    const subPaths = {}
    const menus = {};

    if (clikerConfig.isAuthMethodLocal) {
        subPaths.forgot = {
            title: t('passwordReset-1'),
            extraParams: [':username?'],
            link: '/login/forgot',
            panelComponent: Reset,
            panelInFullScreen: true
        };

        subPaths.reset = {
            title: t('passwordReset-1'),
            extraParams: [':username', ':resetToken'],
            link: '/login/reset',
            panelComponent: ResetLink,
            panelInFullScreen: true
        };

        menus.signup = {
            title: t('signUp'),
            link: '/signup',
            panelComponent: SignUp,
            panelInFullScreen: true
        };
    }

    menus.login = {
        title: t('signIn'),
        link: '/login',
        panelComponent: Login,
        panelInFullScreen: true,

        children: subPaths
    };

    return menus;
}

export default {
    getMenus
}
