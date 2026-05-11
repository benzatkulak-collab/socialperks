// Long-form story-format content for engagement + SEO.
// Reddit-style first-person narratives. Composites based on common
// small-business marketing patterns; not attributed to named customers.

export type StoryCategory =
  | "tried-30-days"
  | "mistakes"
  | "what-worked"
  | "industry";

export type Story = {
  slug: string;
  title: string;
  category: StoryCategory;
  categoryLabel: string;
  excerpt: string;
  authorPersona: string;
  publishedAt: string;
  readingMinutes: number;
  // Body is an array of plain paragraphs and special blocks.
  body: StoryBlock[];
  lessons: { title: string; body: string }[];
};

export type StoryBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] };

const SP_NOTE =
  "Soft note: I now use Social Perks to run this. The 14-day free trial was enough time to know it was the system I had been duct-taping together for years.";

export const STORIES: Story[] = [
  // ────────────────────────────────────────────────────────────
  // "I tried X for 30 days" (5)
  // ────────────────────────────────────────────────────────────
  {
    slug: "i-tried-running-an-instagram-giveaway-for-30-days-heres-what-happened",
    title:
      "I tried running an Instagram giveaway every week for 30 days. Here is what actually happened.",
    category: "tried-30-days",
    categoryLabel: "I tried it for 30 days",
    excerpt:
      "Four weekly giveaways, $180 in prizes, and a follower count that did not behave the way every guru on YouTube told me it would.",
    authorPersona: "Owner of a small candle and home-goods shop",
    publishedAt: "2026-04-10",
    readingMinutes: 11,
    body: [
      {
        type: "p",
        text: "I run a small candle and home-goods shop on a side street that gets foot traffic when the weather is nice and absolutely no foot traffic when it is not. My Instagram had been sitting at 2,143 followers for almost six months. Every reel I posted got 400 views, every photo got 30 likes, and not one person had ever DM'd me to ask about an order.",
      },
      {
        type: "p",
        text: "I had watched roughly 40 hours of YouTube videos telling me giveaways were the single best growth tactic for a small product business. So I decided to commit. Four weeks. One giveaway per week. Real prizes from my own inventory, plus a couple of partner gift cards. I wanted to see if the hype was real or if I was about to set $180 on fire.",
      },
      { type: "h2", text: "Week one: the rules I told myself" },
      {
        type: "p",
        text: "I set up the first giveaway with the exact format every influencer recommended. Follow the account. Like the post. Tag two friends. Bonus entry if you share to your story. The prize was a $45 candle bundle, which is about my median order value, so I told myself worst case I am giving away one order to gain a hundred followers.",
      },
      {
        type: "p",
        text: "Before I hit post I wrote down what I expected: 200 new followers, 50 comments, 10 story shares. I wanted a baseline so I could not bend the numbers in my favor at the end.",
      },
      { type: "h2", text: "What actually happened in week one" },
      {
        type: "p",
        text: "The post went up Tuesday morning. By Tuesday night I had 340 comments. By Friday I had 612 comments and 287 new followers. I felt like a genius. I went to bed that night thinking I had cracked the code.",
      },
      {
        type: "p",
        text: "Then I looked at the followers. About 40 of them were giveaway-hunter accounts with names like 'wins_everything_2024' and 'lucky_lou_giveaways'. Another 60 had zero posts. Maybe 100 were real-looking accounts in the right age range. The rest were a mystery. Engagement on my next two non-giveaway posts dropped 60 percent. Instagram's algorithm seemed to take one look at the new audience and conclude my account was now in the 'giveaway' niche.",
      },
      { type: "h2", text: "Week two: tightening the rules" },
      {
        type: "p",
        text: "I knew week one was attracting the wrong people, so I changed the format. Same prize budget, different rules. To enter you had to comment your favorite scent and what room you would put the candle in. No tagging required. I also added that the winner had to be a US-based account because I cannot afford international shipping on a $45 bundle.",
      },
      {
        type: "p",
        text: "Comments dropped to 110 for the week. Followers gained: 84. But this time when I scrolled through the followers, almost all of them looked like real humans who actually like candles. Engagement on my next regular post went back to roughly normal.",
      },
      { type: "h2", text: "Week three: the partner experiment" },
      {
        type: "p",
        text: "I had read that co-hosted giveaways are the highest-ROI variant because the partner account drives qualified followers from a related niche. So I reached out to a small ceramicist who makes mugs in a similar aesthetic. We combined a candle bundle and two mugs into a single prize. Each of us posted the giveaway and required follows of both accounts.",
      },
      {
        type: "p",
        text: "This one worked the best by a margin. 412 new followers in five days, and the quality was the best of any week. The ceramicist's audience was clearly my audience. About 20 of those followers DM'd within two weeks asking about specific candles. Five became paying customers in the next 30 days. I should have started with this format and skipped weeks one and two entirely.",
      },
      { type: "h2", text: "Week four: the truth-or-dare giveaway" },
      {
        type: "p",
        text: "For the last week I wanted to try a format I had not seen anywhere. I called it the 'truth' giveaway. The rule was simple: comment on the post telling me what you would actually do with the candle in real life. Most honest, most specific, most interesting comment wins. No follow requirement, no tagging.",
      },
      {
        type: "p",
        text: "It got 47 comments. Forty-seven. Embarrassingly small. But every single one was a paragraph long. I learned more about my customers from those 47 comments than from the previous 1,000. One woman said she was buying candles every time her husband had to travel for work because their kid would not sleep without the smell. I almost cried. I built three new product bundles based on the patterns I saw in those comments.",
      },
      { type: "h2", text: "The final numbers after 30 days" },
      {
        type: "ul",
        items: [
          "Started at 2,143 followers. Ended at 2,927. Net gain: 784.",
          "Total prize spend at retail value: $180. At my cost: $54.",
          "New customers traceable to the giveaways: 11 in the first 30 days, and 7 more in the following 60.",
          "Estimated revenue from those new customers in the first 90 days: $612.",
          "Hours spent setting up, posting, picking winners, fulfilling: about 18.",
          "Net 'pay rate' for my time, ignoring brand-building value: about $31 per hour.",
        ],
      },
      { type: "h2", text: "What I wish I had known on day one" },
      {
        type: "p",
        text: "The giveaway people on YouTube are not lying. Giveaways work. But the version of 'works' they are selling and the version that exists when you are running it from your phone at 11pm are very different. The follower count goes up. The bank balance does not always follow. The two things that mattered most were the partner format and the prompt that forced people to actually write something. Everything else was theater.",
      },
      {
        type: "p",
        text: "After the 30 days I stopped doing weekly giveaways. They are exhausting and the long-tail benefit drops off fast. What I do now is one big co-hosted giveaway per quarter, plus an ongoing perk system for my actual customers, where the action is 'leave a Google review' or 'post a photo with the candle' instead of 'follow and tag two friends'. That is where the real money has come from.",
      },
      { type: "p", text: SP_NOTE },
    ],
    lessons: [
      {
        title: "Follower count is the worst metric",
        body: "It is the easiest to move and the least correlated with revenue. Of my 784 new followers, fewer than 20 ever bought anything. Track DMs and saves instead.",
      },
      {
        title: "Co-hosted with a niche partner beats everything",
        body: "Find one account roughly your size whose audience overlaps yours. One co-hosted giveaway will outperform four solo ones.",
      },
      {
        title: "Drop the tag-two-friends rule",
        body: "It attracts giveaway hunters and tanks future engagement. Make the entry require something they care about.",
      },
      {
        title: "Long-form comment prompts are gold",
        body: "Even a small giveaway with a real prompt will teach you more about your customers than a year of analytics.",
      },
      {
        title: "Switch to perks after the first giveaway",
        body: "A perk program rewards customers for actions you actually want. Giveaways reward strangers for following. Different game.",
      },
    ],
  },
  {
    slug: "i-tried-tiktok-marketing-for-my-coffee-shop-for-90-days",
    title:
      "I tried TikTok marketing for my coffee shop for 90 days. I almost quit on day 12.",
    category: "tried-30-days",
    categoryLabel: "I tried it for 30 days",
    excerpt:
      "Three months, 87 videos, and the slow realization that the algorithm does not care about your espresso machine.",
    authorPersona: "Owner of a 9-seat coffee shop in a college town",
    publishedAt: "2026-04-12",
    readingMinutes: 12,
    body: [
      {
        type: "p",
        text: "I own a nine-seat coffee shop in a college town. We do about 180 transactions on a normal weekday and roughly 320 on a busy Saturday. Two years in, we were profitable, the rent was sane, the staff was good. The one thing I could not crack was acquisition. New customers walked in maybe once a week from search or word of mouth, and that was it.",
      },
      {
        type: "p",
        text: "Every twenty-something who walked in had TikTok open. Every cafe within three miles that had blown up in the last year had done it through TikTok. I told my wife I was going to give it 90 days and 90 videos. She said good luck and that I owed her dinner if I failed.",
      },
      { type: "h2", text: "Day 1 to day 12: I almost quit" },
      {
        type: "p",
        text: "I posted my first video on a Monday. It was a slow-motion pour of an iced latte, classic stuff. I had watched maybe 50 TikToks from coffee shops to study the format. The video got 89 views. My third post, two days later, got 412. I told myself fine, this is the slow start everyone talks about.",
      },
      {
        type: "p",
        text: "By day 12 I had posted 14 videos. The average view count was 287. My highest was 1,200. None of them turned into a single new walk-in that I could trace. I was waking up at 5am to film latte art, going home after a 12-hour day to edit, and the only return was a slight increase in followers from people who lived nowhere near my shop.",
      },
      {
        type: "p",
        text: "I sat on my couch on day 12 and almost wrote a post telling my followers I was done. The thing that stopped me was realizing I had been making the wrong videos.",
      },
      { type: "h2", text: "What I had been doing wrong" },
      {
        type: "p",
        text: "Every video was a beauty shot of a drink. I was filming what I, the owner, thought looked nice. None of the videos had a story, a hook, a problem, a stake, or a face. I was selling vibes to an algorithm that does not care about vibes.",
      },
      {
        type: "p",
        text: "I went back and watched the top 30 cafe videos in my city by view count. Almost none of them were drink shots. They were people. They were arguments. They were behind-the-counter moments. They were the owner getting yelled at by a customer. They were the barista's hand visibly shaking on the steam wand on a Saturday rush. Drama, even tiny low-stakes drama, beats beauty every time.",
      },
      { type: "h2", text: "Day 13 to day 30: I started filming the truth" },
      {
        type: "p",
        text: "I made three rules for myself. Rule one: every video has a person in it within the first second. Rule two: every video has a real moment, not a staged one. Rule three: every caption asks a question.",
      },
      {
        type: "p",
        text: "The first video under the new rules was 19 seconds of my morning barista, Jamie, telling the camera why she hates oat milk. Off the cuff, no script. 14,200 views. Two days later I posted a video of me asking a regular what he would change about the shop. He said the music. The video did 38,000 views. People commented suggesting their own playlists. We changed the playlist.",
      },
      { type: "h2", text: "The video that broke through" },
      {
        type: "p",
        text: "On day 41 I posted a video of a customer who had been coming in for two years. She walked in, ordered her usual, and I asked the camera if anyone could guess what it was before she said it. Three of my regulars chimed in from off-screen. She ordered her oat-milk cortado with two raw sugars. The video did 410,000 views.",
      },
      {
        type: "p",
        text: "The Saturday after that video posted, we did 412 transactions. Our previous record was 327. The line was out the door from 9am to 1pm. I had to call in a barista on her day off. Three different customers told me they had driven from out of town because of the video.",
      },
      { type: "h2", text: "Day 41 to day 60: the comedown" },
      {
        type: "p",
        text: "The viral video taught me a brutal lesson. The next 12 videos I posted all averaged under 5,000 views. The bump in foot traffic faded by week three. People had come once, taken a photo, posted it themselves, and moved on. The algorithm had given me a gift and I had no system to capture the people it sent me.",
      },
      {
        type: "p",
        text: "I started thinking about what I would have done differently if I could replay that week. I would have had a QR code on every cup pointing to a perk. Something like: post a story tagging us, get $2 off your next drink. Something to convert the one-time visitor into a returning one. By the time I built that system, the wave was already over.",
      },
      { type: "h2", text: "Day 60 to day 90: building the system I needed" },
      {
        type: "p",
        text: "I spent the last 30 days of the experiment building what I should have built first. A perk on every cup. A simple ask: come back within two weeks for a free drip refill if you bring a friend who has never been here. Half of the customers I brought in from TikTok came back. Most brought someone.",
      },
      { type: "h2", text: "Final numbers" },
      {
        type: "ul",
        items: [
          "Videos posted: 87 in 90 days.",
          "Total views: 1.4 million.",
          "Followers gained: 14,800.",
          "Highest single video: 410,000 views.",
          "New customers I can directly trace: ~340.",
          "Repeat visits from those new customers: ~190 (56 percent return rate after I added the perk).",
          "Estimated revenue lift in 90 days: ~$8,200.",
          "Estimated hours spent filming, editing, posting, and replying: 110.",
        ],
      },
      { type: "h2", text: "What I would tell another small coffee shop owner" },
      {
        type: "p",
        text: "TikTok works for coffee shops, but not the way Instagram works. Beauty shots are a tax. Real moments are the product. The viral video will come if you keep showing up, but if you have no system to capture the wave when it hits, you will get one good weekend and nothing else.",
      },
      { type: "p", text: SP_NOTE },
    ],
    lessons: [
      {
        title: "Stop filming the drink, film the human",
        body: "The algorithm rewards faces and moments. Beauty shots of latte art are everywhere and bore the feed.",
      },
      {
        title: "Have a capture system before you go viral",
        body: "A perk on every cup turns a one-time wave into a return-visit base. Without it, virality is a one-day event.",
      },
      {
        title: "Question captions outperform statement captions",
        body: "Caption every video with a question your customers can answer. Comments drive the algorithm.",
      },
      {
        title: "Plan for the comedown",
        body: "Viral videos are followed by quiet weeks. Do not blow your budget assuming the next post will hit.",
      },
      {
        title: "90 days is the right minimum",
        body: "I almost quit at day 12. The first video that broke through was on day 41. Anything shorter than two months is not a fair test.",
      },
    ],
  },
  {
    slug: "i-asked-every-customer-for-a-google-review-for-30-days",
    title:
      "I asked every single customer for a Google review for 30 days. The results were not what I expected.",
    category: "tried-30-days",
    categoryLabel: "I tried it for 30 days",
    excerpt:
      "I went from 41 reviews to 196. But the bigger surprise was what asking changed about the conversations at the counter.",
    authorPersona: "Owner of a neighborhood bike repair shop",
    publishedAt: "2026-04-14",
    readingMinutes: 10,
    body: [
      {
        type: "p",
        text: "I run a small bike repair shop. Tune-ups, flats, the occasional custom build. Two of us in the shop most days. We have been open six years. Our Google profile had 41 reviews. Forty-one in six years. I knew that was a problem because every plumber, dentist, and nail salon within a mile of us had between 200 and 800.",
      },
      {
        type: "p",
        text: "The reason I had not asked was simple. I am awkward. I do not like asking people for things. I am the guy who tips 25 percent because I am too uncomfortable to do math while a server is waiting. The idea of standing across the counter from a customer and saying 'hey, could you go leave us a review' made me want to crawl under the workbench.",
      },
      {
        type: "p",
        text: "I decided to give it 30 days. Every single customer who picked up a bike, no exceptions, gets the ask. If I chickened out I had to put a dollar in a jar on the counter. If I made it through every transaction I would take my wife to dinner.",
      },
      { type: "h2", text: "Day 1: the worst version of the ask" },
      {
        type: "p",
        text: "I tried it on the first customer of the morning, a woman picking up her road bike after a tune-up. I said, and I quote, 'Hey so we are trying to get more Google reviews, if you have a minute, would you be willing to leave us one?' She looked at me, smiled politely, and said 'oh yeah, sure'. She did not leave one. I checked.",
      },
      {
        type: "p",
        text: "I asked seven more customers on day one in roughly that same flat way. By 6pm I had not received a single review. I put eight dollars in the jar anyway because asking that badly felt like cheating.",
      },
      { type: "h2", text: "Day 3: the script I stole from a friend" },
      {
        type: "p",
        text: "A friend who owns a wine shop heard about the experiment and told me my script was the problem. He said the best version of the ask is short, specific, and has a real reason. He told me to try this: 'Most people who come here have no idea there is a bike shop on this block. Google reviews are basically the only way new customers find us. Would you do me a favor and leave one if you have a minute tonight?'",
      },
      {
        type: "p",
        text: "I rewrote the ask in those terms. It was twice as long but it felt twice as easy to say because it explained why I was asking. The very first customer I tried it on left a review by the time he got to his car. I watched it pop into my notifications about 90 seconds after he walked out.",
      },
      { type: "h2", text: "Day 4 to day 14: the conversion rate climbs" },
      {
        type: "p",
        text: "I started tracking the conversion rate. Out of every ten people I asked, how many actually left a review within 48 hours? Day one with the bad script: zero out of eight. Day four with the new script: three out of nine. By day ten I was hitting roughly five out of ten consistently. If I added a QR code on the receipt that took them directly to the review form, it went up to about seven out of ten.",
      },
      {
        type: "p",
        text: "By day 14 the shop's review count had gone from 41 to 88. I had matched six years of reviews in two weeks. The new reviews were detailed, specific, mentioned my employee by name, and pushed our star rating from 4.6 to 4.8.",
      },
      { type: "h2", text: "The conversation I did not see coming" },
      {
        type: "p",
        text: "Around day 15 I started noticing something I had not expected. The act of asking was changing how I closed every transaction. When you tell every customer 'this is how new customers find us', you end up explaining your business model to them. They start asking follow-up questions. Where are you from? How did you start? What got you into bikes?",
      },
      {
        type: "p",
        text: "I had been running the shop for six years and never had this many real conversations with customers. The reviews were almost a side effect. The bigger benefit was that I now knew the names of twice as many regulars as I had on day one.",
      },
      { type: "h2", text: "Day 15 to day 30: the awkwardness fades" },
      {
        type: "p",
        text: "By the third week I was asking without thinking. I was no longer rehearsing the script in my head while ringing up. It became as automatic as 'do you want a receipt'. By day 30 I had asked 318 customers and received 155 new reviews. Combined with the 41 I started with, I was at 196.",
      },
      { type: "h2", text: "What I learned about the customers who did not review" },
      {
        type: "p",
        text: "Roughly half of the people I asked did not leave a review. I went back and tried to figure out the pattern. Almost all of them were one-off customers: a flat tire fix, a tube replacement, a quick adjustment. The people who left reviews were almost always coming in for a tune-up or a bigger job they had thought about for weeks. The connection to the shop mattered more than I had realized.",
      },
      {
        type: "p",
        text: "That changed how I run the shop. I started offering free 30-day post-tune-up checkups specifically to deepen the relationship with customers who came in for the bigger jobs. About a third of them now come back for a second service within the year.",
      },
      { type: "h2", text: "The numbers at the end" },
      {
        type: "ul",
        items: [
          "Reviews at day 0: 41. Reviews at day 30: 196.",
          "Conversion rate from ask to review: 49 percent overall, 71 percent with the QR code.",
          "Star rating: 4.6 → 4.8.",
          "Phone calls to the shop from Google: roughly doubled by day 30.",
          "Times I had to put a dollar in the awkwardness jar: 11.",
          "Cost: zero dollars in incentives. Just asking.",
        ],
      },
      { type: "h2", text: "What I do now" },
      {
        type: "p",
        text: "I no longer ask every customer manually. After about two months I built a system using Social Perks where the receipt prints with a QR code and a $3 credit toward their next tube. The script is still the same when I have time for the conversation, but the QR code does the work when I am slammed. The review count is now over 400 and the shop ranks first in the map pack for 'bike repair' within a one-mile radius.",
      },
      { type: "p", text: SP_NOTE },
    ],
    lessons: [
      {
        title: "The script matters more than the ask",
        body: "The flat 'could you leave a review' converts at zero. The 'this is how new customers find us' version converts at fifty percent.",
      },
      {
        title: "A QR code on the receipt is the second-most-important thing you can do",
        body: "It removes the friction between the ask and the action. Adds 20 to 30 points of conversion.",
      },
      {
        title: "Awkwardness fades by week two",
        body: "If you are introverted, the first 30 customers are brutal. By customer 75 you will not even think about it.",
      },
      {
        title: "Asking changes the conversation",
        body: "The biggest unexpected benefit was learning customer names and stories. Reviews are almost a byproduct.",
      },
      {
        title: "Reviews follow connection, not transaction",
        body: "People who came in for tune-ups reviewed at 70 percent. People who came in for flats reviewed at 18 percent. Deepen the relationship and reviews follow.",
      },
    ],
  },
  {
    slug: "i-started-a-loyalty-program-with-zero-budget-results-after-60-days",
    title:
      "I started a loyalty program with zero budget. Here is what happened after 60 days.",
    category: "tried-30-days",
    categoryLabel: "I tried it for 30 days",
    excerpt:
      "No app, no fancy software, no plastic cards. Just a notebook, a stamp, and one rule I broke a week in.",
    authorPersona: "Owner of a small bakery",
    publishedAt: "2026-04-16",
    readingMinutes: 11,
    body: [
      {
        type: "p",
        text: "I own a small bakery in a strip mall next to a gym, a tax office, and a dog groomer. We have been open four years. The morning rush is good. After 11am we are dead until pickup orders at five. I had been thinking about a loyalty program for two years but every quote I got was either a $79-a-month app, a $400 setup fee for plastic cards, or a points system that required me to put a tablet on the counter that I did not have space for.",
      },
      {
        type: "p",
        text: "So I decided to do the dumbest possible version. A paper card. A rubber stamp. A rule: buy nine, get the tenth free. Total budget: $14 for the stamp, $22 for 200 paper cards from the local print shop. No app, no software, no spreadsheet.",
      },
      { type: "h2", text: "Week one: the rollout" },
      {
        type: "p",
        text: "I told my staff the program at the morning meeting and printed a small sign for the register. Every time a customer bought anything over $4, they got a card with the first square stamped. If they brought it back, we stamped the next square. The system was 'do not lose your card' and we had no way to recover it if they did.",
      },
      {
        type: "p",
        text: "The first week we handed out 87 cards. By the end of the week, three people had come back with their card. I was excited. My wife said I was getting excited about three people. She was right, but they were three people who had come back specifically because of the card.",
      },
      { type: "h2", text: "Week two: the rule I broke" },
      {
        type: "p",
        text: "On day nine a customer came in for the third time and pulled out her card. It had two stamps on it. I had stamped it twice the first time because she had bought three pastries. I had not stamped it the second time because she had only bought a coffee, which was under $4. She was visibly disappointed. She put the card back in her wallet and walked out without ordering.",
      },
      {
        type: "p",
        text: "I sat with that for an hour. Then I broke my own rule. I changed the program: every visit gets a stamp, regardless of what you buy. The new rule was 'come in nine times, the tenth visit is on us, up to $8'. I wrote it on a piece of paper, taped it to the register, and texted my staff.",
      },
      { type: "h2", text: "Week three: the rule change worked" },
      {
        type: "p",
        text: "The number of cards being used jumped. The number of repeat visits per week went from 22 (the baseline I had been tracking informally) to 48. People were stopping in for a single drip coffee, getting a stamp, and leaving. Not a huge ticket each time, but the line of returning customers was now visible.",
      },
      {
        type: "p",
        text: "I started recognizing faces I had never connected to my shop before. Two women from the tax office next door were coming in every morning. The dog groomer was bringing her clients over. The gym manager was getting a coffee after closing the gym down at 9pm.",
      },
      { type: "h2", text: "The math problem I almost ignored" },
      {
        type: "p",
        text: "At the end of week three I sat down with the cards I had collected from full punchers. Eleven free items redeemed. The total cost in food and drink to me was $54. The total revenue from those eleven customers across all visits was $612. Return on the free items: 11x. But that was not the right number to look at, because some of those customers would have come anyway. The number I actually needed was incremental visits.",
      },
      {
        type: "p",
        text: "I went through my POS data and estimated that about 60 percent of the loyalty visits were truly incremental. The other 40 percent were people who would have come back without the card. That brought the real ROI down to about 6x. Still excellent. But the calculation made me realize how easy it would be to fool myself.",
      },
      { type: "h2", text: "Day 30 to day 60: the slow grind" },
      {
        type: "p",
        text: "Weeks five through eight were quiet. The novelty wore off. People who were going to use the card were using the card. The number of new cards being handed out slowed because the regulars all had one. New customers were not coming in faster because I had not done anything to bring them in.",
      },
      {
        type: "p",
        text: "I made one small change: every full card came with a small invitation card asking the customer to bring a friend, who would get their first stamp for free if they showed up with the regular. Three weeks later, I had 19 new customers from those invitations. About a third of them filled their own cards within 60 days.",
      },
      { type: "h2", text: "Final numbers at day 60" },
      {
        type: "ul",
        items: [
          "Total cards handed out: 314.",
          "Full cards redeemed: 67.",
          "Estimated incremental visits: ~520.",
          "Average ticket on incremental visits: $7.20.",
          "Estimated incremental revenue: $3,744.",
          "Total cost in stamps redeemed: ~$340.",
          "Total cost in setup: $36.",
          "Net incremental revenue minus all program costs: ~$3,368 over 60 days.",
        ],
      },
      { type: "h2", text: "What I would do differently" },
      {
        type: "p",
        text: "The paper cards were a perfect way to test the idea. They were also a pain to manage. I lost track of how many were in circulation. I had no idea who my best customers were because the cards had no names on them. When someone lost a card, I had no way to help them. After two months I moved to a digital system, which let me see exactly how many visits a customer had made, send them a thank-you when they hit their tenth, and offer different perks to different customer segments.",
      },
      {
        type: "p",
        text: "But I am glad I started with paper. If I had bought an app on day one I would never have learned that the program needed to reward visits, not purchase size. The paper version forced me to face that problem directly.",
      },
      { type: "p", text: SP_NOTE },
    ],
    lessons: [
      {
        title: "Start with paper, not software",
        body: "A $14 stamp and a $22 stack of cards will teach you more in two weeks than any app demo. The mistakes are cheap.",
      },
      {
        title: "Reward visits, not purchase size",
        body: "Customers come more often when every visit counts. A $4 minimum will lose you the people who only want coffee.",
      },
      {
        title: "Track incremental, not total",
        body: "Some loyalty visits would have happened anyway. The honest number is what you would not have gotten without the card.",
      },
      {
        title: "Full cards are a marketing event",
        body: "When a customer earns their free item, hand them an invite for a friend. That single moment is your highest-leverage marketing.",
      },
      {
        title: "Paper is a stepping stone",
        body: "Once you have proven the program works, the friction of paper will limit you. Move to digital so you can recover lost cards and segment your customers.",
      },
    ],
  },
  {
    slug: "i-replied-to-every-yelp-review-for-6-months-positive-and-negative",
    title:
      "I replied to every Yelp review for 6 months. Positive and negative. The results changed how I see online reputation.",
    category: "tried-30-days",
    categoryLabel: "I tried it for 30 days",
    excerpt:
      "182 replies. Two lawsuits threatened. One review changed from one star to five. And a strange thing happened to the people who never reviewed me at all.",
    authorPersona: "Owner of a 22-seat family restaurant",
    publishedAt: "2026-04-18",
    readingMinutes: 12,
    body: [
      {
        type: "p",
        text: "I run a 22-seat Italian restaurant in a midwestern suburb. We have been open for eight years. Yelp is the platform our customers actually use, more than Google in our area. We had 416 reviews and a 3.9 average when I started this experiment. The 3.9 was killing us. People stop reading at four stars.",
      },
      {
        type: "p",
        text: "I had a long-standing rule against replying to reviews. I had watched too many restaurant owners get into screaming matches with one-star reviewers on Yelp and look like maniacs. My rule was: do not respond, do not engage, do not make it worse. I decided to test the opposite hypothesis for six months.",
      },
      { type: "h2", text: "The rules I set for myself" },
      {
        type: "p",
        text: "Three rules, written on a sticky note next to my laptop. One: I respond to every review, positive or negative, within 48 hours. Two: I respond from a place of curiosity, not defense, even when the review is unfair. Three: I never write the reply when I am angry. I write a draft, walk away for an hour, and come back.",
      },
      { type: "h2", text: "Month one: the one-star reviews almost broke me" },
      {
        type: "p",
        text: "The first one-star review came in on day three. The customer claimed our pasta was undercooked and the waiter was rude. I knew the waiter. I knew the pasta. I drafted a defensive reply explaining the cooking process. I walked away. I came back. I deleted the draft. I wrote a different one: 'I am sorry your meal did not meet your expectations. I would like to understand what happened. If you are willing, please email me directly at the address below.'",
      },
      {
        type: "p",
        text: "She emailed me. We exchanged six messages over a week. It turned out she had been served the wrong dish, which was not undercooked but was someone else's order, and she had thought it was the dish she ordered. The waiter had been short with her because his shift had run six hours past when his kid's school called about a fever. She did not change her review at the time but she said she would come back.",
      },
      {
        type: "p",
        text: "She came back two months later, ate her actual order, and updated her review to four stars with a note explaining what had happened. That was the moment I knew the experiment was working.",
      },
      { type: "h2", text: "The five-star replies that surprised me most" },
      {
        type: "p",
        text: "I had assumed responding to five-star reviews was a nice-to-have. I was wrong. Five-star reviewers turn into the most loyal customers when you reply. I started writing personal, specific responses. I would mention what they had ordered, ask about their friend they mentioned in the review, and sometimes tell them a tiny piece of behind-the-scenes context they had not known.",
      },
      {
        type: "p",
        text: "Within two months I could trace at least 30 visits a month back to customers who had left five-star reviews, gotten a personal reply, and come back specifically because they felt seen. Three of them brought new groups of four to six people for birthdays.",
      },
      { type: "h2", text: "The lawsuit threats" },
      {
        type: "p",
        text: "I had two reviewers threaten to sue me for libel after I replied to their reviews. Both were one-star reviews that contained factual claims I knew to be false. In one case the reviewer claimed we had served their child a dish containing peanuts despite a warning. We had never served them a dish with peanuts. I had the order receipt and the kitchen ticket.",
      },
      {
        type: "p",
        text: "My reply did not call them a liar. It said: 'I take peanut allergies very seriously and our kitchen process flags any peanut-containing dish. I have pulled the receipt from your visit on [date] and the dishes ordered did not contain peanuts. If you believe there was cross-contamination, I would like to talk through the kitchen process with you.' The reviewer accused me of harassment. I called a lawyer. The lawyer said my reply was professional and factual and there was no case. The reviewer never responded again. The review stayed up. Several months later a different customer left a five-star review that specifically said they had felt safe with their nut allergy at our restaurant.",
      },
      { type: "h2", text: "Month three: the people who never review you" },
      {
        type: "p",
        text: "About 10 weeks in I noticed something I did not expect. New customers were mentioning my Yelp replies. Not the reviews themselves, but my responses. They had read through 20 or 30 of my replies before coming in and decided they wanted to support the place. One couple told me they had read every single response over the previous year before booking their anniversary dinner.",
      },
      {
        type: "p",
        text: "This was the part of the experiment no one had told me about. The replies were not really for the reviewers. They were for the next 5,000 people who would read those reviews and replies before deciding whether to come in. Every reply was a billboard.",
      },
      { type: "h2", text: "Month four and five: the slow drift upward" },
      {
        type: "p",
        text: "Between month one and month five my Yelp rating moved from 3.9 to 4.3. The number of new five-star reviews per month doubled. The negative reviews did not stop, but the percentage of negative reviews that updated after my reply was 22 percent. About one in five.",
      },
      { type: "h2", text: "Month six: the final accounting" },
      {
        type: "ul",
        items: [
          "Reviews replied to: 182.",
          "Average response time: 14 hours.",
          "Negative reviews that updated after my reply: 11 of 49 (22 percent).",
          "Five-star reviewers who came back within 60 days of my reply: 38 of 113 (33 percent).",
          "Average rating: 3.9 → 4.3.",
          "Lawsuit threats: 2. Lawsuits actually filed: 0.",
          "Hours per week spent: roughly 4.",
        ],
      },
      { type: "h2", text: "What I would tell another restaurant owner" },
      {
        type: "p",
        text: "If you do nothing else in your business this quarter, set aside two hours per week to reply to reviews. Reply to the good ones with specifics. Reply to the bad ones with curiosity, never defense. Walk away before you hit send if you feel any heat in your chest. And remember the replies are not for the reviewer. They are for the next thousand people who will read the page.",
      },
      { type: "p", text: SP_NOTE },
    ],
    lessons: [
      {
        title: "Reply to the positives, not just the negatives",
        body: "Five-star replies have a higher ROI than one-star replies because they reinforce loyalty. Mention what they ordered and ask about something they said.",
      },
      {
        title: "Curiosity beats defense every time",
        body: "A defensive reply makes you look guilty even when you are right. A curious reply makes you look like the kind of owner who cares.",
      },
      {
        title: "Replies are written for the readers, not the reviewers",
        body: "The reviewer may never read your response. The next thousand people deciding whether to visit will read all of them.",
      },
      {
        title: "Never reply angry",
        body: "Write the draft, walk away for an hour, come back. The replies you write hot are the ones you will regret.",
      },
      {
        title: "Pull the receipt before disputing facts",
        body: "When a review contains a factual claim you disagree with, have your records ready before replying. Calm, factual responses defuse lawsuit threats.",
      },
    ],
  },
];

// Append remaining 15 stories
import { MISTAKE_STORIES, WORKED_STORIES, INDUSTRY_STORIES } from "./data-part-2";
STORIES.push(...MISTAKE_STORIES, ...WORKED_STORIES, ...INDUSTRY_STORIES);

export function getStoryBySlug(slug: string): Story | undefined {
  return STORIES.find((s) => s.slug === slug);
}

export function getStoriesByCategory(category: StoryCategory): Story[] {
  return STORIES.filter((s) => s.category === category);
}

export const CATEGORY_LABELS: Record<StoryCategory, string> = {
  "tried-30-days": "I tried it for 30 days",
  mistakes: "Mistakes",
  "what-worked": "What worked",
  industry: "Industry deep dives",
};
