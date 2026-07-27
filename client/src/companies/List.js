'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../lib/i18n';
import {Icon} from '../lib/bootstrap-components';
import {LinkButton, requiresAuthenticatedUser, Title, Toolbar, withPageHelpers} from '../lib/page';
import {withErrorHandling} from '../lib/error-handling';
import {Table} from '../lib/table';
import {tableAddDeleteButton, tableRestActionDialogInit, tableRestActionDialogRender} from "../lib/modals";
import {withComponentMixins} from "../lib/decorator-helpers";
import PropTypes from 'prop-types';

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class List extends Component {
    constructor(props) {
        super(props);

        this.state = {};
        tableRestActionDialogInit(this);
    }

    static propTypes = {
        permissions: PropTypes.object
    }

    render() {
        const t = this.props.t;

        const permissions = this.props.permissions;
        const createPermitted = permissions.createCompany;

        const columns = [
            { data: 1, title: t('name') },
            { data: 2, title: t('domain') },
            { data: 3, title: t('phone') },
            { data: 4, title: t('namespace') },
            {
                actions: data => {
                    const actions = [];
                    const perms = data[5];

                    if (perms.includes('view') || perms.includes('edit')) {
                        actions.push({
                            label: <Icon icon="edit" title={t('edit')}/>,
                            link: `/companies/${data[0]}/edit`
                        });
                    }

                    if (perms.includes('share')) {
                        actions.push({
                            label: <Icon icon="share" title={t('share')}/>,
                            link: `/companies/${data[0]}/share`
                        });
                    }

                    tableAddDeleteButton(actions, this, perms, `rest/companies/${data[0]}`, data[1], t('deletingCompany'), t('companyDeleted'));

                    return actions;
                }
            }
        ];

        return (
            <div>
                {tableRestActionDialogRender(this)}
                <Toolbar>
                    {createPermitted &&
                        <LinkButton to="/companies/create" className="btn-primary" icon="plus" label={t('createCompany')}/>
                    }
                </Toolbar>

                <Title>{t('companies')}</Title>

                <Table ref={node => this.table = node} withHeader dataUrl="rest/companies-table" columns={columns} />
            </div>
        );
    }
}
