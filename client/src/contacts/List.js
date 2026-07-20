'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {LinkButton, requiresAuthenticatedUser, Title, Toolbar, withPageHelpers} from '../lib/page';
import {withErrorHandling} from '../lib/error-handling';
import {Table} from '../lib/table';
import {Pill} from '../lib/bootstrap-components';
import {Dropdown, Form, withForm} from '../lib/form';
import {SubscriptionStatus} from '../../../shared/lists';
import {getSubscriptionStatusLabels} from '../lists/subscriptions/helpers';
import moment from 'moment';
import {withComponentMixins} from "../lib/decorator-helpers";

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
        this.state = {};
        this.statusLabels = getSubscriptionStatusLabels(t);

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
        status: PropTypes.string
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

        const columns = [
            {
                data: 1,
                title: t('email'),
                render: data => <span style={{fontWeight: 600}}>{data}</span>
            },
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
                data: 2,
                title: t('status'),
                render: data => <Pill color={statusPillColors[data] || 'gray'}>{this.statusLabels[data]}</Pill>
            },
            {
                data: 3,
                title: t('added'),
                render: data => data ? moment(data).fromNow() : ''
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
                <div className="cn-page-header">
                    <div>
                        <h1 className="cn-page-title">{t('contacts')}</h1>
                    </div>
                    <Toolbar>
                        <LinkButton to="/lists" className="cn-btn cn-btn-primary" icon="plus" label={t('addContact')}/>
                    </Toolbar>
                </div>

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
