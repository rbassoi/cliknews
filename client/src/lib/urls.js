'use strict';

import {anonymousRestrictedAccessToken} from '../../../shared/urls';
import {AppType} from '../../../shared/app';
import cliknewsConfig from "cliknewsConfig";
import i18n from './i18n';

let restrictedAccessToken = anonymousRestrictedAccessToken;

export function setRestrictedAccessToken(token) {
    restrictedAccessToken = token;
}

export function getTrustedUrl(path) {
    return cliknewsConfig.trustedUrlBase + (path || '');
}

export function getSandboxUrl(path, customRestrictedAccessToken, opts) {
    const localRestrictedAccessToken = customRestrictedAccessToken || restrictedAccessToken;
     const url = new URL(localRestrictedAccessToken + '/' + (path || ''), cliknewsConfig.sandboxUrlBase);

    if (opts && opts.withLocale) {
        url.searchParams.append('locale', i18n.language);
    }

    return url.toString();
}

export function getPublicUrl(path, opts) {
    const url = new URL(path || '', cliknewsConfig.publicUrlBase);

    if (opts && opts.withLocale) {
        url.searchParams.append('locale', i18n.language);
    }

    return url.toString();
}

export function getUrl(path) {
    if (cliknewsConfig.appType === AppType.TRUSTED) {
        return getTrustedUrl(path);
    } else if (cliknewsConfig.appType === AppType.SANDBOXED) {
        return getSandboxUrl(path);
    } else if (cliknewsConfig.appType === AppType.PUBLIC) {
        return getPublicUrl(path);
    }
}

export function getBaseDir() {
    if (cliknewsConfig.appType === AppType.TRUSTED) {
        return cliknewsConfig.trustedUrlBaseDir;
    } else if (cliknewsConfig.appType === AppType.SANDBOXED) {
        return cliknewsConfig.sandboxUrlBaseDir + restrictedAccessToken;
    } else if (cliknewsConfig.appType === AppType.PUBLIC) {
        return cliknewsConfig.publicUrlBaseDir;
    }
}
