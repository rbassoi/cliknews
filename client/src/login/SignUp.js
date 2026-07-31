'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../lib/i18n';
import {Link} from 'react-router-dom';
import {
    Button,
    ButtonRow,
    Form,
    FormSendMethod,
    InputField,
    withForm,
    withFormErrorHandlers
} from '../lib/form';
import {withErrorHandling} from '../lib/error-handling';
import {withPageHelpers} from '../lib/page';
import passwordValidator from '../../../shared/password-validator';
import interoperableErrors from '../../../shared/interoperable-errors';
import {withComponentMixins} from '../lib/decorator-helpers';
import AuthLayout from './AuthLayout';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers
])
export default class SignUp extends Component {
    constructor(props) {
        super(props);

        this.passwordValidator = passwordValidator(props.t);

        this.state = {submitted: false};

        this.initForm({
            leaveConfirmation: false
        });
    }

    componentDidMount() {
        this.populateFormValues({
            name: '',
            companyName: '',
            email: '',
            password: '',
            password2: ''
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
        const password2 = state.getIn(['password2', 'value']) || '';

        let passwordMsgs = [];
        if (password) {
            const passwordResults = this.passwordValidator.test(password);
            passwordMsgs.push(...passwordResults.errors);
        }
        if (passwordMsgs.length > 1) {
            passwordMsgs = passwordMsgs.map((msg, idx) => <div key={idx}>{msg}</div>);
        }
        state.setIn(['password', 'error'], passwordMsgs.length > 0 ? passwordMsgs : null);
        state.setIn(['password2', 'error'], password !== password2 ? t('passwordsMustMatch') : null);
    }

    @withFormErrorHandlers
    async submitHandler() {
        const t = this.props.t;

        try {
            this.disableForm();
            this.setFormStatusMessage('info', t('creatingYourAccount'));

            const submitSuccessful = await this.validateAndSendFormValuesToURL(FormSendMethod.POST, 'rest/signup');

            if (submitSuccessful) {
                this.clearFormStatusMessage();
                this.setState({submitted: true});
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

            throw error;
        }
    }

    render() {
        const t = this.props.t;

        if (this.state.submitted) {
            return (
                <AuthLayout eyebrow={t('startForFree')} title={t('yourAccountAwaitingApprovalTitle')}>
                    <p>{t('yourAccountAwaitingApprovalText')}</p>
                    <p className="cn-auth-hint" style={{marginTop: 24, marginBottom: 0}}>
                        <Link to="/login">{t('signIn')}</Link>
                    </p>
                </AuthLayout>
            );
        }

        return (
            <AuthLayout eyebrow={t('startForFree')} title={t('createYourAccount')} subtitle={t('noCreditCardRequired')}>
                <Form stateOwner={this} onSubmitAsync={::this.submitHandler}>
                    <InputField id="name" label={t('yourName')}/>
                    <InputField id="companyName" label={t('companyNameField')}/>
                    <InputField id="email" label={t('email')}/>
                    <InputField id="password" label={t('password')} type="password"/>
                    <InputField id="password2" label={t('confirmPassword')} type="password"/>

                    <ButtonRow>
                        <Button type="submit" className="btn-primary cn-auth-submit" icon="check" label={t('signUp')}/>
                    </ButtonRow>
                </Form>

                <p className="cn-auth-hint" style={{marginTop: 24, marginBottom: 0}}>
                    {t('alreadyHaveAnAccount')} <Link to="/login">{t('signIn')}</Link>
                </p>
            </AuthLayout>
        );
    }
}
