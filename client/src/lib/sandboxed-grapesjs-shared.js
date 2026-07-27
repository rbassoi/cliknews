'use strict';

export const GrapesJSSourceType = {
    MJML: 'mjml',
    HTML: 'html',
    // Plain HTML in a web-page canvas (no email preset) — used by the visual
    // subscription-form builder (client/src/lib/sandboxed-form-builder.js) for
    // web_subscribe/web_manage, which need real <form>/<input> elements rather
    // than MJML's email-oriented component model.
    FORM: 'form'
};

export const getGrapesJSSourceTypeOptions = t => [
    {key: GrapesJSSourceType.MJML, label: t('mjml')},
    {key: GrapesJSSourceType.HTML, label: t('html')}
];
