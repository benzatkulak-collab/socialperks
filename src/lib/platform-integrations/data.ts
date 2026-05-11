export type PlatformIntegrationCategory =
  | "automation"
  | "ecommerce"
  | "cms"
  | "crm"
  | "email";

export type PlatformIntegrationStatus = "available" | "coming-soon";

export interface PlatformIntegrationStep {
  title: string;
  body: string;
}

export interface PlatformIntegrationFAQ {
  q: string;
  a: string;
}

export interface PlatformIntegration {
  slug: string;
  name: string;
  category: PlatformIntegrationCategory;
  oneLiner: string;
  whatItDoes: string;
  setupSteps: PlatformIntegrationStep[];
  useCases: string[];
  faqs: PlatformIntegrationFAQ[];
  status: PlatformIntegrationStatus;
  popularity: number;
}

export const PLATFORM_INTEGRATIONS: PlatformIntegration[] = [
  {
    slug: "zapier",
    name: "Zapier",
    category: "automation",
    status: "available",
    popularity: 10,
    oneLiner:
      "Connect Social Perks to 6,000+ apps and automate perk-driven marketing without writing a single line of code.",
    whatItDoes:
      "The Social Perks + Zapier integration lets you trigger campaigns, sync submissions, and route rewards across the apps your team already runs on. Every event in Social Perks — new submission, perk earned, campaign launched, fraud flag raised — can fire a Zap that updates a spreadsheet, posts to Slack, adds a contact to your CRM, or kicks off an SMS flow.\n\nBecause Zapier sits on top of our REST API, you get production-grade reliability and built-in retries without managing webhooks yourself. Most teams ship their first Zap in under ten minutes, and templates exist for the most common workflows so you do not start from a blank canvas.",
    setupSteps: [
      {
        title: "Generate a Social Perks API key",
        body: "Inside your Social Perks dashboard, open Settings → API Keys and create a read-write key scoped to the workspace you want to automate. Copy the key — Zapier asks for it on the next screen.",
      },
      {
        title: "Connect Social Perks in Zapier",
        body: "Search for Social Perks inside the Zapier app directory, click Connect, and paste the API key. Zapier will validate the connection and pull in your campaigns, programs, and influencers.",
      },
      {
        title: "Pick a trigger event",
        body: "Choose from triggers like New Submission, Perk Redeemed, Campaign Launched, Fraud Flag Raised, or Member Enrolled. Each trigger streams real data so you can map fields visually.",
      },
      {
        title: "Add an action and turn the Zap on",
        body: "Pick the destination app — Slack, Google Sheets, HubSpot, Klaviyo, anything in the Zapier directory — map the fields, run a test, and flip the Zap on. You are live.",
      },
    ],
    useCases: [
      "Post a Slack message to your #marketing channel every time a customer submits an Instagram story",
      "Add new perk redeemers as contacts in Mailchimp with a tag for follow-up sequences",
      "Append every approved submission to a Google Sheet for weekly reporting",
      "Send an SMS thank-you through Twilio when a customer completes a campaign action",
      "Trigger a HubSpot deal stage update when a customer earns their tenth perk",
    ],
    faqs: [
      {
        q: "Do I need a paid Zapier plan?",
        a: "Most Social Perks Zaps run on Zapier's free tier. Multi-step Zaps or high-volume workflows may require a Starter or Professional plan.",
      },
      {
        q: "Which Social Perks plans support the Zapier integration?",
        a: "Zapier works on every paid plan. The free plan supports read-only Zaps so you can prototype workflows.",
      },
      {
        q: "How fast does Zapier pick up new events?",
        a: "Polling triggers run every 1–15 minutes depending on your Zapier plan. Webhook-based triggers fire in under five seconds.",
      },
      {
        q: "Can I send data from Zapier into Social Perks?",
        a: "Yes. Social Perks exposes actions for creating campaigns, enrolling members, submitting proof of action, and issuing perks.",
      },
      {
        q: "Is the Zapier connection secure?",
        a: "Every request uses TLS 1.3 and your scoped API key. Keys can be rotated or revoked instantly from the dashboard.",
      },
      {
        q: "What happens if a Zap fails?",
        a: "Zapier retries failed Zaps automatically and logs the error. You can replay any failed event from the Zap history view.",
      },
    ],
  },
  {
    slug: "make",
    name: "Make.com",
    category: "automation",
    status: "available",
    popularity: 9,
    oneLiner:
      "Build visual, multi-branch automations between Social Perks and 1,500+ apps with Make's drag-and-drop scenario builder.",
    whatItDoes:
      "The Social Perks + Make.com integration gives operations teams the visual canvas they need to model complex perk-driven workflows. Unlike linear automation tools, Make lets you branch logic, run parallel paths, aggregate arrays, and route data through filters and routers — perfect for enterprise campaigns with multi-step approval and reward logic.\n\nEvery Social Perks API endpoint is exposed as a Make module. You can chain submissions, perk wallet updates, influencer matching, and exchange events into a single scenario that runs in real time or on a schedule, complete with error handlers and retry logic.",
    setupSteps: [
      {
        title: "Create a Social Perks API key",
        body: "In Social Perks, open Settings → API Keys and generate a read-write key. Note the workspace ID — Make uses it to scope every call.",
      },
      {
        title: "Add the Social Perks connection in Make",
        body: "Search the Make app directory for Social Perks, click Add, and paste your API key and workspace ID. Make verifies the connection in under five seconds.",
      },
      {
        title: "Drop a Social Perks trigger module onto a scenario",
        body: "Start a scenario with a trigger like Watch Submissions, Watch Perk Redemptions, or Watch Campaign Status Changes. Set the polling interval or use the instant webhook variant.",
      },
      {
        title: "Chain modules and turn the scenario on",
        body: "Add filters, routers, and downstream modules — Slack, Airtable, HubSpot, OpenAI, anything in the Make catalog. Run once to verify, then schedule.",
      },
    ],
    useCases: [
      "Route submissions through OpenAI for sentiment analysis before pushing approved ones to Airtable",
      "Aggregate weekly campaign metrics from Social Perks and email a PDF report to stakeholders",
      "Fan out a single influencer enrollment to Notion, HubSpot, and a Slack DM in parallel",
      "Throttle perk issuance based on inventory levels pulled from Shopify",
      "Detect duplicate submissions across campaigns and auto-merge member profiles",
    ],
    faqs: [
      {
        q: "Is Make better than Zapier for Social Perks?",
        a: "Make is better for complex, branching workflows and high-volume scenarios. Zapier is better for simple, one-trigger-one-action automations.",
      },
      {
        q: "How much does Make cost?",
        a: "Make has a free tier for up to 1,000 operations per month. Paid plans start at $9/month for 10,000 operations.",
      },
      {
        q: "Can I use Make for real-time triggers?",
        a: "Yes. Social Perks supports instant webhook triggers in Make for events like new submissions and perk redemptions.",
      },
      {
        q: "Does Make support the full Social Perks API?",
        a: "Yes. Every endpoint — campaigns, submissions, programs, exchange, influencers — is available as a Make module.",
      },
      {
        q: "How do I handle errors in Make?",
        a: "Make supports error handlers per module. You can route failures to a Slack alert, retry with backoff, or store them in a failure queue.",
      },
      {
        q: "Can I version-control my Make scenarios?",
        a: "Make scenarios can be exported as JSON and stored in Git. Social Perks publishes reference scenarios in our developer docs.",
      },
    ],
  },
  {
    slug: "n8n",
    name: "n8n",
    category: "automation",
    status: "available",
    popularity: 7,
    oneLiner:
      "Self-host your Social Perks automations with n8n — the open-source workflow engine trusted by privacy-conscious teams.",
    whatItDoes:
      "The Social Perks + n8n integration is the right choice when you need full control over where data flows. n8n is open-source and self-hostable, so submissions, customer data, and perk events never leave your infrastructure on the way to downstream systems. It is popular with enterprises in regulated industries and with technical founders who want automation without vendor lock-in.\n\nWe maintain a community n8n node that wraps every Social Perks API endpoint. Drop it into a workflow alongside HTTP request nodes, function nodes, and any of the 400+ pre-built n8n integrations to build automations that run on your own servers, in your own VPC.",
    setupSteps: [
      {
        title: "Install or sign up for n8n",
        body: "Self-host n8n via Docker or sign up for n8n Cloud. Either way, you will land in the workflow editor within a few minutes.",
      },
      {
        title: "Install the Social Perks community node",
        body: "From n8n's Settings → Community Nodes, install n8n-nodes-socialperks. Restart n8n and the node appears in the trigger and action menus.",
      },
      {
        title: "Add your Social Perks credentials",
        body: "Create a new credential of type Social Perks API and paste your API key. The credential is stored encrypted in n8n.",
      },
      {
        title: "Build, test, and activate your workflow",
        body: "Drop a Social Perks trigger node, chain it to actions, and click Execute Workflow to test with live data. Toggle Active to schedule it.",
      },
    ],
    useCases: [
      "Run perk-redemption analytics inside your own VPC without exporting customer data",
      "Sync submissions to a self-hosted PostgreSQL data warehouse for compliance reporting",
      "Trigger custom Python data-science scripts on every approved submission",
      "Forward fraud-flag events to a self-hosted alerting stack like Grafana or PagerDuty",
      "Run scheduled audits of perk-wallet balances and flag anomalies",
    ],
    faqs: [
      {
        q: "Is n8n really free?",
        a: "Yes. n8n is open-source under the Sustainable Use License. n8n Cloud is a paid hosted version.",
      },
      {
        q: "Where can I find the Social Perks node?",
        a: "It is published on npm as n8n-nodes-socialperks and installable from the n8n community-nodes menu.",
      },
      {
        q: "Does the n8n integration support webhooks?",
        a: "Yes. The Social Perks node exposes instant webhook triggers in addition to polling triggers.",
      },
      {
        q: "Can I deploy n8n on my own infrastructure?",
        a: "Yes. Self-hosting is the most popular deployment model. Docker, Kubernetes, and bare-metal installs are all supported.",
      },
      {
        q: "Is the Social Perks node officially supported?",
        a: "It is a community node maintained by the Social Perks developer relations team. We respond to GitHub issues within 48 hours.",
      },
      {
        q: "What is the minimum n8n version?",
        a: "The Social Perks node requires n8n 1.0 or later. We test against the latest stable release.",
      },
    ],
  },
  {
    slug: "pipedream",
    name: "Pipedream",
    category: "automation",
    status: "available",
    popularity: 6,
    oneLiner:
      "Build code-first Social Perks automations in JavaScript or Python with Pipedream's developer-friendly workflow runtime.",
    whatItDoes:
      "The Social Perks + Pipedream integration is built for developers who want to drop into code when no-code tools run out of expressiveness. Every Social Perks API endpoint is available as a pre-built Pipedream action, and you can intersperse them with Node.js or Python steps to transform data, call external APIs, or run custom business logic.\n\nPipedream workflows run on demand or on a schedule with generous free quotas, and every execution is logged with full request/response inspection — perfect for debugging complex perk lifecycles.",
    setupSteps: [
      {
        title: "Create a Pipedream account",
        body: "Sign up for Pipedream at pipedream.com. The free tier includes 10,000 invocations per month.",
      },
      {
        title: "Connect your Social Perks account",
        body: "From the Pipedream account screen, search for Social Perks and authenticate with your API key. Pipedream stores the key encrypted and rotates it on demand.",
      },
      {
        title: "Create a new workflow",
        body: "Pick a Social Perks trigger such as New Submission or Perk Earned. Pipedream emits live events you can inspect in the workflow builder.",
      },
      {
        title: "Add code steps and deploy",
        body: "Chain pre-built actions or write Node.js / Python steps. Click Deploy and the workflow goes live with detailed per-step logging.",
      },
    ],
    useCases: [
      "Enrich submissions with custom Node.js code that calls a third-party verification API",
      "Forward perk events to a Snowflake warehouse using Pipedream's data store",
      "Generate per-campaign QR codes on the fly with a Python step and push them to S3",
      "Pull daily campaign reports and post a summary to a Discord channel via webhook",
      "Schedule a nightly job that reconciles Social Perks ledger entries with Stripe payouts",
    ],
    faqs: [
      {
        q: "Do I need to know how to code to use Pipedream?",
        a: "No. The pre-built actions cover most workflows. Code steps are optional but unlock unlimited flexibility.",
      },
      {
        q: "What languages does Pipedream support?",
        a: "Node.js, Python, Go, and Bash code steps are first-class. You can also call any HTTP endpoint.",
      },
      {
        q: "How do logs work in Pipedream?",
        a: "Every workflow execution stores per-step request/response data for inspection. Logs are retained based on your plan.",
      },
      {
        q: "Can Pipedream replace a backend service?",
        a: "For lightweight integrations, yes. For high-throughput production services, treat Pipedream as a glue layer in front of your own backend.",
      },
      {
        q: "Is Pipedream HIPAA / SOC 2 compliant?",
        a: "Pipedream is SOC 2 Type II compliant. Contact Pipedream sales for HIPAA BAA options.",
      },
      {
        q: "How much does Pipedream cost?",
        a: "Free for 10,000 invocations/month. Paid plans start at $19/month for 25,000 invocations.",
      },
    ],
  },
  {
    slug: "shopify",
    name: "Shopify",
    category: "ecommerce",
    status: "available",
    popularity: 10,
    oneLiner:
      "Reward Shopify customers for posting about their purchases — perks unlock automatically after each verified order.",
    whatItDoes:
      "The Social Perks + Shopify integration turns every Shopify order into a marketing moment. Order confirmation emails embed a personalized perk offer; customers who post a photo, leave a review, or share the product unlock the perk back to their next order. Every step happens inside Shopify with no separate logins for your customers.\n\nUnder the hood, the integration uses Shopify's customer object, discount codes, and order webhooks. Perks become single-use discount codes tied to the customer who earned them, and redemptions write back to the Social Perks ledger for full attribution and ROI tracking.",
    setupSteps: [
      {
        title: "Install the Social Perks Shopify app",
        body: "Open the Shopify App Store, search for Social Perks, and click Install. Approve the requested permissions — orders, customers, discounts, and product reads.",
      },
      {
        title: "Connect your Social Perks workspace",
        body: "After install, you'll be redirected to a connect screen. Sign in to Social Perks and pick the workspace to link.",
      },
      {
        title: "Choose your campaign template",
        body: "Pick from review request, photo post, story share, or referral templates — or import a custom campaign from Social Perks.",
      },
      {
        title: "Customize the email and go live",
        body: "Edit the embedded perk block inside Shopify's order confirmation email, preview on mobile and desktop, and toggle the campaign on.",
      },
    ],
    useCases: [
      "Offer 15% off a customer's next order when they post their unboxing on Instagram",
      "Send a tiered discount that scales with the customer's follower count",
      "Trigger a perk campaign automatically for first-time buyers and a different one for repeat buyers",
      "Reward customers for leaving a Google Review with a free shipping coupon",
      "Run a giveaway where every social share counts as one entry across Shopify customers",
    ],
    faqs: [
      {
        q: "Does this work with Shopify Plus?",
        a: "Yes. The app supports Shopify Basic through Shopify Plus, including B2B and multi-currency stores.",
      },
      {
        q: "Will the perk codes conflict with existing Shopify discounts?",
        a: "No. Perks issue single-use codes that can be configured to stack or not stack with site-wide discounts.",
      },
      {
        q: "Does the app slow down my storefront?",
        a: "No. The customer-facing widget is lazy-loaded and adds under 10 KB to the order confirmation page.",
      },
      {
        q: "Can I customize the perk widget?",
        a: "Yes. Brand colors, fonts, and copy are configurable. Advanced users can override the widget via Liquid template tags.",
      },
      {
        q: "How are submissions verified?",
        a: "Customers paste a post URL or upload a screenshot. Social Perks' verification engine checks the post and either auto-approves or flags for human review.",
      },
      {
        q: "How do I track ROI?",
        a: "Every redeemed perk includes the originating Shopify order ID. The Social Perks dashboard shows attributed revenue, average order value, and cost per acquisition.",
      },
    ],
  },
  {
    slug: "woocommerce",
    name: "WooCommerce",
    category: "ecommerce",
    status: "available",
    popularity: 8,
    oneLiner:
      "Add a perk widget to your WooCommerce checkout and turn every order into a social media post.",
    whatItDoes:
      "The Social Perks + WooCommerce integration brings social-perk marketing to the world's most popular WordPress ecommerce platform. After install, every order confirmation page and email shows a customer-specific perk offer. Customers complete the requested action — review, share, post — and an automatically generated coupon unlocks in their WooCommerce account.\n\nThe integration ships as a standard WooCommerce plugin. It hooks into the order lifecycle, customer object, and WooCommerce coupon system so everything works with your existing payment gateways, taxes, and shipping rules.",
    setupSteps: [
      {
        title: "Install the Social Perks plugin",
        body: "Inside WordPress admin, go to Plugins → Add New, search for Social Perks for WooCommerce, install, and activate.",
      },
      {
        title: "Enter your API key",
        body: "Under WooCommerce → Settings → Social Perks, paste the API key from your Social Perks dashboard and save.",
      },
      {
        title: "Configure trigger and reward",
        body: "Choose which order events fire a perk offer (any order, first order, threshold orders) and which Social Perks campaign issues the reward.",
      },
      {
        title: "Test with a sandbox order and publish",
        body: "Place a test order in WooCommerce sandbox mode, verify the perk widget renders, then enable for live orders.",
      },
    ],
    useCases: [
      "Reward customers who leave a verified WooCommerce review with a discount on their next order",
      "Offer a free product when a customer shares their order on Facebook",
      "Run a referral campaign that gives both referrer and friend $10 off",
      "Send a thank-you perk to customers who complete a post-purchase survey",
      "Issue progressively bigger perks as a customer hits 5, 10, and 25 lifetime orders",
    ],
    faqs: [
      {
        q: "Does this require WooCommerce Subscriptions?",
        a: "No. The plugin works on any WooCommerce 6.0+ install, with or without subscription products.",
      },
      {
        q: "Is the plugin free?",
        a: "The plugin is free. Social Perks subscription costs apply as usual.",
      },
      {
        q: "Will it work with my page builder?",
        a: "Yes. Elementor, Divi, Beaver Builder, and the WordPress block editor are all supported via shortcode or block.",
      },
      {
        q: "Can I use it on a multisite install?",
        a: "Yes. The plugin supports WordPress multisite. Each site connects to its own Social Perks workspace.",
      },
      {
        q: "How does the plugin handle GDPR?",
        a: "Customer data sent to Social Perks honors WooCommerce's privacy settings, including data export and erasure requests.",
      },
      {
        q: "Where can I get support?",
        a: "Plugin support is provided by Social Perks' email support team and the WordPress.org plugin forum.",
      },
    ],
  },
  {
    slug: "squarespace",
    name: "Squarespace",
    category: "cms",
    status: "available",
    popularity: 7,
    oneLiner:
      "Embed a Social Perks widget on your Squarespace site in two clicks — no code required.",
    whatItDoes:
      "The Social Perks + Squarespace integration is the fastest way to start collecting reviews and social posts from customers visiting your Squarespace site. The embeddable widget drops into any page using a Squarespace Code Block, displays your active campaign, and lets visitors enroll, submit proof, and unlock perks without leaving your site.\n\nWe optimize the widget for Squarespace's design system: fonts, colors, and spacing inherit from your site theme by default, so it looks native. Sites with Squarespace Commerce can additionally trigger perks on order completion.",
    setupSteps: [
      {
        title: "Generate your widget snippet",
        body: "In Social Perks, open Widgets → New, pick the Squarespace preset, and copy the embed snippet.",
      },
      {
        title: "Add a Code Block to your Squarespace page",
        body: "Edit any Squarespace page, click Add Block → Code, and paste the snippet. Save the page.",
      },
      {
        title: "Customize the look",
        body: "Use the snippet's data attributes (or the visual editor inside Social Perks) to override colors and fonts. The widget inherits Squarespace fonts by default.",
      },
      {
        title: "Publish and announce",
        body: "Publish the page, then announce the perk on email and social to drive traffic. Track submissions in your Social Perks dashboard.",
      },
    ],
    useCases: [
      "Embed a perk widget on your homepage to capture reviews from existing customers",
      "Add a campaign-specific widget to a landing page for a product launch",
      "Show different perks to logged-in members vs. guests using Squarespace Member Areas",
      "Use Squarespace Commerce order webhooks to trigger post-purchase perks",
      "Run a referral campaign from your Squarespace blog with a social-share-to-unlock perk",
    ],
    faqs: [
      {
        q: "Do I need Squarespace Business or Commerce?",
        a: "Personal plan works for the basic widget. Code Block (used to embed the widget) requires Business plan or higher.",
      },
      {
        q: "Does the widget work on mobile?",
        a: "Yes. The widget is responsive and works on every Squarespace template.",
      },
      {
        q: "Can I A/B test perks on Squarespace?",
        a: "Yes. Social Perks' built-in A/B experiments split traffic at the widget level.",
      },
      {
        q: "Will it slow my site down?",
        a: "The widget is async-loaded and weighs under 30 KB. Lighthouse scores are unaffected in our testing.",
      },
      {
        q: "Can I use my own font?",
        a: "Yes. The widget inherits CSS variables, or you can override them via the embed snippet.",
      },
      {
        q: "Does it work with Squarespace 7.1?",
        a: "Yes. The widget is tested against Squarespace 7.0 and 7.1.",
      },
    ],
  },
  {
    slug: "wordpress",
    name: "WordPress",
    category: "cms",
    status: "available",
    popularity: 9,
    oneLiner:
      "Install the Social Perks plugin to add perk campaigns, widgets, and shortcodes anywhere on your WordPress site.",
    whatItDoes:
      "The Social Perks + WordPress plugin is a first-class way to run perk-driven marketing campaigns from your existing CMS. It registers a Gutenberg block, a classic shortcode, and a Customizer widget so you can drop a perk offer onto any page, post, or sidebar.\n\nThe plugin also exposes WordPress REST endpoints that mirror Social Perks events, letting developers extend campaigns with custom PHP. Combined with WooCommerce, MemberPress, or LearnDash, the plugin powers ecommerce, membership, and course-based perk programs.",
    setupSteps: [
      {
        title: "Install Social Perks from the WordPress plugin directory",
        body: "Navigate to Plugins → Add New, search Social Perks, install, and activate. The plugin auto-creates a Social Perks menu in the admin sidebar.",
      },
      {
        title: "Connect your account",
        body: "Open Social Perks → Settings, paste your API key, and click Connect. The plugin verifies the workspace and fetches your campaigns.",
      },
      {
        title: "Add the Social Perks block to a page",
        body: "Edit any page in Gutenberg, insert the Social Perks block, and pick the campaign to embed. Classic editor users can use the [social_perks] shortcode.",
      },
      {
        title: "Style and publish",
        body: "Pick a widget theme (light, dark, or auto) and update. The widget renders inline and works on every WordPress theme we have tested.",
      },
    ],
    useCases: [
      "Embed a perk on your homepage above the fold to grow your review count",
      "Use shortcodes inside blog posts to offer readers a perk for sharing the article",
      "Trigger perks from MemberPress membership signups",
      "Combine with LearnDash to reward students who post about your course",
      "Build custom PHP integrations using the plugin's REST API hooks",
    ],
    faqs: [
      {
        q: "What's the minimum WordPress version?",
        a: "WordPress 6.0+ and PHP 8.0+. Older versions may work but are not officially supported.",
      },
      {
        q: "Does the plugin support multisite?",
        a: "Yes. Each site in a multisite network connects to its own Social Perks workspace.",
      },
      {
        q: "Is there a Gutenberg block?",
        a: "Yes. The block lets you pick a campaign visually and preview it inside the editor.",
      },
      {
        q: "Can I use the plugin with caching?",
        a: "Yes. The widget is hydrated client-side, so it works with WP Rocket, W3 Total Cache, and Cloudflare.",
      },
      {
        q: "Does it work with translation plugins?",
        a: "Yes. Strings are translatable via WPML, Polylang, and the standard .pot file.",
      },
      {
        q: "Where can I find the source code?",
        a: "The plugin is open-source on GitHub at github.com/socialperks/wordpress-plugin.",
      },
    ],
  },
  {
    slug: "wix",
    name: "Wix",
    category: "cms",
    status: "available",
    popularity: 6,
    oneLiner:
      "Drop the Social Perks widget into your Wix site through the Wix App Market and start earning user-generated content today.",
    whatItDoes:
      "The Social Perks + Wix integration is the easiest way for Wix store owners and small-business sites to launch a perk campaign. The official app installs from the Wix App Market in one click, adds a draggable widget block to the Wix editor, and routes submissions and rewards through the Social Perks dashboard.\n\nFor Wix Stores customers, the app additionally hooks into order webhooks to fire post-purchase perks. For non-store sites, the widget acts as a standalone lead magnet that grows your customer list while collecting authentic social proof.",
    setupSteps: [
      {
        title: "Install the Social Perks app from the Wix App Market",
        body: "Search Wix App Market for Social Perks, click Add to Site, and authorize permissions.",
      },
      {
        title: "Sign in to Social Perks",
        body: "After install, sign in or create a Social Perks account. The app links your Wix site to your Social Perks workspace.",
      },
      {
        title: "Add the widget block to your site",
        body: "In the Wix editor, drag the Social Perks block onto any page. Pick the campaign in the block's settings panel.",
      },
      {
        title: "Publish your site",
        body: "Click Publish in Wix. The widget goes live immediately and submissions flow into Social Perks.",
      },
    ],
    useCases: [
      "Add a sidewide perk banner to your Wix homepage",
      "Trigger post-purchase perks for Wix Stores orders",
      "Embed a giveaway widget on a landing page promoting a new product",
      "Reward Wix Bookings customers for posting about their appointment",
      "Capture reviews from Wix Restaurants diners with a QR code perk",
    ],
    faqs: [
      {
        q: "Is the Wix app free?",
        a: "The app install is free. Social Perks subscription costs apply.",
      },
      {
        q: "Does this work with Wix Studio?",
        a: "Yes. The Wix Studio editor supports the Social Perks widget block.",
      },
      {
        q: "Will it slow down my Wix site?",
        a: "No. The widget is async-loaded and does not affect Wix's Lighthouse score.",
      },
      {
        q: "Can I use Wix Velo to extend the integration?",
        a: "Yes. Velo (Wix's developer platform) can call Social Perks APIs directly for advanced workflows.",
      },
      {
        q: "Does it support Wix Stores subscriptions?",
        a: "Yes. Subscription order events fire perk campaigns the same way one-time orders do.",
      },
      {
        q: "Where do I manage submissions?",
        a: "Submissions live in your Social Perks dashboard. You can also surface them inside Wix using Velo.",
      },
    ],
  },
  {
    slug: "webflow",
    name: "Webflow",
    category: "cms",
    status: "coming-soon",
    popularity: 7,
    oneLiner:
      "A native Social Perks Webflow integration is on the way — join the waitlist to get early access and influence the roadmap.",
    whatItDoes:
      "The Social Perks + Webflow integration (currently in private beta) will let Webflow designers drop a fully-styled perk widget into any page using Webflow's native components and CMS collections. Submissions, perks, and analytics will sync bidirectionally between Webflow CMS items and the Social Perks dashboard.\n\nWhile we finish the official app, you can already embed Social Perks today using Webflow's Embed element and our standard widget snippet — the same one used by our Squarespace and WordPress customers. The forthcoming app will replace the manual embed with a native Webflow App experience.",
    setupSteps: [
      {
        title: "Join the early-access waitlist",
        body: "Sign in to Social Perks and click Get Early Access in the Webflow integrations card. You'll be invited to the private beta in waves.",
      },
      {
        title: "Use the standard embed today",
        body: "Until the native app ships, paste the Social Perks widget snippet into a Webflow Embed element on any page. It works on every Webflow plan.",
      },
      {
        title: "Connect Webflow CMS via Zapier or Make",
        body: "Webflow CMS items can sync to Social Perks campaigns through our existing Zapier and Make integrations — no waiting required.",
      },
      {
        title: "Watch for launch updates",
        body: "We email beta participants with new builds. Once the native app ships, you'll be able to install it from the Webflow App Marketplace.",
      },
    ],
    useCases: [
      "Embed a perk widget on a Webflow marketing site using the standard snippet today",
      "Sync new Webflow CMS blog posts into Social Perks campaigns via Zapier",
      "Trigger a perk for newsletter signups from Webflow forms",
      "Award perks to readers who share specific Webflow CMS articles",
      "Run launch campaigns tied to Webflow Ecommerce products (beta)",
    ],
    faqs: [
      {
        q: "When will the native Webflow app launch?",
        a: "We're targeting a public launch in the next two quarters. Beta access is rolling out now.",
      },
      {
        q: "Can I use Social Perks on Webflow today?",
        a: "Yes — via the standard embed snippet inside a Webflow Embed element, or via Zapier/Make for CMS workflows.",
      },
      {
        q: "Will the native app cost extra?",
        a: "No. It will be included with every Social Perks plan, the same as our other CMS integrations.",
      },
      {
        q: "Will it work on the Webflow free plan?",
        a: "Embeds work on every Webflow plan. The native app may require Webflow Site or Workspace plans.",
      },
      {
        q: "Can I provide feedback?",
        a: "Yes. Beta participants get a dedicated Slack channel with the product team.",
      },
      {
        q: "Will it support Webflow Ecommerce?",
        a: "Yes. Ecommerce order webhooks will trigger perk campaigns natively.",
      },
    ],
  },
  {
    slug: "hubspot",
    name: "HubSpot",
    category: "crm",
    status: "coming-soon",
    popularity: 8,
    oneLiner:
      "A bi-directional HubSpot integration is launching soon — sync perks, submissions, and lifetime value into your CRM automatically.",
    whatItDoes:
      "The Social Perks + HubSpot integration (in late beta) will sync every Social Perks event into HubSpot's CRM as contact properties, timeline events, and workflows. Marketing teams will be able to score leads based on social-perk engagement, build lifecycle stages around perk earning, and trigger HubSpot Sequences from Social Perks submissions.\n\nUntil the native HubSpot app ships, you can already wire the two systems together via Zapier or Make — and many of our customers already do, syncing perk redeemers as HubSpot contacts in under five minutes.",
    setupSteps: [
      {
        title: "Join the beta waitlist",
        body: "Click Get Early Access on the HubSpot integration card inside Social Perks. Slots open weekly.",
      },
      {
        title: "Connect via Zapier today",
        body: "Use the Social Perks → HubSpot Zap templates to sync new submissions as contacts. Most teams ship this in under ten minutes.",
      },
      {
        title: "Map Social Perks fields to HubSpot properties",
        body: "In the beta, you'll pick which Social Perks events become HubSpot contact properties, timeline events, and custom objects.",
      },
      {
        title: "Activate and watch contacts populate",
        body: "Once approved, contacts will start populating in HubSpot in real time. Build workflows from the new fields.",
      },
    ],
    useCases: [
      "Sync every perk redeemer as a HubSpot contact with custom lifecycle stages",
      "Score leads based on social-perk engagement and feed top scorers into sales sequences",
      "Trigger a HubSpot workflow when a contact earns five perks in a quarter",
      "Add submission URLs as HubSpot timeline events for full account context",
      "Run reporting in HubSpot to attribute revenue to perk-driven channels",
    ],
    faqs: [
      {
        q: "Is HubSpot integration available today?",
        a: "Native bi-directional sync is in beta. Today you can use Zapier or Make for the same outcomes.",
      },
      {
        q: "Will the integration sync historical data?",
        a: "Yes. The beta supports a one-time backfill of historical submissions and perks into HubSpot.",
      },
      {
        q: "Which HubSpot products does it work with?",
        a: "Marketing Hub, Sales Hub, Service Hub, and Operations Hub — Free, Starter, Professional, and Enterprise tiers.",
      },
      {
        q: "Will it create custom objects in HubSpot?",
        a: "Yes. Perks, submissions, and campaigns will each have their own HubSpot custom object types.",
      },
      {
        q: "Is there a HubSpot App Marketplace listing?",
        a: "Yes — listing is in HubSpot's review queue. We'll announce when it goes live.",
      },
      {
        q: "Does it support HubSpot OAuth?",
        a: "Yes. The native integration uses OAuth so you never share API keys.",
      },
    ],
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    category: "crm",
    status: "coming-soon",
    popularity: 7,
    oneLiner:
      "Enterprise Salesforce sync is coming — surface Social Perks engagement data inside Sales Cloud, Service Cloud, and Marketing Cloud.",
    whatItDoes:
      "The Social Perks + Salesforce integration (in private alpha with enterprise design partners) will deliver native AppExchange-listed connectors for Sales Cloud, Service Cloud, and Marketing Cloud. Social Perks events will write to Salesforce as standard objects (Contact, Lead, Opportunity) and as custom objects for campaigns and perks.\n\nThe integration uses Salesforce's Bulk API 2.0 and Platform Events for real-time streaming. For enterprises that prefer middleware, we also publish reference patterns for MuleSoft and Boomi.",
    setupSteps: [
      {
        title: "Talk to your Social Perks account manager",
        body: "Salesforce alpha access is granted manually by our enterprise team. Reach out to schedule a scoping call.",
      },
      {
        title: "Provision a Salesforce sandbox",
        body: "We'll install the managed package in a Salesforce sandbox first so your admins can review object mappings and security model.",
      },
      {
        title: "Map objects and fields",
        body: "Pick which Social Perks events map to Salesforce standard or custom objects. Field mapping is fully configurable.",
      },
      {
        title: "Promote to production",
        body: "After validation in sandbox, the package is deployed to production and bi-directional sync turns on.",
      },
    ],
    useCases: [
      "Push every approved submission to a Salesforce Lead with source = Social Perks",
      "Score Salesforce Contacts based on cumulative perk activity for sales prioritization",
      "Build Marketing Cloud journeys that branch on Social Perks events",
      "Surface campaign ROI inside Salesforce dashboards via custom report types",
      "Sync perk redemptions into Service Cloud cases for post-purchase support workflows",
    ],
    faqs: [
      {
        q: "Is Salesforce integration on AppExchange?",
        a: "AppExchange listing is in the security-review phase. Alpha customers run the managed package directly today.",
      },
      {
        q: "Which Salesforce editions are supported?",
        a: "Enterprise, Unlimited, and Performance editions. Professional may require an API add-on.",
      },
      {
        q: "Does it support Marketing Cloud?",
        a: "Yes. Marketing Cloud Engagement journeys can be triggered from Social Perks events via Platform Events.",
      },
      {
        q: "How is data security handled?",
        a: "OAuth + scoped API access. Field-level encryption is supported for sensitive customer data.",
      },
      {
        q: "Can I use MuleSoft instead?",
        a: "Yes. We publish reference MuleSoft flows that hit our REST API. Same for Boomi.",
      },
      {
        q: "When will it be generally available?",
        a: "Targeted GA is within the next year. Alpha customers get a free 12-month enterprise license.",
      },
    ],
  },
  {
    slug: "mailchimp",
    name: "Mailchimp",
    category: "email",
    status: "available",
    popularity: 8,
    oneLiner:
      "Sync perk earners into Mailchimp audiences and trigger campaigns when customers complete social actions.",
    whatItDoes:
      "The Social Perks + Mailchimp integration syncs every perk earner into a Mailchimp audience with the right tags and merge fields. You can build automations that thank customers for posting, nurture high-engagement perk earners with VIP content, and segment by total perks earned or lifetime social value.\n\nThe integration handles audience growth, tag management, and merge-field updates in real time. New submissions land in Mailchimp within seconds, ready to trigger Mailchimp Customer Journeys.",
    setupSteps: [
      {
        title: "Generate a Mailchimp API key",
        body: "In Mailchimp, go to Account → Extras → API Keys and create a new key. Copy it for the next step.",
      },
      {
        title: "Connect Mailchimp in Social Perks",
        body: "In Social Perks, open Integrations → Mailchimp, paste your API key, and pick the target audience.",
      },
      {
        title: "Map Social Perks events to tags",
        body: "Choose which Social Perks events (submission approved, perk redeemed, fraud flag) create tags or update merge fields.",
      },
      {
        title: "Build a Mailchimp Customer Journey",
        body: "Inside Mailchimp, create a Customer Journey triggered by the Social Perks tags. Common starting point: thank customers who post their first review.",
      },
    ],
    useCases: [
      "Tag every customer who completes a campaign so Mailchimp can send a personalized thank-you",
      "Segment your top 10% perk earners and send them VIP invites",
      "Trigger a re-engagement series for customers who started a submission but didn't finish",
      "Add UTM parameters to Mailchimp links and attribute revenue back to Social Perks",
      "Build a Mailchimp survey email that fires on perk redemption to measure satisfaction",
    ],
    faqs: [
      {
        q: "Do I need a paid Mailchimp plan?",
        a: "Mailchimp's free plan works for basic tag sync. Customer Journeys require the Standard plan or higher.",
      },
      {
        q: "How fast does data sync?",
        a: "Within five seconds for new submissions. Bulk historical sync runs as a one-time background job.",
      },
      {
        q: "Can I sync multiple audiences?",
        a: "Yes. The integration supports multiple Mailchimp audiences per Social Perks workspace.",
      },
      {
        q: "Will it work with Mailchimp Transactional (Mandrill)?",
        a: "Yes. Transactional triggers are supported through a separate API key.",
      },
      {
        q: "Does it respect Mailchimp's GDPR settings?",
        a: "Yes. Subscribers added through Social Perks honor your Mailchimp signup form's consent settings.",
      },
      {
        q: "Can I unsubscribe a contact from Mailchimp via Social Perks?",
        a: "Yes. Suppression sync flows both directions: unsubscribes in Mailchimp also pause Social Perks emails.",
      },
    ],
  },
  {
    slug: "klaviyo",
    name: "Klaviyo",
    category: "email",
    status: "available",
    popularity: 7,
    oneLiner:
      "Send perk-driven Klaviyo flows that reward your best customers — built for Shopify, BigCommerce, and DTC brands.",
    whatItDoes:
      "The Social Perks + Klaviyo integration is built for DTC ecommerce teams already using Klaviyo as their email + SMS engine. Social Perks events stream into Klaviyo as Metrics, where they can trigger Flows, populate Segments, and feed into Klaviyo's predictive analytics for customer lifetime value.\n\nThe integration is a Klaviyo Public API consumer, so it supports profile updates, metric tracking, list management, and event-based triggers. Setup takes about ten minutes and there's no middleware to manage.",
    setupSteps: [
      {
        title: "Create a Klaviyo private API key",
        body: "In Klaviyo, go to Settings → API Keys → Create Private API Key. Grant Read and Write access to Profiles, Lists, and Events.",
      },
      {
        title: "Connect Klaviyo in Social Perks",
        body: "Open Integrations → Klaviyo, paste the API key, and pick which Social Perks events should flow into Klaviyo.",
      },
      {
        title: "Map events to Klaviyo Metrics",
        body: "Each Social Perks event becomes a Klaviyo Metric. Map fields like campaign name, perk value, and post URL into the metric properties.",
      },
      {
        title: "Build a Klaviyo Flow",
        body: "Inside Klaviyo, create a Flow triggered by the new Metric. Add email or SMS steps to thank, nurture, or upsell perk earners.",
      },
    ],
    useCases: [
      "Trigger a Klaviyo thank-you email within five minutes of an approved submission",
      "Build a segment of customers who earned three or more perks and send them an exclusive offer",
      "Use Klaviyo's predictive CLV to identify which perk earners are most likely to repurchase",
      "Send post-redemption SMS that asks for a follow-up review",
      "A/B test perk-themed subject lines in Klaviyo against your standard campaigns",
    ],
    faqs: [
      {
        q: "Which Klaviyo plans support this integration?",
        a: "All paid Klaviyo plans. The free plan supports basic profile sync only.",
      },
      {
        q: "Does it sync to Klaviyo SMS?",
        a: "Yes. Perk events can trigger Klaviyo SMS flows the same way they trigger email flows.",
      },
      {
        q: "Will the integration affect my deliverability?",
        a: "No. We use Klaviyo's official Public API and respect rate limits and bounce rules.",
      },
      {
        q: "Can I sync historical perk events?",
        a: "Yes. A one-time backfill imports up to 90 days of historical events into Klaviyo.",
      },
      {
        q: "Does it support Klaviyo Reviews?",
        a: "Yes. Approved Social Perks reviews can be pushed into Klaviyo Reviews as a backup or unified feed.",
      },
      {
        q: "How is profile matching handled?",
        a: "By email address first, then by phone number. Custom external IDs are also supported.",
      },
    ],
  },
  {
    slug: "convertkit",
    name: "ConvertKit",
    category: "email",
    status: "coming-soon",
    popularity: 6,
    oneLiner:
      "ConvertKit integration is coming soon — sync perk earners to your creator email list with one click.",
    whatItDoes:
      "The Social Perks + ConvertKit integration (in development) will give creators a simple, native way to sync perk earners into their ConvertKit forms, sequences, and tags. The integration is being designed around ConvertKit's creator-first metaphors: forms, broadcasts, sequences, and tags map cleanly to Social Perks campaigns and submission events.\n\nUntil the native integration ships, ConvertKit users can wire the two systems together via Zapier or Make. We publish a free Zapier template that covers the most common workflow — adding new perk redeemers as ConvertKit subscribers with a tag indicating which campaign earned them their reward.",
    setupSteps: [
      {
        title: "Join the early-access waitlist",
        body: "From Social Perks, click Get Early Access on the ConvertKit integration card. Spots open weekly.",
      },
      {
        title: "Use the Zapier template today",
        body: "Use our pre-built Zap template that adds Social Perks perk earners as ConvertKit subscribers with campaign-specific tags.",
      },
      {
        title: "Map Social Perks events to tags",
        body: "When the native integration launches, you'll map Social Perks events directly to ConvertKit tags, sequences, and forms.",
      },
      {
        title: "Get launch notifications",
        body: "Beta participants receive an email when the integration goes live, plus a free month of Social Perks Pro for participating.",
      },
    ],
    useCases: [
      "Add new perk redeemers as ConvertKit subscribers with the campaign name as a tag",
      "Trigger a ConvertKit sequence when a creator's fan posts about a product",
      "Segment subscribers by total perks earned and broadcast exclusive content",
      "Sync ConvertKit form completions back to Social Perks for cross-channel attribution",
      "Use perk redemption as an entry trigger for ConvertKit's Visual Automations",
    ],
    faqs: [
      {
        q: "When does ConvertKit integration launch?",
        a: "We're targeting general availability within the next quarter. Waitlist invites are rolling out.",
      },
      {
        q: "Can I use ConvertKit with Social Perks today?",
        a: "Yes — via Zapier or Make. We publish a free Zap template that covers most workflows.",
      },
      {
        q: "Will the integration support ConvertKit Commerce?",
        a: "Yes. Commerce sales will be syncable as perk-triggering events.",
      },
      {
        q: "Does it work with ConvertKit's Creator Pro plan?",
        a: "Yes — and Creator and free plans, as long as the API tier permits.",
      },
      {
        q: "Is there a beta program?",
        a: "Yes. Sign up via the integrations page in Social Perks.",
      },
      {
        q: "Will it support double-opt-in?",
        a: "Yes. The integration respects your ConvertKit account's opt-in settings.",
      },
    ],
  },
];

export const PLATFORM_INTEGRATION_SLUGS = PLATFORM_INTEGRATIONS.map(
  (p) => p.slug,
);

export const PLATFORM_INTEGRATION_CATEGORIES: {
  key: PlatformIntegrationCategory;
  label: string;
}[] = [
  { key: "automation", label: "Automation" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "cms", label: "CMS" },
  { key: "crm", label: "CRM" },
  { key: "email", label: "Email" },
];

export function getPlatformIntegration(
  slug: string,
): PlatformIntegration | undefined {
  return PLATFORM_INTEGRATIONS.find((p) => p.slug === slug);
}

export function getRelatedPlatformIntegrations(
  slug: string,
  category: PlatformIntegrationCategory,
  limit = 4,
): PlatformIntegration[] {
  const sameCategory = PLATFORM_INTEGRATIONS.filter(
    (p) => p.category === category && p.slug !== slug,
  );
  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }
  // Fill from other categories by popularity
  const others = PLATFORM_INTEGRATIONS.filter(
    (p) => p.category !== category && p.slug !== slug,
  ).sort((a, b) => b.popularity - a.popularity);
  return [...sameCategory, ...others].slice(0, limit);
}
