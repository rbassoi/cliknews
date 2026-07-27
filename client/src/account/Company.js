'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../lib/i18n';
import {requiresAuthenticatedUser, withPageHelpers} from '../lib/page'
import {
    Button,
    ButtonRow,
    Fieldset,
    filterData,
    Form,
    FormSendMethod,
    InputField,
    withForm,
    withFormErrorHandlers
} from '../lib/form';
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import clikerConfig from 'clikerConfig';
import {withComponentMixins} from "../lib/decorator-helpers";

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class Company extends Component {
    constructor(props) {
        super(props);

        this.state = {};

        this.initForm();
    }

    submitFormValuesMutator(data) {
        return filterData(data, ['name', 'website', 'address', 'city', 'zip_code', 'country', 'phone']);
    }

    @withAsyncErrorHandler
    async loadFormValues() {
        await this.getFormValuesFromURL('rest/account-company');
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.loadFormValues();
    }

    localValidateFormValues(state) {
        const t = this.props.t;

        if (!state.getIn(['name', 'value'])) {
            state.setIn(['name', 'error'], t('nameMustNotBeEmpty'));
        } else {
            state.setIn(['name', 'error'], null);
        }
    }

    @withFormErrorHandlers
    async submitHandler() {
        const t = this.props.t;

        try {
            this.disableForm();
            this.setFormStatusMessage('info', t('updatingCompanyInformation'));

            const submitSuccessful = await this.validateAndSendFormValuesToURL(FormSendMethod.POST, 'rest/account-company');

            if (submitSuccessful) {
                this.setFlashMessage('success', t('companyInformationUpdated'));
                this.hideFormValidation();
                this.clearFormStatusMessage();
                this.enableForm();

            } else {
                this.enableForm();
                this.setFormStatusMessage('warning', t('thereAreErrorsInTheFormPleaseFixThemAnd'));
            }
        } catch (error) {
            throw error;
        }
    }

    render() {
        const t = this.props.t;

        if (!clikerConfig.globalPermissions.manageSettings) {
            return null;
        }

        return (
            <Form stateOwner={this} onSubmitAsync={::this.submitHandler}>
                <Fieldset label={t('companyInformation')}>
                    <InputField id="name" label={t('companyName')}/>
                    <InputField id="website" label={t('website')} help={t('egWwwmywebsitecomOrHttpswwwmywebsitecom')}/>
                    <InputField id="address" label={t('address')}/>
                    <InputField id="city" label={t('city')}/>
                    <InputField id="zip_code" label={t('zipCode')}/>
                    <InputField id="country" label={t('country')}/>
                    <InputField id="phone" label={t('phone')}/>
                </Fieldset>

                <ButtonRow>
                    <Button type="submit" className="btn-primary" icon="check" label={t('update')}/>
                </ButtonRow>
            </Form>
        );
    }
}
