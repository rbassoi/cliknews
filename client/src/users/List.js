'use strict';

import React, {Component} from "react";
import {withTranslation} from '../lib/i18n';
import {LinkButton, requiresAuthenticatedUser, Title, Toolbar, withPageHelpers} from "../lib/page";
import {Table} from "../lib/table";
import clikerConfig from "clikerConfig";
import {Icon, Pill} from "../lib/bootstrap-components";
import {tableAddDeleteButton, tableRestActionDialogInit, tableRestActionDialogRender} from "../lib/modals";
import {withComponentMixins} from "../lib/decorator-helpers";

@withComponentMixins([
    withTranslation,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class List extends Component {
    constructor(props) {
        super(props);

        this.state = {};
        tableRestActionDialogInit(this);
    }

    render() {
        // There are no permissions checks here because this page makes no sense for anyone who does not have manageUsers permission
        // Once someone has this permission, then all on this page can be used.

        const t = this.props.t;

        const columns = [
            { data: 1, title: t("username") },
        ];

        if (clikerConfig.isAuthMethodLocal) {
            columns.push({ data: 2, title: t("fullName") });
        }

        columns.push({ data: 3, title: t("namespace") });
        columns.push({ data: 4, title: t("role") });

        // These two columns only come back populated when the query is the
        // global-admin one (server/models/users.js's listAllDTAjax) - a regular
        // user's own-account-scoped listDTAjax never reaches this branch, since
        // clikerConfig.isPlatformAdmin only true for the hardcoded admin account.
        if (clikerConfig.isPlatformAdmin) {
            columns.push({ data: 5, title: t("account") });
            columns.push({
                data: 6,
                title: t("status"),
                render: status => {
                    if (status === 'active') return <Pill color="green">{t('active')}</Pill>;
                    if (status === 'suspended') return <Pill color="gray">{t('suspended')}</Pill>;
                    if (status === 'pending') return <Pill color="amber">{t('pending')}</Pill>;
                    return <Pill color="blue">{status}</Pill>;
                }
            });
        }

        columns.push({
            actions: data => {
                const actions = [];

                actions.push({
                    label: <Icon icon="edit" title={t('edit')}/>,
                    link: `/users/${data[0]}/edit`
                });

                actions.push({
                    label: <Icon icon="share-square" title={t('share')}/>,
                    link: `/users/${data[0]}/shares`
                });

                tableAddDeleteButton(actions, this, null, `rest/users/${data[0]}`, data[1], t('deletingUser'), t('userDeleted'));

                return actions;
            }
        });

        return (
            <div>
                {tableRestActionDialogRender(this)}
                <Toolbar>
                    <LinkButton to="/users/create" className="btn-primary" icon="plus" label={t('createUser')}/>
                </Toolbar>

                <Title>{t('users')}</Title>

                <Table ref={node => this.table = node} withHeader dataUrl="rest/users-table" columns={columns} />
            </div>
        );
    }
}
