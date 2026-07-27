'use strict';

import {anonymousRestrictedAccessToken} from '../../../shared/urls';
import {AppType} from '../../../shared/app';
import clikerConfig from "clikerConfig";
import i18n from './i18n';

let restrictedAccessToken = anonymousRestrictedAccessToken;

export function setRestrictedAccessToken(token) {
    restrictedAccessToken = token;
}

export function getTrustedUrl(path) {
    return clikerConfig.trustedUrlBase + (path || '');
}

export function getSandboxUrl(path, customRestrictedAccessToken, opts) {
    const localRestrictedAccessToken = customRestrictedAccessToken || restrictedAccessToken;
     const url = new URL(localRestrictedAccessToken + '/' + (path || ''), clikerConfig.sandboxUrlBase);

    if (opts && opts.withLocale) {
        url.searchParams.append('locale', i18n.language);
    }

    return url.toString();
}

export function getPublicUrl(path, opts) {
    const url = new URL(path || '', clikerConfig.publicUrlBase);

    if (opts && opts.withLocale) {
        url.searchParams.append('locale', i18n.language);
    }

    return url.toString();
}

export function getUrl(path) {
    if (clikerConfig.appType === AppType.TRUSTED) {
        return getTrustedUrl(path);
    } else if (clikerConfig.appType === AppType.SANDBOXED) {
        return getSandboxUrl(path);
    } else if (clikerConfig.appType === AppType.PUBLIC) {
        return getPublicUrl(path);
    }
}

export function getBaseDir() {
    if (clikerConfig.appType === AppType.TRUSTED) {
        return clikerConfig.trustedUrlBaseDir;
    } else if (clikerConfig.appType === AppType.SANDBOXED) {
        return clikerConfig.sandboxUrlBaseDir + restrictedAccessToken;
    } else if (clikerConfig.appType === AppType.PUBLIC) {
        return clikerConfig.publicUrlBaseDir;
    }
}
