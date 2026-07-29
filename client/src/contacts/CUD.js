'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {LinkButton, requiresAuthenticatedUser, Title, withPageHelpers} from '../lib/page';
import {
    Button,
    ButtonRow,
    filterData,
    Form,
    FormSendMethod,
    InputField,
    TableSelect,
    withForm,
    withFormErrorHandlers
} from '../lib/form';
import {withErrorHandling, withAsyncErrorHandler} from '../lib/error-handling';
import {getDefaultNamespace, NamespaceSelect, validateNamespace} from '../lib/namespace';
import {DeleteModalDialog} from '../lib/modals';
import {withComponentMixins} from '../lib/decorator-helpers';
import axios from '../lib/axios';
import {getUrl} from '../lib/urls';

function fieldFormId(field) {
    return 'cf_' + field.key;
}

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class CUD extends Component {
    constructor(props) {
        super(props);

        this.state = {
            fields: []
        };
        this.initForm();
    }

    static propTypes = {
        action: PropTypes.string.isRequired,
        entity: PropTypes.object,
        permissions: PropTypes.object
    }

    submitFormValuesMutator(data) {
        const result = filterData(data, ['first_name', 'last_name', 'email', 'company_id', 'namespace']);

        const customFields = {};
        for (const field of this.state.fields) {
            const value = data[fieldFormId(field)];
            if (value) {
                customFields[field.key] = value;
            }
        }
        result.custom_fields = customFields;

        return result;
    }

    componentDidMount() {
        this._isMounted = true;

        // Populated synchronously (before the fields fetch below resolves) so InputField
        // never renders uncontrolled-then-controlled for first_name/last_name/email/company_id.
        if (this.props.entity) {
            this.getFormValuesFromEntity(this.props.entity);
        } else {
            this.populateFormValues({
                first_name: '',
                last_name: '',
                email: '',
                company_id: null,
                namespace: getDefaultNamespace(this.props.permissions)
            });
        }

        // Custom-field InputFields only enter the DOM once this.state.fields is
        // populated, so there's no equivalent uncontrolled-input risk for them —
        // safe to populate their values together with the field list itself, async.
        this.fetchFields();
    }

    @withAsyncErrorHandler
    async fetchFields() {
        const fieldsResp = await axios.get(getUrl('rest/contact-fields'));
        if (!this._isMounted) {
            return;
        }

        const fields = fieldsResp.data;

        const fieldValues = {};
        for (const field of fields) {
            fieldValues[fieldFormId(field)] = (this.props.entity && this.props.entity.custom_fields && this.props.entity.custom_fields[field.key]) || '';
        }

        this.setState({fields});
        this.populateFormValues(fieldValues);
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    localValidateFormValues(state) {
        const t = this.props.t;

        if (!state.getIn(['email', 'value'])) {
            state.setIn(['email', 'error'], t('emailMustNotBeEmpty'));
        } else {
            state.setIn(['email', 'error'], null);
        }

        validateNamespace(t, state);
    }

    @withFormErrorHandlers
    async submitHandler(submitAndLeave) {
        const t = this.props.t;

        let sendMethod, url;
        if (this.props.entity) {
            sendMethod = FormSendMethod.PUT;
            url = `rest/contacts/${this.props.entity.id}`;
        } else {
            sendMethod = FormSendMethod.POST;
            url = 'rest/contacts';
        }

        this.disableForm();
        this.setFormStatusMessage('info', t('saving'));

        const submitResult = await this.validateAndSendFormValuesToURL(sendMethod, url);

        if (submitResult) {
            if (this.props.entity) {
                if (submitAndLeave) {
                    this.navigateToWithFlashMessage('/contacts', 'success', t('contactUpdated'));
                } else {
                    await this.getFormValuesFromURL(`rest/contacts/${this.props.entity.id}`);
                    this.enableForm();
                    this.setFormStatusMessage('success', t('contactUpdated'));
                }
            } else {
                if (submitAndLeave) {
                    this.navigateToWithFlashMessage('/contacts', 'success', t('contactCreated'));
                } else {
                    this.navigateToWithFlashMessage(`/contacts/${submitResult}/edit`, 'success', t('contactCreated'));
                }
            }
        } else {
            this.enableForm();
            this.setFormStatusMessage('warning', t('thereAreErrorsInTheFormPleaseFixThemAnd'));
        }
    }

    render() {
        const t = this.props.t;
        const isEdit = !!this.props.entity;
        const canDelete = isEdit && this.props.entity.permissions.includes('delete');

        const companiesColumns = [
            {data: 1, title: t('name')},
            {data: 2, title: t('domain')}
        ];

        return (
            <div>
                {canDelete &&
                    <DeleteModalDialog
                        stateOwner={this}
                        visible={this.props.action === 'delete'}
                        deleteUrl={`rest/contacts/${this.props.entity.id}`}
                        backUrl={`/contacts/${this.props.entity.id}/edit`}
                        successUrl="/contacts"
                        deletingMsg={t('deletingContact')}
                        deletedMsg={t('contactDeleted')}/>
                }

                <Title>{isEdit ? t('editContact') : t('createContact')}</Title>

                <Form stateOwner={this} onSubmitAsync={::this.submitHandler}>
                    <InputField id="first_name" label={t('firstName')}/>
                    <InputField id="last_name" label={t('lastName')}/>
                    <InputField id="email" label={t('email')}/>
                    <TableSelect id="company_id" label={t('company')} withHeader withClear dropdown dataUrl="rest/companies-table" columns={companiesColumns} selectionLabelIndex={1}/>

                    {this.state.fields.map(field => (
                        <InputField key={field.key} id={fieldFormId(field)} label={field.name}/>
                    ))}

                    <NamespaceSelect/>

                    <ButtonRow>
                        <Button type="submit" className="btn-primary" icon="check" label={t('save')}/>
                        <Button type="submit" className="btn-primary" icon="check" label={t('saveAndLeave')} onClickAsync={async () => await this.submitHandler(true)}/>
                        {canDelete && <LinkButton className="btn-danger" icon="trash-alt" label={t('delete')} to={`/contacts/${this.props.entity.id}/delete`}/>}
                    </ButtonRow>
                </Form>
            </div>
        );
    }
}
