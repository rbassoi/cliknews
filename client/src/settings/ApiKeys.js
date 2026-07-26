'use strict';

import React, {Component} from "react";
import {withTranslation} from '../lib/i18n';
import {requiresAuthenticatedUser, withPageHelpers} from "../lib/page";
import {withErrorHandling, withAsyncErrorHandler} from "../lib/error-handling";
import {Button, Pill} from "../lib/bootstrap-components";
import {CheckBox, Form, withForm} from "../lib/form";
import {tableAddRestActionButton, tableRestActionDialogInit, tableRestActionDialogRender} from "../lib/modals";
import {Table} from "../lib/table";
import {HTTPMethod} from "../lib/axios";
import axios from "../lib/axios";
import {getUrl} from "../lib/urls";
import {withComponentMixins} from "../lib/decorator-helpers";
import moment from 'moment';

const SCOPES = ['read', 'campaigns', 'contacts', 'transactional'];

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class ApiKeys extends Component {
    constructor(props) {
        super(props);

        this.state = {
            lastCreatedKey: null
        };
        tableRestActionDialogInit(this);

        this.initForm({leaveConfirmation: false});
    }

    componentDidMount() {
        this.populateFormValues({
            scope_read: true,
            scope_campaigns: false,
            scope_contacts: false,
            scope_transactional: false
        });
    }

    @withAsyncErrorHandler
    async createKey() {
        const scopes = SCOPES.filter(scope => this.getFormValue('scope_' + scope));

        const response = await axios.post(getUrl('rest/api-keys'), {scopes});

        this.setState({lastCreatedKey: response.data});
        this.table.refresh();
    }

    render() {
        const t = this.props.t;
        const lastCreatedKey = this.state.lastCreatedKey;

        const columns = [
            {data: 1, title: t('key')},
            {data: 2, title: t('scopes'), render: scopes => (scopes || '').split(',').filter(Boolean).map(s => <Pill key={s} color="blue" style={{marginRight: 4}}>{s}</Pill>)},
            {data: 3, title: t('lastUsed'), render: d => d ? moment(d).fromNow() : t('never')},
            {
                data: 4,
                title: t('status'),
                render: revokedAt => revokedAt ? <Pill color="gray">{t('revoked')}</Pill> : <Pill color="green">{t('active')}</Pill>
            },
            {
                actions: data => {
                    const id = data[0];
                    const revokedAt = data[4];

                    if (revokedAt) {
                        return [];
                    }

                    const actions = [];
                    tableAddRestActionButton(
                        actions, this,
                        {method: HTTPMethod.POST, url: `rest/api-keys-revoke/${id}`},
                        {icon: 'ban', label: t('revoke')},
                        t('confirmRevoke'),
                        t('areYouSureYouWantToRevokeThisApiKey'),
                        t('revokingApiKey'),
                        t('apiKeyRevoked'),
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
                        <h1 className="cn-page-title">{t('apiKeys')}</h1>
                        <div className="cn-page-subtitle">{t('apiKeysSubtitle')}</div>
                    </div>
                </div>

                <div className="cn-card" style={{padding: '20px 24px', marginBottom: 24}}>
                    <Form stateOwner={this} noStatus>
                        <div style={{display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                            {SCOPES.map(scope => (
                                <CheckBox key={scope} id={'scope_' + scope} text={scope}/>
                            ))}
                            <Button className="btn-primary" icon="plus" label={t('generateNewKey')} onClickAsync={::this.createKey}/>
                        </div>
                    </Form>
                </div>

                {lastCreatedKey &&
                    <div className="cn-card" style={{padding: '20px 24px', marginBottom: 24, borderColor: 'var(--cn-accent, #3d63d9)'}}>
                        <div style={{fontWeight: 700, marginBottom: 8}}>{t('copyThisKeyNowYouWontSeeItAgain')}</div>
                        <code style={{display: 'block', wordBreak: 'break-all', fontSize: 15}}>{lastCreatedKey.raw_key}</code>
                    </div>
                }

                <Table ref={node => this.table = node} withHeader dataUrl="rest/api-keys-table" columns={columns}/>
            </div>
        );
    }
}
