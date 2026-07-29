'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {ModalDialog} from '../lib/bootstrap-components';
import {requiresAuthenticatedUser, withPageHelpers} from '../lib/page';
import {filterData, Form, FormSendMethod, InputField, withForm, withFormErrorHandlers} from '../lib/form';
import {getDefaultNamespace, NamespaceSelect, validateNamespace} from '../lib/namespace';
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import {withComponentMixins} from '../lib/decorator-helpers';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class CreateCompanyModal extends Component {
    constructor(props) {
        super(props);

        this.initForm({
            leaveConfirmation: false
        });
    }

    static propTypes = {
        permissions: PropTypes.object.isRequired,
        onClose: PropTypes.func.isRequired,
        onDone: PropTypes.func.isRequired
    }

    submitFormValuesMutator(data) {
        return filterData(data, ['name', 'domain', 'phone', 'namespace']);
    }

    componentDidMount() {
        this.populateFormValues({
            name: '',
            domain: '',
            phone: '',
            namespace: getDefaultNamespace(this.props.permissions)
        });
    }

    localValidateFormValues(state) {
        const t = this.props.t;

        if (!state.getIn(['name', 'value'])) {
            state.setIn(['name', 'error'], t('nameMustNotBeEmpty'));
        } else {
            state.setIn(['name', 'error'], null);
        }

        validateNamespace(t, state);
    }

    async hideModal() {
        this.props.onClose();
    }

    @withFormErrorHandlers
    async submit() {
        const t = this.props.t;

        this.disableForm();
        this.setFormStatusMessage('info', t('saving'));

        const submitResult = await this.validateAndSendFormValuesToURL(FormSendMethod.POST, 'rest/companies');

        if (submitResult) {
            this.props.onDone({id: submitResult, name: this.getFormValue('name')});
        } else {
            this.enableForm();
            this.setFormStatusMessage('warning', t('thereAreErrorsInTheFormPleaseFixThemAnd'));
        }
    }

    render() {
        const t = this.props.t;

        return (
            <ModalDialog hidden={false} title={t('createCompany')} onCloseAsync={() => this.hideModal()} buttons={[
                {label: t('save'), className: 'btn-primary', onClickAsync: ::this.submit},
                {label: t('close'), className: 'btn-danger', onClickAsync: ::this.hideModal}
            ]}>
                <Form stateOwner={this} format="wide">
                    <InputField id="name" label={t('name')}/>
                    <InputField id="domain" label={t('domain')} help={t('domainUsedToMatchThisCompanyToContacts')}/>
                    <InputField id="phone" label={t('phone')}/>
                    <NamespaceSelect/>
                </Form>
            </ModalDialog>
        );
    }
}
