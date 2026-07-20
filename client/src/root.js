'use strict';

import './lib/public-path';

import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {TranslationRoot, withTranslation} from './lib/i18n';
import account from './account/root';
import login from './login/root';
import blacklist from './blacklist/root';
import contacts from './contacts/root';
import lists from './lists/root';
import namespaces from './namespaces/root';
import reports from './reports/root';
import campaigns from './campaigns/root';
import channels from './channels/root';
import templates from './templates/root';
import users from './users/root';
import sendConfigurations from './send-configurations/root';
import settings from './settings/root';

import {DropdownLink, getLanguageChooser, NavDropdown, NavGroup, NavLink, Section} from "./lib/page";

import cliknewsConfig from 'cliknewsConfig';
import Home from "./Home";
import {DropdownActionLink, Icon} from "./lib/bootstrap-components";
import axios from './lib/axios';
import {getUrl} from "./lib/urls";
import {withComponentMixins} from "./lib/decorator-helpers";
import Update from "./settings/Update";

const topLevelMenuKeys = ['contacts', 'lists', 'channels', 'templates', 'campaigns'];

if (cliknewsConfig.reportsEnabled) {
    topLevelMenuKeys.push('reports');
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
            }

            async logout() {
                await axios.post(getUrl('rest/logout'));
                window.location = getUrl();
            }

            render() {
                const path = this.props.location.pathname;

                const topLevelItems = structure.children;
                const activeClass = link => (link && path.startsWith(link) && (link !== '/' || path === '/')) ? 'active' : '';

                const topLevelMenu = [];

                for (const entryKey of topLevelMenuKeys) {
                    const entry = topLevelItems[entryKey];
                    const link = entry.link || entry.externalLink;
                    topLevelMenu.push(<NavLink key={entryKey} className={activeClass(link)} to={link}>{entry.title}</NavLink>);
                }

                const adminLinks = ['/users', '/namespaces', '/settings', '/send-configurations', '/blacklist', '/account/api'];
                const isAdminActive = adminLinks.some(link => path.startsWith(link));

                if (cliknewsConfig.isAuthenticated) {
                    return (
                        <>
                            <ul className="cn-nav-list">
                                <NavLink className={activeClass('/')} to="/">{t('dashboard')}</NavLink>
                                {topLevelMenu}
                            </ul>
                            <NavGroup label={t('administration')} startOpen={isAdminActive}>
                                {cliknewsConfig.globalPermissions.displayManageUsers && <NavLink className={activeClass('/users')} to="/users">{t('users')}</NavLink>}
                                <NavLink className={activeClass('/namespaces')} to="/namespaces">{t('namespaces')}</NavLink>
                                {cliknewsConfig.globalPermissions.manageSettings && <NavLink className={activeClass('/settings')} to="/settings">{t('globalSettings')}</NavLink>}
                                <NavLink className={activeClass('/send-configurations')} to="/send-configurations">{t('sendConfigurations')}</NavLink>
                                {cliknewsConfig.globalPermissions.manageBlacklist && <NavLink className={activeClass('/blacklist')} to="/blacklist">{t('blacklist')}</NavLink>}
                                <NavLink className={activeClass('/account/api')} to="/account/api">{t('api')}</NavLink>
                            </NavGroup>
                            <div className="cn-sidebar-footer">
                                <ul className="cn-sidebar-user navbar-nav">
                                    {getLanguageChooser(t)}
                                    <NavDropdown menuClassName="dropdown-menu-right" label={cliknewsConfig.user.username} icon="user">
                                        <DropdownLink to="/account"><Icon icon='user'/> {t('account')}</DropdownLink>
                                        {cliknewsConfig.authMethod == 'cas' && <DropdownLink to="/cas/logout" forceReload><Icon icon="sign-out-alt"/> {t('logOut')}</DropdownLink>}
                                        {cliknewsConfig.authMethod != 'cas' && <DropdownActionLink onClickAsync={::this.logout}><Icon icon='sign-out-alt'/> {t('logOut')}</DropdownActionLink>}
                                    </NavDropdown>
                                </ul>
                                <div className="cn-sidebar-copyright">&copy; 2026 ClikNews. <a href="https://github.com/rbassoi/cliknews">{t('sourceOnGitHub')}</a></div>
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
                ...channels.getMenus(t)
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


