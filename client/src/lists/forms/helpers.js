'use strict';

import {GrapesJSSourceType} from '../../lib/sandboxed-grapesjs-shared';

// Web-facing template keys editable with the visual block builder (see
// docs/saas-plan.md's form-builder round). 'form' keys get field blocks (a real
// <form> is wrapped around the canvas content at save time, below); 'notice' keys
// are pure MJML content — grapesjs-mjml's own Text/Image/Divider/Button blocks
// already cover these, so they reuse the exact same MJML mode templates already use,
// no custom plugin or wrapping needed. web_manage_address/web_unsubscribe stay on
// the raw code editor: they're small, fixed-field forms (not driven by the list's
// custom fields), so a block builder wouldn't add much over hand-editing them.
export const visualBuilderKeys = {
    web_subscribe: {mode: 'form', sourceType: GrapesJSSourceType.FORM},
    web_manage: {mode: 'form', sourceType: GrapesJSSourceType.FORM},
    web_confirm_subscription_notice: {mode: 'notice', sourceType: GrapesJSSourceType.MJML},
    web_subscribed_notice: {mode: 'notice', sourceType: GrapesJSSourceType.MJML},
    web_updated_notice: {mode: 'notice', sourceType: GrapesJSSourceType.MJML},
    web_confirm_unsubscription_notice: {mode: 'notice', sourceType: GrapesJSSourceType.MJML},
    web_unsubscribed_notice: {mode: 'notice', sourceType: GrapesJSSourceType.MJML},
    web_manual_unsubscribe_notice: {mode: 'notice', sourceType: GrapesJSSourceType.MJML},
    web_privacy_policy_notice: {mode: 'notice', sourceType: GrapesJSSourceType.MJML}
};

// Matches server/views/subscription/partials/subscription-{subscribe,manage}-form.hbs
// exactly (CSRF token, honeypot/timestamp fields the subscribe flow relies on, submit
// button) — kept out of the editable canvas so a drag/delete slip can't corrupt them.
const formShells = {
    web_subscribe: {
        open:
            '<form id="main-form" method="post" action="/subscription/{{cid}}/subscribe">\n' +
            '<input type="hidden" name="_csrf" value="{{csrfToken}}">\n' +
            '<input type="hidden" class="tz-detect" name="tz" id="tz" value="{{tz}}">\n' +
            '<input type="hidden" name="address" value="">\n' +
            '<input type="hidden" name="sub" id="sub" value="">\n' +
            '<input type="hidden" name="ucid" value="{{ucid}}">\n',
        close:
            '\n<button type="submit">{{#translate}}subscribeToList{{/translate}}</button>\n' +
            '</form>\n' +
            '<script>document.getElementById(\'sub\').value = new Date().getTime();</script>'
    },
    web_manage: {
        open:
            '<form id="main-form" method="post" action="/subscription/{{lcid}}/manage">\n' +
            '<input type="hidden" name="_csrf" value="{{csrfToken}}">\n' +
            '<input type="hidden" name="cid" value="{{cid}}">\n' +
            '<input type="hidden" class="tz-detect" name="tz" id="tz" value="{{tz}}">\n',
        close:
            '\n<button type="submit">{{#translate}}updateProfile{{/translate}}</button>\n' +
            '</form>'
    }
};

/**
 * Turns the raw GrapesJS-exported inner content into the final value to store under
 * this key. Done client-side so the server never needs to know whether a value came
 * from the visual builder or was hand-typed — either way it arrives as one complete,
 * valid template string.
 */
export function wrapVisualBuilderContent(key, innerHtml) {
    const shell = formShells[key];
    if (!shell) {
        // Notice pages are already complete, valid MJML content (mj-section/mj-column/...)
        // on their own — no wrapping needed.
        return innerHtml;
    }

    // Matches server/views/subscription/web-{subscribe,manage}.mjml.hbs exactly: {{{body}}}
    // sits directly inside <mj-body> in layout.mjml.hbs, so this needs to be a complete
    // <mj-section> — a bare <mj-text> at the top level is invalid MJML (mj-text may only
    // appear inside mj-column/mj-hero/mj-attributes).
    return '<mj-section><mj-column><mj-text>' + shell.open + innerHtml + shell.close + '</mj-text></mj-column></mj-section>';
}
