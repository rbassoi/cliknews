'use strict';

import './lib/public-path';

import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {TranslationRoot, withTranslation} from './lib/i18n';
import account from './account/root';
import login from './login/root';
import blacklist from './blacklist/root';
import contacts from './contacts/root';
import companies from './companies/root';
import lists from './lists/root';
import namespaces from './namespaces/root';
import reports from './reports/root';
import campaigns from './campaigns/root';
import channels from './channels/root';
import templates from './templates/root';
import users from './users/root';
import sendConfigurations from './send-configurations/root';
import settings from './settings/root';
import accounts from './accounts/root';

import {getLanguageChooser, NavGroup, NavLink, Section} from "./lib/page";

import clikerConfig from 'clikerConfig';
import Home from "./Home";
import {Icon} from "./lib/bootstrap-components";
import axios from './lib/axios';
import {getUrl} from "./lib/urls";
import {withComponentMixins} from "./lib/decorator-helpers";
import Update from "./settings/Update";
import {getTheme, toggleTheme} from "./lib/theme";

// Flat, icon + label sidebar entries (no sub-items in this app's real menu tree —
// unlike the design handoff's example tree, most of these only ever have one real
// destination, so a collapsible group would just be empty ceremony around one link).
const flatMenuKeys = ['contacts', 'companies', 'lists', 'forms', 'channels', 'campaigns'];
const flatMenuIcons = {
    contacts: 'user', companies: 'building', lists: 'list', forms: 'clipboard-list',
    channels: 'broadcast-tower', campaigns: 'paper-plane', reports: 'chart-bar'
};

if (clikerConfig.reportsEnabled) {
    flatMenuKeys.push('reports');
}


@withComponentMixins([
    withTranslation
])
class Root extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const t = this.props.t;

        let structure;

        // The MainMenu component is defined here in order to avoid recreating menu structure on every change in the main menu
        // This is because Root component depends only on the language, thus it is redrawn (and the structure is recomputed) only when the language changes
        class MainMenu extends Component {
            constructor(props) {
                super(props);
                this.state = {
                    theme: getTheme()
                };
            }

            async logout() {
                await axios.post(getUrl('rest/logout'));
                window.location = clikerConfig.landingUrlBase || getUrl();
            }

            handleToggleTheme() {
                this.setState({ theme: toggleTheme() });
            }

            render() {
                const path = this.props.location.pathname;

                const topLevelItems = structure.children;
                const activeClass = link => (link && path.startsWith(link) && (link !== '/' || path === '/')) ? 'active' : '';

                const flatMenu = [];
                for (const entryKey of flatMenuKeys) {
                    const entry = topLevelItems[entryKey];
                    const link = entry.link || entry.externalLink;
                    flatMenu.push(<NavLink key={entryKey} icon={flatMenuIcons[entryKey]} className={activeClass(link)} to={link}>{entry.title}</NavLink>);
                }

                const templatesEntry = topLevelItems.templates;
                const mosaicoEntry = templatesEntry.children.mosaico;
                const isModelosActive = path.startsWith('/templates');

                const adminLinks = ['/users', '/namespaces', '/settings', '/sending-domains', '/api-keys', '/send-configurations', '/blacklist', '/account/api', '/accounts', '/pending-accounts'];
                const isAdminActive = adminLinks.some(link => path.startsWith(link));

                const isDark = this.state.theme !== 'light';

                if (clikerConfig.isAuthenticated) {
                    return (
                        <>
                            <ul className="cn-nav-list">
                                <NavLink icon="th-large" className={activeClass('/')} to="/">{t('dashboard')}</NavLink>
                            </ul>
                            {flatMenu.slice(0, 3)}
                            <NavGroup label={t('templates')} icon="file-alt" startOpen={isModelosActive}>
                                <NavLink className={activeClass('/templates') && !path.startsWith('/templates/mosaico') ? 'active' : ''} to={templatesEntry.link}>{t('email')}</NavLink>
                                <NavLink className={activeClass('/templates/mosaico')} to={mosaicoEntry.link}>{t('landingPages')}</NavLink>
                            </NavGroup>
                            {flatMenu.slice(3)}

                            <NavGroup className="cn-nav-group-admin" label={t('administration')} startOpen={isAdminActive}>
                                {clikerConfig.globalPermissions.displayManageUsers && <NavLink className={activeClass('/users')} to="/users">{t('users')}</NavLink>}
                                <NavLink className={activeClass('/namespaces')} to="/namespaces">{t('namespaces')}</NavLink>
                                {clikerConfig.globalPermissions.manageSettings && <NavLink className={activeClass('/settings')} to="/settings">{t('globalSettings')}</NavLink>}
                                <NavLink className={activeClass('/sending-domains')} to="/sending-domains">{t('sendingDomains')}</NavLink>
                                <NavLink className={activeClass('/api-keys')} to="/api-keys">{t('apiKeys')}</NavLink>
                                <NavLink className={activeClass('/send-configurations')} to="/send-configurations">{t('sendConfigurations')}</NavLink>
                                {clikerConfig.globalPermissions.manageBlacklist && <NavLink className={activeClass('/blacklist')} to="/blacklist">{t('blacklist')}</NavLink>}
                                <NavLink className={activeClass('/account/api')} to="/account/api">{t('api')}</NavLink>
                                {clikerConfig.isPlatformAdmin && <NavLink className={activeClass('/accounts')} to="/accounts">{t('accounts')}</NavLink>}
                                {clikerConfig.isPlatformAdmin && <NavLink className={activeClass('/pending-accounts')} to="/pending-accounts">{t('pendingAccounts')}</NavLink>}
                            </NavGroup>

                            <div className="cn-sidebar-footer">
                                <ul className="cn-sidebar-user navbar-nav">
                                    {getLanguageChooser(t)}
                                    <NavLink className={activeClass('/account')} icon="user" to="/account">{clikerConfig.user.username}</NavLink>
                                </ul>
                                <div className="cn-sidebar-footer-actions">
                                    <button type="button" className="btn btn-ghost cn-theme-toggle" onClick={::this.handleToggleTheme}>
                                        <Icon icon={isDark ? 'moon' : 'sun'}/>
                                        <span>{isDark ? t('dark') : t('light')}</span>
                                    </button>
                                    {clikerConfig.authMethod == 'cas' &&
                                        <a href={getUrl('cas/logout')} className="btn btn-ghost">
                                            <Icon icon="sign-out-alt"/>
                                            <span>{t('logOut')}</span>
                                        </a>
                                    }
                                    {clikerConfig.authMethod != 'cas' &&
                                        <button type="button" className="btn btn-ghost" onClick={::this.logout}>
                                            <Icon icon="sign-out-alt"/>
                                            <span>{t('logOut')}</span>
                                        </button>
                                    }
                                </div>
                                <div className="cn-sidebar-copyright">&copy; 2026 Cliker. <a href="https://github.com/rbassoi/cliker">{t('sourceOnGitHub')}</a></div>
                            </div>
                        </>
                    );
                } else {
                    return (
                        <div className="cn-sidebar-footer">
                            <ul className="cn-sidebar-user navbar-nav">
                                {getLanguageChooser(t)}
                            </ul>
                        </div>
                    );
                }
            }
        }

        structure = {
            title: t('home'),
            link: '/',
            panelRender: props => <Home />,
            primaryMenuComponent: MainMenu,
            children: {
                ...login.getMenus(t),
                ...contacts.getMenus(t),
                ...companies.getMenus(t),
                ...lists.getMenus(t),
                ...reports.getMenus(t),
                ...templates.getMenus(t),
                ...namespaces.getMenus(t),
                ...users.getMenus(t),
                ...blacklist.getMenus(t),
                ...account.getMenus(t),
                ...settings.getMenus(t),
                ...sendConfigurations.getMenus(t),
                ...campaigns.getMenus(t),
                ...channels.getMenus(t),
                ...accounts.getMenus(t)
            }
        };

        return (
            <Section root='/' structure={structure}/>
        );
    }
}

export default function() {
    ReactDOM.render(<TranslationRoot><Root/></TranslationRoot>,document.getElementById('root'));
};


