'use strict';

import React from "react";
import List from "./List";
import CUD from "./CUD";
import FieldsList from "./fields/List";
import FieldsCUD from "./fields/CUD";
import Share from '../shares/Share';
import qs from 'querystringify';
import {ellipsizeBreadcrumbLabel} from "../lib/helpers";
import {namespaceCheckPermissions} from "../lib/namespace";

function getMenus(t) {
    return {
        'contacts': {
            title: t('contacts'),
            link: '/contacts',
            checkPermissions: {
                createContact: {
                    entityTypeId: 'namespace',
                    requiredOperations: ['createContact']
                },
                viewContact: {
                    entityTypeId: 'contact',
                    requiredOperations: ['view']
                },
                ...namespaceCheckPermissions('createContact')
            },
            panelRender: props => <List status={qs.parse(props.location.search).status} permissions={props.permissions}/>,
            children: {
                fields: {
                    title: t('contactFields'),
                    link: '/contacts/fields',
                    panelRender: props => <FieldsList/>,
                    children: {
                        ':fieldId([0-9]+)': {
                            title: t('edit'),
                            resolve: {
                                field: params => `rest/contact-fields/${params.fieldId}`
                            },
                            link: params => `/contacts/fields/${params.fieldId}/edit`,
                            navs: {
                                ':action(edit|delete)': {
                                    title: t('edit'),
                                    link: params => `/contacts/fields/${params.fieldId}/edit`,
                                    panelRender: props => <FieldsCUD action={props.match.params.action} entity={props.resolved.field}/>
                                }
                            }
                        },
                        create: {
                            title: t('create'),
                            panelRender: props => <FieldsCUD action="create"/>
                        }
                    }
                },
                ':contactId([0-9]+)': {
                    title: resolved => ellipsizeBreadcrumbLabel(resolved.contact.email),
                    resolve: {
                        contact: params => `rest/contacts/${params.contactId}`
                    },
                    link: params => `/contacts/${params.contactId}/edit`,
                    navs: {
                        ':action(edit|delete)': {
                            title: t('edit'),
                            link: params => `/contacts/${params.contactId}/edit`,
                            visible: resolved => resolved.contact.permissions.includes('view') || resolved.contact.permissions.includes('edit'),
                            panelRender: props => <CUD action={props.match.params.action} entity={props.resolved.contact} permissions={props.permissions} />
                        },
                        share: {
                            title: t('share'),
                            link: params => `/contacts/${params.contactId}/share`,
                            visible: resolved => resolved.contact.permissions.includes('share'),
                            panelRender: props => <Share title={t('share')} entity={props.resolved.contact} entityTypeId="contact" />
                        }
                    }
                },
                create: {
                    title: t('create'),
                    panelRender: props => <CUD action="create" permissions={props.permissions} />
                }
            }
        }
    };
}

export default {
    getMenus
}
