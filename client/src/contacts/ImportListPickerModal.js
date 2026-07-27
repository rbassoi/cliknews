'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {ModalDialog} from '../lib/bootstrap-components';
import {requiresAuthenticatedUser, withPageHelpers} from '../lib/page';
import {Form, TableSelect, withForm} from '../lib/form';
import {withErrorHandling} from '../lib/error-handling';
import {withComponentMixins} from '../lib/decorator-helpers';

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class ImportListPickerModal extends Component {
    constructor(props) {
        super(props);

        this.initForm({
            leaveConfirmation: false
        });
    }

    static propTypes = {
        onClose: PropTypes.func.isRequired
    }

    componentDidMount() {
        this.populateFormValues({
            list: null
        });
    }

    async hideModal() {
        this.props.onClose();
    }

    async goToImport() {
        const t = this.props.t;
        const listId = this.getFormValue('list');

        if (listId) {
            this.navigateTo(`/lists/${listId}/imports/create`);
        } else {
            this.setFormStatusMessage('warning', t('selectAListToImportInto'));
        }
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
            <ModalDialog hidden={false} title={t('importContacts')} onCloseAsync={() => this.hideModal()} buttons={[
                {label: t('continue'), className: 'btn-primary', onClickAsync: ::this.goToImport},
                {label: t('close'), className: 'btn-danger', onClickAsync: ::this.hideModal}
            ]}>
                <Form stateOwner={this} format="wide">
                    <p>{t('selectAListToImportInto')}</p>
                    <TableSelect id="list" format="wide" label={t('list')} withHeader dropdown dataUrl="rest/lists-table" columns={listsColumns} selectionKeyIndex={0} selectionLabelIndex={1}/>
                </Form>
            </ModalDialog>
        );
    }
}
