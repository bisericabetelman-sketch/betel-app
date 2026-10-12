# Betel Manchester app — setup guide

This is the church app as a **web app**: people open a link and add it to their phone's home screen, where it behaves like a normal app with the Betel logo. It works in English and Romanian.

## What's in the folder

All 15 files sit in one folder, with no subfolders.

| File | What it is |
|---|---|
| `config.js` | **All church details** — meetings, address, WhatsApp, email, bank details, links. Edit this to change anything. |
| `i18n.js` | All button and heading text, in English and Romanian. |
| `index.html`, `app.css`, `app.js` | The app itself. You shouldn't need to touch these. |
| `netlify.toml` | Netlify settings, including how the app reads your latest YouTube videos. |
| `prayer-wall.sql` | Optional: sets up the prayer wall database. |
| `*.png`, `manifest.webmanifest`, `sw.js` | Home-screen icons and offline support. |

## 1. Put it online (free, about 20 minutes)

The YouTube feature needs Netlify's free hosting connected to GitHub. Both have free accounts.

1. Create a free account at **github.com**. Click **New repository**, name it `betel-app`, and choose **Private**. Create it.
2. Extract the zip first (on Windows, right-click it and choose **Extract All**). On the new repository page, click **uploading an existing file**, then **choose your files**. Open the extracted `betel-app` folder, select all 15 files (**Ctrl+A**), and click **Open**. Then click **Commit changes**.
3. Create a free account at **netlify.com**. Sign up with your GitHub account.
4. In Netlify, click **Add new site → Import an existing project → GitHub**, then pick `betel-app`. Leave every setting as it is and click **Deploy**.
5. After a minute you get a link like `https://something.netlify.app`. Under **Site configuration → Change site name**, you can change it to something like `betel-manchester.netlify.app`.

Every time you change a file on GitHub, Netlify updates the app automatically within a minute or two.

**Your own address (optional):** you can buy a domain such as `betelmanchester.org.uk` and connect it under **Domain management** in Netlify.

## 2. Install it on a phone

- **iPhone:** open the link in **Safari**, tap **Share**, then tap **Add to Home Screen**.
- **Android:** open the link in **Chrome**. Tap **Install** on the banner in the app, or open the ⋮ menu and choose **Add to Home screen** / **Install app**.

## 3. Online giving with Apple Pay and Google Pay (Stripe)

1. Create an account at **stripe.com** as a charity. You need the church's legal name, charity number 1217648, a trustee's details, and the Lloyds account for payouts.
2. In Stripe, go to **Payment Links → New**. Choose **Customers choose what to pay**, name it e.g. "Donation to Betel Manchester", and create it.
3. Copy the link (it starts with `https://buy.stripe.com/...`).
4. In `config.js`, paste it between the quotes on the `stripePaymentLink: ''` line.

A **Give online** button then appears on the Give screen. Stripe's payment page shows Apple Pay on iPhones and Google Pay on Android automatically, and Stripe pays the money into the Lloyds account. Check Stripe's current fees and charity pricing before you start.

Bank transfer details already show on the Give screen and cost nothing.

## 4. Prayer wall (optional)

At the moment, prayer requests go to the church WhatsApp (07407 247656) or email. The prayer wall section stays hidden until you switch it on:

1. Create a free project at **supabase.com**.
2. Open **SQL Editor → New query**, paste in everything from `prayer-wall.sql`, and click **Run**.
3. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `config.js`, under `prayerWall`.

When someone ticks **Share on prayer wall**, their request is also saved in Supabase, **hidden until you approve it**. To approve one, go to **Table Editor → prayer_requests** and tick **approved**. Delete a row to remove a request.

Prayer requests can contain personal information. A short privacy note, saying who sees requests and how long you keep them, is good practice under UK GDPR.

## 5. Changing things later

- **Meetings, address, contacts, bank details:** edit `config.js` on GitHub (open the file and click the ✏️ pencil icon).
- **A one-off event, such as the weekend away:** add it to `specialEvents` in `config.js`. There's an example in the comments there.
- **After any change:** open `sw.js` and change `betel-v2` to `betel-v3` (then `v4`, and so on), so phones pick up the update.

## Notes

- **Add to calendar** creates a weekly repeating event. Meeting lengths are set in `config.js` as `durationMins`: Sunday is 2 hours and the others are 1½ hours. Adjust them if needed.
- **"Ask where this week"** opens WhatsApp with a ready-written question about the home meetings.
- The **verse of the day** rotates through the verses listed in `config.js`. You can add more there.
- The **Watch** screen shows the latest videos from the YouTube channel and plays them inside the app. **Watch live** opens the channel's live page.
