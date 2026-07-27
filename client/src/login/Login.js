'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../lib/i18n';
import {withPageHelpers} from '../lib/page'
import {Link} from 'react-router-dom'
import {
    Button,
    ButtonRow,
    CheckBox,
    Form,
    FormSendMethod,
    InputField,
    withForm,
    withFormErrorHandlers
} from '../lib/form';
import {withErrorHandling} from '../lib/error-handling';
import qs from 'querystringify';
import interoperableErrors from '../../../shared/interoperable-errors';
import clikerConfig from 'clikerConfig';
import {getUrl} from "../lib/urls";
import {withComponentMixins} from "../lib/decorator-helpers";
import AuthLayout from './AuthLayout';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers
])
export default class Login extends Component {
    constructor(props) {
        super(props);

        this.state = {};

        this.initForm({
            leaveConfirmation: false
        });
    }

    componentDidMount() {
        this.populateFormValues({
            username: '',
            password: '',
            remember: false
        });
    }

    localValidateFormValues(state) {
        const t = this.props.t;

        const username = state.getIn(['username', 'value']);
        if (!username) {
            state.setIn(['username', 'error'], t('userNameMustNotBeEmpty'));
        } else {
            state.setIn(['username', 'error'], null);
        }

        const password = state.getIn(['password', 'value']);
        if (!username) {
            state.setIn(['password', 'error'], t('passwordMustNotBeEmpty'));
        } else {
            state.setIn(['password', 'error'], null);
        }
    }

    @withFormErrorHandlers
    async submitHandler() {
        const t = this.props.t;

        try {
            this.disableForm();
            this.setFormStatusMessage('info', t('verifyingCredentials'));

            const submitSuccessful = await this.validateAndSendFormValuesToURL(FormSendMethod.POST, 'rest/login');

            if (submitSuccessful) {
                const unsafeUrl = qs.parse(this.props.location.search).next || '';
                const safeUrl = unsafeUrl.replace(/[^a-zA-Z0-9/\-]/g, "");

                const nextUrl = safeUrl || getUrl();

                /* This ensures we get config for the authenticated user */
                window.location = nextUrl;
            } else {
                this.enableForm();

                this.setFormStatusMessage('warning', t('pleaseEnterYourCredentialsAndTryAgain'));
            }
        } catch (error) {
            if (error instanceof interoperableErrors.IncorrectPasswordError) {
                this.enableForm();

                this.setFormStatusMessage('danger',
                    <span>
                        <strong>{t('invalidUsernameOrPassword')}</strong>
                    </span>
                );

                return;
            }

            throw error;
        }
    }

    render() {
        const t = this.props.t;

        let passwordResetLink;
        if (clikerConfig.isAuthMethodLocal) {
            passwordResetLink = <Link to={`/login/forgot/${this.getFormValue('username')}`}>{t('forgotYourPassword?')}</Link>;
        } else if (clikerConfig.externalPasswordResetLink) {
            passwordResetLink = <a href={clikerConfig.externalPasswordResetLink}>{t('forgotYourPassword?')}</a>;
        }
        if (clikerConfig.authMethod != 'cas') {
          return (
            <AuthLayout eyebrow={t('authWelcomeBackEyebrow')} title={t('signIn')} subtitle={t('authSignInSubtitle')}>
                <Form stateOwner={this} onSubmitAsync={::this.submitHandler}>
                    <InputField format="wide" id="username" label={t('username')}/>
                    <InputField format="wide" id="password" label={t('password')} type="password" />
                    <CheckBox format="wide" id="remember" text={t('rememberMe')}/>

                    <ButtonRow>
                        <Button type="submit" className="btn-primary cn-auth-submit" icon="check" label={t('signIn')}/>
                        {passwordResetLink}
                    </ButtonRow>
                </Form>
            </AuthLayout>
          );
        } else {
          return (
            <AuthLayout eyebrow={t('authWelcomeBackEyebrow')} title={`${t('signIn')} CAS`}>
              {<a href="/cas/login" className="btn btn-primary cn-auth-submit">{t('signIn')}</a>}
              {passwordResetLink}
            </AuthLayout>
          );
        }
    }
}
