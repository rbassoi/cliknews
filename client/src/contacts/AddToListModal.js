'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {ModalDialog} from '../lib/bootstrap-components';
import {requiresAuthenticatedUser, withPageHelpers} from '../lib/page';
import {Form, TableSelect, withForm} from '../lib/form';
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import {withComponentMixins} from '../lib/decorator-helpers';
import axios from '../lib/axios';
import {getUrl} from '../lib/urls';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class AddToListModal extends Component {
    constructor(props) {
        super(props);

        this.initForm({
            leaveConfirmation: false
        });
    }

    static propTypes = {
        contactIds: PropTypes.array.isRequired,
        onClose: PropTypes.func.isRequired,
        onDone: PropTypes.func.isRequired
    }

    componentDidMount() {
        this.populateFormValues({
            list: null
        });
    }

    async hideModal() {
        this.props.onClose();
    }

    @withAsyncErrorHandler
    async submit() {
        const t = this.props.t;
        const listId = this.getFormValue('list');

        if (!listId) {
            this.setFormStatusMessage('warning', t('selectAListToImportInto'));
            return;
        }

        this.disableForm();
        this.setFormStatusMessage('info', t('saving'));

        const resp = await axios.post(getUrl(`rest/contacts-add-to-list/${listId}`), {contactIds: this.props.contactIds});

        this.props.onDone(resp.data);
    }

    render() {
        const t = this.props.t;

        const listsColumns = [
            {data: 1, title: t('name')},
            {data: 2, title: t('id'), render: data => <code>{data}</code>},
            {data: 3, title: t('subscribers')},
            {data: 4, title: t('description')},
            {data: 5, title: t('namespace')}
        ];

        return (
            <ModalDialog hidden={false} title={t('addToList')} onCloseAsync={() => this.hideModal()} buttons={[
                {label: t('addToList'), className: 'btn-primary', onClickAsync: ::this.submit},
                {label: t('close'), className: 'btn-danger', onClickAsync: ::this.hideModal}
            ]}>
                <Form stateOwner={this} format="wide">
                    <p>{t('selectedContactsCount', {count: this.props.contactIds.length})}</p>
                    <TableSelect id="list" format="wide" label={t('list')} withHeader dropdown dataUrl="rest/lists-table" columns={listsColumns} selectionKeyIndex={0} selectionLabelIndex={1}/>
                </Form>
            </ModalDialog>
        );
    }
}
