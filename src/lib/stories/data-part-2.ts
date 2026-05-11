// Long-form story batches appended to STORIES in data.ts.
// Reddit-style first-person narratives. Composites based on common
// small-business marketing patterns; not attributed to named customers.
import type { Story } from "./data";

export const MISTAKE_STORIES: Story[] = [
  {
    slug: "the-biggest-marketing-mistake-i-made-as-a-restaurant-owner",
    title: "The biggest marketing mistake I made as a restaurant owner",
    category: "mistakes",
    categoryLabel: "Mistakes",
    excerpt:
      "I burned $8,000 in four months trying to do everything at once. Here is what I would do differently.",
    authorPersona: "Restaurant owner, Austin",
    publishedAt: "2026-02-14",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I opened a 38-seat neighborhood restaurant on the east side of Austin three years ago. The food was good, the rent was insane, and the marketing was entirely on me because I could not afford to hire anyone. In my first year I made every mistake on the menu. The biggest one cost me about $8,000 over four months, and I want to walk through it because nobody warned me before I did it.",
      },
      {
        type: "p",
        text: "Here is the mistake in one sentence: I tried to be on every platform at once. Instagram, TikTok, Facebook, Google Ads, Yelp ads, a printed flyer drop, a postcard mailer, a Groupon, and an email list I had no idea how to grow. I told myself I was hedging my bets. What I was actually doing was guaranteeing that nothing got enough attention to work.",
      },
      { type: "h2", text: "How the spiral started" },
      {
        type: "p",
        text: "Month one I was excited. I posted on Instagram every day for the first three weeks. I tried to film TikToks. I set up a Facebook page. I sent out 400 postcards to the surrounding zip codes for $312. I bought a $50 boosted post on Facebook. I created a Google My Business account and immediately spent $200 on local search ads. I think I slept maybe four hours a night that month.",
      },
      {
        type: "p",
        text: "By the end of month one I had spent $1,400 on marketing and had gained about 14 trackable new customers. The numbers were so embarrassing I did not write them down at the time. I figured I just needed to push harder. That was the mistake inside the mistake.",
      },
      { type: "h2", text: "Month two through four: the panic spending" },
      {
        type: "p",
        text: "When the first month did not work, I doubled down on the platforms I knew the least about. I hired a Fiverr person to run TikTok ads. I paid a local guy $400 to make me a Reels video that I never used because it did not look like our restaurant. I ran a Groupon that brought in 67 customers who tipped on the discounted price and never came back. By month four I had spent close to $8,000 and could not point to a single channel that was working.",
      },
      {
        type: "quote",
        text: "I was a restaurant owner pretending to be a marketing department. Both jobs got done worse than if I had picked one.",
      },
      { type: "h2", text: "The night I finally figured it out" },
      {
        type: "p",
        text: "My wife sat me down in our kitchen on a Sunday night and made me write down every dollar I had spent and every customer I could trace to a channel. We spent two hours on it. The truth was painful. About 70 percent of new customers were coming from one channel: people walking past the patio on a nice evening. The next biggest channel was Google reviews, which I had done nothing to grow. The flyers, the Groupons, the boosted posts, the Fiverr ads — all of them combined accounted for maybe 15 percent of new customers and 100 percent of my marketing spend.",
      },
      { type: "h2", text: "What I did the next Monday" },
      {
        type: "p",
        text: "I killed every paid channel except Google search ads, which I capped at $8 a day. I stopped posting on TikTok and Facebook entirely. I picked Instagram because I was actually okay at it and posted three times a week, no more. And I put a small card on every table asking diners to leave a Google review with a QR code that took them straight there. That was it. That was the entire marketing plan.",
      },
      {
        type: "p",
        text: "Within 60 days the Google review count went from 38 to 144. Within 90 days I was ranking in the top three results for our cuisine plus our neighborhood. Walk-in traffic, which was already my biggest channel, doubled. The restaurant has been profitable every month since.",
      },
      { type: "h2", text: "What I tell every new restaurant owner now" },
      {
        type: "ul",
        items: [
          "Pick one channel for the first 90 days. Just one.",
          "The channel should be where your real customers actually are, not where marketing influencers say they should be.",
          "For most neighborhood restaurants, that is Google reviews plus one social platform.",
          "Track customers, not impressions. Ask every new face how they heard about you and write it down.",
          "Stop posting on platforms where the algorithm has already decided you do not matter.",
        ],
      },
      {
        type: "p",
        text: "If I could replay year one I would have saved $7,000 and a lot of sleep. The mistake was not in which platform I picked. The mistake was thinking I had to be on all of them. Pick one. Get good. Then maybe add another.",
      },
    ],
    lessons: [
      {
        title: "Do not try to do everything at once",
        body: "Focus on one channel for 90 days before adding another. The discipline matters far more than the channel.",
      },
      {
        title: "Trace every customer to a source",
        body: "If you cannot say where 80 percent of your new customers come from, you cannot make a single rational marketing decision.",
      },
      {
        title: "Groupon trains the wrong customer",
        body: "Discount-hunters do not become regulars. They show up once, tip on the discount, and never return.",
      },
      {
        title: "Google reviews are free and underrated",
        body: "For a neighborhood business, your map-pack rank is worth more than any paid ad. Build the review pipeline first.",
      },
      {
        title: "Boosted posts are not a strategy",
        body: "Hitting boost on a post you already made is a tax. If you want paid ads to work, you need a campaign, an offer, and a way to measure it.",
      },
    ],
  },
  {
    slug: "i-spent-2000-on-facebook-ads-with-nothing-to-show-for-it",
    title: "I spent $2,000 on Facebook ads with nothing to show for it",
    category: "mistakes",
    categoryLabel: "Mistakes",
    excerpt:
      "Six weeks, eleven campaigns, and a slow lesson about what the dashboard does not tell you.",
    authorPersona: "Boutique pet supply shop owner, Portland",
    publishedAt: "2026-01-22",
    readingMinutes: 5,
    body: [
      {
        type: "p",
        text: "I run a small pet supply shop in Portland. We sell premium dog food, a curated selection of toys, and we have a little dog-wash station in the back that the regulars love. We have been open about two years. Six months ago I decided to take a real swing at Facebook ads because every podcast I listened to had a guest who said Facebook ads were the most underpriced advertising in history. I had $2,000 set aside. I treated it like tuition.",
      },
      { type: "h2", text: "The first campaign: the easy mistake" },
      {
        type: "p",
        text: "I followed a YouTube tutorial step by step. Boosted a post about our new collagen chew. Targeted dog owners in a 10-mile radius. Budget: $20 a day. The ad got 12,400 impressions in the first week. The dashboard showed 87 'engagements' and 11 'link clicks'. New customers in store who mentioned the ad: zero. New collagen chew sales online: two, totaling $34.",
      },
      {
        type: "p",
        text: "I told myself the creative was bad. I made a new one. Same result. I told myself the audience was wrong. I narrowed it to 'premium dog food buyers'. Same result. Over six weeks I ran eleven different campaigns, each with what I thought was a better hook. The total trackable revenue from $2,000 in spend was $187.",
      },
      { type: "h2", text: "What the dashboard was hiding from me" },
      {
        type: "p",
        text: "The Facebook dashboard kept telling me my cost-per-click was great. My cost per thousand impressions was great. My 'engagement rate' was above average. Everything was green. The one number that was not green was the only one that mattered: revenue. I had been so busy optimizing the metrics Facebook wanted me to optimize that I had stopped looking at the metric I needed to optimize.",
      },
      {
        type: "quote",
        text: "The dashboard is designed to make you feel good enough to keep spending. It is not designed to tell you whether the spending is working.",
      },
      { type: "h2", text: "The conversation with a friend who actually knows ads" },
      {
        type: "p",
        text: "Eventually I called a friend who runs ads professionally for ecommerce brands. She asked me three questions. What is your customer lifetime value? I did not know. What is your average order value? About $42. What percentage of your customers come back within 60 days? I had no idea. She told me I was not ready to run ads. Not because my ads were bad. Because my business did not have the data infrastructure to know whether the ads were working.",
      },
      {
        type: "p",
        text: "She told me that for a shop my size, with a $42 average order value, I needed customers to come back at least three times before Facebook ads could break even after Facebook took its cut and accounting for the cost of goods. I had never measured repeat purchase rate. I had no email list. I had no loyalty program. The customers the ads sent me had no path to coming back.",
      },
      { type: "h2", text: "What I should have built first" },
      {
        type: "ul",
        items: [
          "An email list with a real reason for people to join it.",
          "A way to ask every in-store customer for their email or phone number.",
          "A perk program that rewards a third visit, not a first one.",
          "A clear understanding of which products my best customers buy on visits two through five.",
          "A way to actually track which channel a customer came from.",
        ],
      },
      { type: "h2", text: "What I do now" },
      {
        type: "p",
        text: "I am not running paid ads at all right now. I built an email list of about 800 customers over four months using a simple in-store ask: leave your email, get $5 off your next visit of $25 or more. The list has driven about $4,200 in repeat business in the last three months at essentially zero cost. When I do go back to Facebook ads, it will be to bring people into the email list, not to sell them collagen chews directly. The ads will be the top of the funnel, not the funnel.",
      },
      {
        type: "p",
        text: "The $2,000 was not wasted. It was tuition. But I would have learned more if I had spent it on building the back end of my business instead of pouring it into the front end.",
      },
    ],
    lessons: [
      {
        title: "Vanity metrics are designed to feel good",
        body: "Cost per click, engagement rate, CPM — these tell you the ad is performing. They do not tell you the business is performing.",
      },
      {
        title: "Ads only work if customers come back",
        body: "For most small businesses, the first purchase loses money once you account for ad cost. You need a system to bring people back before paid ads make sense.",
      },
      {
        title: "Build the email list before the ad budget",
        body: "An email list of 800 real customers is worth more than $2,000 of cold Facebook ads. Build the asset, then drive traffic to it.",
      },
      {
        title: "Know your repeat purchase rate or do not run ads",
        body: "If you cannot tell a friend what percentage of customers come back within 60 days, you are not ready to spend money on acquisition.",
      },
      {
        title: "Treat the first $500 as tuition",
        body: "If you are going to spend on paid ads, expect the first chunk to teach you nothing about your business and everything about your assumptions. Then quit early.",
      },
    ],
  },
  {
    slug: "why-i-stopped-running-groupon-deals",
    title: "Why I stopped running Groupon deals (and what I wish I had known sooner)",
    category: "mistakes",
    categoryLabel: "Mistakes",
    excerpt:
      "Three deals, 412 redemptions, and a customer base that took 18 months to recover.",
    authorPersona: "Massage studio owner, San Diego",
    publishedAt: "2026-03-04",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I have a four-room massage studio off the 805 in San Diego. I have been running it for nine years. We do mostly therapeutic and prenatal work, with a small percentage of spa-style massages for date nights and the occasional gift card. Three years ago I ran my first Groupon. Two years ago I ran my third and last one. Here is what I should have known before signing the contract.",
      },
      { type: "h2", text: "The pitch that got me" },
      {
        type: "p",
        text: "A Groupon rep called me on a Tuesday afternoon. She was sharp, friendly, and asked exactly the right questions. She said her team had analyzed my zip code and that a 60-minute massage at $39 (down from $110) would do somewhere between 200 and 400 redemptions in the first month. She said I would get half: roughly $19.50 per massage. I would lose money on every single one, but I would 'fill my book' and convert them into regulars.",
      },
      {
        type: "p",
        text: "I asked her what percentage of Groupon customers typically convert. She said studies show 'around 20 to 30 percent'. I did the math on the back of a receipt. If 300 people redeemed and 25 percent converted, I would have 75 new regulars paying $110 going forward. The lifetime value math seemed obviously worth losing $30 a head in the short term.",
      },
      { type: "h2", text: "What actually happened on deal one" },
      {
        type: "p",
        text: "We sold 287 vouchers in the first nine days. Redemptions started the next week. The studio was booked solid for two months. My therapists were exhausted. The customers were, almost without exception, people I had never seen before and would never see again.",
      },
      {
        type: "ul",
        items: [
          "287 vouchers redeemed.",
          "Customers who rebooked at full price within 12 months: 19.",
          "Conversion rate: 6.6 percent. Not 25 percent.",
          "Customers who left a one-star or two-star review: 11.",
          "Net loss on the deal once you subtract therapist pay, supplies, and Groupon's cut: roughly $4,200.",
        ],
      },
      {
        type: "p",
        text: "The reviews were the worst part. Several Groupon customers showed up late, expected to be served past the end of their slot, and got upset when we charged them for the upgrade tier they had not pre-paid for. A two-star review on Yelp that said 'feels like a discount factory' lived on my profile for two years.",
      },
      { type: "h2", text: "Why I tried it twice more" },
      {
        type: "quote",
        text: "Sunk cost is a hell of a drug. I told myself the first deal was a learning experience and that I knew how to run the second one better.",
      },
      {
        type: "p",
        text: "Deal two: I narrowed the offer to a 90-minute deep tissue at $69, hoping a higher-ticket deal would attract a more serious customer. Result: 81 redemptions, 7 rebooked, similar review damage. Deal three, six months later: I tried a 'first-time client' restriction. Same result. The Groupon customer is a specific kind of customer. Discount-hunters are not converting into regulars no matter how I frame the offer.",
      },
      { type: "h2", text: "What I learned about the math nobody tells you" },
      {
        type: "p",
        text: "The Groupon math only works if you have spare capacity that would otherwise sit empty. I did not. I was already running at 70 percent capacity at full price. Every Groupon slot I gave away was a slot a full-price customer could not book. The opportunity cost made the actual loss closer to $7,000 per deal, not $4,200.",
      },
      {
        type: "p",
        text: "The other thing nobody mentioned is what happens to your full-price customers when they find out you ran a Groupon. Three of my best regulars asked if they could get the Groupon price. Two of them stopped coming after I said no. That is several thousand dollars a year of recurring revenue, gone, because I had advertised a 65-percent-off price to the world.",
      },
      { type: "h2", text: "What I do instead now" },
      {
        type: "p",
        text: "I run a referral perk program. Existing clients get $20 off their next session for every new client they send who books and shows up. The new client gets $20 off their first session. The two of them combined cost me $40, which is less than the $60 I was losing on each Groupon redemption. And the customers who come in are pre-qualified by someone who already trusts the studio. The conversion rate from referral first-visit to regular is north of 50 percent. The Groupon rate was 6.6.",
      },
      {
        type: "p",
        text: "If I had to do it again I would never have signed the first contract. The 'fill your book with new customers' pitch is technically true. It just leaves out which customers, at what cost, and what they do to the rest of your business.",
      },
    ],
    lessons: [
      {
        title: "Groupon does not bring you regulars",
        body: "The conversion rate from Groupon to full-price customer is closer to 5 percent than the 25 percent the reps quote you. Run the math on that number, not theirs.",
      },
      {
        title: "Opportunity cost is real",
        body: "If your capacity is already at 70 percent, every discounted slot is a slot a full-price customer cannot book. The real loss is bigger than what shows up on the invoice.",
      },
      {
        title: "Existing customers find out",
        body: "Your best regulars will see the deal. Some will ask for the discount. Some will leave when you say no. Account for that before you sign.",
      },
      {
        title: "Discount hunters write bad reviews",
        body: "Customers who got 65 percent off still expect 100 percent of the experience. The gap between expectation and reality lives on your review pages for years.",
      },
      {
        title: "Referrals beat Groupons by every measure",
        body: "A referral program costs less per new customer, converts at ten times the rate, and improves your reputation instead of damaging it.",
      },
    ],
  },
  {
    slug: "the-influencer-i-paid-1000-who-delivered-3-likes",
    title: "The influencer I paid $1,000 who delivered 3 likes",
    category: "mistakes",
    categoryLabel: "Mistakes",
    excerpt:
      "I learned the hard way that follower count is the most lie-able number in marketing.",
    authorPersona: "Skincare brand founder, Brooklyn",
    publishedAt: "2026-02-02",
    readingMinutes: 5,
    body: [
      {
        type: "p",
        text: "I run a small skincare brand. We make three products and sell them out of a tiny studio in Brooklyn and through our website. About 18 months ago I was looking for a way to expand beyond word of mouth and decided to try influencer marketing. I found an account I thought was perfect: 47,000 followers, 'clean beauty' aesthetic, all the right hashtags, lives in New York. I paid her $1,000 for a single Instagram post and one set of stories.",
      },
      { type: "h2", text: "The flags I missed" },
      {
        type: "p",
        text: "Looking back, the signs were obvious. Her last 12 posts had between 200 and 600 likes. For an account with 47,000 followers, that is an engagement rate under 1 percent. Healthy small influencer engagement is 3 to 6 percent. Her comments were almost all single emojis or generic phrases like 'beautiful' and 'love this!!'. The accounts commenting had names like 'beautyfanatic_2384' with no profile picture and three posts.",
      },
      {
        type: "p",
        text: "I did not check any of this. I checked her follower count, her aesthetic, and her DM responsiveness. She replied to me within an hour. She had a media kit. The media kit said 'average engagement: 4.2%'. I sent the money.",
      },
      { type: "h2", text: "The post went up. Nothing happened." },
      {
        type: "p",
        text: "Her post got 312 likes. Three of those were on a tagged version of the product. Stories had 1,200 views, which she sent me screenshots of. Link clicks from the swipe-up: 4. Sales on our website that day from the discount code: 0. Sales the following week: 0. New email signups: 1, and that was my mom.",
      },
      {
        type: "quote",
        text: "I spent more on that one post than I had spent on the next six months of marketing combined. The return was three likes and a lesson.",
      },
      { type: "h2", text: "The conversation I should have had before paying" },
      {
        type: "p",
        text: "I now know that the only useful conversation with an influencer before paying is this: can you show me the actual analytics on your last five posts? Not screenshots they prepared. A live screen-share of the Instagram dashboard. Real reach, real saves, real shares, real link clicks. The vast majority of influencers in the 10K-to-100K range will not do this. The ones who will are the ones worth working with.",
      },
      { type: "h2", text: "What real engagement looks like" },
      {
        type: "p",
        text: "Six months after the $1,000 disaster, I tried again. This time I reached out to an account with 4,200 followers who posted twice a week about her morning routine. Her likes were 300 to 600 per post. Her engagement rate was over 10 percent. I offered her $80 of free product and a 15 percent affiliate cut on sales from her code. She posted twice. Total likes across both posts: 940. Stories saw 1,800 views. Link clicks: 87. Sales from the code: 14, totaling $612 of revenue. Cost to me: $80 in product (which costs me $24 to make) plus about $90 in affiliate commission.",
      },
      {
        type: "p",
        text: "The 4,200-follower account outperformed the 47,000-follower account by every measure that mattered. By about 300x on dollars-per-result.",
      },
      { type: "h2", text: "Why this happens" },
      {
        type: "ul",
        items: [
          "Follower count can be bought. There are entire businesses that sell 10,000 followers for $40.",
          "Engagement can also be bought, through 'engagement pods' or comment bots, but it is harder to fake at the volume needed.",
          "An account with high follower count and low engagement is almost always inflated. Always.",
          "Small accounts have actual community. Their followers asked to be there because they liked the content.",
          "The audience that buys from an influencer is the audience that already trusts them, not the audience that scrolled past.",
        ],
      },
      { type: "h2", text: "What I would tell my past self" },
      {
        type: "p",
        text: "Pay attention to engagement rate, not follower count. Ask for live analytics, not screenshots. Start with smaller creators who actually know their audience. Pay in product first, money second. And never, ever wire $1,000 to an account that has 47,000 followers and gets 300 likes a post. That math has never worked and it never will.",
      },
    ],
    lessons: [
      {
        title: "Engagement rate is the only follower metric that matters",
        body: "Likes divided by followers. Under 1 percent means the account is inflated. Above 3 percent means there is a real audience there.",
      },
      {
        title: "Demand live analytics before paying",
        body: "Anyone who will not screen-share their Instagram insights is hiding something. The ones who will are the ones worth working with.",
      },
      {
        title: "Small creators outperform big ones for small budgets",
        body: "A 4,000-follower creator with real engagement will outsell a 50,000-follower creator with bots almost every time. Start small.",
      },
      {
        title: "Pay in product before cash",
        body: "Send product first, see how they post about it organically, then talk paid partnership. The ones who post nothing on their own are not worth a dollar.",
      },
      {
        title: "A media kit is a sales document, not a fact sheet",
        body: "The numbers in a media kit are the influencer's best case scenario. Treat them like a job applicant's resume — verify before you trust.",
      },
    ],
  },
  {
    slug: "how-i-killed-my-coffee-shops-instagram-engagement-in-30-days",
    title: "How I killed my coffee shop's Instagram engagement in 30 days",
    category: "mistakes",
    categoryLabel: "Mistakes",
    excerpt:
      "I followed the advice from every social media coach on Twitter. Engagement dropped 80 percent.",
    authorPersona: "Coffee shop co-owner, Asheville",
    publishedAt: "2026-03-19",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I co-own a small coffee shop in Asheville. We have been open for almost five years. Our Instagram had grown slowly to about 6,800 followers, with a stable engagement rate of about 5 percent. Posts of our morning bake regularly got 300 to 500 likes. Reels of the espresso pulls did even better. It was nothing wild, but it was honest growth and the people in our DMs were actual customers.",
      },
      {
        type: "p",
        text: "Then I made the mistake of spending a weekend on Marketing Twitter. I read 11 threads about how to grow on Instagram in 2026. I made a list of every tactic. I gave myself 30 days to implement everything. Here is what happened to our engagement.",
      },
      { type: "h2", text: "Tactic one: post daily, no exceptions" },
      {
        type: "p",
        text: "Every thread said the algorithm rewards consistency. I had been posting three times a week. I went to once a day, every day, including weekends. The first week the new posts averaged 180 likes instead of our usual 350. I told myself the algorithm needed to adjust to the new frequency.",
      },
      {
        type: "p",
        text: "It did not adjust. By week three, posts were averaging 90 likes. The followers who actually engaged were getting fatigued. The algorithm was showing my content to fewer people because the per-post engagement rate had dropped. Posting more had not given me more reach. It had given me less.",
      },
      { type: "h2", text: "Tactic two: jump on every trending audio" },
      {
        type: "p",
        text: "I was told that using trending audio is the single best way to get into the Explore page. So I started chasing trends. A trending sound about office workers. A trending sound about toxic relationships. A trending sound about overpriced apartments. I awkwardly tied each one to coffee.",
      },
      {
        type: "p",
        text: "One Reel got 14,000 views, which was three times our previous best. The followers it brought us? Almost none. The reach we got on the next regular post? Half of what it should have been. The algorithm had decided we were now a 'trending audio' account, not a 'local coffee shop' account, and the audience it sent us was the wrong audience.",
      },
      { type: "h2", text: "Tactic three: write 'longer captions with a hook'" },
      {
        type: "p",
        text: "The Marketing Twitter people loved long captions. They told me the first line should be a hook. They told me to break captions into short lines. They told me to add a CTA at the end. I tried it.",
      },
      {
        type: "quote",
        text: "Every caption I wrote made me cringe. I sounded like a LinkedIn influencer who had never operated a real business.",
      },
      {
        type: "p",
        text: "Engagement on those posts dropped 60 percent compared to our normal short captions. The voice was wrong. Our followers were locals who came in three times a week. They did not want a 'three-part framework for building your morning routine'. They wanted to know if we had a new pastry.",
      },
      { type: "h2", text: "Tactic four: comment-pod-style 'engagement loops'" },
      {
        type: "p",
        text: "A thread told me to create reciprocal comment chains with five other local businesses. We would all comment on each other's posts within the first hour to boost early engagement. I set this up. It worked for about a week, then Instagram cracked down on coordinated comment activity. Our reach dropped further. Two of the businesses in the loop got their accounts flagged. Mine did not, but the reach hit took six weeks to recover.",
      },
      { type: "h2", text: "The damage report at day 30" },
      {
        type: "ul",
        items: [
          "Average likes per post: 350 → 71.",
          "Average comments per post: 18 → 4.",
          "Engagement rate: 5.1% → 1.0%.",
          "Followers: +120 (mostly low-quality from the viral Reel).",
          "DMs from real customers per week: 8 → 2.",
          "Walk-ins who mentioned the Instagram in some way: 12 per week → 3 per week.",
        ],
      },
      { type: "h2", text: "Recovery and what actually works for us" },
      {
        type: "p",
        text: "It took about three months to undo the damage. I went back to three posts a week, all in our actual voice. I stopped chasing trending audio. I wrote captions the way I would talk to a customer at the bar. I let the engagement rate climb back. By month four we were back to roughly where we had been.",
      },
      {
        type: "p",
        text: "The lesson was not that social media advice is all bad. Some of it is great for someone. The lesson is that almost none of it was right for a small local coffee shop. The advice that grows a personal brand from 5,000 to 50,000 followers will actively damage a neighborhood business. Different goals, different game.",
      },
    ],
    lessons: [
      {
        title: "Posting more is not the same as posting better",
        body: "Daily posting only helps if every post hits at least your baseline engagement. Below that, the algorithm punishes you.",
      },
      {
        title: "Wrong-audience reach is worse than no reach",
        body: "A viral Reel that brings in followers who do not care about your business will tank the reach of your next ten posts.",
      },
      {
        title: "Stay in your voice",
        body: "If your caption sounds like a LinkedIn thread, your real customers will scroll past. Write the way you talk to people at the counter.",
      },
      {
        title: "Engagement pods are short-term, long-term-bad",
        body: "Coordinated reciprocal commenting will get flagged. The temporary boost is not worth the multi-month penalty.",
      },
      {
        title: "Local business plays a different game than personal brand",
        body: "Most viral Instagram advice is written for people growing a creator account. The tactics that work for them often destroy a small local business.",
      },
    ],
  },
];

export const WORKED_STORIES: Story[] = [];

export const INDUSTRY_STORIES: Story[] = [];
