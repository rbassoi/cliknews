'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../../lib/i18n';
import {LinkButton, requiresAuthenticatedUser, Title, withPageHelpers} from '../../lib/page';
import {
    Button,
    ButtonRow,
    filterData,
    Form,
    FormSendMethod,
    InputField,
    StaticField,
    withForm,
    withFormErrorHandlers
} from '../../lib/form';
import {withErrorHandling} from '../../lib/error-handling';
import {DeleteModalDialog} from '../../lib/modals';
import {withComponentMixins} from '../../lib/decorator-helpers';

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

        this.state = {};
        this.initForm();
    }

    static propTypes = {
        action: PropTypes.string.isRequired,
        entity: PropTypes.object
    }

    submitFormValuesMutator(data) {
        return filterData(data, ['name']);
    }

    componentDidMount() {
        if (this.props.entity) {
            this.getFormValuesFromEntity(this.props.entity);
        } else {
            this.populateFormValues({
                name: ''
            });
        }
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
    async submitHandler(submitAndLeave) {
        const t = this.props.t;

        let sendMethod, url;
        if (this.props.entity) {
            sendMethod = FormSendMethod.PUT;
            url = `rest/contact-fields/${this.props.entity.id}`;
        } else {
            sendMethod = FormSendMethod.POST;
            url = 'rest/contact-fields';
        }

        this.disableForm();
        this.setFormStatusMessage('info', t('saving'));

        const submitResult = await this.validateAndSendFormValuesToURL(sendMethod, url);

        if (submitResult) {
            this.navigateToWithFlashMessage('/contacts/fields', 'success', this.props.entity ? t('fieldUpdated') : t('fieldCreated'));
        } else {
            this.enableForm();
            this.setFormStatusMessage('warning', t('thereAreErrorsInTheFormPleaseFixThemAnd'));
        }
    }

    render() {
        const t = this.props.t;
        const isEdit = !!this.props.entity;

        return (
            <div>
                {isEdit &&
                    <DeleteModalDialog
                        stateOwner={this}
                        visible={this.props.action === 'delete'}
                        deleteUrl={`rest/contact-fields/${this.props.entity.id}`}
                        backUrl={`/contacts/fields/${this.props.entity.id}/edit`}
                        successUrl="/contacts/fields"
                        deletingMsg={t('deletingField')}
                        deletedMsg={t('fieldDeleted')}/>
                }

                <Title>{isEdit ? t('editField') : t('createField')}</Title>

                <Form stateOwner={this} onSubmitAsync={::this.submitHandler}>
                    <InputField id="name" label={t('name')}/>
                    {isEdit && <StaticField id="key" className="form-group" label={t('mergeTag')} help={t('usedInternallyToIdentifyThisFieldCannotBe')}>{this.props.entity.key}</StaticField>}

                    <ButtonRow>
                        <Button type="submit" className="btn-primary" icon="check" label={t('save')}/>
                        {isEdit && <LinkButton className="btn-danger" icon="trash-alt" label={t('delete')} to={`/contacts/fields/${this.props.entity.id}/delete`}/>}
                    </ButtonRow>
                </Form>
            </div>
        );
    }
}
