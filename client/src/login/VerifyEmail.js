'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../lib/i18n';
import {withPageHelpers} from '../lib/page'
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import {withComponentMixins} from "../lib/decorator-helpers";
import axios from '../lib/axios';
import {getUrl} from "../lib/urls";
import AuthLayout from './AuthLayout';

const VerifyEmailState = {
    PENDING: 0,
    VALID: 1,
    INVALID: 2
};

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers
])
export default class VerifyEmail extends Component {
    constructor(props) {
        super(props);

        this.state = {
            verifyState: VerifyEmailState.PENDING
        };
    }

    @withAsyncErrorHandler
    async verifyEmail() {
        const params = this.props.match.params;

        try {
            await axios.post(getUrl('rest/verify-email'), {
                token: params.verifyToken
            });

            this.setState({verifyState: VerifyEmailState.VALID});
        } catch (error) {
            this.setState({verifyState: VerifyEmailState.INVALID});
        }
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.verifyEmail();
    }

    render() {
        const t = this.props.t;

        if (this.state.verifyState === VerifyEmailState.PENDING) {
            return (
                <AuthLayout title={t('verifyingYourEmail')}>
                    <p className="cn-auth-hint">{t('verifyingYourEmail')}</p>
                </AuthLayout>
            );

        } else if (this.state.verifyState === VerifyEmailState.INVALID) {
            return (
                <AuthLayout title={t('theEmailVerificationLinkIsInvalidTitle')}>
                    <p className="cn-auth-hint">{t('theEmailVerificationLinkIsInvalidText')}</p>
                </AuthLayout>
            );

        } else {
            return (
                <AuthLayout title={t('yourEmailHasBeenConfirmedTitle')}>
                    <p>{t('yourEmailHasBeenConfirmedText')}</p>
                </AuthLayout>
            );
        }
    }
}
