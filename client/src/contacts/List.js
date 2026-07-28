'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {LinkButton, requiresAuthenticatedUser, Toolbar, withPageHelpers} from '../lib/page';
import {withErrorHandling} from '../lib/error-handling';
import {Table} from '../lib/table';
import {Button, Icon, Pill} from '../lib/bootstrap-components';
import {Dropdown, Form, withForm} from '../lib/form';
import {tableAddDeleteButton, tableRestActionDialogInit, tableRestActionDialogRender} from '../lib/modals';
import {SubscriptionStatus} from '../../../shared/lists';
import {getSubscriptionStatusLabels} from '../lists/subscriptions/helpers';
import {getUrl} from '../lib/urls';
import moment from 'moment';
import {withComponentMixins} from "../lib/decorator-helpers";
import ImportListPickerModal from './ImportListPickerModal';

const statusPillColors = {
    [SubscriptionStatus.SUBSCRIBED]: 'green',
    [SubscriptionStatus.UNSUBSCRIBED]: 'gray',
    [SubscriptionStatus.BOUNCED]: 'amber',
    [SubscriptionStatus.COMPLAINED]: 'amber'
};

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class List extends Component {
    constructor(props) {
        super(props);

        const t = props.t;
        this.state = {
            isImportModalOpen: false
        };
        this.statusLabels = getSubscriptionStatusLabels(t);
        tableRestActionDialogInit(this);

        this.initForm({
            leaveConfirmation: false,
            onChange: {
                status: (newState, key, oldValue, value) => {
                    this.navigateTo('/contacts' + (value ? '?status=' + value : ''));
                }
            }
        });
    }

    static propTypes = {
        status: PropTypes.string,
        permissions: PropTypes.object
    }

    componentDidMount() {
        this.populateFormValues({
            status: this.props.status || ''
        });
    }

    componentDidUpdate() {
        const status = this.props.status || '';
        if (this.getFormValue('status') !== status) {
            this.populateFormValues({ status });
        }
    }

    render() {
        const t = this.props.t;
        const createPermitted = this.props.permissions.createContact;

        const columns = [
            {
                data: 1,
                title: t('email'),
                render: data => <span style={{fontWeight: 600}}>{data}</span>
            },
            { data: 2, title: t('name') },
            {
                data: 4,
                title: t('lists'),
                sortable: false,
                searchable: false,
                render: data => (
                    <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                        {(data ? data.split(';') : []).map(name => <Pill key={name} color="blue">{name}</Pill>)}
                    </div>
                )
            },
            {
                data: 5,
                title: t('status'),
                // Aggregate alias (min(u.status) from the lists-union subquery), same as
                // "lists"/"company" below — dt-helpers' generic search/sort is WHERE-based
                // and MySQL can't reference a SELECT alias there.
                sortable: false,
                searchable: false,
                render: data => data !== null ? <Pill color={statusPillColors[data] || 'gray'}>{this.statusLabels[data]}</Pill> : ''
            },
            {
                data: 3,
                title: t('added'),
                render: data => data ? moment(data).fromNow() : ''
            },
            {
                data: 6,
                title: t('company'),
                sortable: false,
                searchable: false,
                render: data => data || ''
            },
            {
                actions: data => {
                    const actions = [];
                    const perms = data[7];

                    if (perms.includes('view') || perms.includes('edit')) {
                        actions.push({
                            label: <Icon icon="edit" title={t('edit')}/>,
                            link: `/contacts/${data[0]}/edit`
                        });
                    }

                    if (perms.includes('share')) {
                        actions.push({
                            label: <Icon icon="share" title={t('share')}/>,
                            link: `/contacts/${data[0]}/share`
                        });
                    }

                    tableAddDeleteButton(actions, this, perms, `rest/contacts/${data[0]}`, data[1], t('deletingContact'), t('contactDeleted'));

                    return actions;
                }
            }
        ];

        const statusOptions = [
            {key: '', label: t('allStatuses')},
            {key: SubscriptionStatus.SUBSCRIBED.toString(), label: t('subscribed')},
            {key: SubscriptionStatus.UNSUBSCRIBED.toString(), label: t('unubscribed')},
            {key: SubscriptionStatus.BOUNCED.toString(), label: t('bounced')},
            {key: SubscriptionStatus.COMPLAINED.toString(), label: t('complained')}
        ];

        let dataUrl = 'rest/contacts-table';
        if (this.props.status) {
            dataUrl += `?status=${this.props.status}`;
        }

        return (
            <div>
                {tableRestActionDialogRender(this)}

                <div className="cn-page-header">
                    <div>
                        <h1 className="cn-page-title">{t('contacts')}</h1>
                    </div>
                    <Toolbar>
                        <a href={getUrl('contacts-export' + (this.props.status ? '?status=' + this.props.status : ''))}>
                            <Button label={t('exportAsCsv')} className="cn-btn cn-btn-secondary"/>
                        </a>
                        <Button
                            label={t('importContacts')}
                            className="cn-btn cn-btn-secondary"
                            onClickAsync={() => this.setState({isImportModalOpen: true})}
                        />
                        <LinkButton to="/contacts/fields" className="cn-btn cn-btn-secondary" icon="cog" label={t('manageFields')}/>
                        {createPermitted &&
                            <LinkButton to="/contacts/create" className="cn-btn cn-btn-primary" icon="plus" label={t('addContact')}/>
                        }
                    </Toolbar>
                </div>

                {this.state.isImportModalOpen &&
                    <ImportListPickerModal onClose={() => this.setState({isImportModalOpen: false})}/>
                }

                <div className="cn-card" style={{padding: '10px 14px', marginBottom: 14, display: 'inline-block'}}>
                    <Form format="inline" stateOwner={this}>
                        <Dropdown format="inline" id="status" label={t('status')} options={statusOptions}/>
                    </Form>
                </div>

                <Table ref={node => this.table = node} withHeader dataUrl={dataUrl} columns={columns}/>
            </div>
        );
    }
}
