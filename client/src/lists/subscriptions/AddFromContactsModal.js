'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../../lib/i18n';
import {ModalDialog} from '../../lib/bootstrap-components';
import {requiresAuthenticatedUser, withPageHelpers} from '../../lib/page';
import {Form, TableSelect, TableSelectMode, withForm} from '../../lib/form';
import {withAsyncErrorHandler, withErrorHandling} from '../../lib/error-handling';
import {withComponentMixins} from '../../lib/decorator-helpers';
import axios from '../../lib/axios';
import {getUrl} from '../../lib/urls';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class AddFromContactsModal extends Component {
    constructor(props) {
        super(props);

        this.initForm({
            leaveConfirmation: false
        });
    }

    static propTypes = {
        listId: PropTypes.number.isRequired,
        onClose: PropTypes.func.isRequired,
        onDone: PropTypes.func.isRequired
    }

    componentDidMount() {
        this.populateFormValues({
            contacts: []
        });
    }

    async hideModal() {
        this.props.onClose();
    }

    @withAsyncErrorHandler
    async submit() {
        const t = this.props.t;
        const contactIds = this.getFormValue('contacts') || [];

        if (contactIds.length === 0) {
            this.setFormStatusMessage('warning', t('selectAtLeastOneContact'));
            return;
        }

        this.disableForm();
        this.setFormStatusMessage('info', t('saving'));

        const resp = await axios.post(getUrl(`rest/contacts-add-to-list/${this.props.listId}`), {contactIds});

        this.props.onDone(resp.data);
    }

    render() {
        const t = this.props.t;

        const contactsColumns = [
            {data: 1, title: t('email')},
            {data: 2, title: t('name')},
            {data: 6, title: t('company')}
        ];

        return (
            <ModalDialog hidden={false} title={t('addSubscriber')} onCloseAsync={() => this.hideModal()} buttons={[
                {label: t('addSubscriber'), className: 'btn-primary', onClickAsync: ::this.submit},
                {label: t('close'), className: 'btn-danger', onClickAsync: ::this.hideModal}
            ]}>
                <Form stateOwner={this} format="wide">
                    <p>{t('selectContactsToSubscribeToThisList')}</p>
                    <TableSelect id="contacts" format="wide" label={t('contacts')} selectionAsArray withHeader dropdown selectMode={TableSelectMode.MULTI} dataUrl={`rest/contacts-table?excludeListId=${this.props.listId}`} columns={contactsColumns} selectionLabelIndex={1} help={t('contactsAlreadyInThisListAreNotShown')}/>
                </Form>
            </ModalDialog>
        );
    }
}
