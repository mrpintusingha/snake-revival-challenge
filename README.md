# Snake Revival Challenge

BUILD: 90s NOKIA SNAKE CHALLENGE

Build and deploy a production-ready, mobile-first viral web experience called:

90s Nokia Snake Challenge

Core positioning:

You played it as a kid.
Can you still beat your friends?

The objective is to recreate the emotional experience of playing classic monochrome mobile Snake in the late 1990s / early 2000s, then combine that nostalgia with a modern social competition and friend-challenge loop.

This is a paid game experience, not gambling.

There are:

No cash prizes

No prize pool

No payouts

No betting

No wagering

No winner payments

No monetary rewards

The player simply pays to enter the official challenge and receives:

Their score

Their global ranking

Their country ranking

Their personal best

Achievements

Friend challenges

Shareable results

The business model is simply:

Players pay to participate.

1. VERY IMPORTANT PRODUCT PHILOSOPHY

The most important thing is NOSTALGIA.

Do not make this feel like a modern retro-inspired arcade game.

Make someone who played classic Snake on a monochrome mobile phone immediately think:

“OH MY GOD. THIS IS EXACTLY HOW IT FELT.”

The actual Snake game should deliberately preserve the simplicity and limitations of the original era.

Do NOT modernize the game with:

gradients

3D graphics

particle effects

flashy animations

modern game HUDs

unnecessary visual effects

elaborate backgrounds

The modern technology should be invisible.

The game should feel old.

The social experience should feel modern.

The core contrast is:

1999 game experience + 2026 social competition

2. NOKIA BRAND / IP CAUTION

The concept is specifically about nostalgia for Nokia-era Snake.

However, do not assume permission to use Nokia's protected branding or proprietary assets.

DO NOT copy or reproduce without permission:

Nokia logos

Nokia wordmarks

exact Nokia phone shell/product designs

Nokia proprietary UI artwork

Nokia copyrighted game source code

Nokia proprietary sound files

screenshots or product photographs

other proprietary Nokia assets

Instead:

Create an ORIGINAL implementation of the classic monochrome mobile Snake experience.

The game may use descriptive wording such as:

“Nokia-era Snake”
“Snake on old phones”
“The Snake game you remember”

Include a subtle footer disclaimer:

Not affiliated with or endorsed by Nokia.

Make all Nokia-related wording configurable so it can be changed easily if legal review requires it.

The gameplay, screen proportions, visual simplicity, scoring behavior, movement and overall feel should be recreated as faithfully as possible from the childhood experience, while using original implementation/assets.

3. BRAND

Primary consumer-facing name:

90s Nokia Snake Challenge

Short brand:

90s Snake

Hero copy:

You played it as a kid.

Can you still beat your friends?

Supporting copy:

The classic mobile Snake experience, rebuilt as a global challenge for the 90s generation.

Primary CTA:

ENTER THE CHALLENGE — $1

4. NO PLAYABLE DEMO

Do NOT provide a playable free 10-second demo.

Do NOT let visitors control Snake before payment.

The first visit should preserve the excitement and nostalgia.

Instead, create a short looping visual teaser of the actual game.

The teaser should be approximately 5–10 seconds and show:

monochrome display

Snake moving

Snake eating food

score increasing

Snake growing

classic simple movement

subtle original retro audio if appropriate

The visitor should immediately recognize the childhood experience.

End with:

WHO'S STILL GOT IT?

Then:

ENTER THE CHALLENGE — $1

The teaser exists only to create anticipation and nostalgia.

The real game starts only after payment.

5. LANDING PAGE

Create a highly polished but extremely simple landing page.

It should feel like an internet phenomenon rather than a normal startup website.

Avoid a SaaS-style layout.

Hero:

🐍

90s Nokia Snake Challenge

You played it as a kid.

Can you still beat your friends?

Supporting line:

The classic mobile Snake experience, rebuilt for the 90s generation.

Below the hero, show the nostalgic game teaser.

Then a large CTA:

ENTER THE CHALLENGE — $1

Under CTA:

3 official attempts • Global ranking • Challenge your friends

Show REAL social proof from the database when available:

47,821 players

18,420 top score

1,284 challenges today

Do not fabricate these numbers.

For early development, seed clearly-labelled test/demo data or gracefully hide the values until enough real data exists.

6. LIVE ACTIVITY

Make the product feel alive.

Show actual live statistics when backed by real data:

🟢 37 people are playing right now

1,284 challenges sent today

Activity examples:

Rahul just scored 5,203.

Sneha entered the Top 100.

Amit challenged Priya.

Arjun reached #8.

Only show genuine events from the database.

Never fabricate activity.

Keep this section visually subtle.

7. LANDING PAGE LEADERBOARD

Show a compact leaderboard preview.

Heading:

WHO'S STILL GOT IT?

Example:

🥇 Arjun — 18,420
🥈 Sneha — 17,891
🥉 Rahul — 16,991
4. Amit — 15,822
5. Priya — 15,430

Use real database data.

CTA below:

CAN YOU ENTER THE TOP 100?

8. HOW IT WORKS

Keep extremely short:

1. ENTER

Pay $1 to enter the official challenge.

2. PLAY

Play the classic Snake experience.

3. CHALLENGE

Get your score and challenge your friends.

Do not over-explain.

9. PAYMENT

Use Dodo Payments.

Initial price:

$1

The price must be configurable.

Do not hard-code $1 throughout the application.

Future prices may be tested:

$1
$1.99
$2.99
$4.99

But the initial production value is $1.

Payment screen:

ENTER THE OFFICIAL CHALLENGE

$1

3 official attempts. Keep your best score.

Benefits:

✓ Global leaderboard
✓ Personal best
✓ Friend challenges
✓ Shareable score
✓ 3 official attempts

CTA:

PAY $1 & PLAY

Use Dodo Payments securely.

Payment must be verified server-side.

Never trust a frontend “payment successful” flag.

Implement webhooks and idempotent payment processing.

Store:

Dodo payment ID

customer reference when appropriate

amount

currency

status

player/session reference

timestamp

After confirmed payment:

unlock the official game

If payment fails:

Return the user cleanly to the payment state and allow retry.

Do not accidentally consume an attempt for a failed payment.

10. USER ONBOARDING

Do NOT require account creation before payment.

Minimize friction.

After payment, create a lightweight player identity.

Ask for:

YOUR NAME

Nickname:

____________

Optional:

Country

The player should be able to start the game immediately.

If they leave before creating a full profile, preserve the session.

Provide optional account creation later.

11. OFFICIAL GAME

After successful payment:

Use a dramatic but minimal transition:

YOUR CHILDHOOD IS BACK.

Then:

3

2

1

GO

Then start Snake.

The actual game must be the emotional centerpiece of the product.

12. SNAKE GAME — EXTREMELY IMPORTANT

Recreate the classic monochrome mobile-Snake experience as faithfully as possible.

The objective is for someone familiar with the original game to immediately recognize:

screen proportions

monochrome appearance

score placement

Snake appearance

food

Snake growth

movement

controls

speed progression

collision behavior

simplicity

pacing

The game should NOT look like a modern arcade game.

Visual direction:

dark monochrome LCD-inspired screen

muted green/gray pixel appearance

block-based Snake

simple food dot

simple score

minimal UI

subtle display texture

no gradients

no modern effects

Use original assets/implementation.

Do NOT copy proprietary Nokia assets.

13. GAME CONTROLS

Desktop:

Arrow keys

WASD

Mobile:

swipe up/down/left/right

optional large directional touch controls if useful

Touch controls must feel excellent.

Prevent accidental page scrolling while playing.

No horizontal overflow.

Game should run smoothly on:

iPhone

Android

tablets

desktop browsers

14. GAMEPLAY

Core mechanics:

Snake continuously moves

Food increases score

Snake grows

Collision with wall ends game

Collision with itself ends game

Difficulty increases gradually

Movement must feel fair

Input latency must be extremely low

Game loop should be deterministic as much as practical

Keep the gameplay simple.

Do not add:

weapons

power-ups

skins

modern special effects

unnecessary features

The simplicity IS the nostalgia.

15. OFFICIAL ATTEMPTS

Initial $1 entry provides:

3 official attempts

The player can play up to three official games.

Only the highest valid score counts as their personal best.

Show clearly:

Attempts remaining: 3

Then:

Attempts remaining: 2

etc.

Do not make the user feel tricked.

The three attempts are part of the paid entry.

16. RESULT SCREEN

THIS IS THE MOST IMPORTANT SCREEN AFTER THE GAME.

After the game ends:

YOUR SCORE

4,872

Then:

GLOBAL #327

You beat 96% of players.

Show:

🌎 Global: #327
🇮🇳 India: #71
👥 Friends: #2

Then an achievement:

SNAKE LEGEND

Achievement tiers:

0–499:
Snake Rookie

500–1,499:
Nokia Kid

1,500–2,999:
Snake Player

3,000–4,999:
Snake Master

5,000–9,999:
Snake Legend

10,000+:
90s Final Boss

These are status labels only.

There are NO monetary rewards.

17. RESULT SCREEN CTA

After showing the result:

😈 CAN YOUR FRIEND BEAT YOU?

Show:

Your score: 4,872

Primary CTA:

CHALLENGE A FRIEND

Secondary:

SHARE MY SCORE

Third:

PLAY AGAIN

If attempts remain, allow another official attempt.

The player's best score must always be preserved.

18. VIRAL CHALLENGE SYSTEM

Every player should get a unique challenge link.

Example:

/challenge/ABC123

or:

/challenge/pintu-ABC123

The link must be shareable and work for users who have never visited the website.

Challenge page:

🐍 PINTU SCORED 4,872

CAN YOU BEAT HIM?

Supporting copy:

Pintu thinks he's still got it.

Show:

4,872

Then:

BEAT THIS SCORE

The challenge page should be one of the most polished pages in the entire application.

19. FRIEND CHALLENGE EXPERIENCE

When the friend opens the challenge:

Show the original player's score prominently.

Example:

PINTU VS YOU

Pintu:

4,872

Then:

Beat 4,872 to take the crown.

CTA:

BEAT THIS SCORE

Flow:

Challenge page
→ payment
→ official game
→ result
→ score comparison

Do not require complicated friend registration.

Use the challenge relationship itself to establish the connection.

20. FRIEND BATTLE

After the challenger finishes:

Show:

THE BATTLE

Pintu — 4,872
Rahul — 5,103

If challenger wins:

👑 YOU TOOK THE CROWN

If challenger loses:

🐍 PINTU STILL HAS THE CROWN

Add:

REMATCH

The language should create friendly rivalry.

Never introduce betting or money-based competition.

21. SHARE TEXT

Optimize especially for WhatsApp.

Generate:

SCORE SHARE

🐍 I scored 4,872 on the 90s Nokia Snake Challenge.

Apparently I'm better than 96% of players.

Can you beat me?

[challenge URL]

FRIEND CHALLENGE

😂 I scored 4,872 on 90s Snake.

I challenge you to beat me.

[challenge URL]

Make sharing one tap.

Use:

Web Share API

WhatsApp

Copy link

X

Telegram where practical

On mobile, prioritize native sharing and WhatsApp.

22. SHAREABLE SCORE CARD

Generate a dynamic social image.

It should look like a piece of social content, not an advertisement.

Display:

90s SNAKE CHALLENGE

🐍

4,872

GLOBAL #327

BEAT MY SCORE

90s Snake branding

website URL

Make this optimized for:

WhatsApp

Instagram Stories

X

Facebook

Use Open Graph metadata.

Challenge pages should dynamically generate:

Pintu scored 4,872 on 90s Snake. Can you beat him?

23. PLAYER PROFILE

Keep profiles lightweight.

Show:

Nickname
Country
Best score
Global rank
Country rank
Games played
Achievements
Recent scores
Challenge link

Example:

PINTU

🐍 4,872

GLOBAL #327

SNAKE LEGEND

[ CHALLENGE ME ]

Do not force profiles before first gameplay.

24. LEADERBOARD

Create dedicated leaderboard page.

Tabs:

GLOBAL

INDIA

FRIENDS

Columns:

Rank
Player
Score
Badge

Highlight the current player.

Always make it easy to see:

YOU ARE #327

Use efficient database queries.

Leaderboard should update as new verified scores arrive.

25. FRIEND LEADERBOARD

Use challenge relationships rather than building a full social graph initially.

Show:

YOUR FRIEND BATTLE

Pintu — 4,872
Rahul — 5,103

Then:

👑 Rahul has the crown

or:

🐍 Pintu still has the crown

26. LIVE ACTIVITY FEED

Create a compact real-time activity feed.

Examples:

Rahul just scored 5,203.

Sneha entered the Top 100.

Amit challenged Priya.

Pintu reached #327.

Back it with actual Supabase data.

Do not fabricate activity.

27. DATABASE — SUPABASE

Use Supabase.

Tables:

profiles
game_sessions
scores
challenges
payments
achievements
player_achievements
activity_events

Suggested structures:

profiles

id
nickname
country
created_at
updated_at

game_sessions

id
profile_id
payment_id
attempt_number
session_token_hash
game_version
started_at
ended_at
score
status
verified
created_at

scores

id
profile_id
game_session_id
score
rank_global
rank_country
status
created_at
verified_at

challenges

id
challenger_id
challenger_score
challenge_code
created_at
opened_at
accepted_by
completed_at

payments

id
profile_id
provider
provider_payment_id
amount
currency
status
created_at

achievements

id
name
description
threshold
created_at

player_achievements

id
profile_id
achievement_id
created_at

activity_events

id
profile_id
event_type
metadata
created_at

Add appropriate indexes.

28. SCORE SECURITY / ANTI-CHEAT

Do NOT trust:

browser → score → database

Create server-side official game sessions.

At minimum:

session ID

secure session token

payment association

attempt number

game version

start time

end time

score validation

duplicate submission prevention

Validate scores for plausibility.

Reject obviously impossible submissions.

Rate-limit:

score submissions

challenge generation

suspicious requests

Flag suspicious results.

Statuses:

verified
pending
flagged
rejected

For MVP, basic anti-cheat is sufficient.

Do not spend months building advanced anti-cheat.

29. SERVER ARCHITECTURE

Use Supabase Edge Functions or equivalent backend functions where needed for:

payment verification

Dodo webhook handling

official session creation

score submission

challenge creation

sensitive writes

Never expose:

Supabase service role key

Dodo secret keys

webhook secrets

in frontend code.

30. ANALYTICS

Use PostHog.

Track:

landing_view
challenge_cta_clicked
checkout_started
payment_completed
payment_failed
game_started
game_completed
score_submitted
challenge_created
challenge_shared
challenge_opened
friend_checkout_started
friend_payment_completed
friend_game_started
friend_game_completed
repeat_attempt

The most important funnel is:

Visitor
→ Checkout
→ Paid
→ Game
→ Score
→ Challenge
→ Friend opens
→ Friend pays
→ Friend plays

Create a simple founder analytics view showing:

Visitors
Checkout starts
Paid players
Revenue
Games completed
Challenges created
Challenges opened
Friend conversion
Repeat players

31. ADMIN DASHBOARD

Create a simple protected admin dashboard.

Show:

Total players
Total paid players
Payments
Revenue
Today's players
Today's revenue
Games played
Average score
Top score
Challenges created
Challenges opened
Repeat players
Flagged scores

Sections:

Recent payments
Recent games
Recent challenges
Flagged scores

Keep it simple.

32. REAL SOCIAL PROOF

Never use fake numbers.

During development, allow clearly marked seed/test records.

In production, show only real data.

Examples:

47,821 players

18,420 top score

1,284 challenges today

37 playing now

All should be dynamically calculated.

33. DESIGN

The design should look like:

Nostalgia + internet challenge + premium simplicity

The game:

extremely retro

monochrome

simple

authentic-feeling

The website:

modern

fast

polished

social

visually striking

Use strong typography.

Keep copy short.

Avoid:

generic startup gradients

purple AI gradients

excessive rounded cards

stock photos

corporate sections

long explanations

The visitor should immediately understand:

This is Snake.

I can challenge my friends.

34. MOBILE-FIRST

Assume much of the traffic comes from:

WhatsApp
Instagram
Facebook
X
mobile browsers

Therefore:

mobile-first design

large tap targets

excellent swipe controls

instant load

no horizontal scrolling

checkout optimized for mobile

result screen optimized for screenshots

sharing optimized for mobile

35. SEO / SOCIAL METADATA

Primary title:

90s Nokia Snake Challenge — Can You Still Beat Your Friends?

Description:

You played Snake as a kid. Now prove you still have it. Enter the 90s Snake Challenge, get your score and challenge your friends.

Dynamic challenge title:

Pintu scored 4,872 on 90s Snake. Can you beat him?

Generate proper:

Open Graph title

Open Graph description

Open Graph image

Twitter/X metadata

canonical URL

36. PERFORMANCE

The game must load extremely quickly.

Prioritize:

fast first paint

small JavaScript bundle

minimal dependencies

efficient Canvas rendering

smooth game loop

mobile performance

low memory usage

Do not add large libraries unless genuinely necessary.

37. DEPLOYMENT

Prepare for production deployment using:

Frontend:
React + TypeScript

Game:
HTML5 Canvas

Database/backend:
Supabase

Payments:
Dodo Payments

Analytics:
PostHog

Hosting:
Vercel / equivalent managed hosting

Use environment variables.

Create README/setup documentation containing:

Supabase setup

Database migration

RLS setup

Dodo setup

Dodo webhook setup

PostHog setup

environment variables

local development

production deployment

custom domain

test payment mode

live payment mode

38. ENVIRONMENT VARIABLES

Clearly document variables such as:

SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DODO_PAYMENTS_API_KEY
DODO_WEBHOOK_SECRET
POSTHOG_KEY
POSTHOG_HOST

Never expose secrets to the browser.

39. PRICE CONFIGURATION

The initial production price is:

$1

But store it as a configurable value.

Example conceptual configuration:

ENTRY_PRICE = 1.00

Do not hard-code the number throughout the codebase.

We will later test pricing experimentally.

Do not automatically increase pricing based only on user count.

40. DO NOT OVERBUILD

The MVP must remain focused.

Build ONLY:

Landing page

Nostalgia teaser

Dodo payment

Official Snake game

Three attempts

Score

Global leaderboard

India leaderboard

Personalized challenge URL

WhatsApp sharing

Result card

Lightweight profile

Basic live activity

Analytics

Basic admin dashboard

Basic score anti-cheat

Legal/disclaimer footer

Do NOT build yet:

multiple games

subscriptions

chat

social feed

complex friend graphs

tournaments

prize system

gambling

NFTs

blockchain

AI features

unnecessary animations

complicated account systems

One game.

One price.

One leaderboard.

One viral loop.

41. THE VIRAL LOOP

Optimize the entire application around:

SEE

Person sees nostalgic Snake.

↓

WANT

“I remember this!”

↓

ENTER

Pays $1.

↓

PLAY

Gets official score.

↓

RANK

Discovers their global position.

↓

EGO

“I'm #327. I can do better.”

↓

SHARE

Challenges friend.

↓

FRIEND

Friend sees:

Pintu scored 4,872.
Can you beat him?

↓

PAYMENT

Friend pays $1.

↓

PLAY

Friend plays.

↓

COMPETITION

Friend takes or loses the crown.

↓

SHARE

Friend challenges someone else.

↓

LOOP

This viral loop is more important than adding features.

42. KEY PRODUCT COPY

Use language like:

You played it as a kid. Can you still beat your friends?

Who's still got it?

Your childhood is back.

Can you beat Pintu?

Take the crown.

You lost the crown.

Take it back.

You beat 96% of players.

Snake Legend.

Avoid generic phrases like:

“Welcome to our gaming platform.”

“This innovative gaming experience…”

“Join our community…”

Keep it human, nostalgic and competitive.

43. FINAL QUALITY BAR

The website must produce two reactions:

Reaction #1

“OMG. This is exactly the Snake I remember.”

Reaction #2

“No way Rahul beat me. I need to challenge him.”

The nostalgia should come from the actual game experience.

The virality should come from the challenge system.

The revenue should come from paid participation.

The growth should come from players themselves sharing their scores.

Build the complete MVP with this philosophy.

Do not ask unnecessary questions.

Use sensible defaults.

Where credentials are unavailable, implement the complete integration structure and clearly identify the required environment variables.

Before considering the project complete, test:

mobile layout

desktop layout

Snake controls

swipe controls

game loop

collision

score

three attempts

payment success

payment failure

duplicate payment webhook

payment retry

session recovery

score validation

leaderboard

ranking

challenge creation

challenge opening

WhatsApp sharing

result image

Open Graph preview

Supabase RLS

security

page refresh

slow network

mobile Safari

Chrome Android

responsive behavior

Fix all critical issues.

The application should be ready to deploy to a custom domain immediately after credentials are configured.

SUCCESS CRITERIA

The MVP is successful only if it creates this behavioral chain:

A stranger sees it → understands it instantly → pays $1 → plays → cares about their score → shares a challenge → another stranger pays $1.

Optimize the product around this behavior above everything else.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6ab400db-7965-42a5-bdbb-64a8ba7b9322).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
