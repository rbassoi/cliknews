'use strict';

import React, {Component} from 'react';
import {withTranslation} from '../lib/i18n';
import {Trans} from 'react-i18next';
import {Link} from 'react-router-dom';
import {requiresAuthenticatedUser, Title, withPageHelpers} from '../lib/page'
import {withAsyncErrorHandler, withErrorHandling} from '../lib/error-handling';
import axios from '../lib/axios';
import {Button} from '../lib/bootstrap-components';
import {getUrl} from "../lib/urls";
import {withComponentMixins} from "../lib/decorator-helpers";
import styles from "./styles.scss"

@withComponentMixins([
    withTranslation,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class API extends Component {
    constructor(props) {
        super(props);

        this.state = {
            accessToken: null
        };
    }

    @withAsyncErrorHandler
    async loadAccessToken() {
        const response = await axios.get(getUrl('rest/access-token'));
        this.setState({
            accessToken: response.data
        });
    }

    componentDidMount() {
        // noinspection JSIgnoredPromiseFromCall
        this.loadAccessToken();
    }

    async resetAccessToken() {
        const response = await axios.post(getUrl('rest/access-token-reset'));
        this.setState({
            accessToken: response.data
        });
    }

    render() {
        const t = this.props.t;

        const accessToken = this.state.accessToken || 'ACCESS_TOKEN';

        let accessTokenMsg;
        if (this.state.accessToken) {
            accessTokenMsg = <div>{t('personalAccessToken') + ': '}<code>{accessToken}</code></div>;
        } else {
            accessTokenMsg = <div>{t('accessTokenNotYetGenerated')}</div>;
        }

        return (
            <div className={styles.api}>
                <Title>{t('api')}</Title>

                <div className="card mb-3">
                    <div className="card-body">
                        <div className="float-right">
                            <Button label={this.state.accessToken ? t('resetAccessToken') : t('generateAccessToken')} icon="redo" className="btn-info" onClickAsync={::this.resetAccessToken} />
                        </div>
                        {accessTokenMsg}
                    </div>
                </div>

                <div className="card mb-3" style={{borderColor: 'var(--cn-accent, #3d63d9)'}}>
                    <div className="card-body">
                        <h4 className="card-title">{t('accountApiTitle')}</h4>

                        <p>{t('accountApiIntro')}</p>

                        <div className="alert alert-info" role="alert">
                            {t('accountApiWhichKeyNote')} <Link to="/api-keys">{t('apiKeys')}</Link>{t('accountApiWhichKeyNote2')}
                        </div>

                        <p>
                            {t('accountApiAuthHeader')} <code>{getUrl('api-v1')}</code>
                        </p>
                    </div>
                </div>

                <div className="accordion" id="apicallsv2">
                    <div className="card">
                        <div className="card-header">
                            <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#v2lists"><h4>GET /api-v1/lists – {t('accountApiListLists')}</h4></button>
                        </div>
                        <div id="v2lists" className="collapse" data-parent="#apicallsv2">
                            <div className="card-body">
                                <p>{t('accountApiListListsDesc')}</p>
                                <p><strong>{t('example')}</strong></p>
                                <pre>curl -H 'api-key: SUA_CHAVE_DE_API' \<br/>{`  '${getUrl('api-v1/lists')}'`}</pre>
                                <p>{t('responseExample')}:</p>
                                <pre>{`{"data": [{"id": 12, "name": "CLIKDROPS", "subscribers": 1202}]}`}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#v2sendconfigs"><h4>GET /api-v1/send-configurations – {t('accountApiListSendConfigs')}</h4></button>
                        </div>
                        <div id="v2sendconfigs" className="collapse" data-parent="#apicallsv2">
                            <div className="card-body">
                                <p>{t('accountApiListSendConfigsDesc')}</p>
                                <p><strong>{t('example')}</strong></p>
                                <pre>curl -H 'api-key: SUA_CHAVE_DE_API' \<br/>{`  '${getUrl('api-v1/send-configurations')}'`}</pre>
                                <p>{t('responseExample')}:</p>
                                <pre>{`{"data": [{"id": 1, "name": "System"}]}`}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#v2createcampaign"><h4>POST /api-v1/campaigns – {t('accountApiCreateCampaign')}</h4></button>
                        </div>
                        <div id="v2createcampaign" className="collapse" data-parent="#apicallsv2">
                            <div className="card-body">
                                <p>{t('accountApiCreateCampaignDesc')}</p>

                                <p><strong>{t('arguments')}</strong> (JSON body)</p>
                                <ul>
                                    <li><strong>name</strong> – {t('accountApiArgName')} (<em>{t('required')}</em>)</li>
                                    <li><strong>subject</strong> – {t('accountApiArgSubject')} (<em>{t('required')}</em>)</li>
                                    <li><strong>html</strong> – {t('accountApiArgHtml')} (<em>{t('required')}</em>)</li>
                                    <li><strong>list_id</strong> – {t('accountApiArgListId')} (<em>{t('required')}</em>, {t('accountApiSeeGetLists')})</li>
                                    <li><strong>send_configuration_id</strong> – {t('accountApiArgSendConfigId')} (<em>{t('required')}</em>, {t('accountApiSeeGetSendConfigs')})</li>
                                    <li><strong>sender</strong> – {t('accountApiArgSender')} <code>{`{"name": "...", "email": "..."}`}</code> (<em>{t('optional')}</em>)</li>
                                    <li><strong>text</strong> – {t('accountApiArgText')} (<em>{t('optional')}</em>)</li>
                                </ul>

                                <p><strong>{t('example')}</strong></p>
                                <pre>curl -X POST -H 'api-key: SUA_CHAVE_DE_API' -H 'Content-Type: application/json' \<br/>
{`  -d '{"name": "Clickdata Drops #1", "subject": "Clickdata Drops #1", "sender": {"name": "Clickdata Drops", "email": "drops@seudominio.com.br"}, "html": "<html>...</html>", "list_id": 12, "send_configuration_id": 1}' \\`}<br/>
{`  '${getUrl('api-v1/campaigns')}'`}</pre>
                                <p>{t('responseExample')}:</p>
                                <pre>{`{"id": 42}`}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#v2sendcampaign"><h4>POST /api-v1/campaigns/:id/send – {t('accountApiSendCampaign')}</h4></button>
                        </div>
                        <div id="v2sendcampaign" className="collapse" data-parent="#apicallsv2">
                            <div className="card-body">
                                <p>{t('accountApiSendCampaignDesc')}</p>
                                <p><strong>{t('example')}</strong></p>
                                <pre>curl -X POST -H 'api-key: SUA_CHAVE_DE_API' \<br/>{`  '${getUrl('api-v1/campaigns/42/send')}'`}</pre>
                                <p>{t('responseExample')}:</p>
                                <pre>{`{"status": 2}`}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#v2listcampaigns"><h4>GET /api-v1/campaigns – {t('accountApiListCampaigns')}</h4></button>
                        </div>
                        <div id="v2listcampaigns" className="collapse" data-parent="#apicallsv2">
                            <div className="card-body">
                                <p>{t('accountApiListCampaignsDesc')}</p>
                                <p><strong>{t('example')}</strong></p>
                                <pre>curl -H 'api-key: SUA_CHAVE_DE_API' \<br/>{`  '${getUrl('api-v1/campaigns?limit=10')}'`}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#v2contacts"><h4>GET/POST /api-v1/contacts – {t('accountApiContacts')}</h4></button>
                        </div>
                        <div id="v2contacts" className="collapse" data-parent="#apicallsv2">
                            <div className="card-body">
                                <p>{t('accountApiContactsDesc')}</p>
                                <p><strong>{t('example')}</strong></p>
                                <pre>curl -X POST -H 'api-key: SUA_CHAVE_DE_API' -H 'Content-Type: application/json' \<br/>
{`  -d '{"email": "pessoa@example.com", "list_id": 12}' \\`}<br/>
{`  '${getUrl('api-v1/contacts')}'`}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#v2transactional"><h4>POST /api-v1/transactional/send – {t('accountApiTransactional')}</h4></button>
                        </div>
                        <div id="v2transactional" className="collapse" data-parent="#apicallsv2">
                            <div className="card-body">
                                <p>{t('accountApiTransactionalDesc')}</p>
                                <p><strong>{t('example')}</strong></p>
                                <pre>curl -X POST -H 'api-key: SUA_CHAVE_DE_API' -H 'Content-Type: application/json' \<br/>
{`  -d '{"send_configuration_id": 1, "to": "pessoa@example.com", "subject": "Olá", "html": "<p>Oi!</p>"}' \\`}<br/>
{`  '${getUrl('api-v1/transactional/send')}'`}</pre>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mb-3 mt-3">
                    <div className="card-body">
                        <h4 className="card-title">{t('legacyApiTitle')}</h4>
                        <p>{t('legacyApiIntro')}</p>
                    </div>
                </div>

<div className="accordion" id="apicalls">
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moresubscribers"><h4>GET /api/subscriptions/:listCid – {t('getSubscribers')}</h4></button>
        </div>
        <div id="moresubscribers" className="collapse" data-parent="#apicalls">
            <div className="card-body">
               <p>
                    {t('getSubscribers')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}
                        <ul>
                        <li><strong>start</strong> – {t('startPosition')} (<em>{t('optionalDefault0')}</em>)</li>
                        <li><strong>limit</strong> – {t('limitEmailsCountInResponse')} (<em>{t('optionalDefault10000')}</em>)</li>
                        </ul>
                    </li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XGET '{getUrl(`api/subscriptions/P5wKkz-e7?access_token=${accessToken}&limit=10&start=10&search=gmail`)}' </pre>

            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <h4><button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moresubscribe"><h4>POST /api/subscribe/:listCid – {t('addSubscription')}</h4></button></h4>
        </div>
        <div id="moresubscribe" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('thisApiCallEitherInsertsANewSubscription')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                    <li><strong>EMAIL</strong> – {t('subscribersEmailAddress')} (<em>{t('required')}</em>)</li>
                    <li><strong>MERGE_FIRST_NAME</strong> – {t('subscribersFirstName')}</li>
                    <li><strong>MERGE_LAST_NAME</strong> – {t('subscribersLastName')}</li>
                    <li><strong>TIMEZONE</strong> – {t('subscribersTimezoneEgEuropeTallinnPstOr')}</li>
                    <li><strong>MERGE_TAG_VALUE</strong> – {t('customFieldValueUseYesnoForOptionGroup')}</li>
                </ul>

                <p>
                    {t('additionalPostArguments')}:
                </p>

                <ul>
                    <li>
                        <strong>FORCE_SUBSCRIBE</strong> – {t('setToYesIfYouWantToMakeSureTheEmailIs')}
                        by default.
                    </li>
                    <li>
                        <strong>REQUIRE_CONFIRMATION</strong> – {t('setToYesIfYouWantToSendConfirmationEmail')}
                    </li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/subscribe/B16uVTdW?access_token=${accessToken}`)}' \<br/>
--data 'EMAIL=test@example.com&amp;MERGE_CHECKBOX=yes&amp;REQUIRE_CONFIRMATION=yes'</pre>

                <p>
                    {t('responseExample')}:
                </p>
                <pre>"data": ("id":"TTrw41znK")</pre>

            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moreunsubscribe"><h4>POST /api/unsubscribe/:listCId – {t('removeSubscription')}</h4></button>
        </div>
        <div id="moreunsubscribe" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('thisApiCallMarksASubscriptionAs')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                    <li><strong>EMAIL</strong> – {t('subscribersEmailAddress')} (<em>{t('required')}</em>)</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/unsubscribe/B16uVTdW?access_token=${accessToken}`)}' \<br/>
--data 'EMAIL=test@example.com'</pre>

                <p>
                    {t('responseExample')}:
                </p>
                <pre>"data": ("id":"TTrw41znK", "unsubscribed":true)</pre>

            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moredelete"><h4>POST /api/delete/:listCId – {t('deleteSubscription')}</h4></button>
        </div>
        <div id="moredelete" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('thisApiCallDeletesASubscription')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                    <li><strong>EMAIL</strong> – {t('subscribersEmailAddress')} (<em>{t('required')}</em>)</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/delete/B16uVTdW?access_token=${accessToken}`)}' \<br/>
--data 'EMAIL=test@example.com'</pre>
                <p>
                    {t('responseExample')}:
                </p>
                <pre>"data": ("id":"TTrw41znK", "deleted":true)</pre>

            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#morefield"><h4>POST /api/field/:listId – {t('addNewCustomField')}</h4></button>
        </div>
        <div id="morefield" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('thisApiCallCreatesANewCustomFieldForA')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                    <li><strong>NAME</strong> – {t('fieldName')} (<em>{t('required')}</em>)</li>
                    <li><strong>TYPE</strong> – {t('oneOfTheFollowingTypes')}
                        <ul>
                            <li><strong>text</strong> &ndash; Text</li>
                            <li><strong>website</strong> &ndash; Website</li>
                            <li><strong>longtext</strong> &ndash; Multi-line text</li>
                            <li><strong>gpg</strong> &ndash; GPG Public Key</li>
                            <li><strong>number</strong> &ndash; Number</li>
                            <li><strong>radio</strong> &ndash; Radio Buttons</li>
                            <li><strong>checkbox</strong> &ndash; Checkboxes</li>
                            <li><strong>dropdown</strong> &ndash; Drop Down</li>
                            <li><strong>date-us</strong> &ndash; Date (MM/DD/YYY)</li>
                            <li><strong>date-eur</strong> &ndash; Date (DD/MM/YYYY)</li>
                            <li><strong>birthday-us</strong> &ndash; Birthday (MM/DD)</li>
                            <li><strong>birthday-eur</strong> &ndash; Birthday (DD/MM)</li>
                            <li><strong>json</strong> &ndash; JSON value for custom rendering</li>
                            <li><strong>option</strong> &ndash; Option</li>
                        </ul>
                    </li>
                    <li><strong>GROUP</strong> – {t('ifTheTypeIsOptionThenYouAlsoNeedTo')}</li>
                    <li><strong>GROUP_TEMPLATE</strong> – {t('templateForTheGroupElementIfNotSetThen')}</li>
                    <li><strong>VISIBLE</strong> – yes/no, {t('ifNotVisibleThenTheSubscriberCanNotView')}</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/field/B16uVTdW?access_token=${accessToken}`)}' \<br/>
--data 'NAME=Comment&TYPE=text'</pre>
                <p>
                    {t('responseExample')}:
                </p>
                <pre>"data": ("id":22, "tag":"MERGE_COMMENT")</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moreblacklistget"><h4>GET /api/blacklist/get – {t('getListOfBlacklistedEmails')}</h4></button>
        </div>
        <div id="moreblacklistget" className="collapse" data-parent="#apicalls">
            <div className="card-body">
               <p>
                    {t('thisApiCallGetListOfBlacklistedEmails')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}
                        <ul>
                        <li><strong>start</strong> – {t('startPosition')} (<em>{t('optionalDefault0')}</em>)</li>
                        <li><strong>limit</strong> – {t('limitEmailsCountInResponse')} (<em>{t('optionalDefault10000')}</em>)</li>
                        <li><strong>search</strong> – {t('filterByPartOfEmail')} (<em>{t('optionalDefault')}</em>)</li>
                        </ul>
                    </li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XGET '{getUrl(`api/blacklist/get?access_token=${accessToken}&limit=10&start=10&search=gmail`)}' </pre>

            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moreblacklistadd"><h4>POST /api/blacklist/add – {t('addEmailToBlacklist')}</h4></button>
        </div>
        <div id="moreblacklistadd" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('thisApiCallEitherAddEmailsToBlacklist')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                    <li><strong>EMAIL</strong> – {t('emailAddress')} (<em>{t('required')}</em>)</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/blacklist/add?access_token=${accessToken}`)}' \<br/>
--data 'EMAIL=test@example.com'</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moreblacklistdelete"><h4>POST /api/blacklist/delete – {t('deleteEmailFromBlacklist')}</h4></button>
        </div>
        <div id="moreblacklistdelete" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('thisApiCallEitherDeleteEmailsFrom')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                    <li><strong>EMAIL</strong> – {t('emailAddress')} (<em>{t('required')}</em>)</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/blacklist/delete?access_token=${accessToken}`)}' \<br/>
--data 'EMAIL=test@example.com'</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#morelistsemail"><h4>GET /api/lists/:email – {t('getTheListsAUserHasSubscribedTo')}</h4></button>
        </div>
        <div id="morelistsemail" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('retrieveTheListsThatTheUserWithEmailHas')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XGET '{getUrl(`api/lists/test@example.com?access_token=${accessToken}`)}'</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#morelistsnamespace"><h4>GET /api/lists-by-namespace/:namespaceId – {t('getTheListsInANamespace')}</h4></button>
        </div>
        <div id="morelistsnamespace" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                  {t('retrieveTheListsThatTheNamespaceWith')}
                </p>

                <p>
                  {t('queryParams')}
                </p>
                <ul>
                  <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                  <strong>{t('example')}</strong>
                </p>

                <pre>curl -XGET '{getUrl(`api/lists-by-namespace/1?access_token=${accessToken}`)}'</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#morecreatelist"><h4>POST /api/list – {t('createList')}</h4></button>
        </div>
        <div id="morecreatelist" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                  {t('createsANewListOfSubscribers')}
                </p>

                <p>
                  {t('queryParams')}
                </p>
                <ul>
                  <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                  <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                  <li><strong>NAMESPACE</strong> – {t('namespace')} (<em>{t('required')}</em>)</li>
                  <li><strong>UNSUBSCRIPTION_MODE</strong> – {t('unsubscription')} (<em>{t('required')}</em>):
                    <ul>
                      <li><strong>0</strong> - {t('onestepIeNoEmailWithConfirmationLink')}</li>
                      <li><strong>1</strong> - {t('onestepWithUnsubscriptionFormIeNoEmail')}</li>
                      <li><strong>2</strong> - {t('twostepIeAnEmailWithConfirmationLinkWill')}</li>
                      <li><strong>3</strong> - {t('twostepWithUnsubscriptionFormIeAnEmail')}</li>
                      <li><strong>4</strong> - {t('manualIeUnsubscriptionHasToBePerformedBy')}</li>
                    </ul>
                  </li>
                  <li><strong>NAME</strong> – {t('name')}</li>
                  <li><strong>DESCRIPTION</strong> – {t('description')}</li>
                  <li><strong>HOMEPAGE</strong> – {t('homepage')}</li>
                  <li><strong>CONTACT_EMAIL</strong> – {t('contactEmail')}</li>
                  <li><strong>DEFAULT_FORM</strong> – {t('webAndEmailFormsAndTemplatesUsedIn')}</li>
                  <li><strong>FIELDWIZARD</strong> – {t('representationOfSubscribersName')}:
                    <ul>
                      <li><strong>none</strong> - {t('emptyCustomNoFields')}</li>
                      <li><strong>full_name</strong> - {t('nameOneField')}</li>
                      <li><strong>first_last_name</strong> - {t('firstNameAndLastNameTwoFields')}</li>
                    </ul>
                  </li>
                  <li><strong>TO_NAME</strong> – {t('recipientsNameTemplate')}</li>
                  <li><strong>LISTUNSUBSCRIBE_DISABLED</strong> – {t('doNotSendListUnsubscribeHeaders')}</li>
                  <li><strong>PUBLIC_SUBSCRIBE</strong> – {t('allowPublicUsersToSubscribeThemselves')}</li>
                  <li><strong>SEND_CONFIGURATION</strong> – {t('sendConfiguration')}</li>
                </ul>

                <p>
                  <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/list?access_token=${accessToken}`)}' \<br/>
                  -d 'NAMESPACE=1' \<br/>
                  -d 'UNSUBSCRIPTION_MODE=0' \<br/>
                  -d 'NAME=list1' \<br/>
                  -d 'DESCRIPTION=a very nice list' \<br/>
                  -d 'CONTACT_EMAIL=test@example.com' \<br/>
                  -d 'HOMEPAGE=example.com' \<br/>
                  -d 'FIELDWIZARD=first_last_name' \<br/>
                  -d 'SEND_CONFIGURATION=1' \<br/>
                  -d 'PUBLIC_SUBSCRIBE=1' \<br/>
                  -d 'LISTUNSUBSCRIBE_DISABLED=0'
                </pre>
                <p>
                    {t('responseExample')}:
                </p>
                <pre>"data": ("id":"WSGjaP1fY")</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moredeletelist"><h4>DELETE /api/list/:listCId – {t('deleteList')}</h4></button>
        </div>
        <div id="moredeletelist" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                  {t('deletesAListOfSubscribers')}
                </p>

                <p>
                  {t('queryParams')}
                </p>
                <ul>
                  <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                  <strong>{t('example')}</strong>
                </p>

                <pre>curl -XDELETE '{getUrl(`api/list/WSGjaP1fY?access_token=${accessToken}`)}'</pre>
                <p>
                    {t('responseExample')}:
                </p>
                <pre>{t('emptyObject')}</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#morerss"><h4>GET /api/rss/fetch/:campaignCid – {t('triggerFetchOfACampaign')}</h4></button>
        </div>
        <div id="morerss" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('forcesTheRssFeedCheckToImmediatelyCheck')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XGET '{getUrl(`api/rss/fetch/5OOnZKrp0?access_token=${accessToken}`)}'</pre>
            </div>
        </div>
    </div>
    <div className="card">
        <div className="card-header">
          <button type="button" className="btn btn-link" data-toggle="collapse" data-target="#moretemplate"><h4>POST /api/templates/:templateId/send – {t('sendTransactionalEmail')}</h4></button>
        </div>
        <div id="moretemplate" className="collapse" data-parent="#apicalls">
            <div className="card-body">
                <p>
                    {t('sendSingleEmailByTemplateWithGiven')}
                </p>

                <p>
                    {t('queryParams')}
                </p>
                <ul>
                    <li><strong>access_token</strong> – {t('yourPersonalAccessToken')}</li>
                </ul>

                <p>
                    <strong>POST</strong> {t('arguments')}
                </p>
                <ul>
                    <li><strong>EMAIL</strong> – {t('emailAddress')} (<em>{t('required')}</em>)</li>
                    <li><strong>SEND_CONFIGURATION_ID</strong> – {t('idOfConfigurationUsedToCreateMailer')}</li>
                    <li><strong>SUBJECT</strong> – {t('subject')}</li>
                    <li><strong>TAGS</strong> – {t('mapOfTemplateVariablesToReplace')}</li>
                    <li><strong>ATTACHMENTS</strong> – {t('attachmentsFormatAsConsumedByNodemailer')}</li>
                </ul>

                <p>
                    <strong>{t('example')}</strong>
                </p>

                <pre>curl -XPOST '{getUrl(`api/templates/1/send?access_token=${accessToken}`)}' \<br/>
--data 'EMAIL=test@example.com&amp;SUBJECT=Test&amp;TAGS[FOO]=bar&amp;TAGS[TEST]=example'</pre>
            </div>
        </div>
    </div>
</div>



            </div>
        );
    }
}
