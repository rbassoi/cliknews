'use strict';

import React, {Component} from 'react';
import ReactDOMServer from 'react-dom/server';
import PropTypes from 'prop-types';
import {withTranslation} from './i18n';

import jQuery from 'jquery';

import 'datatables.net';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.css';

import axios from './axios';

import {withPageHelpers} from './page'
import {withAsyncErrorHandler, withErrorHandling} from './error-handling';
import styles from "./styles.scss";
import {getUrl} from "./urls";
import {withComponentMixins} from "./decorator-helpers";

//dtFactory();
//dtSelectFactory();


const TableSelectMode = {
    NONE: 0,
    SINGLE: 1,
    MULTI: 2
};

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers
], ['refresh'])
class Table extends Component {
    constructor(props) {
        super(props);
        this.mounted = false;
        this.selectionMap = this.getSelectionMap(props);
    }

    static propTypes = {
        dataUrl: PropTypes.string,
        data: PropTypes.array,
        columns: PropTypes.array,
        selectMode: PropTypes.number,
        selection: PropTypes.oneOfType([PropTypes.array, PropTypes.string, PropTypes.number]),
        selectionKeyIndex: PropTypes.number,
        selectionAsArray: PropTypes.bool,
        onSelectionChangedAsync: PropTypes.func,
        onSelectionDataAsync: PropTypes.func,
        withHeader: PropTypes.bool,
        refreshInterval: PropTypes.number,
        pageLength: PropTypes.number,
        order: PropTypes.array,
        search: PropTypes.string, // initial value of the search field
        searchCols: PropTypes.arrayOf(PropTypes.string), // should have same length as `columns`, set items to `null` to prevent search
    }

    static defaultProps = {
        selectMode: TableSelectMode.NONE,
        selectionKeyIndex: 0,
        pageLength: 50,
        order: [[0, 'asc']]
    }

    refresh() {
        if (this.table) {
            this.table.rows().draw('page');
        }
    }

    getSelectionMap(props) {
        let selArray = [];
        if (props.selectMode === TableSelectMode.SINGLE && !this.props.selectionAsArray) {
            if (props.selection !== null && props.selection !== undefined) {
                selArray = [props.selection];
            } else {
                selArray = [];
            }
        } else if ((props.selectMode === TableSelectMode.SINGLE && this.props.selectionAsArray) || props.selectMode === TableSelectMode.MULTI) {
            selArray = props.selection || [];
        }

        const selMap = new Map();

        for (const elem of selArray) {
            selMap.set(elem, undefined);
        }

        if (props.data) {
            for (const rowData of props.data) {
                const key = rowData[props.selectionKeyIndex];
                if (selMap.has(key)) {
                    selMap.set(key, rowData);
                }
            }

        } else if (this.table) {
            this.table.rows().every(function() {
                const rowData = this.data();
                const key = rowData[props.selectionKeyIndex];
                if (selMap.has(key)) {
                    selMap.set(key, rowData);
                }
            });
        }

        return selMap;
    }

    getPageRowKeys() {
        const self = this;
        const keys = [];
        this.table.rows({ page: 'current' }).every(function () {
            keys.push(this.data()[self.props.selectionKeyIndex]);
        });
        return keys;
    }

    updateHeaderCheckbox() {
        if (!this.jqHeaderCheckbox) {
            return;
        }

        const pageKeys = this.getPageRowKeys();
        const selectedOnPage = pageKeys.filter(key => this.selectionMap.has(key)).length;

        this.jqHeaderCheckbox.prop('checked', pageKeys.length > 0 && selectedOnPage === pageKeys.length);
        this.jqHeaderCheckbox.prop('indeterminate', selectedOnPage > 0 && selectedOnPage < pageKeys.length);
    }

    updateSelectInfo() {
        if (!this.jqSelectInfo) {
            return; // If the table is updated very quickly after mounting, the datatable may not be initialized yet.
        }

        if (this.props.selectMode !== TableSelectMode.MULTI) {
            return;
        }

        this.updateHeaderCheckbox();

        const t = this.props.t;

        this.jqSelectInfo.empty();

        const count = this.selectionMap.size;
        if (count === 0) {
            return;
        }

        const pageInfo = this.table.page.info();
        const recordsDisplay = pageInfo.recordsDisplay;

        if (recordsDisplay > 0 && count >= recordsDisplay) {
            this.jqSelectInfo.append(jQuery('<span>' + t('allMatchingRecordsSelected', { count }) + ' </span>'));
        } else {
            this.jqSelectInfo.append(jQuery('<span>' + t('countEntriesSelected', { count }) + ' </span>'));

            const pageKeys = this.getPageRowKeys();
            const pageAllSelected = pageKeys.length > 0 && pageKeys.every(key => this.selectionMap.has(key));

            if (pageAllSelected && recordsDisplay > pageKeys.length) {
                const jqSelectAllLink = jQuery('<a href="">' + t('selectAllMatchingRecords', { count: recordsDisplay }) + '</a>').on('click', ::this.selectAllMatching);
                this.jqSelectInfo.append(jqSelectAllLink).append(jQuery('<span> &middot; </span>'));
            }
        }

        const jqDeselectLink = jQuery('<a href="">' + t('deselectAll') + '</a>').on('click', ::this.deselectAll);
        this.jqSelectInfo.append(jqDeselectLink);
    }

    @withAsyncErrorHandler
    async fetchData(data, callback) {
        // This custom ajax fetch function allows us to properly handle the case when the user is not authenticated.
        const response = await axios.post(getUrl(this.props.dataUrl), data);
        callback(response.data);
    }

    @withAsyncErrorHandler
    async fetchAndNotifySelectionData() {
        if (this.props.onSelectionDataAsync) {
            if (!this.props.data) {
                const keysToFetch = [];
                for (const pair of this.selectionMap.entries()) {
                    if (!pair[1]) {
                        keysToFetch.push(pair[0]);
                    }
                }

                if (keysToFetch.length > 0) {
                    const response = await axios.post(getUrl(this.props.dataUrl), {
                        operation: 'getBy',
                        column: this.props.selectionKeyIndex,
                        values: keysToFetch
                    });

                    const oldSelectionMap = this.selectionMap;
                    // Start from the existing map (which already holds full row data
                    // for any key resolved earlier, e.g. rows on the current page) and
                    // only fill in the ones that were missing it — replacing the map
                    // outright here would silently drop those already-resolved keys
                    // from the selection.
                    this.selectionMap = new Map(oldSelectionMap);
                    for (const row of response.data) {
                        const key = row[this.props.selectionKeyIndex];
                        if (oldSelectionMap.has(key)) {
                            this.selectionMap.set(key, row);
                        }
                    }

                    if (this.selectionMap.size !== oldSelectionMap.size) {
                        this.notifySelection(this.props.onSelectionChangedAsync, this.selectionMap);
                    }
                }
            }

            // noinspection JSIgnoredPromiseFromCall
            this.notifySelection(this.props.onSelectionDataAsync, this.selectionMap);
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const nextSelectionMap = this.getSelectionMap(nextProps);

        let updateDueToSelectionChange = false;
        if (nextSelectionMap.size !== this.selectionMap.size) {
            updateDueToSelectionChange = true;
        } else {
            for (const key of this.selectionMap.keys()) {
                if (!nextSelectionMap.has(key)) {
                    updateDueToSelectionChange = true;
                    break;
                }
            }
        }

        this.selectionMap = nextSelectionMap;

        return updateDueToSelectionChange || this.props.data !== nextProps.data || this.props.dataUrl !== nextProps.dataUrl;
    }

    componentDidMount() {
        this.mounted = true;

        const columns = this.props.columns.slice();

        if (this.props.selectMode === TableSelectMode.MULTI) {
            columns.unshift({ isSelectionCheckbox: true, title: '' });
        }

        // XSS protection and actions rendering
        for (const column of columns) {
            if (column.isSelectionCheckbox) {
                const self = this;
                column.type = 'html';
                column.data = null;
                column.orderable = false;
                column.searchable = false;
                column.render = () => '';
                column.createdCell = (td, cellData, rowData) => {
                    const key = rowData[self.props.selectionKeyIndex];
                    const checked = self.selectionMap.has(key);
                    jQuery(td).html(`<input type="checkbox"${checked ? ' checked' : ''}>`);
                    // The row itself already has a click handler (below) that toggles
                    // selection — the checkbox is a visual reflection of that same
                    // state, not a second independent control, so its own default
                    // toggle-on-click is suppressed to avoid a double-toggle.
                    jQuery(td).find('input').on('click', evt => evt.preventDefault());
                };
            } else if (column.actions) {
                const createdCellFn = (td, data, rowData) => {
                    const linksContainer = jQuery(`<span class="${styles.actionLinks}"/>`);

                    let actions = column.actions(rowData);
                    let options = {};

                    if (!Array.isArray(actions)) {
                        options = actions;
                        actions = actions.actions;
                    }

                    for (const action of actions) {
                        if (action.action) {
                            const html = ReactDOMServer.renderToStaticMarkup(<a href="">{action.label}</a>);
                            const elem = jQuery(html);
                            elem.click((evt) => { evt.preventDefault(); action.action(this) });
                            linksContainer.append(elem);

                        } else if (action.link) {
                            const html = ReactDOMServer.renderToStaticMarkup(<a href={action.link}>{action.label}</a>);
                            const elem = jQuery(html);
                            elem.click((evt) => { evt.preventDefault(); this.navigateTo(action.link) });
                            linksContainer.append(elem);

                        } else if (action.href) {
                            const html = ReactDOMServer.renderToStaticMarkup(<a href={action.href}>{action.label}</a>);
                            const elem = jQuery(html);
                            linksContainer.append(elem);

                        } else {
                            const html = ReactDOMServer.renderToStaticMarkup(<span>{action.label}</span>);
                            const elem = jQuery(html);
                            linksContainer.append(elem);
                        }
                    }

                    if (options.refreshTimeout) {
                        const currentMS = Date.now();

                        if (!this.refreshTimeoutAt || this.refreshTimeoutAt > currentMS + options.refreshTimeout) {
                            clearTimeout(this.refreshTimeoutId);

                            this.refreshTimeoutAt = currentMS + options.refreshTimeout;

                            this.refreshTimeoutId = setTimeout(() => {
                                this.refreshTimeoutAt = 0;
                                this.refresh();
                            }, options.refreshTimeout);
                        }
                    }

                    jQuery(td).html(linksContainer);
                };

                column.type = 'html';
                column.createdCell = createdCellFn;
                column.render = () => '';

                if (!('data' in column)) {
                    column.data = null;
                    column.orderable = false;
                    column.searchable = false;
                }
            } else {
                const originalRender = column.render;
                column.render = (data, ...rest) => {
                    if (originalRender) {
                        const markup = originalRender(data, ...rest);
                        return ReactDOMServer.renderToStaticMarkup(<div>{markup}</div>);
                    } else {
                        return ReactDOMServer.renderToStaticMarkup(<div>{data}</div>)
                    }
                };
            }

            column.title = ReactDOMServer.renderToStaticMarkup(<div>{column.title}</div>);
        }

        // The checkbox column above is a display-only, client-side addition the
        // server's own column list (server/lib/dt-helpers.js) knows nothing about —
        // it's always orderable:false/searchable:false, but its mere presence shifts
        // every real column's *position* in the columns[] array by one. "order"/
        // "searchCols" are positional (they say "column N"), so they need the same
        // +1 shift or the server ends up looking up the wrong column (e.g. sorting
        // by the checkbox column itself, which has data:null → `ORDER BY undefined`).
        const columnIndexOffset = this.props.selectMode === TableSelectMode.MULTI ? 1 : 0;

        // `order` is documented/defaulted as an array of [col, dir] pairs (e.g.
        // [[0, 'asc']]), but several existing call sites (campaigns/List.js,
        // campaigns/Clone.js, campaigns/Status.js) pass a single un-nested pair
        // (e.g. [6, 'desc']) — DataTables tolerated that directly, so normalize
        // it here rather than crashing on `.map()` over a flat pair.
        const orderPairs = Array.isArray(this.props.order[0]) ? this.props.order : [this.props.order];

        const dtOptions = {
            columns,
            order: orderPairs.map(([col, dir]) => [col + columnIndexOffset, dir]),
            autoWidth: false,
            pageLength: this.props.pageLength,
            dom: // This overrides Bootstrap 4 settings. It may need to be updated if there are updates in the DataTables Bootstrap 4 plugin.
                "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
                "<'row'<'col-sm-12'<'" + styles.dataTableTable + "'tr>>>" +
                "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>"
        };
        if (this.props.search)
            dtOptions.search = { search: this.props.search };
        if (this.props.searchCols) {
            const searchCols = columnIndexOffset ? [null, ...this.props.searchCols] : this.props.searchCols;
            dtOptions.searchCols = searchCols.map(value => value !== null ? ({
                search: value,
            }) : null)
        }

        const self = this;
        dtOptions.createdRow = function(row, data) {
            const rowKey = data[self.props.selectionKeyIndex];

            if (self.selectionMap.has(rowKey)) {
                jQuery(row).addClass('selected');
            }

            jQuery(row).on('click', () => {
                const selectionMap = self.selectionMap;

                if (self.props.selectMode === TableSelectMode.SINGLE) {
                    if (selectionMap.size !== 1 || !selectionMap.has(rowKey)) {
                        // noinspection JSIgnoredPromiseFromCall
                        self.notifySelection(self.props.onSelectionChangedAsync, new Map([[rowKey, data]]));
                    }

                } else if (self.props.selectMode === TableSelectMode.MULTI) {
                    const newSelMap = new Map(selectionMap);

                    if (selectionMap.has(rowKey)) {
                        newSelMap.delete(rowKey);
                    } else {
                        newSelMap.set(rowKey, data);
                    }

                    // noinspection JSIgnoredPromiseFromCall
                    self.notifySelection(self.props.onSelectionChangedAsync, newSelMap);
                }
            });
        };

        const t = this.props.t;
        dtOptions.language = {
          "sEmptyTable":     t("noDataAvailableInTable"),
          "sInfo":           t("showingStartToEndOfTotalEntries"),
          "sInfoEmpty":      t("showing0To0Of0Entries"),
          "sInfoFiltered":   t("filteredFromMaxTotalEntries"),
          "sInfoPostFix":    t(""),
          "sInfoThousands":  t("-1"),
          "sLengthMenu":     t("showMenuEntries"),
          "sLoadingRecords": t("loading-1"),
          "sProcessing":     t("processing"),
          "sSearch":         t("search"),
          "sZeroRecords":    t("noMatchingRecordsFound"),
          "oPaginate": {
            "sFirst":    t("firs"),
            "sLast":     t("last"),
            "sNext":     t("next"),
            "sPrevious": t("previous")
          },
          "oAria": {
           "sSortAscending":  t("activateToSortColumnAscending"),
           "sSortDescending": t("activateToSortColumnDescending")
          }
       }

        dtOptions.initComplete = function() {
            self.jqSelectInfo = jQuery('<div class="dataTable_selection_info"/>');
            const jqWrapper = jQuery(self.domTable).parents('.dataTables_wrapper');
            jQuery('.dataTables_info', jqWrapper).after(self.jqSelectInfo);

            if (self.props.selectMode === TableSelectMode.MULTI) {
                // The checkbox column is always the first one (see the `unshift` above),
                // so its header cell is the first <th>. A header checkbox toggling
                // selection of the whole current page is a standard, more discoverable
                // pattern than a text link alone.
                const jqHeaderCell = jQuery(self.domTable).find('thead th').eq(0);
                self.jqHeaderCheckbox = jQuery('<input type="checkbox">');
                jqHeaderCell.empty().append(self.jqHeaderCheckbox);
                self.jqHeaderCheckbox.on('click', evt => self.toggleSelectPage(evt));
            }

            self.updateSelectInfo();
        };

        if (this.props.data) {
            dtOptions.data = this.props.data;
        } else {
            dtOptions.serverSide = true;
            dtOptions.ajax = ::this.fetchData;
        }

        this.table = jQuery(this.domTable).DataTable(dtOptions);

        // Selection state (which rows on the newly-drawn page are selected) can
        // change on any draw, not just ones triggered by a React prop change
        // (e.g. the user paginating, searching or sorting), so the info line and
        // header checkbox need to be refreshed on every draw too.
        this.table.on('draw.dt', () => self.updateSelectInfo());

        if (this.props.refreshInterval) {
            this.refreshIntervalId = setInterval(() => this.refresh(), this.props.refreshInterval);
        }

        this.table.on('destroy.dt', () => {
           clearInterval(this.refreshIntervalId);
           clearTimeout(this.refreshTimeoutId);
        });

        // noinspection JSIgnoredPromiseFromCall
        this.fetchAndNotifySelectionData();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.data) {
            this.table.clear();
            this.table.rows.add(this.props.data);
        } else {
            // XXX: Changing URL changing from data to dataUrl is not implemented
            this.refresh();
        }

        const self = this;
        this.table.rows().every(function() {
            const key = this.data()[self.props.selectionKeyIndex];
            const isSelected = self.selectionMap.has(key);
            jQuery(this.node()).toggleClass('selected', isSelected);
            if (self.props.selectMode === TableSelectMode.MULTI) {
                jQuery(this.node()).find('input[type="checkbox"]').prop('checked', isSelected);
            }
        });

        this.updateSelectInfo();

        // noinspection JSIgnoredPromiseFromCall
        this.fetchAndNotifySelectionData();
    }

    componentWillUnmount() {
        this.mounted = false;
        clearInterval(this.refreshIntervalId);
        clearTimeout(this.refreshTimeoutId);
    }

    async notifySelection(eventCallback, newSelectionMap) {
        if (this.mounted && eventCallback) {
            const selPairs = Array.from(newSelectionMap).sort((l, r) => l[0] - r[0]);

            let data = selPairs.map(entry => entry[1]);
            let sel = selPairs.map(entry => entry[0]);

            if (this.props.selectMode === TableSelectMode.SINGLE && !this.props.selectionAsArray) {
                if (sel.length) {
                    sel = sel[0];
                    data = data[0];
                } else {
                    sel = null;
                    data = null;
                }
            }

            await eventCallback(sel, data);
        }
    }

    async deselectAll(evt) {
        evt.preventDefault();

        // noinspection JSIgnoredPromiseFromCall
        this.notifySelection(this.props.onSelectionChangedAsync, new Map());
    }

    // Bound to the header checkbox. Selects every row on the currently displayed
    // page if not all of them are already selected, otherwise deselects just this
    // page's rows (leaving any selection made on other pages untouched).
    async toggleSelectPage(evt) {
        evt.preventDefault();

        const self = this;
        const pageKeys = this.getPageRowKeys();
        const allSelected = pageKeys.length > 0 && pageKeys.every(key => this.selectionMap.has(key));

        const newSelectionMap = new Map(this.selectionMap);
        this.table.rows({ page: 'current' }).every(function() {
            const rowData = this.data();
            const key = rowData[self.props.selectionKeyIndex];
            if (allSelected) {
                newSelectionMap.delete(key);
            } else {
                newSelectionMap.set(key, rowData);
            }
        });

        // noinspection JSIgnoredPromiseFromCall
        this.notifySelection(this.props.onSelectionChangedAsync, newSelectionMap);
    }

    // Fetches every row matching the current search/filter across all pages (not
    // just the currently loaded one) and adds them all to the selection. Used by
    // the "select all N matching records" link that appears once a whole page is
    // already selected and more matching rows exist elsewhere.
    @withAsyncErrorHandler
    async selectAllMatching(evt) {
        evt.preventDefault();

        const recordsDisplay = this.table.page.info().recordsDisplay;

        const MAX_SELECT_ALL_MATCHING = 20000;
        if (recordsDisplay > MAX_SELECT_ALL_MATCHING) {
            this.setFlashMessage('danger', this.props.t('tooManyRecordsToSelectAll', { count: MAX_SELECT_ALL_MATCHING }));
            return;
        }

        const params = Object.assign({}, this.table.ajax.params(), { start: 0, length: -1 });
        const response = await axios.post(getUrl(this.props.dataUrl), params);

        const newSelectionMap = new Map(this.selectionMap);
        for (const rowData of response.data.data) {
            const key = rowData[this.props.selectionKeyIndex];
            newSelectionMap.set(key, rowData);
        }

        // noinspection JSIgnoredPromiseFromCall
        this.notifySelection(this.props.onSelectionChangedAsync, newSelectionMap);
    }

    render() {
        const t = this.props.t;
        const props = this.props;

        let className = 'table table-striped table-bordered';

        if (this.props.selectMode !== TableSelectMode.NONE) {
            className += ' table-hover';
        }

        return (
            <div>
                <table ref={(domElem) => { this.domTable = domElem; }} className={className} cellSpacing="0" width="100%" />
            </div>
        );
    }
}

export {
    Table,
    TableSelectMode
}
