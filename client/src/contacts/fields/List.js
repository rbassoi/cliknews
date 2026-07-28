'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../../lib/i18n';
import {LinkButton, requiresAuthenticatedUser, Title, Toolbar, withPageHelpers} from '../../lib/page';
import {withErrorHandling, withAsyncErrorHandler} from '../../lib/error-handling';
import {withComponentMixins} from '../../lib/decorator-helpers';
import axios from '../../lib/axios';
import {getUrl} from '../../lib/urls';

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class List extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fields: null
        };
    }

    @withAsyncErrorHandler
    async fetchFields() {
        const response = await axios.get(getUrl('rest/contact-fields'));
        this.setState({fields: response.data});
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.fetchFields();
    }

    render() {
        const t = this.props.t;
        const fields = this.state.fields;

        return (
            <div>
                <Toolbar>
                    <LinkButton to="/contacts/fields/create" className="btn-primary" icon="plus" label={t('createField')}/>
                </Toolbar>

                <Title>{t('contactFields')}</Title>
                <p style={{color: 'var(--cn-text-muted)', marginTop: -8, marginBottom: 20, maxWidth: '60ch'}}>{t('contactFieldsPageHelp')}</p>

                <div className="cn-card" style={{padding: 0, overflow: 'hidden'}}>
                    <table className="table" style={{margin: 0}}>
                        <thead>
                            <tr>
                                <th>{t('name')}</th>
                                <th>{t('mergeTag')}</th>
                                <th/>
                            </tr>
                        </thead>
                        <tbody>
                            {fields && fields.map(field => (
                                <tr key={field.id}>
                                    <td>{field.name}</td>
                                    <td><code>{field.key}</code></td>
                                    <td style={{textAlign: 'right'}}>
                                        <LinkButton to={`/contacts/fields/${field.id}/edit`} className="btn-secondary btn-sm" icon="edit" label={t('edit')}/>
                                    </td>
                                </tr>
                            ))}
                            {fields && fields.length === 0 &&
                                <tr><td colSpan="3">{t('noFieldsYet')}</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}
