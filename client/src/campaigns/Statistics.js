'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {Trans} from 'react-i18next';
import {requiresAuthenticatedUser, withPageHelpers} from '../lib/page';
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import axios from "../lib/axios";
import {getUrl} from "../lib/urls";
import {AlignedRow} from "../lib/form";
import {Icon, StatCard} from "../lib/bootstrap-components";
import {CampaignReportHeader} from "./CampaignReportHeader";

import styles from "./styles.scss";
import {Link} from "react-router-dom";
import {withComponentMixins} from "../lib/decorator-helpers";
import moment from 'moment';

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class Statistics extends Component {
    constructor(props) {
        super(props);

        const t = props.t;

        this.state = {
            entity: props.entity,
            opensByDay: null
        };

        this.refreshTimeoutHandler = ::this.periodicRefreshTask;
        this.refreshTimeoutId = 0;
    }

    static propTypes = {
        entity: PropTypes.object
    }

    @withAsyncErrorHandler
    async refreshEntity() {
        let resp;

        resp = await axios.get(getUrl(`rest/campaigns-stats/${this.props.entity.id}`));
        const entity = resp.data;

        this.setState({
            entity
        });
    }

    @withAsyncErrorHandler
    async fetchOpensByDay() {
        const resp = await axios.get(getUrl(`rest/campaigns-opens-by-day/${this.props.entity.id}`));
        this.setState({
            opensByDay: resp.data
        });
    }

    async periodicRefreshTask() {
        // The periodic task runs all the time, so that we don't have to worry about starting/stopping it as a reaction to the buttons.
        await this.refreshEntity();
        if (this.refreshTimeoutHandler) { // For some reason the task gets rescheduled if server is restarted while the page is shown. That why we have this check here.
            this.refreshTimeoutId = setTimeout(this.refreshTimeoutHandler, 60000);
        }
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.periodicRefreshTask();
        // noinspection JSIgnoredPromiseFromCall
        this.fetchOpensByDay();
    }

    componentWillUnmount() {
        clearTimeout(this.refreshTimeoutId);
        this.refreshTimeoutHandler = null;
    }


    render() {
        const t = this.props.t;
        const entity = this.state.entity;
        const total = entity.total;
        const opensByDay = this.state.opensByDay;

        const rate = (val) => total ? Math.round(val / total * 100) : 0;

        const maxOpens = opensByDay ? Math.max(1, ...opensByDay.map(d => d.count)) : 1;

        const renderMetrics = (key, label, showZoomIn = true) => {
            const val = entity[key]

            return (
                <AlignedRow label={label}><span className={styles.statsMetrics}>{val}</span>{showZoomIn && <span className={styles.zoomIn}><Link to={`/campaigns/${entity.id}/statistics/${key}`}><Icon icon="search-plus"/></Link></span>}</AlignedRow>
            );
        }

        const renderMetricsWithProgress = (key, label, progressBarClass, showZoomIn = true) => {
            const val = entity[key]

            if (!total) {
                return renderMetrics(key, label);
            }

            const percent = rate(val);

            return (
                <AlignedRow label={label}>
                    {showZoomIn && <span className={styles.statsProgressBarZoomIn}><Link to={`/campaigns/${entity.id}/statistics/${key}`}><Icon icon="search-plus"/></Link></span>}
                    <div className={`progress ${styles.statsProgressBar}`}>
                        <div
                            className={`progress-bar progress-bar-${progressBarClass}`}
                            role="progressbar"
                            style={{minWidth: '6em', width: percent + '%'}}>
                            {val}&nbsp;({percent}%)
                        </div>
                    </div>
                </AlignedRow>
            );
        }

        return (
            <div>
                <CampaignReportHeader entity={entity}/>

                <div className="cn-page-header">
                    <div>
                        <h2 className="cn-page-title">{t('campaignStatistics')}</h2>
                    </div>
                </div>

                <div className="cn-grid-4" style={{marginBottom: 28}}>
                    <StatCard label={t('sent')} value={(entity.delivered || 0).toLocaleString()}/>
                    <StatCard label={t('openRate')} value={!entity.open_tracking_disabled ? `${rate(entity.opened)}%` : '—'}/>
                    <StatCard label={t('clickRate')} value={!entity.click_tracking_disabled ? `${rate(entity.clicks)}%` : '—'}/>
                    <StatCard label={t('unsubscribed')} value={(entity.unsubscribed || 0).toLocaleString()}/>
                </div>

                {!entity.open_tracking_disabled &&
                    <div className="cn-card" style={{padding: '20px 24px', marginBottom: 28}}>
                        <div style={{fontSize: 13, fontWeight: 700, color: 'var(--cn-text-muted, #888)', marginBottom: 16}}>{t('opensLastDays')}</div>
                        {opensByDay &&
                            <div style={{display: 'flex', alignItems: 'flex-end', gap: 12, height: 120}}>
                                {opensByDay.map(d => (
                                    <div key={d.day} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end'}}>
                                        <div style={{fontSize: 11, fontWeight: 600, color: '#888'}}>{d.count > 0 ? d.count : ''}</div>
                                        <div style={{
                                            width: '100%',
                                            height: `${Math.max(4, Math.round(d.count / maxOpens * 100))}%`,
                                            background: '#3d63d9',
                                            opacity: d.count > 0 ? 0.4 + 0.6 * (d.count / maxOpens) : 0.15,
                                            borderRadius: 4
                                        }}/>
                                        <div style={{fontSize: 11, color: '#888', textTransform: 'capitalize'}}>{moment(d.day).format('dd')}</div>
                                    </div>
                                ))}
                            </div>
                        }
                    </div>
                }

                <div className="cn-card" style={{padding: '20px 24px', marginBottom: 28}}>
                    {renderMetrics('total', t('total'), false)}
                    {renderMetrics('delivered', t('delivered'))}
                    {renderMetrics('blacklisted', t('blacklisted'), false)}
                    {renderMetricsWithProgress('bounced', t('bounced'), 'info')}
                    {renderMetricsWithProgress('complained', t('complaints'), 'danger')}
                    {renderMetricsWithProgress('unsubscribed', t('unsubscribed'), 'warning')}
                    {!entity.open_tracking_disabled && renderMetricsWithProgress('opened', t('opened'), 'success')}
                    {!entity.click_tracking_disabled && renderMetricsWithProgress('clicks', t('clicked'), 'success')}
                </div>

                <div className="cn-card" style={{padding: '20px 24px'}}>
                    <div style={{fontSize: 13, fontWeight: 700, color: 'var(--cn-text-muted, #888)', marginBottom: 12}}>{t('quickReports')}</div>
                    <small className="text-muted"><Trans i18nKey="belowYouCanDownloadPremadeReportsRelated">Below, you can download pre-made reports related to this campaign. Each link generates a CSV file that can be viewed in a spreadsheet editor. Custom reports and reports that cover more than one campaign can be created through <Link to="/reports">Reports</Link> functionality of Cliker.</Trans></small>
                    <ul className="list-unstyled my-3">
                        <li><a href={getUrl(`quick-rpts/open-and-click-counts/${entity.id}`)}>Open and click counts per currently subscribed subscriber</a></li>
                    </ul>
                </div>
           </div>
        );
    }
}
