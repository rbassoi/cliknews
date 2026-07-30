'use strict';

import {CampaignStatus, CampaignType} from "../../../shared/campaigns";
import campaignsStyles from "./styles.scss";
import {Button, Pill} from "../lib/bootstrap-components";
import {CheckBox, Fieldset, TableSelect} from "../lib/form";
import React from "react";
import axios from "../lib/axios";
import {getPublicUrl, getSandboxUrl, getUrl} from "../lib/urls";

// Asks a campaign contact-picker endpoint (either the is_test-only table or the
// all-subscribers table below) for exactly 1 row ordered by e-mail, instead of rendering
// a full DataTables widget just to read its first result.
async function fetchFirstRow(endpoint, campaignId) {
    const params = {
        draw: 1,
        start: 0,
        length: 1,
        search: {value: ''},
        order: [{column: 1, dir: 'asc'}],
        columns: [
            {data: 0, searchable: false},
            {data: 1, searchable: true},
            {data: 2, searchable: false},
            {data: 3, searchable: false},
            {data: 4, searchable: false},
            {data: 5, searchable: false}
        ]
    };

    const resp = await axios.post(getUrl(`rest/${endpoint}/${campaignId}`), params);
    const row = resp.data.data[0];

    if (!row) {
        return null;
    }

    const [listCid, subscriptionCid] = row[0].split(':');
    return {listCid, subscriptionCid, email: row[1]};
}

// Fetches the first test contact (a subscriber explicitly flagged is_test) configured on
// any of the campaign's lists.
export async function fetchDefaultTestUser(campaignId) {
    return fetchFirstRow('campaigns-test-users-table', campaignId);
}

// Fetches the first subscriber (regardless of is_test) on any of the campaign's lists.
export async function fetchDefaultSubscriber(campaignId) {
    return fetchFirstRow('campaigns-subscribers-table', campaignId);
}

// Picks a contact to default the preview to: prefer a dedicated test contact if one is
// configured, otherwise fall back to any real subscriber - most campaigns don't have a
// test contact set up, and requiring one just to see a preview isn't worth the friction.
export async function fetchDefaultPreviewContact(campaignId) {
    const testUser = await fetchDefaultTestUser(campaignId);
    if (testUser) {
        return testUser;
    }

    return fetchDefaultSubscriber(campaignId);
}

// Builds the URL that renders the campaign fully compiled (merge tags substituted) for a
// given test subscriber. Same logic CUD.js's editor-preview panel already uses.
export async function buildCampaignPreviewUrl(entity, listCid, subscriptionCid) {
    if (entity.type === CampaignType.RSS) {
        const result = await axios.post(getUrl('rest/restricted-access-token'), {
            method: 'rssPreview',
            params: {campaignCid: entity.cid, listCid}
        });

        return getSandboxUrl(`cpgs/rss-preview/${entity.cid}/${listCid}/${subscriptionCid}`, result.data, {withLocale: true});
    }

    return getPublicUrl(`archive/${entity.cid}/${listCid}/${subscriptionCid}`, {withLocale: true});
}

export function campaignStatusPill(t, campaignStatusLabels, status) {
    if (status === CampaignStatus.FINISHED || status === CampaignStatus.ACTIVE) {
        return <Pill color="green">{campaignStatusLabels[status]}</Pill>;
    } else if (status === CampaignStatus.SCHEDULED) {
        return <Pill color="blue">{campaignStatusLabels[status]}</Pill>;
    } else {
        return <Pill color="gray">{campaignStatusLabels[status]}</Pill>;
    }
}

export function getCampaignLabels(t) {

    const campaignTypeLabels = {
        [CampaignType.REGULAR]: t('regular'),
        [CampaignType.TRIGGERED]: t('triggered'),
        [CampaignType.RSS]: t('rss')
    };

    const campaignStatusLabels = {
        [CampaignStatus.IDLE]: t('idle'),
        [CampaignStatus.SCHEDULED]: t('scheduled'),
        [CampaignStatus.PAUSED]: t('paused'),
        [CampaignStatus.FINISHED]: t('finished'),
        [CampaignStatus.PAUSED]: t('paused'),
        [CampaignStatus.INACTIVE]: t('inactive'),
        [CampaignStatus.ACTIVE]: t('active'),
        [CampaignStatus.SENDING]: t('sending'),
        [CampaignStatus.PAUSING]: t('pausing')
    };


    return {
        campaignStatusLabels,
        campaignTypeLabels
    };
}


export class ListsSelectorHelper {
    constructor(owner, t, id, allowEmpty = false) {
        this.owner = owner;
        this.t = t;
        this.id = id;
        this.nextEntryId = 0;
        this.allowEmpty = allowEmpty;

        this.keyRegex = new RegExp(`^(${id}_[0-9]+_)list$`);
    }

    getNextEntryId() {
        const id = this.nextEntryId;
        this.nextEntryId += 1;
        return id;
    }

    getPrefix(lstUid) {
        return this.id + '_' + lstUid + '_';
    }

    onAddListEntry(orderBeforeIdx) {
        const owner = this.owner;
        const id = this.id;

        owner.updateForm(mutState => {
            const lsts = mutState.getIn([id, 'value']);
            let paramId = 0;

            const lstUid = this.getNextEntryId();
            const prefix = this.getPrefix(lstUid);

            mutState.setIn([prefix + 'list', 'value'], null);
            mutState.setIn([prefix + 'segment', 'value'], null);
            mutState.setIn([prefix + 'useSegmentation', 'value'], false);

            mutState.setIn([id, 'value'], [...lsts.slice(0, orderBeforeIdx), lstUid, ...lsts.slice(orderBeforeIdx)]);
        });
    }

    onRemoveListEntry(lstUid) {
        const owner = this.owner;
        const id = this.id;

        owner.updateForm(mutState => {
            const lsts = owner.getFormValue(id);
            const prefix = this.getPrefix(lstUid);

            mutState.delete(prefix + 'list');
            mutState.delete(prefix + 'segment');
            mutState.delete(prefix + 'useSegmentation');

            mutState.setIn([id, 'value'], lsts.filter(val => val !== lstUid));
        });
    }

    onListEntryMoveUp(orderIdx) {
        const owner = this.owner;
        const id = this.id;

        const lsts = owner.getFormValue(id);
        owner.updateFormValue(id, [...lsts.slice(0, orderIdx - 1), lsts[orderIdx], lsts[orderIdx - 1], ...lsts.slice(orderIdx + 1)]);
    }

    onListEntryMoveDown(orderIdx) {
        const owner = this.owner;
        const id = this.id;

        const lsts = owner.getFormValue(id);
        owner.updateFormValue(id, [...lsts.slice(0, orderIdx), lsts[orderIdx + 1], lsts[orderIdx], ...lsts.slice(orderIdx + 2)]);
    }


    // Public methods
    onFormChangeBeforeValidation(mutStateData, key, oldValue, newValue) {
        let match;

        if (key && (match = key.match(this.keyRegex))) {
            const prefix = match[1];
            mutStateData.setIn([prefix + 'segment', 'value'], null);
        }
    }

    getFormValuesMutator(data) {
        const id = this.id;

        const lsts = [];
        for (const lst of data[id]) {
            const lstUid = this.getNextEntryId();
            const prefix = this.getPrefix(lstUid);

            data[prefix + 'list'] = lst.list;
            data[prefix + 'segment'] = lst.segment;
            data[prefix + 'useSegmentation'] = !!lst.segment;

            lsts.push(lstUid);
        }
        data[id] = lsts;
    }

    submitFormValuesMutator(data) {
        const id = this.id;

        const lsts = [];
        for (const lstUid of data[id]) {
            const prefix = this.getPrefix(lstUid);

            const useSegmentation = data[prefix + 'useSegmentation'];

            lsts.push({
                list: data[prefix + 'list'],
                segment: useSegmentation ? data[prefix + 'segment'] : null
            });
        }
        data[id] = lsts;

        for (const key in data) {
            if (key.startsWith('data_') || key.startsWith(id + '_')) {
                delete data[key];
            }
        }
    }

    populateFrom(data, lists) {
        const id = this.id;

        const lsts = [];
        for (const lst of lists) {
            const lstUid = this.getNextEntryId();
            const prefix = this.getPrefix(lstUid);

            data[prefix + 'list'] = lst.list;
            data[prefix + 'segment'] = lst.segment;
            data[prefix + 'useSegmentation'] = !!lst.segment;

            lsts.push(lstUid);
        }
        data[id] = lsts;
    }

    localValidateFormValues(state) {
        const id = this.id;
        const t = this.t;

        for (const lstUid of state.getIn([id, 'value'])) {
            const prefix = this.getPrefix(lstUid);

            if (!state.getIn([prefix + 'list', 'value'])) {
                state.setIn([prefix + 'list', 'error'], t('listMustBeSelected'));
            }

            if (state.getIn([prefix + 'useSegmentation', 'value']) && !state.getIn([prefix + 'segment', 'value'])) {
                state.setIn([prefix + 'segment', 'error'], t('segmentMustBeSelected'));
            }
        }
    }

    render() {
        const t = this.t;
        const owner = this.owner;
        const id = this.id;

        const listsColumns = [
            { data: 1, title: t('name') },
            { data: 2, title: t('id'), render: data => <code>{data}</code> },
            { data: 3, title: t('subscribers') },
            { data: 4, title: t('description') },
            { data: 5, title: t('namespace') }
        ];

        const segmentsColumns = [
            { data: 1, title: t('name') }
        ];

        const lstsEditEntries = [];
        const lsts = owner.getFormValue(id) || [];
        let lstOrderIdx = 0;
        for (const lstUid of lsts) {
            const prefix = this.getPrefix(lstUid);
            const lstOrderIdxClosure = lstOrderIdx;

            const selectedList = owner.getFormValue(prefix + 'list');

            lstsEditEntries.push(
                <div key={lstUid} className={campaignsStyles.entry + ' ' + campaignsStyles.entryWithButtons}>
                    <div className={campaignsStyles.entryButtons}>
                        {(this.allowEmpty || lsts.length > 1) &&
                        <Button
                            className="btn-secondary"
                            icon="trash-alt"
                            title={t('remove')}
                            onClickAsync={() => this.onRemoveListEntry(lstUid)}
                        />
                        }
                        <Button
                            className="btn-secondary"
                            icon="plus"
                            title={t('insertNewEntryBeforeThisOne')}
                            onClickAsync={() => this.onAddListEntry(lstOrderIdxClosure)}
                        />
                        {lstOrderIdx > 0 &&
                        <Button
                            className="btn-secondary"
                            icon="chevron-up"
                            title={t('moveUp')}
                            onClickAsync={() => this.onListEntryMoveUp(lstOrderIdxClosure)}
                        />
                        }
                        {lstOrderIdx < lsts.length - 1 &&
                        <Button
                            className="btn-secondary"
                            icon="chevron-down"
                            title={t('moveDown')}
                            onClickAsync={() => this.onListEntryMoveDown(lstOrderIdxClosure)}
                        />
                        }
                    </div>
                    <div className={campaignsStyles.entryContent}>
                        <TableSelect id={prefix + 'list'} label={t('list')} withHeader dropdown dataUrl='rest/lists-table' columns={listsColumns} selectionLabelIndex={1} />
                        <div>
                            <CheckBox id={prefix + 'useSegmentation'} label={t('segment')} text={t('useAParticularSegment')}/>
                            {selectedList && owner.getFormValue(prefix + 'useSegmentation') &&
                            <TableSelect id={prefix + 'segment'} withHeader dropdown dataUrl={`rest/segments-table/${selectedList}`} columns={segmentsColumns} selectionLabelIndex={1} />
                            }
                        </div>
                    </div>
                </div>
            );

            lstOrderIdx += 1;
        }

        return (
            <Fieldset label={t('lists')}>
                {lstsEditEntries}
                <div key="newEntry" className={campaignsStyles.newEntry}>
                    <Button
                        className="btn-secondary"
                        icon="plus"
                        label={t('addList')}
                        onClickAsync={() => this.onAddListEntry(lsts.length)}
                    />
                </div>
            </Fieldset>
        );
    }
}

