'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../lib/i18n';
import {withPageHelpers} from '../lib/page'
import {Button, ButtonRow, Form, FormSendMethod, InputField, withForm, withFormErrorHandlers} from '../lib/form';
import {withErrorHandling} from '../lib/error-handling';
import {withComponentMixins} from "../lib/decorator-helpers";
import AuthLayout from './AuthLayout';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers
])
export default class Forget extends Component {
    constructor(props) {
        super(props);

        this.state = {};

        this.initForm({
            leaveConfirmation: false
        });
    }

    componentDidMount() {
        this.populateFormValues({
            usernameOrEmail: this.props.match.params.username || ''
        });
    }

    localValidateFormValues(state) {
        const t = this.props.t;

        const username = state.getIn(['usernameOrEmail', 'value']);
        if (!username) {
            state.setIn(['usernameOrEmail', 'error'], t('usernameOrEmailMustNotBeEmpty'));
        } else {
            state.setIn(['usernameOrEmail', 'error'], null);
        }
    }

    @withFormErrorHandlers
    async submitHandler() {
        const t = this.props.t;

        this.disableForm();
        this.setFormStatusMessage('info', t('processing-1'));

        const submitSuccessful = await this.validateAndSendFormValuesToURL(FormSendMethod.POST, 'rest/password-reset-send');

        if (submitSuccessful) {
            this.navigateToWithFlashMessage('/login', 'success', t('ifTheUsernameEmailExistsInTheSystem'));
        } else {
            this.enableForm();
            this.setFormStatusMessage('warning', t('pleaseEnterYourUsernameEmailAndTryAgain'));
        }
    }

    render() {
        const t = this.props.t;

        return (
            <AuthLayout title={t('passwordReset')} subtitle={t('weWillSendYouAnEmailThatWillAllowYouTo')}>
                <p className="cn-auth-hint">{t('pleaseProvideTheUsernameOrEmailAddress')}</p>

                <Form stateOwner={this} onSubmitAsync={::this.submitHandler}>
                    <InputField format="wide" id="usernameOrEmail" label={t('usernameOrEmail')}/>

                    <ButtonRow>
                        <Button type="submit" className="btn-primary cn-auth-submit" icon="check" label={t('sendEmail')}/>
                    </ButtonRow>
                </Form>
            </AuthLayout>
        );
    }
}
