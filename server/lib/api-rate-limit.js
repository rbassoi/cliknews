'use strict';

const {RateLimiterMemory} = require('rate-limiter-flexible');

// In-memory, not Redis-backed: config.redis.enabled is false by default in
// this app (see server/config/default.yaml), and each app-type (trusted/
// sandboxed/public) already runs as a single process, so there's no second
// instance to keep in sync. See docs/saas-plan.md Part K.
const limitersByPlanCode = {
    free: new RateLimiterMemory({points: 60, duration: 60}),
    starter: new RateLimiterMemory({points: 180, duration: 60}),
    business: new RateLimiterMemory({points: 600, duration: 60}),
    enterprise: new RateLimiterMemory({points: 2000, duration: 60})
};
const defaultLimiter = limitersByPlanCode.free;

async function apiRateLimit(req, res, next) {
    const planCode = req.account && req.account.plan_code;
    const limiter = limitersByPlanCode[planCode] || defaultLimiter;

    try {
        await limiter.consume(String(req.account.id));
        next();
    } catch (err) {
        res.status(429).json({error: 'rate_limit_exceeded'});
    }
}

module.exports.apiRateLimit = apiRateLimit;
