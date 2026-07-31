'use strict';

import React, {Component} from "react";
import {withTranslation} from '../lib/i18n';
import {requiresAuthenticatedUser, withPageHelpers} from "../lib/page";
import {withErrorHandling} from "../lib/error-handling";
import {tableAddRestActionButton, tableRestActionDialogInit, tableRestActionDialogRender} from "../lib/modals";
import {Table} from "../lib/table";
import {HTTPMethod} from "../lib/axios";
import {withComponentMixins} from "../lib/decorator-helpers";
import moment from 'moment';

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class PendingAccounts extends Component {
    constructor(props) {
        super(props);
        this.state = {};
        tableRestActionDialogInit(this);
    }

    render() {
        const t = this.props.t;

        const columns = [
            {data: 1, title: t('companyName')},
            {data: 2, title: t('contact')},
            {data: 3, title: t('email')},
            {data: 4, title: t('signedUp'), render: data => moment(data).fromNow()},
            {
                actions: data => {
                    const id = data[0];
                    const actions = [];

                    tableAddRestActionButton(
                        actions, this,
                        {method: HTTPMethod.POST, url: `rest/pending-accounts/${id}/approve`},
                        {icon: 'check', label: t('approve')},
                        t('confirmApproveAccount'),
                        t('doYouWantToApproveThisAccount?'),
                        t('approvingAccount'),
                        t('accountApproved'),
                        null
                    );

                    tableAddRestActionButton(
                        actions, this,
                        {method: HTTPMethod.POST, url: `rest/pending-accounts/${id}/reject`},
                        {icon: 'trash-alt', label: t('reject')},
                        t('confirmRejectAccount'),
                        t('doYouWantToRejectThisAccount?'),
                        t('rejectingAccount'),
                        t('accountRejected'),
                        null
                    );

                    return actions;
                }
            }
        ];

        return (
            <div>
                {tableRestActionDialogRender(this)}

                <div className="cn-page-header">
                    <div>
                        <h1 className="cn-page-title">{t('pendingAccounts')}</h1>
                    </div>
                </div>

                <Table ref={node => this.table = node} withHeader dataUrl="rest/pending-accounts-table" columns={columns}/>
            </div>
        );
    }
}
