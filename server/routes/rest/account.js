'use strict';

const passport = require('../../lib/passport');
const users = require('../../models/users');
const accounts = require('../../models/accounts');
const contextHelpers = require('../../lib/context-helpers');

const router = require('../../lib/router-async').create();


router.getAsync('/account', passport.loggedIn, async (req, res) => {
    const user = await users.getById(contextHelpers.getAdminContext(), req.user.id);
    user.hash = users.hash(user);
    return res.json(user);
});

router.postAsync('/account', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const data = req.body;
    data.id = req.user.id;

    await users.updateWithConsistencyCheck(contextHelpers.getAdminContext(), req.body, true);
    return res.json();
});

router.getAsync('/account-company', passport.loggedIn, async (req, res) => {
    const account = await accounts.getById(req.context.account.id);
    account.hash = accounts.hash(account);
    return res.json(account);
});

router.postAsync('/account-company', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    await accounts.updateOwnAccount(req.context, req.body);
    return res.json();
});

router.postAsync('/account-validate', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const data = req.body;
    data.id = req.user.id;

    return res.json(await users.serverValidate(contextHelpers.getAdminContext(), data, true));
});

router.getAsync('/access-token', passport.loggedIn, async (req, res) => {
    const accessToken = await users.getAccessToken(req.user.id);
    return res.json(accessToken);

});

router.postAsync('/access-token-reset', passport.loggedIn, passport.csrfProtection, async (req, res) => {
    const accessToken = await users.resetAccessToken(req.user.id);
    return res.json(accessToken);
});


router.postAsync('/signup', passport.csrfProtection, async (req, res) => {
    // Doesn't log the new user in — the account starts out 'pending' (see
    // accounts.signup()) and can't be used until the admin approves it, so there's
    // nothing useful to log into yet. The client shows a "awaiting approval"
    // message instead of redirecting into the app.
    await accounts.signup(req.body);
    return res.json();
});

router.post('/login', passport.csrfProtection, passport.restLogin);
router.post('/logout', passport.csrfProtection, passport.restLogout);

router.postAsync('/password-reset-send', passport.csrfProtection, async (req, res) => {
    await users.sendPasswordReset(req.locale, req.body.usernameOrEmail);
    return res.json();
});

router.postAsync('/password-reset-validate', passport.csrfProtection, async (req, res) => {
    const isValid = await users.isPasswordResetTokenValid(req.body.username, req.body.resetToken);
    return res.json(isValid);
});

router.postAsync('/password-reset', passport.csrfProtection, async (req, res) => {
    await users.resetPassword(req.body.username, req.body.resetToken, req.body.password);
    return res.json();
});

router.postAsync('/restricted-access-token', passport.loggedIn, async (req, res) => {
    const restrictedAccessToken = await users.getRestrictedAccessToken(req.context, req.body.method, req.body.params);
    return res.json(restrictedAccessToken);

});

router.putAsync('/restricted-access-token', passport.loggedIn, async (req, res) => {
    await users.refreshRestrictedAccessToken(req.context, req.body.token);
    return res.json();
});

module.exports = router;
