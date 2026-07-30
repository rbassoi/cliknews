'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {requiresAuthenticatedUser, withPageHelpers} from '../lib/page';
import {Form, TableSelect, withForm} from '../lib/form';
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import {Button, ModalDialog} from '../lib/bootstrap-components';
import {withComponentMixins} from '../lib/decorator-helpers';
import {buildCampaignPreviewUrl, fetchDefaultPreviewContact} from './helpers';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export class PreviewModalDialog extends Component {
    constructor(props) {
        super(props);

        this.state = {
            previewUrl: null,
            device: 'desktop'
        };

        this.fetchPreviewUrlId = null;

        this.initForm({
            leaveConfirmation: false,
            onChangeBeforeValidation: {
                testUser: ::this.onTestUserChanged
            }
        });
    }

    static propTypes = {
        visible: PropTypes.bool.isRequired,
        onHide: PropTypes.func.isRequired,
        entity: PropTypes.object.isRequired
    };

    componentDidMount() {
        this.populateFormValues({
            testUser: null
        });
    }

    componentDidUpdate(prevProps) {
        if (this.props.visible && !prevProps.visible) {
            // noinspection JSIgnoredPromiseFromCall
            this.autoSelectDefaultTestUser();
        }
    }

    onTestUserChanged(mutStateData, key, oldValue, testUserValue) {
        // noinspection JSIgnoredPromiseFromCall
        this.fetchPreviewUrl(testUserValue);
    }

    @withAsyncErrorHandler
    async autoSelectDefaultTestUser() {
        if (this.getFormValue('testUser')) {
            return;
        }

        const defaultContact = await fetchDefaultPreviewContact(this.props.entity.id);
        if (defaultContact) {
            const value = `${defaultContact.listCid}:${defaultContact.subscriptionCid}`;
            this.populateFormValues({testUser: value});
            // noinspection JSIgnoredPromiseFromCall
            this.fetchPreviewUrl(value);
        }
    }

    @withAsyncErrorHandler
    async fetchPreviewUrl(testUserValue) {
        this.fetchPreviewUrlId = testUserValue;

        if (!testUserValue) {
            this.setState({previewUrl: null});
            return;
        }

        const [listCid, subscriptionCid] = testUserValue.split(':');
        const url = await buildCampaignPreviewUrl(this.props.entity, listCid, subscriptionCid);

        if (this.fetchPreviewUrlId === testUserValue) {
            this.setState({previewUrl: url});
        }
    }

    async hideModal() {
        this.props.onHide();
    }

    render() {
        const t = this.props.t;

        const subscribersColumns = [
            {data: 1, title: t('email')},
            {data: 4, title: t('list')}
        ];

        const frameClass = 'cn-editor-preview-frame' + (this.state.device === 'mobile' ? ' cn-editor-preview-frame--mobile' : '');

        return (
            <ModalDialog className="cn-preview-modal" hidden={!this.props.visible} title={t('previewAndTest')} onCloseAsync={() => this.hideModal()} buttons={[
                {label: t('close'), className: 'btn-danger', onClickAsync: ::this.hideModal}
            ]}>
                <div className="cn-preview-modal-body">
                    <div className="cn-preview-modal-frame-col">
                        <div className="cn-preview-modal-toggle">
                            <Button className={this.state.device === 'desktop' ? 'btn-primary' : 'btn-secondary'} icon="tv" label={t('desktop')} onClickAsync={async () => this.setState({device: 'desktop'})}/>
                            <Button className={this.state.device === 'mobile' ? 'btn-primary' : 'btn-secondary'} icon="mobile" label={t('mobile')} onClickAsync={async () => this.setState({device: 'mobile'})}/>
                        </div>
                        {this.state.previewUrl ?
                            <iframe src={this.state.previewUrl} className={frameClass} title={t('preview')}/>
                            :
                            <div className="cn-editor-preview-empty">{t('noSubscribersAvailableToPreview')}</div>
                        }
                    </div>
                    <div className="cn-preview-modal-picker-col">
                        <Form stateOwner={this}>
                            <TableSelect id="testUser" label={t('previewAs')} withHeader dropdown dataUrl={`rest/campaigns-subscribers-table/${this.props.entity.id}`} columns={subscribersColumns} selectionLabelIndex={1}/>
                        </Form>
                    </div>
                </div>
            </ModalDialog>
        );
    }
}
