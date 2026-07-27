'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../../lib/i18n';
import {LinkButton, requiresAuthenticatedUser, Title, Toolbar, withPageHelpers} from '../../lib/page';
import {withErrorHandling} from '../../lib/error-handling';
import {Table} from '../../lib/table';
import {Icon, Pill} from '../../lib/bootstrap-components';
import {withComponentMixins} from '../../lib/decorator-helpers';
import {getPublicUrl, getUrl} from '../../lib/urls';
import axios from '../../lib/axios';
import PropTypes from 'prop-types';

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class FormsOverview extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    static propTypes = {
        permissions: PropTypes.object
    }

    async editForm(table, listId, defaultFormId) {
        try {
            let formId = defaultFormId;
            if (!formId) {
                const response = await axios.post(getUrl(`rest/lists/${listId}/ensure-form`));
                formId = response.data;
            }
            table.navigateTo(`/forms/custom/${formId}/edit`);
        } catch (error) {
            table.setFlashMessage('danger', this.props.t('creatingFormFailed'));
        }
    }

    copyLink(table, cid) {
        const t = this.props.t;
        const url = getPublicUrl(`subscription/${cid}`, {withLocale: true});

        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(
                () => table.setFlashMessage('success', t('linkCopiedToClipboard')),
                () => table.setFlashMessage('warning', url)
            );
        } else {
            table.setFlashMessage('warning', url);
        }
    }

    render() {
        const t = this.props.t;

        const permissions = this.props.permissions;
        const customFormsPermitted = permissions.createCustomForm || permissions.viewCustomForm;

        const columns = [
            { data: 1, title: t('list') },
            { data: 3, title: t('subscribers') },
            {
                data: 7,
                title: t('formTemplate'),
                render: data => data
                    ? <Pill color="blue">{t('customizedForm')}</Pill>
                    : <Pill color="gray">{t('defaultForm')}</Pill>
            },
            {
                actions: data => {
                    const actions = [];
                    const listId = data[0];
                    const cid = data[2];
                    const defaultFormId = data[7];
                    const perms = data[8];

                    if (perms.includes('edit')) {
                        actions.push({
                            label: <Icon icon="edit" title={t('editForm')}/>,
                            action: table => this.editForm(table, listId, defaultFormId)
                        });
                    }

                    actions.push({
                        label: <Icon icon="link" title={t('copyLink')}/>,
                        action: table => this.copyLink(table, cid)
                    });

                    actions.push({
                        label: <Icon icon="eye" title={t('view')}/>,
                        action: () => window.open(getPublicUrl(`subscription/${cid}`, {withLocale: true}), '_blank')
                    });

                    return actions;
                }
            }
        ];

        return (
            <div>
                {customFormsPermitted &&
                    <Toolbar>
                        <LinkButton to="/forms/custom" className="btn-primary" icon="cog" label={t('manageCustomForms')}/>
                    </Toolbar>
                }

                <Title>{t('forms')}</Title>

                <Table ref={node => this.table = node} withHeader dataUrl="rest/lists-table" columns={columns} />
            </div>
        );
    }
}
