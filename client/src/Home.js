'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {withTranslation} from './lib/i18n';
import {requiresAuthenticatedUser, withPageHelpers} from './lib/page';
import {withComponentMixins} from "./lib/decorator-helpers";
import {withErrorHandling, withAsyncErrorHandler} from "./lib/error-handling";
import {StatCard, Pill, Icon} from "./lib/bootstrap-components";
import axios from "./lib/axios";
import {getUrl} from "./lib/urls";
import {Link} from "react-router-dom";
import {CampaignStatus} from "../../shared/campaigns";
import {getCampaignLabels} from "./campaigns/helpers";

function statusPill(t, campaignLabels, status) {
    if (status === CampaignStatus.FINISHED || status === CampaignStatus.ACTIVE) {
        return <Pill color="green">{campaignLabels[status]}</Pill>;
    } else if (status === CampaignStatus.SCHEDULED) {
        return <Pill color="blue">{campaignLabels[status]}</Pill>;
    } else {
        return <Pill color="gray">{campaignLabels[status]}</Pill>;
    }
}

const listDotColors = ['#3d63d9', '#3da95f', '#d98a3d', '#c23d9e'];

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class Home extends Component {
    constructor(props) {
        super(props);

        this.state = {
            stats: null
        };
    }

    static propTypes = {
    }

    @withAsyncErrorHandler
    async fetchStats() {
        const resp = await axios.get(getUrl('rest/dashboard-stats'));
        this.setState({
            stats: resp.data
        });
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.fetchStats();
    }

    render() {
        const t = this.props.t;
        const stats = this.state.stats;
        const campaignLabels = getCampaignLabels(t);

        return (
            <div>
                <div className="cn-page-header">
                    <div>
                        <h1 className="cn-page-title">{t('dashboard')}</h1>
                        <div className="cn-page-subtitle">{t('dashboardSubtitle')}</div>
                    </div>
                    <Link className="cn-btn cn-btn-primary" to="/campaigns/create"><Icon icon="plus"/> {t('newCampaignShort')}</Link>
                </div>

                {stats &&
                    <div>
                        <div className="cn-grid-4" style={{marginBottom: 28}}>
                            <StatCard label={t('totalContacts')} value={stats.totalContacts.toLocaleString()}/>
                            <StatCard label={t('activeLists')} value={stats.listsCount.toLocaleString()}/>
                            <StatCard label={t('newslettersSent')} value={stats.newslettersSent.toLocaleString()}
                                      delta={stats.newslettersSentThisMonth > 0 ? `+${stats.newslettersSentThisMonth} ${t('thisMonth')}` : null}
                                      deltaPositive={stats.newslettersSentThisMonth > 0}/>
                            <StatCard label={t('avgOpenRateLabel')} value={`${stats.avgOpenRate.toFixed(0)}%`}/>
                        </div>

                        <div style={{marginBottom: 28}}>
                            <h2 style={{fontSize: 16, fontWeight: 700, marginBottom: 14}}>{t('yourLists')}</h2>
                            {stats.recentLists.length === 0 &&
                                <div className="cn-card" style={{padding: 20, color: '#888'}}>{t('noLists')}</div>
                            }
                            <div className="cn-grid-4">
                                {stats.recentLists.map((l, idx) => (
                                    <Link key={l.id} to={`/lists/${l.id}/subscriptions`} className="cn-card" style={{padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, color: 'inherit', textDecoration: 'none'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                            <div style={{width: 8, height: 8, borderRadius: '50%', background: listDotColors[idx % listDotColors.length]}}/>
                                            <div style={{fontSize: 14, fontWeight: 600}}>{l.name}</div>
                                        </div>
                                        <div style={{fontSize: 20, fontWeight: 800}}>{(l.subscribers || 0).toLocaleString()}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 style={{fontSize: 16, fontWeight: 700, marginBottom: 14}}>{t('recentCampaigns')}</h2>
                            <div className="cn-card" style={{overflow: 'hidden'}}>
                                {stats.recentCampaigns.length === 0 &&
                                    <div style={{padding: 20, color: '#888'}}>{t('noRecentCampaigns')}</div>
                                }
                                {stats.recentCampaigns.length > 0 &&
                                    <>
                                        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 20px', background: '#f7f7f5', fontSize: 12, fontWeight: 600, color: '#888'}}>
                                            <div>{t('campaign')}</div><div>{t('list')}</div><div>{t('date')}</div><div>{t('status')}</div><div>{t('openRate')}</div>
                                        </div>
                                        {stats.recentCampaigns.map(c => (
                                            <Link key={c.id} to={`/campaigns/${c.id}/status`} style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '14px 20px', borderTop: '1px solid #eee', fontSize: 13, alignItems: 'center', color: 'inherit', textDecoration: 'none'}}>
                                                <div style={{fontWeight: 600}}>{c.name}</div>
                                                <div style={{color: '#888'}}>{c.list || '—'}</div>
                                                <div style={{color: '#888'}}>{moment(c.date).format('DD MMM')}</div>
                                                <div>{statusPill(t, campaignLabels, c.status)}</div>
                                                <div style={{fontWeight: 600}}>{c.openRate != null ? `${c.openRate.toFixed(0)}%` : '—'}</div>
                                            </Link>
                                        ))}
                                    </>
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>
        );
    }
}
