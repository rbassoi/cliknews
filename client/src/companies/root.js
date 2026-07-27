'use strict';

import React from 'react';
import CompaniesList from './List';
import CompaniesCUD from './CUD';
import Share from '../shares/Share';
import {ellipsizeBreadcrumbLabel} from "../lib/helpers";
import {namespaceCheckPermissions} from "../lib/namespace";

function getMenus(t) {
    return {
        'companies': {
            title: t('companies'),
            link: '/companies',
            checkPermissions: {
                createCompany: {
                    entityTypeId: 'namespace',
                    requiredOperations: ['createCompany']
                },
                viewCompany: {
                    entityTypeId: 'company',
                    requiredOperations: ['view']
                },
                ...namespaceCheckPermissions('createCompany')
            },
            panelRender: props => <CompaniesList permissions={props.permissions}/>,
            children: {
                ':companyId([0-9]+)': {
                    title: resolved => t('companyEntityName', {name: ellipsizeBreadcrumbLabel(resolved.company.name)}),
                    resolve: {
                        company: params => `rest/companies/${params.companyId}`
                    },
                    link: params => `/companies/${params.companyId}/edit`,
                    navs: {
                        ':action(edit|delete)': {
                            title: t('edit'),
                            link: params => `/companies/${params.companyId}/edit`,
                            visible: resolved => resolved.company.permissions.includes('edit'),
                            panelRender: props => <CompaniesCUD action={props.match.params.action} entity={props.resolved.company} permissions={props.permissions} />
                        },
                        share: {
                            title: t('share'),
                            link: params => `/companies/${params.companyId}/share`,
                            visible: resolved => resolved.company.permissions.includes('share'),
                            panelRender: props => <Share title={t('share')} entity={props.resolved.company} entityTypeId="company" />
                        }
                    }
                },
                create: {
                    title: t('create'),
                    panelRender: props => <CompaniesCUD action="create" permissions={props.permissions} />
                }
            }
        }
    };
}

export default {
    getMenus
}
