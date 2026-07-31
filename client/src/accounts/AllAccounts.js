'use strict';

import React, {Component} from "react";
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {requiresAuthenticatedUser, withPageHelpers} from "../lib/page";
import {withAsyncErrorHandler, withErrorHandling} from "../lib/error-handling";
import {tableAddRestActionButton, tableRestActionDialogInit, tableRestActionDialogRender} from "../lib/modals";
import {Table} from "../lib/table";
import {Button, ModalDialog, Pill} from "../lib/bootstrap-components";
import {Dropdown, Form, FormSendMethod, InputField, withForm, withFormErrorHandlers} from "../lib/form";
import {HTTPMethod} from "../lib/axios";
import axios from "../lib/axios";
import {getUrl} from "../lib/urls";
import {withComponentMixins} from "../lib/decorator-helpers";
import interoperableErrors from "../../../shared/interoperable-errors";
import passwordValidatorFactory from "../../../shared/password-validator";
import moment from 'moment';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
class CreateAccountModalDialog extends Component {
    constructor(props) {
        super(props);

        this.passwordValidator = passwordValidatorFactory(props.t);

        this.initForm({
            leaveConfirmation: false
        });
    }

    static propTypes = {
        visible: PropTypes.bool.isRequired,
        onHide: PropTypes.func.isRequired,
        onCreated: PropTypes.func.isRequired,
        plans: PropTypes.array.isRequired
    }

    componentDidMount() {
        this.populateFormValues({
            name: '',
            companyName: '',
            email: '',
            password: '',
            planId: this.props.plans.length > 0 ? this.props.plans[0].id : null
        });
    }

    localValidateFormValues(state) {
        const t = this.props.t;

        if (!state.getIn(['name', 'value'])) {
            state.setIn(['name', 'error'], t('nameMustNotBeEmpty'));
        } else {
            state.setIn(['name', 'error'], null);
        }

        if (!state.getIn(['email', 'value'])) {
            state.setIn(['email', 'error'], t('emailMustNotBeEmpty'));
        } else {
            state.setIn(['email', 'error'], null);
        }

        const password = state.getIn(['password', 'value']) || '';
        const passwordResults = this.passwordValidator.test(password);
        state.setIn(['password', 'error'], passwordResults.errors.length > 0 ? passwordResults.errors.join(' ') : null);

        if (!state.getIn(['planId', 'value'])) {
            state.setIn(['planId', 'error'], t('planMustBeSelected'));
        } else {
            state.setIn(['planId', 'error'], null);
        }
    }

    @withFormErrorHandlers
    async submitHandler() {
        const t = this.props.t;

        try {
            this.disableForm();
            this.setFormStatusMessage('info', t('creatingAccount'));

            const submitSuccessful = await this.validateAndSendFormValuesToURL(FormSendMethod.POST, 'rest/accounts');

            if (submitSuccessful) {
                this.enableForm();
                this.clearFormStatusMessage();
                this.props.onCreated();
            } else {
                this.enableForm();
                this.setFormStatusMessage('warning', t('thereAreErrorsInTheFormPleaseFixThemAnd'));
            }
        } catch (error) {
            if (error instanceof interoperableErrors.DuplicitEmailError) {
                this.enableForm();
                this.setFormStatusMessage('danger', t('emailAlreadyRegistered'));
                return;
            }

            if (error instanceof interoperableErrors.DuplicitNameError) {
                this.enableForm();
                this.setFormStatusMessage('danger', error.message);
                return;
            }

            throw error;
        }
    }

    async hideModal() {
        this.props.onHide();
    }

    render() {
        const t = this.props.t;

        const planOptions = this.props.plans.map(plan => ({key: plan.id, label: plan.name}));

        return (
            <ModalDialog hidden={!this.props.visible} title={t('createAccount')} onCloseAsync={() => this.hideModal()} buttons={[
                {label: t('create'), className: 'btn-primary', onClickAsync: ::this.submitHandler},
                {label: t('close'), className: 'btn-danger', onClickAsync: ::this.hideModal}
            ]}>
                <Form stateOwner={this}>
                    <InputField id="companyName" label={t('companyNameField')}/>
                    <InputField id="name" label={t('ownerName')}/>
                    <InputField id="email" label={t('email')}/>
                    <InputField id="password" label={t('password')} type="password"/>
                    <Dropdown id="planId" label={t('plan')} options={planOptions}/>
                </Form>
            </ModalDialog>
        );
    }
}

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class AllAccounts extends Component {
    constructor(props) {
        super(props);

        this.state = {
            plans: [],
            createVisible: false
        };
        tableRestActionDialogInit(this);
    }

    @withAsyncErrorHandler
    async fetchPlans() {
        const resp = await axios.get(getUrl('rest/plans'));
        this.setState({plans: resp.data});
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.fetchPlans();
    }

    onAccountCreated() {
        this.setState({createVisible: false});
        this.table.refresh();
    }

    render() {
        const t = this.props.t;

        const columns = [
            {data: 1, title: t('companyName')},
            {
                data: 2,
                title: t('status'),
                render: status => {
                    if (status === 'active') return <Pill color="green">{t('active')}</Pill>;
                    if (status === 'suspended') return <Pill color="gray">{t('suspended')}</Pill>;
                    if (status === 'pending') return <Pill color="amber">{t('pending')}</Pill>;
                    return <Pill color="blue">{status}</Pill>;
                }
            },
            {data: 3, title: t('plan')},
            {data: 4, title: t('users'), searchable: false, orderable: false},
            {data: 5, title: t('signedUp'), render: data => moment(data).fromNow()},
            {
                actions: data => {
                    const id = data[0];
                    const status = data[2];
                    const actions = [];

                    if (status === 'suspended') {
                        tableAddRestActionButton(
                            actions, this,
                            {method: HTTPMethod.POST, url: `rest/accounts/${id}/unban`},
                            {icon: 'check', label: t('unban')},
                            t('confirmUnbanAccount'),
                            t('doYouWantToUnbanThisAccount?'),
                            t('unbanningAccount'),
                            t('accountUnbanned'),
                            null
                        );
                    } else {
                        tableAddRestActionButton(
                            actions, this,
                            {method: HTTPMethod.POST, url: `rest/accounts/${id}/ban`},
                            {icon: 'ban', label: t('ban')},
                            t('confirmBanAccount'),
                            t('doYouWantToBanThisAccount?'),
                            t('banningAccount'),
                            t('accountBanned'),
                            null
                        );
                    }

                    return actions;
                }
            }
        ];

        return (
            <div>
                {tableRestActionDialogRender(this)}

                <CreateAccountModalDialog
                    visible={this.state.createVisible}
                    onHide={() => this.setState({createVisible: false})}
                    onCreated={::this.onAccountCreated}
                    plans={this.state.plans}
                />

                <div className="cn-page-header">
                    <div>
                        <h1 className="cn-page-title">{t('accounts')}</h1>
                    </div>
                    <Button className="btn-primary" icon="plus" label={t('createAccount')} onClickAsync={async () => this.setState({createVisible: true})}/>
                </div>

                <Table ref={node => this.table = node} withHeader dataUrl="rest/accounts-table" columns={columns}/>
            </div>
        );
    }
}
