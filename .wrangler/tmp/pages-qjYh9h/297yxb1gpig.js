// <define:__ROUTES__>
var define_ROUTES_default = { version: 1, include: ["/*"], exclude: ["/favicon.ico", "/robots.txt", "/_next/static/*", "/fonts/*", "/data/*", "/*.png", "/*.ico", "/*.txt", "/*.json"] };

// node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "/Users/jonwillington/filter-website/.wrangler/tmp/pages-qjYh9h/bundledWorker-0.17721571720104623.mjs";
import { isRoutingRuleMatch } from "/Users/jonwillington/filter-website/node_modules/wrangler/templates/pages-dev-util.ts";
export * from "/Users/jonwillington/filter-website/.wrangler/tmp/pages-qjYh9h/bundledWorker-0.17721571720104623.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=297yxb1gpig.js.map
