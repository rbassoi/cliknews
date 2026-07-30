'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import {Button, Icon} from '../lib/bootstrap-components';
import {buildCampaignPreviewUrl, campaignStatusPill, fetchDefaultPreviewContact, getCampaignLabels} from './helpers';
import {PreviewModalDialog} from './PreviewModalDialog';
import {withComponentMixins} from '../lib/decorator-helpers';
import moment from 'moment';

// Shared campaign report header (thumbnail + name/subject/status + "preview and test"
// entry point) reused on both the campaign status page and the campaign statistics page.
@withComponentMixins([
    withTranslation,
    withErrorHandling
])
export class CampaignReportHeader extends Component {
    constructor(props) {
        super(props);

        const {campaignStatusLabels} = getCampaignLabels(props.t);
        this.campaignStatusLabels = campaignStatusLabels;

        this.state = {
            thumbnailPreviewUrl: null,
            previewVisible: false
        };
    }

    static propTypes = {
        entity: PropTypes.object.isRequired
    };

    @withAsyncErrorHandler
    async fetchThumbnailPreview() {
        const defaultContact = await fetchDefaultPreviewContact(this.props.entity.id);
        if (defaultContact) {
            const url = await buildCampaignPreviewUrl(this.props.entity, defaultContact.listCid, defaultContact.subscriptionCid);
            this.setState({thumbnailPreviewUrl: url});
        }
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.fetchThumbnailPreview();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.entity.id !== this.props.entity.id) {
            this.setState({thumbnailPreviewUrl: null});
            // noinspection JSIgnoredPromiseFromCall
            this.fetchThumbnailPreview();
        }
    }

    render() {
        const t = this.props.t;
        const entity = this.props.entity;

        return (
            <>
                <PreviewModalDialog
                    visible={this.state.previewVisible}
                    onHide={() => this.setState({previewVisible: false})}
                    entity={entity}
                />

                <div className="cn-card cn-campaign-report-header">
                    <div className="cn-campaign-thumbnail" onClick={() => this.setState({previewVisible: true})}>
                        {this.state.thumbnailPreviewUrl ?
                            <iframe src={this.state.thumbnailPreviewUrl} className="cn-campaign-thumbnail-frame" title={t('preview')} tabIndex="-1" scrolling="no"/>
                            :
                            <div className="cn-campaign-thumbnail-empty"><Icon icon="envelope"/></div>
                        }
                    </div>
                    <div className="cn-campaign-report-header-text">
                        <h1 className="cn-page-title">{entity.name}</h1>
                        {entity.subject && <div className="cn-campaign-report-subject">{entity.subject}</div>}
                        <div className="cn-campaign-report-meta">
                            {campaignStatusPill(t, this.campaignStatusLabels, entity.status)}
                            {entity.scheduled && <span>{moment(entity.scheduled).format('LLL')}</span>}
                        </div>
                    </div>
                    <div className="cn-campaign-report-header-actions">
                        <Button className="btn-secondary" icon="eye" label={t('previewAndTest')} onClickAsync={async () => this.setState({previewVisible: true})}/>
                    </div>
                </div>
            </>
        );
    }
}
