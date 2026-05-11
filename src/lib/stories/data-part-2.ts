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

export const WORKED_STORIES: Story[] = [
  {
    slug: "how-i-got-127-google-reviews-in-30-days-as-a-yoga-studio",
    title: "How I got 127 Google reviews in 30 days as a yoga studio",
    category: "what-worked",
    categoryLabel: "What worked",
    excerpt:
      "No ads. No giveaway. Just a QR code on the back of the mat rack and a script I made my front desk memorize.",
    authorPersona: "Yoga studio owner, Denver",
    publishedAt: "2026-03-26",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I own a yoga studio in Denver. We have three rooms, eight teachers, and about 220 active members. For the first four years we had 41 Google reviews. Total. In four years. Most of them from 2022 when one teacher asked her loyal students to leave reviews on a single Saturday afternoon. After that, nothing. I would ask a class every couple of months. People nodded politely and forgot the moment they walked out the door.",
      },
      {
        type: "p",
        text: "Three months ago I decided to actually fix this. I gave myself 30 days. The goal: 100 new Google reviews. No paid ads, no giveaway, no begging. I ended up with 127. Here is exactly what I did and what I would do differently next time.",
      },
      { type: "h2", text: "Why I cared in the first place" },
      {
        type: "p",
        text: "Two competing studios opened within 18 months of each other a half-mile from us. One of them had 312 reviews when they opened, because the owner had hustled hard in the pre-opening period. They were outranking us in Google Maps for every search I cared about. I watched our walk-in trial rate drop from about 6 a week to 2. The reviews were the difference. I am sure of it.",
      },
      { type: "h2", text: "The three pieces that made it work" },
      {
        type: "p",
        text: "I tested a lot of things in the first week and most of them did not move the needle. Here are the three that did.",
      },
      { type: "h2", text: "Piece one: the QR code on the back of the mat rack" },
      {
        type: "p",
        text: "Our front desk faces the mat rack. After class, every member walks back to the rack to grab their mat or put one away. I printed a 5x7 sign that said 'Loved class? Tell Google about Sarah/Maya/Hank. Takes 30 seconds. Their families read it.' Underneath was a QR code that opened directly to our Google review page with the prompt pre-filled.",
      },
      {
        type: "p",
        text: "The trick was the teacher names. We rotate the sign every week to match the teachers on the schedule that week. Students who just had a great class with Maya feel a stronger pull to mention Maya by name. About 60 percent of our reviews now name a specific teacher, which Google's algorithm seems to love.",
      },
      { type: "h2", text: "Piece two: the front-desk script" },
      {
        type: "p",
        text: "I wrote a single sentence and made every front desk staff person memorize it. They say it to every member who walks out and stops to chat. 'Hey, totally optional, but if you have 30 seconds we are trying to hit 100 Google reviews this month and you would make our day.' That is it. No discount, no incentive, no awkward upsell.",
      },
      {
        type: "quote",
        text: "The thing nobody told me about asking for reviews is that you have to actually ask. Like, out loud, with a human voice. The QR code alone got us maybe 20. The script unlocked the rest.",
      },
      { type: "h2", text: "Piece three: the personal text" },
      {
        type: "p",
        text: "On a Sunday night I went through our membership system and pulled the top 50 most-frequent attendees of the last 90 days. People who had been to 8 or more classes. I texted each of them personally from my phone. Not from a marketing tool. Not as a blast. One at a time.",
      },
      {
        type: "p",
        text: "The text said: 'Hey [name], it is [my name] from the studio. I have a weird favor to ask. We are trying to climb the Google rankings and I am hand-asking a handful of our most loyal members for a quick review. No obligation at all. Here is the link if you have a minute: [link].' That was it.",
      },
      {
        type: "p",
        text: "Out of 50 texts, 38 people left a review within 72 hours. The reviews from those 38 people were the best reviews on our page. Long, specific, names of teachers, names of classes, photos in some cases. Those are the ones that get a new prospect to click 'Book Trial'.",
      },
      { type: "h2", text: "The 30-day breakdown" },
      {
        type: "ul",
        items: [
          "Week 1: 22 reviews (mostly the personal texts).",
          "Week 2: 34 reviews (QR code starting to compound).",
          "Week 3: 41 reviews (front desk script in full swing, plus one teacher who became a believer and started asking from the front of the room before savasana).",
          "Week 4: 30 reviews (momentum starting to slow as we ran out of unasked regulars).",
          "Total: 127. Average star rating: 4.9. Total reviews now: 168.",
        ],
      },
      { type: "h2", text: "What happened to the business" },
      {
        type: "p",
        text: "Within 45 days of the campaign ending, our walk-in trial rate had gone from 2 a week back to 7. We rank #1 in the map pack for 'yoga studio near me' in our zip code. Trial-to-member conversion did not change much because that was already strong, but the top of the funnel doubled.",
      },
      {
        type: "p",
        text: "I tracked monthly recurring revenue from new memberships in the 60 days after vs. the 60 days before. New MRR added: $4,180 vs $1,920. So the campaign was worth roughly $2,200 of recurring revenue per month going forward, with a one-time cost of about $40 in printed signs and one Sunday night of texting.",
      },
      { type: "h2", text: "What I would do differently" },
      {
        type: "ul",
        items: [
          "Start the personal text wave on a Tuesday, not a Sunday. Sunday-night texts felt like work to people.",
          "Rotate the sign monthly with seasonal copy, not just teacher names.",
          "Build a quiet system to ask new members for a review at their 30-day mark, not just during a sprint.",
          "Send a thank-you reply to every review under the studio name. The signal back to Google matters, and members love seeing their name acknowledged.",
          "Train every teacher, not just the ones who naturally ask. The teachers who are uncomfortable asking are leaving the biggest gap.",
        ],
      },
    ],
    lessons: [
      {
        title: "Reviews compound. Get to 100 fast",
        body: "The jump from 40 reviews to 150 changes how the map pack treats you. The next 100 are easier than the first 100 because the social proof flywheel takes over.",
      },
      {
        title: "Name the staff in your ask",
        body: "Reviews that mention a specific teacher or stylist or barista feel more authentic and rank better. Make it easy to name names.",
      },
      {
        title: "Personal texts beat anything automated",
        body: "Thirty-eight out of fifty members responded to a hand-typed text. No marketing tool gets that conversion. Use this carefully and rarely.",
      },
      {
        title: "Ask in person, with a human voice",
        body: "QR codes and signs prime the pump. The actual review usually happens because a human at the front desk said the sentence out loud.",
      },
      {
        title: "Track new MRR, not review count",
        body: "Reviews are a means to an end. Measure how many new paying customers showed up because of them, not just how many stars you collected.",
      },
    ],
  },
  {
    slug: "the-3-instagram-tactics-that-tripled-my-salons-bookings",
    title: "The 3 Instagram tactics that tripled my salon's bookings",
    category: "what-worked",
    categoryLabel: "What worked",
    excerpt:
      "Not viral Reels. Not trending audio. Three boring tactics that took 90 days to work and changed everything.",
    authorPersona: "Hair salon owner, Nashville",
    publishedAt: "2026-04-02",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I own a small salon in East Nashville. Five chairs, four stylists plus me. We had been open about three years and were doing okay but our online bookings had plateaued at around 30 to 40 new clients a month coming in through Instagram. Most of them were the kind of one-time client who books because they saw a photo, comes in, never returns. I wanted regulars.",
      },
      {
        type: "p",
        text: "Last year I spent 90 days testing exactly three things on our Instagram. Nothing fancy. No paid ads, no influencer deals, no chasing trends. By month four we were bringing in 110+ new bookings a month, and the conversion to second visit went from about 20 percent to over 60 percent. Here is what I did.",
      },
      { type: "h2", text: "Tactic one: before/after carousels with the booking link in the first comment" },
      {
        type: "p",
        text: "I had been posting before/afters forever. Single photos. The 'after' shot was usually flattering, the 'before' was the client's selfie they had texted us. Engagement was fine but bookings from these posts were spotty.",
      },
      {
        type: "p",
        text: "I changed three things. First: every post became a carousel of 5 to 7 slides. Slide one was the dramatic after. Slides 2-4 were process shots: foiling, color in the bowl, glaze going on. Slide 5 was the before, only revealed at the end. The last slide was a 'book with [stylist name]' card with a QR code.",
      },
      {
        type: "p",
        text: "Second: I pinned the booking link as the first comment on every post, not in our bio. People who liked the post saw it directly under the caption. Third: the caption named the price range, the time it took, and the specific service so the right customer self-qualified before clicking.",
      },
      {
        type: "p",
        text: "The carousels went from averaging 400 impressions and 2 to 3 bookings to averaging 1,200 impressions and 8 to 12 bookings. The booking-per-post number tripled even though the impressions only tripled, because the qualification was tighter. Fewer 'just curious' clicks, more real bookings.",
      },
      { type: "h2", text: "Tactic two: the Tuesday DM ritual" },
      {
        type: "p",
        text: "Every Tuesday morning I sit down for 45 minutes and DM five people. Not five strangers. Five existing clients who have been in within the last 90 days. I message them something specific to their last visit.",
      },
      {
        type: "p",
        text: "Example: 'Hey, just saw a photo of a balayage that reminded me of yours from October. How is it holding up? You due for a glaze yet?' Or: 'I know you said you might want to go shorter in the spring. We have a slot Saturday morning if you want it before the others fill in.'",
      },
      {
        type: "quote",
        text: "I was treating Instagram as a billboard. It is actually a chat app. The five-DM ritual every Tuesday is the single highest-ROI 45 minutes in my week.",
      },
      {
        type: "p",
        text: "About 2 out of 5 of those DMs convert to a booking that week. That is 8 to 10 extra appointments a month, all from people who would have eventually rebooked but maybe in 2 or 3 months instead of this week. The math on filling otherwise-empty slots is significant.",
      },
      { type: "h2", text: "Tactic three: the stylist-of-the-week story takeover" },
      {
        type: "p",
        text: "Every week one of my stylists takes over our stories for a full day. They show their first coffee, their first client, the color theory whiteboard they sketch in the back room, lunch, their last client's reveal. The whole day. From their phone, in their voice, with their actual personality.",
      },
      {
        type: "p",
        text: "Why this worked is non-obvious. Hair is intimate. Choosing a new stylist feels like a small commitment. People do not want to book a 'salon'. They want to book a person. The takeover days let prospects pre-meet each stylist on their own time. By the time someone DMs to book, they almost always name the stylist they want.",
      },
      {
        type: "p",
        text: "The DMs we get on takeover days are 3 to 4 times higher than normal days. The conversion from DM to booking is also higher because the person already feels like they know who they are booking with. Our newest stylist, who had been struggling to fill her column, was fully booked within two weeks of her first takeover.",
      },
      { type: "h2", text: "The boring truth about what made this work" },
      {
        type: "ul",
        items: [
          "None of this was new. Carousels, DMs, story takeovers — every salon owner I know had thought about doing them.",
          "What made it work was actually doing it for 90 days without skipping a week.",
          "We did not gain a huge follower bump. We went from 3,200 to 4,100 followers over the period. The growth was in conversion, not reach.",
          "The whole strategy assumed our audience was already mostly local. We were not trying to reach Los Angeles. We were trying to convert the people who already followed us.",
          "Every tactic worked because it made the prospect feel known before they walked in the door.",
        ],
      },
      { type: "h2", text: "Numbers at the end of 90 days" },
      {
        type: "ul",
        items: [
          "New clients per month: 38 → 112.",
          "Second-visit conversion: 22% → 63%.",
          "Average new client booking value: $87 → $124 (the qualification in captions filtered out the cheapest service-seekers).",
          "Monthly revenue from new clients: roughly $3,300 → $13,800.",
          "Stylist column utilization average: 64% → 91%.",
        ],
      },
      {
        type: "p",
        text: "If I had to pick one to start with, it would be the Tuesday DM ritual. It costs nothing. It takes 45 minutes. It works the same week you start. And it teaches you what your real clients actually want, which makes every other tactic better.",
      },
    ],
    lessons: [
      {
        title: "Carousels outperform single posts for service businesses",
        body: "A 5-slide carousel that walks through process and ends with a booking card converts 2 to 3 times better than a single hero photo. Use the middle slides to build the story.",
      },
      {
        title: "Qualify in the caption",
        body: "Stating price range, time, and service in the caption reduces tire-kicker DMs and increases real bookings. The right customer self-selects.",
      },
      {
        title: "DMs are the highest-ROI 45 minutes you have",
        body: "Five personal DMs to recent clients every Tuesday will book more appointments than any Reel. Treat Instagram as a chat app, not a billboard.",
      },
      {
        title: "Pre-meet your staff in stories",
        body: "Service businesses are about people. Story takeovers let prospects choose their person before they ever DM you. Conversion to booking jumps.",
      },
      {
        title: "Conversion beats reach",
        body: "Going from 22% to 63% on second visits matters more than doubling your followers. Optimize the funnel before you pour more in the top.",
      },
    ],
  },
  {
    slug: "how-a-50-perk-cost-me-50-customers-and-i-couldnt-be-happier",
    title: "How a $50 perk cost me 50 customers and I could not be happier",
    category: "what-worked",
    categoryLabel: "What worked",
    excerpt:
      "A simple referral perk turned 12 of my best customers into a sales team. The 'cost' became my favorite line item.",
    authorPersona: "Pilates studio owner, Tampa",
    publishedAt: "2026-02-22",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I run a Pilates reformer studio in Tampa. Six reformers, two instructors plus me, monthly memberships only — no drop-ins. We had been open about 18 months and were stuck at around 60 active members. Every month I was adding 4 to 5 new members and losing 3 to 4. Net growth of one or two. It felt like running on a treadmill.",
      },
      {
        type: "p",
        text: "Then I built a referral perk. It is not complicated. It is not new. But over six months it has cost me about $2,500 in 'perks' and brought in over $48,000 in new recurring revenue. Best line item I have ever spent money on.",
      },
      { type: "h2", text: "The perk in one paragraph" },
      {
        type: "p",
        text: "If a current member refers a new member who signs up for our $189/month unlimited membership and stays for 30 days, the referring member gets $50 off their next month and the new member gets $50 off their first month. The referrer also gets a 'champion' badge in our community group chat, which sounds dumb but is genuinely a status item among our regulars. That is the whole program.",
      },
      { type: "h2", text: "Why $50 specifically" },
      {
        type: "p",
        text: "I tested three numbers before settling. $20 was too small to motivate. Nobody referred for $20. $100 was too big and made existing members feel like they were being paid, which they did not like. They wanted it to feel like a gift, not a commission. $50 was the sweet spot. Big enough to feel like real money, small enough to feel like a thank-you instead of a transaction.",
      },
      {
        type: "p",
        text: "The 30-day stay requirement was critical. Without it, the program incentivized members to drag any friend through the door for a single class. With it, members became choosier. They referred friends who actually wanted to do Pilates, not friends who wanted a free 50 dollars worth of class.",
      },
      { type: "h2", text: "The first month results" },
      {
        type: "p",
        text: "I rolled this out at the end of August. I told members about it in two places: a single Sunday email and a small printed card I taped on each reformer. That is it. No big launch. No social media campaign.",
      },
      {
        type: "ul",
        items: [
          "September: 8 referrals, 6 stayed past 30 days, $300 in perks paid out, $1,134 in new MRR added.",
          "October: 11 referrals, 9 stayed, $450 in perks, $1,701 in new MRR.",
          "November: 14 referrals, 11 stayed, $550 in perks, $2,079 in new MRR.",
          "December (slow): 6 referrals, 5 stayed, $250 in perks, $945 in new MRR.",
          "January (best ever): 19 referrals, 17 stayed, $850 in perks, $3,213 in new MRR.",
          "February (in progress): on track for similar to January.",
        ],
      },
      { type: "h2", text: "Who actually became my sales team" },
      {
        type: "p",
        text: "Here is the thing I did not expect. The members who referred were not the loudest or most engaged ones. It was not the front-row people. It was a quieter group of 12 members who I now think of as my actual sales team. They referred 6, 8, 10 friends over a few months. They told me later that the perk gave them an excuse to invite friends they had been wanting to invite anyway. They just needed a frame to bring it up.",
      },
      {
        type: "quote",
        text: "The perk did not motivate referrals. It legitimized them. My members were already trying to invite their friends. The $50 just gave them the permission slip.",
      },
      { type: "h2", text: "The lost customers" },
      {
        type: "p",
        text: "Now, the title of this story. We had about 50 members at the time who never referred anyone. After six months of the program running, 14 of them quietly left. Not because of the program. Because of what the program revealed. The members who referred were the members who loved the studio. The ones who left were the ones who never quite did. They had been on the edge for months. Watching their friends get invited to a community they were not part of made them realize they were not part of it.",
      },
      {
        type: "p",
        text: "Losing those members ended up being a feature, not a bug. They were the members who tended to complain about the temperature, request schedule changes that did not work for anyone, and put downward pressure on the energy of the room. Their replacements, brought in by the referral program, were active community members from day one.",
      },
      { type: "h2", text: "What I changed after the first six months" },
      {
        type: "p",
        text: "I added one wrinkle in month four. Once a member had referred 3 friends who stayed, they got an additional month free instead of a fourth $50 off. The math is roughly the same but the messaging feels different. 'Three friends and your next month is on us' moves people in a way that '$50 off four times' does not.",
      },
      {
        type: "p",
        text: "I also send a personal thank-you DM every time someone refers. Just me, from my phone, to the referring member. Not a templated one. The DM does more than the money. People who referred and got the DM almost always referred again.",
      },
      { type: "h2", text: "What I would do differently" },
      {
        type: "ul",
        items: [
          "Start tracking referrals from day one of opening, not at month 18.",
          "Make the perk available the moment a new member signs up, not after their first month. Newer members are best positioned to invite, because their excitement is highest.",
          "Build the program into the membership signup flow so it is unmissable, not buried in an email.",
          "Send the personal thank-you within 24 hours, not the next time I happen to log into the system.",
          "Be intentional about which members I ask in person to refer. The 12 who became my sales team are still the 12. Find them earlier next time.",
        ],
      },
      {
        type: "p",
        text: "The studio is now at 94 active members. We are out of slots on the reformers at peak hours. The next problem is good. I get to think about whether to open a second location, which is a much better problem than wondering why nobody is signing up.",
      },
    ],
    lessons: [
      {
        title: "The perk amount is a feeling, not a math problem",
        body: "$20 is too small to motivate, $100 feels transactional. $50 reads as a gift. Test inside your category, but err toward 'thank-you-sized' not 'commission-sized'.",
      },
      {
        title: "Make the new customer stay before paying out",
        body: "A 30-day stay requirement transforms the referral pool. Without it, members refer warm bodies. With it, they refer real prospects.",
      },
      {
        title: "Status beats cash for your top referrers",
        body: "The 'champion' badge in the community chat motivates more than the $50. Build a visible recognition layer alongside the financial perk.",
      },
      {
        title: "Losing edge customers is okay",
        body: "When a referral program reveals who actually loves you, the unhappy ones at the edges will leave. Their replacements will be 10x better. Let it happen.",
      },
      {
        title: "Personal thanks compound the effect",
        body: "A DM from the owner after each referral does more than the perk itself. The members who got a personal note referred again at much higher rates.",
      },
    ],
  },
  {
    slug: "why-i-fired-my-marketing-agency-and-results-improved",
    title: "Why I fired my marketing agency and results improved",
    category: "what-worked",
    categoryLabel: "What worked",
    excerpt:
      "$4,200 a month for 11 months. The week after I fired them, leads went up. Here is what I learned.",
    authorPersona: "Dental practice owner, Phoenix",
    publishedAt: "2026-01-15",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I own a two-chair dental practice in Phoenix. Family dentistry, cosmetic, the occasional emergency. In year two I hired a marketing agency because I was tired of doing marketing while doing dentistry. They were referred by a friend, came with a slick deck, and quoted me $4,200 a month for what they called a 'full-funnel local SEO and paid acquisition system'. I said yes.",
      },
      {
        type: "p",
        text: "Eleven months later I fired them. The week after, our lead flow went up. Not down. Up. I want to talk about why, because I think a lot of small businesses are paying for marketing that is actively making things worse and they do not know how to tell.",
      },
      { type: "h2", text: "The first three months: it felt great" },
      {
        type: "p",
        text: "Month one they did a brand audit, a keyword audit, a competitor audit, a 'voice of customer' study. The deck was beautiful. Month two they redesigned our Google Business profile, refreshed our website hero, set up Google Ads, set up Facebook Ads, set up a Yelp ad budget. Month three they sent the first dashboard. It was full of green checkmarks. I felt taken care of for the first time in years.",
      },
      { type: "h2", text: "The next eight months: it stopped feeling like anything" },
      {
        type: "p",
        text: "The dashboards kept coming. The numbers were always going up. 'Impressions up 312% month over month.' 'Click-through rate above industry benchmark.' 'Brand search volume trending positively.' Beautiful charts in beautiful colors. I had no idea if any of it was working.",
      },
      {
        type: "p",
        text: "When I asked specifically about new patients, the answers got fuzzy. 'We are seeing strong indicators.' 'The brand is building.' 'Cosmetic inquiries are up qualitatively.' When I asked for an actual count of new patients who could be traced to anything they were running, the answer was: 'attribution in healthcare is complex, but we are seeing strong directional signals'.",
      },
      {
        type: "quote",
        text: "I was paying $4,200 a month for the feeling of being marketed. The actual marketing was somewhere between negligible and zero.",
      },
      { type: "h2", text: "The numbers I finally tracked myself" },
      {
        type: "p",
        text: "In month nine I started doing something the agency had never done. I had my front desk ask every new patient one specific question: 'How did you find us?' I made a five-column spreadsheet: Referral, Google Maps, Google Ads, Insurance directory, Other. Eight weeks of data, 47 new patients.",
      },
      {
        type: "ul",
        items: [
          "Referral: 26 patients (55%).",
          "Google Maps (organic): 13 patients (28%).",
          "Insurance directory: 5 patients (11%).",
          "Other (drove past, neighbor, etc.): 2 patients (4%).",
          "Google Ads: 1 patient (2%).",
          "Facebook Ads: 0.",
          "Yelp Ads: 0.",
        ],
      },
      {
        type: "p",
        text: "The agency was managing $1,800 a month in ad spend on top of their $4,200 fee. The combined spend was generating 1 patient out of 47. The other 46 were coming from things the agency had no claim on: word of mouth, our existing Google Maps presence, and the insurance directory the agency had never even mentioned.",
      },
      { type: "h2", text: "What I did the day I fired them" },
      {
        type: "p",
        text: "I sent a polite email ending the contract with 30 days notice. The reply was a long PDF about 'attribution modeling' and 'multi-touch journeys' explaining why my numbers undercounted their contribution. I read it carefully. Then I fired them anyway.",
      },
      {
        type: "p",
        text: "The same week, I took the $4,200 a month and split it like this. $400 a month for a part-time virtual assistant in the Philippines who manages our Google Business profile, replies to reviews, and uploads weekly photos. $200 a month for a tool that lets me text patients post-visit and ask for a review. $300 a month into a small print budget for the referral cards we hand out at checkout. $400 a month for Google search ads that I now run myself, capped tightly on five branded and intent-based keywords. The remaining $2,900 went straight to my bank account.",
      },
      { type: "h2", text: "What happened in the next 90 days" },
      {
        type: "p",
        text: "Google review count went from 89 to 217. Google Maps rank for 'dentist [neighborhood]' went from #6 to #1. New patients per month went from an average of 18 to 31. Referral-marked patients climbed from 26 to 38 in the first 8 weeks alone, because the cards at checkout were finally being used consistently and reviews kept driving more reviews.",
      },
      {
        type: "p",
        text: "The agency had been running ads. I was now running a business. The difference was that I knew what was working because I had set up the simple act of asking every new patient how they found us. That five-column spreadsheet was worth more than the entire agency contract.",
      },
      { type: "h2", text: "When an agency actually makes sense" },
      {
        type: "ul",
        items: [
          "When you are spending more than $10,000 a month on paid acquisition and need a specialist to manage budget allocation.",
          "When you have a specific complex problem (CRO on a high-volume site, technical SEO migration, programmatic SEO) that requires deep expertise.",
          "When you have your own attribution data and can hold the agency accountable to specific tracked-revenue numbers, not 'impressions'.",
          "When the agency works on performance terms instead of monthly retainers, or at least caps the retainer below a percentage of attributed revenue.",
          "Not, ever, when you are paying for 'brand building' or 'full funnel' without a clear definition of which numbers will move and by when.",
        ],
      },
      {
        type: "p",
        text: "Looking back, the agency was not malicious. They were doing what their playbook said to do for any client. The problem was that their playbook was designed for $50,000-a-month spenders and I was a $4,000-a-month spender. At my scale, the agency overhead ate everything that might have worked. I needed someone who would do the boring work, not a team that would produce monthly slide decks.",
      },
    ],
    lessons: [
      {
        title: "The dashboard is not the result",
        body: "Beautiful slide decks with up-and-to-the-right charts are easy to produce. New patients in your chairs are the only number that counts. If you cannot trace specific new customers to specific work, you do not have marketing — you have decoration.",
      },
      {
        title: "Ask every new customer how they found you",
        body: "A five-column spreadsheet and one question at the front desk will tell you more about your marketing than any agency dashboard. Start this on day one and never stop.",
      },
      {
        title: "Most small businesses do not need an agency",
        body: "Below about $10K a month in ad spend, agency overhead consumes too much of the budget. You are better off paying a VA, using simple tools, and running ads yourself.",
      },
      {
        title: "Branded and intent-based keywords beat broad targeting",
        body: "When I started running ads myself I cut to five tight keywords (our name, 'emergency dentist [neighborhood]', etc.). Conversion 10x'd. The agency had been running 90 keywords trying to look thorough.",
      },
      {
        title: "Reinvest the saved money into the work that worked",
        body: "When I fired the agency I redirected the budget into reviews, referrals, and tight intent ads — the channels that were already working organically. Doubling down on what works beats hoping a new channel will save you.",
      },
    ],
  },
  {
    slug: "the-customer-loyalty-system-thats-driven-40-percent-of-my-revenue",
    title: "The customer loyalty system that has driven 40% of my revenue",
    category: "what-worked",
    categoryLabel: "What worked",
    excerpt:
      "I stopped trying to acquire new customers and started rewarding the ones I had. Eighteen months later the math is wild.",
    authorPersona: "Bakery owner, Minneapolis",
    publishedAt: "2026-04-12",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "I own a small bakery in Minneapolis. We do morning pastries, sourdough loaves on Tuesdays and Saturdays, custom cakes by order, and we run a small wholesale account with two local cafes. Annual revenue is somewhere in the mid-six-figures. For the first five years I was obsessed with new customers. I now think that was almost entirely the wrong thing to be obsessed with.",
      },
      {
        type: "p",
        text: "Eighteen months ago I built a loyalty system from scratch. Not a punch card. A real system, with tiers and a community and earned perks. As of last month, customers in the program represent 41% of revenue while making up about 22% of our total customer count. The average loyalty member spends 3.4 times what a non-member spends per year. Here is exactly how the system works and what I learned building it.",
      },
      { type: "h2", text: "The wrong loyalty system I tried first" },
      {
        type: "p",
        text: "Before this one I had a 'buy 10 get 1 free' punch card. Customers loved getting them, lost them within two weeks, and approximately nobody ever redeemed one. We probably gave out 4,000 cards over two years and gave away maybe 200 free pastries. The punch card was theater, not loyalty.",
      },
      {
        type: "p",
        text: "It also was not building anything. A redeemed punch card was a one-time discount. It did not tell me who my best customers were. It did not give me a way to talk to them. It did not unlock anything special as a customer kept coming back. It was just a 10% discount applied randomly and inefficiently.",
      },
      { type: "h2", text: "What I built instead" },
      {
        type: "p",
        text: "The new system has three tiers and is tracked through our point-of-sale by phone number. Customers join by giving their phone number at checkout. There is no app to download. There is no card to lose. They get a text the first time saying welcome and explaining the tiers.",
      },
      { type: "h2", text: "Tier one: Regulars" },
      {
        type: "p",
        text: "Anyone who has spent $50 cumulative. About 60% of joiners hit this within a month. Regulars get one free morning pastry on their birthday and a $5 credit they can apply any visit. The text on their birthday goes out automatically and is the single highest-converting message we send. Birthday visits are usually our highest-ticket visits of the year for that customer because people bring friends.",
      },
      { type: "h2", text: "Tier two: Locals" },
      {
        type: "p",
        text: "Anyone who has spent $300 cumulative. About 25% of Regulars reach Locals within a year. Locals get all of the above plus a 10% standing discount on Saturday sourdough (which moves them onto a slower-day visit so we even out our weekly demand) and early access to seasonal pre-orders (Thanksgiving pies, holiday cookie boxes, etc.). The early access is the killer perk. Last Thanksgiving we sold out our pie pre-orders in 36 hours, almost entirely to Locals.",
      },
      { type: "h2", text: "Tier three: Family" },
      {
        type: "p",
        text: "Anyone who has spent $1,000 cumulative. About 30 customers right now. Family gets a private text thread with me (I batch responses every couple of days, not in real time, but they know I see them). They get to suggest a flavor for each month's special croissant. They get a free custom cake on a milestone of their choice once per year. They get invited to two members-only events per year, usually a Thursday evening tasting with the staff. They never wait in line.",
      },
      {
        type: "quote",
        text: "The Family tier is the only marketing channel I have ever had that improved my mood instead of draining it. These are my favorite customers. The perks are mostly things I would have done for them anyway. Now they are formalized.",
      },
      { type: "h2", text: "Why the tiers matter" },
      {
        type: "p",
        text: "A flat loyalty program rewards everyone the same and so motivates no one specifically. The tiers create a ladder. Customers can see where they are and what comes next. Regulars look at the Saturday sourdough discount and want it. Locals look at the private text thread and want in. The ladder is the engine.",
      },
      {
        type: "p",
        text: "I did not invent this. Hotels and airlines have known it forever. What I did was apply it to a 28-employee bakery in Minneapolis, which was not how this was supposed to work, and it has worked better than any other thing I have ever done in the business.",
      },
      { type: "h2", text: "The numbers, after 18 months" },
      {
        type: "ul",
        items: [
          "Loyalty members: 612 active phone numbers.",
          "Regulars: 458. Locals: 124. Family: 30.",
          "Loyalty members as a percentage of total customer count: ~22%.",
          "Loyalty members as a percentage of revenue: ~41%.",
          "Average non-member annual spend: $84.",
          "Average loyalty member annual spend: $287.",
          "Birthday text redemption rate: 71%.",
          "Pre-order sellouts to Locals: 4 out of last 4 seasonal pre-orders.",
          "Cost of the program (free pastries, $5 credits, etc.) as a percentage of revenue: ~3.2%.",
        ],
      },
      { type: "h2", text: "What I did not expect" },
      {
        type: "p",
        text: "The Family members became my best market research. When I am thinking about a new product, I run it past them. They are honest and specific in a way that focus groups never are. They tell me things like 'I would buy that as a 4-pack but not as a 6-pack' or 'that should be $7, not $9, because the croissant next to it is $6'. That information is worth thousands of dollars in saved guesses.",
      },
      {
        type: "p",
        text: "The Family members also became referrers without me asking. About a third of my custom cake orders now come from Family members recommending us to friends having a birthday. The referrals are higher value than any other channel I have because Family members only recommend us to people they know will actually order, not generic acquaintances.",
      },
      { type: "h2", text: "What I would do differently if I were starting today" },
      {
        type: "ul",
        items: [
          "Start the program day one of opening, not year five. The customers I lost over years one through four because there was no path to deeper loyalty — I cannot get those back.",
          "Make tiers public from the start so customers know they are climbing a ladder.",
          "Build the birthday automation first. It is the single highest-ROI piece and works on its own from week one.",
          "Be careful about how often Family-tier events happen. Two a year is right. Four a year felt like work and stressed me out.",
          "Track everything by phone number, not email. Email opt-ins were 15%, phone opt-ins are over 80%.",
        ],
      },
      { type: "h2", text: "A note about software" },
      {
        type: "p",
        text: "I duct-taped the first version of this together with our point-of-sale, a Google Sheet, and a Twilio account for the texts. It was clunky for about a year. I now run the whole thing through Social Perks, which lets me set the tiers, the perks, the automated messages, and the referral mechanics in one place. The 14-day free trial was enough time to know it was the system I had been duct-taping together for years. The work is the same. The work is just less work now.",
      },
      {
        type: "p",
        text: "If you are reading this and you have been telling yourself you need to spend on ads to grow, ask yourself first whether your existing customers have a reason to come back this month. If they do not, do that first. New customers cost five times what existing ones do. The math has been the same forever. Most of us, including me for years, ignore it.",
      },
    ],
    lessons: [
      {
        title: "Reward repeat, not first visits",
        body: "Discounts on first visits attract one-time customers. Earned tiers reward the people who actually keep your business alive. Build for the second and third visit, not the first.",
      },
      {
        title: "Tiers create a ladder",
        body: "A flat loyalty program motivates nobody specifically. A three-tier system gives customers something visible to climb toward. The ladder itself is the engine.",
      },
      {
        title: "Birthday automation is the single highest-ROI message",
        body: "Customers redeem birthday offers at 70%+ and often bring friends. Build this first and let it run on autopilot forever.",
      },
      {
        title: "Phone numbers beat emails for loyalty programs",
        body: "Opt-in rates for phone numbers at point of sale are 5 times higher than for emails. Text open rates are also 5 times higher. Default to phone.",
      },
      {
        title: "Your top tier is your market research team",
        body: "Family-tier customers will tell you what to build, what to price, and what to cut. Their feedback is worth more than any focus group you could pay for.",
      },
    ],
  },
];

export const INDUSTRY_STORIES: Story[] = [
  {
    slug: "what-its-actually-like-running-marketing-for-a-coffee-shop-in-2026",
    title: "What it is actually like running marketing for a coffee shop in 2026",
    category: "industry",
    categoryLabel: "Industry",
    excerpt:
      "Three platforms, four staff, an oven that breaks every Thursday, and somehow I am also expected to be a content creator.",
    authorPersona: "Coffee shop owner, Providence",
    publishedAt: "2026-04-04",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "I have owned a coffee shop in Providence for four years. We do about 320 transactions on a weekday, double that on a Saturday morning, and have four full-time staff plus me. I want to walk through what marketing actually looks like for a business like mine in 2026, because every podcast and YouTube channel I listen to about small business marketing seems to be describing a different reality than the one I live in.",
      },
      { type: "h2", text: "The marketing job description nobody hands you" },
      {
        type: "p",
        text: "When I opened, nobody told me that running a coffee shop in 2026 would require me to be a part-time Instagram content creator, a part-time TikTok strategist, a part-time Google Maps optimizer, a part-time email marketer, a part-time SMS operator, a part-time podcast guest, a part-time newsletter writer, and a part-time crisis communications manager for the inevitable bad Yelp review. All of that is on top of running the actual coffee shop, which has its own full-time job description.",
      },
      {
        type: "p",
        text: "The honest answer is that I do maybe 30% of what every marketing person on the internet says I should be doing. The 30% is the part that actually works for us. The other 70% is theater that the people selling marketing services want small businesses to feel guilty about not doing.",
      },
      { type: "h2", text: "What an average week of marketing actually looks like" },
      {
        type: "p",
        text: "Sunday night, 45 minutes. I plan the week's three Instagram posts. I do not film anything new. I pull from a folder of photos my staff and I took during the week. I write captions on my phone in bed.",
      },
      {
        type: "p",
        text: "Tuesday morning, 20 minutes between rushes. I respond to Google reviews from the prior week. Every one. Including the ones that complain about parking, which I am not responsible for. The replies are short and the same Google sees that I respond, which seems to help our ranking, but the real reason I do it is that future customers read them.",
      },
      {
        type: "p",
        text: "Wednesday afternoon, 30 minutes. I send our newsletter. We have 1,400 subscribers. The newsletter is two paragraphs. What is new (a pastry, a coffee, a special event), and a 'note from behind the bar' that is usually about something funny or chaotic from the week. Open rate hovers around 42%. Click-through is irrelevant because there is rarely anything to click. The newsletter is not selling anything. It is keeping us in the back of people's minds for the days they are deciding where to go.",
      },
      {
        type: "p",
        text: "Friday, 15 minutes. I post a single Reel of something from the week. The bar at 8am. A latte art attempt that did not work. The dog of the day on our patio. It takes 15 minutes because I do not edit anything beyond trimming the start and end.",
      },
      {
        type: "p",
        text: "Total: about 2 hours of marketing per week. That is it. That is the entire program.",
      },
      { type: "h2", text: "What I do not do, and why" },
      {
        type: "p",
        text: "I do not post on TikTok. I tried for six months. It did not move the needle on anything. Our customers are 28 to 55 and live within a 1.5 mile radius. They are not on TikTok looking for a coffee shop.",
      },
      {
        type: "p",
        text: "I do not run paid ads. Not because I am against them. Because the math does not work for an average-ticket-of-$6.40 business with a 14% net margin. If a Facebook ad costs me $5 to acquire a new customer, that customer needs to come back 6 times before I have made any money on them. Most never come back even once.",
      },
      {
        type: "p",
        text: "I do not have a LinkedIn presence. I do not host workshops. I do not have a podcast. I do not have a Patreon. I do not have an Etsy. I do not have an OnlyCoffee account. (That last one is a joke. I think.) Every one of those has been pitched to me as 'the thing' that would unlock my next stage.",
      },
      {
        type: "quote",
        text: "The most important marketing skill I have learned is saying no to good ideas. Every yes is a tax on the things that are actually working.",
      },
      { type: "h2", text: "The numbers that actually matter to me" },
      {
        type: "ul",
        items: [
          "Daily transactions: tracked at point of sale. Anything under 290 on a Tuesday means something is off.",
          "Saturday morning rush count: 7am-10am. Trending up YoY is the single best health indicator.",
          "Google review count and average star rating: checked weekly.",
          "Newsletter open rate: checked monthly. If it drops below 35%, something is wrong with my writing.",
          "Repeat customer rate (loyalty signups who came in 3+ times in 30 days): the most important number nobody else tracks.",
          "Instagram engagement: I literally do not look at this anymore. It does not predict transactions in any reliable way.",
        ],
      },
      { type: "h2", text: "What changed in 2026 specifically" },
      {
        type: "p",
        text: "Two things shifted in the last 12 months that matter. First, Google has gotten really aggressive about the map pack. The top three results for 'coffee near me' get something like 80% of clicks in mobile search now. Ranking #4 might as well be ranking #40. This makes review velocity and recency a survival metric, not a marketing metric.",
      },
      {
        type: "p",
        text: "Second, Instagram has stopped being a discovery channel for local businesses and become a 'remind people you exist' channel. Five years ago people found my shop on Instagram and visited. Now Instagram followers are already customers. Posting is for retention, not acquisition. This changed how I think about every post.",
      },
      { type: "h2", text: "The hidden marketing work" },
      {
        type: "p",
        text: "The marketing work that actually pays off is not on any platform. It is the staff being warm when someone comes in for the first time. It is naming the dog of the customer who comes in Tuesdays. It is the latte being the same temperature it was last week. It is the cup not leaking. It is remembering that the regular who orders a cortado lost his job last month and asking how things are going.",
      },
      {
        type: "p",
        text: "I would put 80% of our growth in the last two years on that work. The Instagram posts and the newsletters and the Google review replies are the surface. The work underneath is what makes the surface visible.",
      },
      { type: "h2", text: "Advice for someone opening one in 2026" },
      {
        type: "ul",
        items: [
          "Set up your Google Business profile before your espresso machine. The map pack is more important than your bar layout.",
          "Build a system to ask every happy customer for a review. The first 100 reviews are the hardest. Push through them.",
          "Pick one social platform you will actually post to. Two is one too many.",
          "Start a newsletter on day one. Email is the only channel you actually own.",
          "Do not run ads in year one. You do not have enough data about your own business yet.",
          "Train your staff to treat first-time customers like a story they will tell at dinner that night. Most marketing is unnecessary if this part works.",
        ],
      },
    ],
    lessons: [
      {
        title: "Most marketing advice is for someone else",
        body: "Podcasts and gurus are mostly speaking to ecommerce or creator businesses with very different economics. Translate ruthlessly before applying anything to a local service business.",
      },
      {
        title: "The map pack is your biggest marketing channel",
        body: "Google Maps ranking drives more new customers to a coffee shop than every social platform combined. Treat review velocity as a survival metric.",
      },
      {
        title: "Saying no is the senior skill",
        body: "Every new platform, podcast, or program is a tax on what is already working. The best small business marketers are the ones who decline the most opportunities.",
      },
      {
        title: "Email is the only channel you own",
        body: "Every platform can change the rules tomorrow and tank your reach. Your email list is the one asset nobody can take. Build it from day one.",
      },
      {
        title: "Hidden marketing is the real marketing",
        body: "Warm staff, consistent product, remembered names. None of it shows up in a dashboard. All of it shows up in repeat visits. Invest there first.",
      },
    ],
  },
  {
    slug: "the-true-cost-of-acquiring-a-restaurant-customer-i-tracked-everything",
    title: "The true cost of acquiring a restaurant customer. I tracked everything for a year.",
    category: "industry",
    categoryLabel: "Industry",
    excerpt:
      "I expected the number to be high. It was much higher than I thought, and the math made me rethink the whole business.",
    authorPersona: "Restaurant owner, Charleston",
    publishedAt: "2026-03-12",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "I own a 62-seat farm-to-table restaurant in Charleston. We opened five years ago. Last year I decided to do something I had been putting off: actually track customer acquisition cost across every channel for a full 12 months. I bought a notebook, set up a spreadsheet, and trained my front-of-house team to ask the right questions. The numbers were not what I expected.",
      },
      { type: "h2", text: "How I tracked it" },
      {
        type: "p",
        text: "Every reservation, every walk-in, every takeout order, the host or server asked one question: 'Have you been here before?' If no: 'How did you hear about us?' We recorded the answer in our POS as a free-text tag. At the end of every month I would clean the tags into categories. I also tracked every dollar I spent on marketing across every channel, including time.",
      },
      {
        type: "p",
        text: "Time was the hardest part. I logged my own marketing hours and valued them at $40 an hour, which is what I would pay someone to do the work if I were not doing it myself. A lot of people skip this step and end up with very flattering numbers. The honest CAC number includes the owner's hours.",
      },
      { type: "h2", text: "The categories I ended up with" },
      {
        type: "ul",
        items: [
          "Word of mouth (a friend brought them, they live in the neighborhood, etc.).",
          "Google Maps / search.",
          "Yelp (organic, not paid).",
          "Instagram.",
          "TripAdvisor.",
          "OpenTable.",
          "Press / mentions in a local article.",
          "Walked by.",
          "Other (gift card, hotel concierge, etc.).",
        ],
      },
      { type: "h2", text: "The full-year numbers" },
      {
        type: "p",
        text: "We served 8,432 new customers (parties of one count as one, parties of four count as four). Total marketing spend including my time: roughly $48,000 across the year. Blended CAC: $5.69. That number is meaningless without breaking it down by channel.",
      },
      {
        type: "ul",
        items: [
          "Word of mouth: 3,114 new customers (37%). Marketing cost: $0. CAC: $0.",
          "Google Maps / search: 1,981 new customers (23%). Marketing cost (Google Business profile management, photos, review responses): roughly $2,800 in my time. CAC: $1.41.",
          "Yelp organic: 891 new customers (11%). Marketing cost: $0. CAC: $0.",
          "Instagram: 712 new customers (8%). Marketing cost: $9,400 of my time managing the account. CAC: $13.20.",
          "OpenTable: 612 new customers (7%). Marketing cost: $4,200 in subscription and cover fees. CAC: $6.86.",
          "Walked by: 478 new customers (6%). Marketing cost: $0 (other than rent for being in a walkable area).",
          "TripAdvisor: 312 new customers (4%). Marketing cost: $0. CAC: $0.",
          "Press / mentions: 201 new customers (2%). Marketing cost: roughly $1,800 in PR-related time and a small annual retainer. CAC: $8.96.",
          "Other: 131 new customers (2%). Mostly gift cards and concierge referrals. Hard to attribute.",
          "Paid Facebook and Instagram ads: 0 attributable customers across $4,200 spent. CAC: undefined / failure.",
          "Direct mail / flyer drop: 0 attributable customers across $1,600 spent. CAC: undefined / failure.",
        ],
      },
      { type: "h2", text: "What surprised me" },
      {
        type: "p",
        text: "The first surprise was how dominant word of mouth was. I had a vague sense that 'most people come from word of mouth'. The actual number was 37%, which means more than a third of our new business comes from a channel I cannot directly pay for. The implication is that the marketing budget should be designed to amplify word of mouth, not to compete with it.",
      },
      {
        type: "p",
        text: "The second surprise was how cheap Google Maps was relative to everything else. $1.41 per new customer is the kind of number paid advertisers dream about. The only reason it was that cheap is because we had been quietly investing in it for years. Reviews, photos, accurate hours, fast review responses. The CAC was low because the work had compounded.",
      },
      {
        type: "p",
        text: "The third surprise was Instagram. We have 14,000 followers. I had assumed it was a major channel. It was not. 8% of new customers, at a $13 CAC, which is the highest cost on the entire list except for paid ads (which were total failures). I do not regret being on Instagram, but I had been treating it as a top-three priority when it was actually a top-five priority at best.",
      },
      {
        type: "quote",
        text: "The marketing channel you spend the most time on is rarely the one that actually grows the business. Track everything. Trust the numbers, not the vibes.",
      },
      { type: "h2", text: "What CAC numbers do not capture" },
      {
        type: "p",
        text: "CAC is one number. It does not tell you whether the customers from that channel come back. Lifetime value matters more, especially for a restaurant where margins on a single meal are thin. So I did a second analysis: for each channel, what percentage of those customers came back within 6 months?",
      },
      {
        type: "ul",
        items: [
          "Word of mouth referrals: 64% returned within 6 months.",
          "Google Maps: 51% returned.",
          "Walked by: 49% returned.",
          "Yelp organic: 38% returned.",
          "Instagram: 33% returned.",
          "TripAdvisor: 18% returned (mostly tourists).",
          "OpenTable: 27% returned.",
          "Press / mentions: 22% returned (mostly people checking out the buzz, not regulars-in-waiting).",
        ],
      },
      {
        type: "p",
        text: "Word of mouth was cheapest AND highest-converting to repeat. Instagram was expensive AND mid-tier on retention. TripAdvisor and press brought tourists who were never coming back. Once I overlaid CAC with retention, the picture changed completely.",
      },
      { type: "h2", text: "What I changed for year two" },
      {
        type: "p",
        text: "I doubled down on the channels that were cheap and converted: word of mouth and Google Maps. For word of mouth, I built a quiet referral program that rewards a regular for bringing a new diner with a complimentary dessert (or a glass of wine if the new party is 21+). For Google Maps, I doubled the time I spent on review responses and added a weekly photo upload from the kitchen.",
      },
      {
        type: "p",
        text: "I cut Instagram time roughly in half. We still post, but I no longer treat it as a top priority. I killed the paid ad budget and the direct mail entirely. I saved roughly $5,800 in cash and 4 hours a week of my time. New customer count went up, not down, in the first half of year two.",
      },
      { type: "h2", text: "Advice for any restaurant owner" },
      {
        type: "ul",
        items: [
          "Spend the next 90 days asking every new customer where they came from. Just that. Do not change anything else.",
          "At the end of 90 days you will know which 2 or 3 channels actually drive your business.",
          "Cut the others in half. Most of them will not miss you.",
          "Reinvest the saved time into the channels that work.",
          "Add a retention overlay before you congratulate yourself. A cheap channel that brings tourists is worth less than an expensive channel that brings regulars.",
        ],
      },
    ],
    lessons: [
      {
        title: "Include your time in CAC math",
        body: "Marketing CAC that excludes the owner's hours is fiction. Value your time at what a replacement would cost, log it honestly, and the numbers will tell a different story.",
      },
      {
        title: "Word of mouth is usually your biggest channel",
        body: "Most restaurant owners underestimate word of mouth because they cannot see it. Track it explicitly and you will discover it is the channel worth amplifying above all others.",
      },
      {
        title: "Cheap channels are usually old channels",
        body: "Google Maps was cheap for us because we had been investing in it quietly for years. Channels that compound look free at the end of a long compounding period. Start them early.",
      },
      {
        title: "CAC without retention is misleading",
        body: "A $4 customer who never returns is worth less than a $12 customer who comes back six times. Overlay retention on every CAC number before deciding what to cut and what to keep.",
      },
      {
        title: "The channel you spend the most time on is rarely your biggest",
        body: "Most owners overweight Instagram because they enjoy posting on it. Track outcomes, not effort, and reallocate accordingly. The discomfort is the point.",
      },
    ],
  },
  {
    slug: "why-most-small-business-marketing-courses-are-useless",
    title: "Why most small business marketing courses are useless",
    category: "industry",
    categoryLabel: "Industry",
    excerpt:
      "I have bought eleven of them. I want to talk honestly about what they teach, what they do not, and the one I would actually recommend.",
    authorPersona: "Boutique owner, Atlanta",
    publishedAt: "2026-01-30",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I own a small boutique in Atlanta. Clothing and accessories, mostly from independent designers. I have been open six years. Over those six years I have bought eleven marketing courses, ranging from $97 to $2,400. I have completed nine of them. I have implemented exactly two of them in any meaningful way. I want to talk about why that ratio is so bad, because I think a lot of small business owners are pouring money into this stuff and feeling guilty about not finishing it.",
      },
      { type: "h2", text: "What most marketing courses are actually selling" },
      {
        type: "p",
        text: "Almost all of them sell the same thing dressed in different vocabulary. The product is: hope, structure, and a sense that you are doing something about your business. The hope is that this course will be the one. The structure is the videos and the workbook. The 'doing something' is the feeling of progress as you move through the modules.",
      },
      {
        type: "p",
        text: "What they are not selling is actual results. The course creators know this. The fine print always says 'individual results vary' or 'this is education, not a guarantee'. The testimonials on the sales page are from the 1% of buyers who happened to grow during the period after buying the course, mostly because they would have grown anyway.",
      },
      { type: "h2", text: "The structural problem with courses" },
      {
        type: "p",
        text: "A course is a recorded artifact. It is the same for everyone who buys it. Your business is not the same as everyone else's. The advice that works for a candle ecommerce brand with 50K Instagram followers will actively damage a brick-and-mortar dog grooming business. The advice that works for a creator selling courses will be irrelevant to a service business with a referral pipeline.",
      },
      {
        type: "p",
        text: "Courses get around this by being abstract. 'Build your brand voice.' 'Define your ideal customer.' 'Create content that resonates.' This advice is true at a level so high that it cannot guide a Tuesday morning decision. The courses that try to be specific usually pick an example business that does not look like yours, and the specifics break when you try to apply them.",
      },
      { type: "h2", text: "The eleven courses, briefly" },
      {
        type: "ul",
        items: [
          "Course 1: $197. 'Instagram for brick and mortar.' Recorded in 2019, still being sold. Most of the tactics no longer work. Refund denied.",
          "Course 2: $397. 'Email marketing mastery.' Useful for someone with zero email list. I had 800 subscribers already. Felt remedial.",
          "Course 3: $97. 'TikTok for boutique owners.' Good energy from the instructor. The tactics produced 14,000 views and zero sales.",
          "Course 4: $1,200. 'Six-figure boutique blueprint.' The 'blueprint' was a folder of PDFs that could have been a free YouTube playlist.",
          "Course 5: $497. 'Pinterest traffic system.' Actually changed my business. One of the two I implemented.",
          "Course 6: $2,400. 'Mastermind' that was 70% community and 30% course. I quit at month three. The community was 90 small business owners commenting 'amazing!' on each other's wins.",
          "Course 7: $250. 'SEO for product businesses.' Good content but too technical for a non-developer.",
          "Course 8: $797. 'Reels growth system.' Tactics worked for two months, then platform changes broke them.",
          "Course 9: $397. 'Customer retention playbook.' Actually changed my business. The other one I implemented.",
          "Course 10: $599. 'Sales page that converts.' I have a boutique, not an info product. I should not have bought this.",
          "Course 11: $1,800. 'Ads accelerator.' Spent the budget the course said to spend. Got nothing back. The course's advice was correct for someone with a 5x average order value of mine.",
        ],
      },
      { type: "h2", text: "What worked about the two courses that worked" },
      {
        type: "p",
        text: "The Pinterest course (#5) and the retention course (#9) had two things in common that none of the others had. First, both were narrow. Pinterest. Retention. Not 'marketing for boutiques'. Narrow enough that the advice could actually be specific.",
      },
      {
        type: "p",
        text: "Second, both were taught by people who had actually run the exact business I run. The Pinterest one was taught by a boutique owner with a physical store. The retention one was taught by a former retail operator. Their examples were my examples. Their constraints were my constraints. When they said 'do X', X was a thing I could actually do on Tuesday at 11am.",
      },
      {
        type: "quote",
        text: "The pattern is: narrow topic, taught by someone who has actually done the thing in a business that looks like yours. Everything else is entertainment.",
      },
      { type: "h2", text: "What I do instead of buying courses now" },
      {
        type: "p",
        text: "I have a small reading and listening diet. Three newsletters from operators (not gurus). One podcast that interviews actual store owners about specifics. A handful of Substacks from independent retail consultants who actually do the work and write about it honestly.",
      },
      {
        type: "p",
        text: "When I have a specific problem, I pay a specific consultant for one or two hours of their time. The hourly rate sounds high. The total spend is far less than a course because I am buying answers to my actual question instead of 12 hours of video that might contain the answer if I am willing to mine it.",
      },
      {
        type: "p",
        text: "I have not bought a course in 18 months. My business is up, not down. I do not feel like I am missing anything.",
      },
      { type: "h2", text: "The course I would actually recommend" },
      {
        type: "p",
        text: "I am going to break the pattern of this article and recommend a course, but with a heavy asterisk. There is a course on Local SEO for small physical-location businesses, taught by someone who has consulted with hundreds of them. It is $349. It is narrow. The instructor has done the thing. The content is dense and unsexy. I have referred multiple friends to it and every one of them said it paid for itself within 60 days.",
      },
      {
        type: "p",
        text: "I am intentionally not naming it here because I do not want this story to become an ad. If you want the name, search 'local SEO course for small business owners 2026' and look at honest reviews on Reddit. You will find it.",
      },
      { type: "h2", text: "How to decide if you should buy a course" },
      {
        type: "ul",
        items: [
          "Does the course teach one narrow thing or does it teach 'marketing'? If 'marketing', skip it.",
          "Has the instructor run a business that looks like yours, recently? If not, skip it.",
          "Are the testimonials specific (numbers, dates, channels) or vague (transformational, life-changing)? Specific only.",
          "Is the price under $500? Courses above that price almost always include a 'community' which is rarely worth anything.",
          "Can you find at least three honest reviews on a third-party site (Reddit, an independent blog) that are not affiliated with the seller? If not, skip it.",
        ],
      },
      {
        type: "p",
        text: "And finally: if you have not implemented the last course you bought, do not buy a new one. The bottleneck is not knowledge. The bottleneck is doing.",
      },
    ],
    lessons: [
      {
        title: "Narrow beats broad",
        body: "Courses that teach one specific tactic taught by a specific operator outperform broad 'marketing for X' courses every time. Buy depth, not breadth.",
      },
      {
        title: "Look for operators, not gurus",
        body: "Anyone teaching marketing who has not run a business like yours in the last three years is selling theory. Look for instructors with current operating experience in your category.",
      },
      {
        title: "Implementation, not knowledge, is the bottleneck",
        body: "Most owners who buy courses already know what to do. They are not doing it. Another course will not change that. A consultant or accountability partner will.",
      },
      {
        title: "Vague testimonials are red flags",
        body: "If a testimonial says 'transformational' instead of 'I added $11K in monthly revenue in 90 days', the course probably did not produce the second kind of result. Look for specifics.",
      },
      {
        title: "Buy hours, not videos",
        body: "Paying a real operator for two hours of their time will almost always teach you more than a $1,000 video course. Custom answers to your real question beat generic answers to a generic question.",
      },
    ],
  },
  {
    slug: "the-quiet-truth-about-influencer-marketing-for-small-budgets",
    title: "The quiet truth about influencer marketing for small budgets",
    category: "industry",
    categoryLabel: "Industry",
    excerpt:
      "After working with 27 creators across two years, here is what nobody in the influencer marketing industry wants to admit.",
    authorPersona: "Apparel brand co-founder, Brooklyn",
    publishedAt: "2026-02-26",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "My co-founder and I run a small apparel brand. We design and produce small batches of basics — tees, sweats, a few outerwear pieces — and sell them through our website and one storefront in Brooklyn. We have done influencer marketing in some form for two years. We have worked with 27 different creators across that time, ranging from 1,500 followers to 180,000. We have spent roughly $34,000 on influencer activity in those two years.",
      },
      {
        type: "p",
        text: "Here is the quiet truth: of those 27 creators, 6 produced real measurable revenue, 4 produced something we could not measure but might have helped, and 17 produced nothing. That is a 22% hit rate. If I had known that going in I would have planned differently. I want to write the article I needed to read 24 months ago.",
      },
      { type: "h2", text: "What the influencer marketing industry tells you" },
      {
        type: "p",
        text: "Industry articles say things like 'micro-influencers deliver 7x the engagement of macro-influencers' or 'influencer marketing has a 5.2x ROI on average'. These numbers are technically true and meaningfully misleading. They are averages of campaigns run by brands with budgets, infrastructure, and audience data that small brands do not have.",
      },
      {
        type: "p",
        text: "What the industry never says is that the median ROI for a small brand doing influencer marketing for the first time is approximately zero. The average is dragged up by a small number of huge wins. Your campaign is much more likely to be in the long tail of zero than in the head of huge wins.",
      },
      { type: "h2", text: "Why so many creators produce nothing" },
      {
        type: "p",
        text: "After 27 partnerships, the pattern is clear. Creators produce nothing when one of three things is true. First, their audience is not actually their audience. They have followers, but the followers do not act on their recommendations. This is the inflated-account problem and it is extremely common in the 10K to 80K range.",
      },
      {
        type: "p",
        text: "Second, the creator's audience is the wrong fit for your product. A creator with great engagement among 24-year-old fitness enthusiasts is not going to sell our cashmere crewneck to people who buy basics for the office. The fit has to be exact, and most creators will tell you their audience fits your product even when it does not.",
      },
      {
        type: "p",
        text: "Third, the creator is going through the motions. They have done so many brand deals that their audience has tuned out the sponsored content. The post happens, the engagement is real, the sales are zero because their audience has trained itself to scroll past anything that looks paid.",
      },
      { type: "h2", text: "The six creators who actually worked" },
      {
        type: "p",
        text: "Looking at our six successes, they had three things in common. All three matter. Miss one and the campaign falls apart.",
      },
      {
        type: "p",
        text: "One: they had a real and demonstrable audience, not a follower count. Their engagement rate was 5%+ across their last 20 posts. Their comments were specific and conversational, not single emojis. The accounts engaging looked like real people. We checked this before working with them, every time.",
      },
      {
        type: "p",
        text: "Two: their audience was an exact fit for our product. Not 'fashion girlies' but 'people who buy minimal basics they will wear for years.' The narrower the fit, the better the result. The creator with 1,500 followers who wore our basics every other day to her literal day job at an architecture firm outsold creators with 80K followers and a broader 'style' audience.",
      },
      {
        type: "p",
        text: "Three: they were creating because they liked our product, not because they liked the contract. The creators who reached out to us first, or who had organically posted about us before we paid them, produced 4 to 5 times the results of creators we cold-pitched. The pre-existing interest was the most predictive variable in the whole game.",
      },
      {
        type: "quote",
        text: "The math on influencer marketing only works if you treat the partnership as an extension of an interest the creator already has. Paying someone to pretend to care about your brand gets you scrolled past.",
      },
      { type: "h2", text: "What the four 'maybe worked' creators taught us" },
      {
        type: "p",
        text: "Four creators produced engagement we could not directly tie to sales but seemed to help in less measurable ways. They produced UGC we used for months. They drove email signups that converted later. They built a kind of cultural credibility in a specific micro-community.",
      },
      {
        type: "p",
        text: "I am not sure how much we should value those outcomes. We did one analysis where we estimated the value of UGC we would have had to produce ourselves, plus the email list growth, plus the assumed lift on brand recall. The number came out to roughly break-even on those four creators. Not a hit. Not a loss. Tuition.",
      },
      { type: "h2", text: "The 17 who produced nothing" },
      {
        type: "p",
        text: "These were the most expensive lessons. Average spend per creator in this bucket was around $1,400 in product plus fee. They had followers in the 8K to 50K range. They had media kits. They had social proof from other brands. They had nice DMs.",
      },
      {
        type: "p",
        text: "Three of them I now suspect had bot-inflated followers. Five of them had real audiences that did not actually fit our product. Nine of them were burned out on brand deals and their audiences had tuned out. The total spend on this bucket was about $24,000. The total attributable revenue was about $1,800.",
      },
      { type: "h2", text: "What we do now" },
      {
        type: "ul",
        items: [
          "We only work with creators who have organically posted about us first. That single rule cut our miss rate from 78% to about 15%.",
          "We pay smaller upfront fees and offer larger affiliate cuts. The creators who believe in the product accept this happily. The ones who do not, do not. The negotiation itself filters for the right partners.",
          "We require a live screen-share of analytics before sending any product. If they will not share their last 5 posts' real data, we do not work with them.",
          "We trial new creators with gifted product only for the first round. If something organic happens, we move to a paid partnership.",
          "We track every order from a creator code for 90 days, not 7. The long-tail conversions are real and often bigger than the immediate spike.",
        ],
      },
      { type: "h2", text: "Honest cost-per-acquisition math" },
      {
        type: "p",
        text: "Across all 27 creators and $34K in spend, we generated roughly $52K in directly attributable revenue. Looks profitable. But the gross margin on our products is 38%, so the $52K in revenue is $19,760 in gross profit. We spent $34K to generate $19,760 in gross profit. Net loss of about $14,240 across two years of influencer marketing.",
      },
      {
        type: "p",
        text: "If we exclude the 17 misses, the 10 partnerships that worked or might have worked produced about $48K in revenue on $10K in spend. That subset was extremely profitable. The problem is that we did not know in advance which 10 those would be.",
      },
      {
        type: "p",
        text: "The lesson is that influencer marketing for small brands is not a marketing channel. It is a portfolio. Most of the bets fail. A few pay for everything. You need the discipline to spread small, kill fast, and double down only on what has proven itself.",
      },
    ],
    lessons: [
      {
        title: "Median ROI is zero, even though average ROI is positive",
        body: "Industry-quoted averages are dragged up by a few huge wins. Most small brand campaigns produce nothing. Plan for the median, not the average.",
      },
      {
        title: "Pre-existing interest is the most predictive variable",
        body: "Creators who organically posted about you before any deal will outperform paid cold partnerships by 4 to 5 times. Hunt for the people who already love your product.",
      },
      {
        title: "Audience fit beats audience size",
        body: "A 1,500-follower creator with a tight audience fit will outsell an 80K-follower creator with broad aesthetic alignment. Narrow is your friend.",
      },
      {
        title: "Treat the program as a portfolio",
        body: "Most bets will fail. A few will pay for everything. Plan small starting bets, kill them fast when they do not work, and reinvest aggressively in what does.",
      },
      {
        title: "Gross profit math, not revenue math",
        body: "$52K in revenue at a 38% margin is $19K in profit. If you spent $34K to get there, you lost money. Always run the gross profit calculation, not the topline revenue one.",
      },
    ],
  },
  {
    slug: "how-i-built-a-customer-list-of-2000-people-with-a-clipboard",
    title: "How I built a customer list of 2,000 people with a clipboard",
    category: "industry",
    categoryLabel: "Industry",
    excerpt:
      "No CRM. No popup. No 'spin to win'. Just a clipboard, a pen, and a question I asked every day for two years.",
    authorPersona: "Bookstore owner, Burlington",
    publishedAt: "2026-03-08",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "I own an independent bookstore in Burlington. We have been open seven years. The store is about 1,200 square feet, mostly fiction with a strong cookbook and kids section. For the first five years I had no email list. I had a Mailchimp account I had opened once and never used. I had told myself the bookstore did not really need a list because our customers came in person and we knew them by name.",
      },
      {
        type: "p",
        text: "Then 2023 happened, and our biggest sale event got rained out, and I realized I had no way to reach my customers except by hoping they walked by. I sat down that night and decided to build a list. I gave myself a goal of 2,000 names in two years. I just hit 2,043. Here is exactly how I did it without any popup, any tool, or any technology more complicated than a clipboard.",
      },
      { type: "h2", text: "Why I did not use a popup" },
      {
        type: "p",
        text: "Our online sales are not a meaningful part of the business. About 6% of revenue. I did not need to optimize the website for email signups. The customers I cared about were the ones standing in front of me, holding a book. A popup is the worst possible interruption for someone trying to decide if they want to spend $32 on a hardcover.",
      },
      {
        type: "p",
        text: "More importantly, popups produce a specific kind of subscriber: someone who wants a 10% off code and does not really care about you. I wanted subscribers who wanted to hear from me. The clipboard at the counter selected for those people exactly.",
      },
      { type: "h2", text: "The clipboard, the pen, and the script" },
      {
        type: "p",
        text: "The setup was absurdly simple. A clipboard. A pen on a string. A sheet of paper with three columns: First name, Email, How often you want to hear from us (weekly / monthly / occasionally). The clipboard lived on the counter, slightly tilted toward the customer, with a small handwritten sign that said 'Want our newsletter? We rec books, hint at sales, gossip about author drama.'",
      },
      {
        type: "p",
        text: "The line about author drama was the kicker. People would read the sign, smile, and ask 'wait, what?' That was the opening. The conversation about an author who had picked a fight on Twitter would unfold and the customer would put their email down.",
      },
      {
        type: "p",
        text: "The script for staff was one sentence. After ringing someone up, the staffer would say: 'You want to sign up for the newsletter? It is mostly book recs and the occasional drama.' That is it. About a third of customers said yes the first time. Another 20% signed up on a later visit because they had seen the clipboard and warmed up to it.",
      },
      { type: "h2", text: "How I got to 2,000" },
      {
        type: "p",
        text: "I started in February 2024. Here is the rough monthly pace:",
      },
      {
        type: "ul",
        items: [
          "Months 1-3: 40-60 signups per month as we worked out the script.",
          "Months 4-9: 80-110 per month as staff got comfortable asking.",
          "Months 10-15: 100-130 per month as the newsletter built a reputation that made it easier to ask.",
          "Months 16-24: 80-100 per month, with the dropoff coming from a higher baseline (people who came in regularly had mostly signed up already).",
        ],
      },
      { type: "h2", text: "The 'how often' column was the secret weapon" },
      {
        type: "p",
        text: "I let people choose their cadence. Weekly subscribers get a Wednesday recommendation email and a Sunday roundup. Monthly subscribers get one curated email on the first of each month. Occasional subscribers get an email when there is something I really think they would care about (a major sale, a big-name author event, the new Murakami).",
      },
      {
        type: "p",
        text: "About 45% of subscribers chose weekly. 35% chose monthly. 20% chose occasional. The choice made everyone feel respected. The unsubscribe rate across all three groups is under 1% per year, which is far below industry benchmarks for email marketing.",
      },
      {
        type: "quote",
        text: "Email marketing best practices say more frequency drives more revenue. Maybe. But high frequency you did not consent to is just noise. Let people choose. The ones who chose weekly read everything.",
      },
      { type: "h2", text: "What the list is worth" },
      {
        type: "p",
        text: "Last year, email-attributable revenue was about $61,000 on a store doing approximately $640K in annual revenue. So just under 10% of revenue from a list that cost me effectively nothing to build (the clipboard cost $3, the pen $2, and Mailchimp at 2,000 subscribers is around $20/month).",
      },
      {
        type: "p",
        text: "More importantly, the list is the asset I have used to weather every disruption since I started it. The rained-out sale that triggered all this would have lost us $4-5K in 2023. With the list, I rescheduled and emailed everyone, and we did the sale revenue on the make-up day in 2024. The pandemic-style shutdowns we had last winter? The list let us run pre-orders and curbside pickup that kept the lights on.",
      },
      { type: "h2", text: "What I would tell any other physical-store owner" },
      {
        type: "ul",
        items: [
          "Start the list today. Not Monday. Today. A clipboard at the counter is enough.",
          "Make the value proposition specific. 'Newsletter signup' is generic. 'Book recs and author drama' is a thing people actually want.",
          "Let subscribers pick their frequency. It feels small. It is not. It is the single most respectful thing you can do for an email list.",
          "Train your staff with one sentence to say. Not a script. One sentence. The lower the friction, the more they will actually do it.",
          "Move the list off paper into a real tool only after you hit 500. Below 500, paper-to-Mailchimp on a Sunday night works fine and forces you to look at your subscribers as individuals.",
          "Do not buy a list. Ever. The 50 people who walked into your store last week are worth more than 5,000 random emails you bought.",
        ],
      },
      { type: "h2", text: "The newsletter itself" },
      {
        type: "p",
        text: "Worth saying: a list is only as good as what you send to it. Our Wednesday email is one book recommendation, usually 200 words, written in my voice with a personal angle on why I liked it. Our Sunday roundup is 5 quick links to what is happening in the literary world that week. Our occasional 'big deal' email is short and direct.",
      },
      {
        type: "p",
        text: "I do not use templates. I do not use AI to write the recommendations. I write every one of them myself on a Tuesday night with a glass of wine. The customers can tell. The open rates are above 60%. The reply rate (people emailing me back to tell me what they thought) is something like 4%, which any email marketer reading this knows is unhinged in a good way.",
      },
      {
        type: "p",
        text: "The clipboard was the start. The newsletter is the maintenance. The relationship is the thing.",
      },
    ],
    lessons: [
      {
        title: "Ask in person, every transaction",
        body: "A clipboard at the counter with a one-sentence script will outperform any website popup. The customers in front of you are the ones who matter.",
      },
      {
        title: "Specific beats generic in the value prop",
        body: "'Newsletter' is generic and forgettable. 'Book recs and author drama' is a thing people want. Make the value proposition specific to your category and your voice.",
      },
      {
        title: "Let subscribers choose frequency",
        body: "Letting people pick weekly, monthly, or occasional is the single highest-ROI design choice in an email program. It cuts unsubscribes, increases opens, and makes subscribers feel respected.",
      },
      {
        title: "Owned channels beat rented ones",
        body: "Every social platform can change the rules and tank your reach overnight. Your email list cannot be taken away. Build the owned asset before the rented audience.",
      },
      {
        title: "Voice is the moat",
        body: "Anyone can build a list. Few will write to it in a way that sounds like a person. The voice you bring to the inbox is what makes people open, reply, and buy.",
      },
    ],
  },
];
