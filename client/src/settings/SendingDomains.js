'use strict';

import React, {Component} from "react";
import {withTranslation} from '../lib/i18n';
import {requiresAuthenticatedUser, withPageHelpers} from "../lib/page";
import {withErrorHandling, withAsyncErrorHandler} from "../lib/error-handling";
import {ButtonRow, Form, FormSendMethod, InputField, withForm, withFormErrorHandlers} from "../lib/form";
import {Button, Pill} from "../lib/bootstrap-components";
import {tableAddRestActionButton, tableRestActionDialogInit, tableRestActionDialogRender} from "../lib/modals";
import {Table} from "../lib/table";
import {HTTPMethod} from "../lib/axios";
import {withComponentMixins} from "../lib/decorator-helpers";

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class SendingDomains extends Component {
    constructor(props) {
        super(props);

        this.state = {
            lastCreatedDomain: null
        };
        tableRestActionDialogInit(this);

        this.initForm({
            leaveConfirmation: false
        });
    }

    clearFields() {
        this.populateFormValues({domain: ''});
    }

    localValidateFormValues(state) {
        const t = this.props.t;

        if (!state.getIn(['domain', 'value'])) {
            state.setIn(['domain', 'error'], t('domainMustNotBeEmpty'));
        } else {
            state.setIn(['domain', 'error'], null);
        }
    }

    @withFormErrorHandlers
    async submitHandler() {
        const t = this.props.t;

        this.disableForm();
        this.setFormStatusMessage('info', t('saving'));

        const submitSuccessful = await this.validateAndSendFormValuesToURL(FormSendMethod.POST, 'rest/sending-domains');

        if (submitSuccessful) {
            this.hideFormValidation();
            this.clearFields();
            this.enableForm();
            this.clearFormStatusMessage();
            this.table.refresh();

            if (submitSuccessful !== true) {
                this.setState({lastCreatedDomain: submitSuccessful});
            }
        } else {
            this.enableForm();
            this.setFormStatusMessage('warning', t('thereAreErrorsInTheFormPleaseFixThemAnd-1'));
        }
    }

    componentDidMount() {
        this.clearFields();
    }

    render() {
        const t = this.props.t;
        const lastCreatedDomain = this.state.lastCreatedDomain;

        const columns = [
            {data: 1, title: t('domain')},
            {
                data: 3,
                title: t('status'),
                render: verified => verified ? <Pill color="green">{t('verified')}</Pill> : <Pill color="amber">{t('pendingDnsVerification')}</Pill>
            },
            {
                actions: data => {
                    const id = data[0];

                    const actions = [];

                    tableAddRestActionButton(
                        actions, this,
                        {method: HTTPMethod.DELETE, url: `rest/sending-domains/${id}`},
                        {icon: 'trash-alt', label: t('remove')},
                        t('confirmRemoval'),
                        t('areYouSureYouWantToRemoveThisSendingDomain'),
                        t('removingSendingDomain'),
                        t('sendingDomainRemoved'),
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
                        <h1 className="cn-page-title">{t('sendingDomains')}</h1>
                        <div className="cn-page-subtitle">{t('sendingDomainsSubtitle')}</div>
                    </div>
                </div>

                <div className="cn-card" style={{padding: '20px 24px', marginBottom: 24}}>
                    <Form stateOwner={this} onSubmitAsync={::this.submitHandler} format="inline">
                        <InputField id="domain" label={t('domain')} placeholder="example.com"/>
                        <ButtonRow>
                            <Button type="submit" className="btn-primary" icon="plus" label={t('addDomain')}/>
                        </ButtonRow>
                    </Form>
                </div>

                {lastCreatedDomain &&
                    <div className="cn-card" style={{padding: '20px 24px', marginBottom: 24, borderColor: 'var(--cn-accent, #3d63d9)'}}>
                        <div style={{fontWeight: 700, marginBottom: 8}}>{t('addThisDnsTxtRecordToVerify', {domain: lastCreatedDomain.domain})}</div>
                        <div style={{fontSize: 13, color: '#888', marginBottom: 4}}>{t('recordName')}</div>
                        <code style={{display: 'block', marginBottom: 12, wordBreak: 'break-all'}}>{lastCreatedDomain.dns_record_name}</code>
                        <div style={{fontSize: 13, color: '#888', marginBottom: 4}}>{t('recordValue')}</div>
                        <code style={{display: 'block', wordBreak: 'break-all'}}>{lastCreatedDomain.dns_record_value}</code>
                    </div>
                }

                <Table ref={node => this.table = node} withHeader dataUrl="rest/sending-domains-table" columns={columns}/>
            </div>
        );
    }
}
