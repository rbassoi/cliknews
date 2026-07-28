'use strict';

import React from 'react';
import {Link} from 'react-router-dom';
import {Icon} from '../lib/bootstrap-components';
import {withTranslation} from '../lib/i18n';
import {withComponentMixins} from '../lib/decorator-helpers';
import {getUrl} from '../lib/urls';

const features = [
    {icon: 'paper-plane', key: 'authFeatureSending'},
    {icon: 'file-alt', key: 'authFeatureForms'},
    {icon: 'chart-line', key: 'authFeatureReports'}
];

@withComponentMixins([
    withTranslation
])
class AuthLayout extends React.Component {
    render() {
        const t = this.props.t;

        return (
            <div className="cn-auth">
                <div className="cn-auth-hero">
                    <div className="cn-auth-hero-inner">
                        <Link className="cn-auth-brand" to="/">
                            <img className="cn-auth-logo" src={getUrl('static/cliker-icon.png')} alt="Cliker"/>
                            <span>cliker</span>
                        </Link>

                        <h1>{t('authHeroTitle')}</h1>
                        <p>{t('authHeroSubtitle')}</p>

                        <ul className="cn-auth-features">
                            {features.map(f => (
                                <li key={f.key}>
                                    <span className="cn-auth-feature-icon"><Icon icon={f.icon}/></span>
                                    {t(f.key)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="cn-auth-panel">
                    <div className="cn-auth-panel-inner">
                        <Link className="cn-auth-brand cn-auth-brand-mobile" to="/">
                            <img className="cn-auth-logo" src={getUrl('static/cliker-icon.png')} alt="Cliker"/>
                            <span>cliker</span>
                        </Link>

                        {this.props.eyebrow && <div className="cn-auth-eyebrow">{this.props.eyebrow}</div>}
                        {this.props.title && <h2 className="cn-auth-title">{this.props.title}</h2>}
                        {this.props.subtitle && <p className="cn-auth-subtitle">{this.props.subtitle}</p>}

                        {this.props.children}
                    </div>
                </div>
            </div>
        );
    }
}

export default AuthLayout;
