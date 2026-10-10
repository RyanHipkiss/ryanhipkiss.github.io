---
title: "CraftProfit: a WoW Forever addon that tells you what's worth crafting"
description: "An auction house scanner for World of Warcraft: Forever that prices every recipe you know, shows which ones make a profit, and tracks it over time in a browser dashboard."
publishDate: 2026-10-10
---

Is this worth crafting?

Anyone who levels a profession in World of Warcraft ends up asking that question at the auction house. You know the recipe. You can see what the finished item sells for. But working out what the mats cost, whether a vendor sells half of them cheaper, and whether anyone actually buys the thing means a lot of searching and a lot of mental arithmetic.

So I built **CraftProfit**, an addon for World of Warcraft: Forever. One click scans the auction house, and it lists every recipe your characters know that makes a profit, most profitable first, with the mats to buy for each one.

This post is about what it does and how it's put together, rather than the code line by line. The source is on [GitHub](https://github.com/RyanHipkiss/wow-forever-addons).

## How you use it

There are three steps, and the first two only happen once:

1. **Open each profession window on every character.** CraftProfit saves the recipes that character knows. They're shared across your alts, so your tailor's recipes show up while you're on your bank character.
2. **Visit a trade goods vendor.** CraftProfit notes what merchants charge, so threads, vials, flux and other vendor mats get priced properly.
3. **Go to the auction house and click "Scan AH".** When the scan finishes, the window opens on your profitable recipes.

Each row shows the item, who can craft it, the mat cost, what it sells for, the profit, the margin, and how many are already listed. That last number matters more than it looks: a big profit on an item with forty listings is a lot less appealing than a smaller one with two.

Underneath each row are the mats to buy for one craft, and where each one should come from.

## The shape of it

There are two halves: the addon inside the game, and a small dashboard that runs on your own computer.

```text
  In game (Lua addon)                                On your PC (Node.js)
 ---------------------                              ----------------------
 Profession windows --> known recipes  --+
 Trade vendors      --> vendor prices  --+
 Auction house scan --> AH prices      --+--> SavedVariables --> dashboard server
 Mailbox            --> your own sales --+     (CraftProfit.lua)   (localhost:4747)
                                                                         |
                                                                         v
                                                                     Browser
```

The addon does all the gathering and the profit maths. The dashboard reads what the addon saves and shows the history.

## Scanning the auction house

WoW lets an addon ask for a snapshot of every auction on the realm in one go. The catch is that Blizzard only allows one of these every 15 minutes, so CraftProfit remembers when you last scanned and tells you how long to wait rather than wasting the request.

A full snapshot can be tens of thousands of auctions. Reading them all at once would freeze the game, so the scanner works through them in batches of 1,500 per frame and shows its progress as it goes.

## Pricing things fairly

The interesting part isn't the scan, it's deciding what a price actually *is*. The lowest listing is easy to find, but it's often one stack of one, and it would make everything look cheaper than it is. So CraftProfit uses different rules for buying and selling:

* **Buying mats** uses the average unit price of the cheapest 15% of what's listed. That's roughly what you'd pay buying a real quantity, and one cheap listing can't skew it.
* **Selling the result** uses the lowest buyout, because that's the price you have to undercut. The AH cut comes off that, 5% by default, or whatever you set for a neutral goblin auction house.
* **Bid-only auctions are ignored**, because there's no price you can act on.

For each mat, CraftProfit then picks the cheapest of three sources: the vendor, the auction house, or crafting it yourself. Bolts of Linen are the classic example. Buying the cloth and making the bolts is often cheaper than buying the bolts, and the row says "craft it" when that's the case. The same check works the other way: if a vendor would pay more for the finished item than the auction house, the sell price uses that instead and is marked `(v)`.

## Tracking your own sales

A recipe that shows a profit isn't much use if nobody buys the item. Ideally CraftProfit would know what other players' auctions sold for, but WoW doesn't tell addons that.

What it can see is your own mail. When one of your auctions sells, you get an "Auction successful" mail with the item and the price. CraftProfit reads these whenever you open a mailbox, before you take the gold, and keeps a record of your sales. Duplicate mails are ignored, so opening the mailbox twice doesn't count a sale twice.

That record answers a more useful question than "what did it sell for?": **how many have I sold at or above the price this profit is based on?** Sales below that price don't count, because they don't prove the profit is real.

## The dashboard

The in-game window answers "what should I craft right now?". The dashboard answers "what's been worth crafting lately?".

Every scan saves a daily record of each recipe's profit. A small Node.js server on your own computer reads the addon's saved data and serves a page at `localhost:4747`. It has no dependencies to install: it ships with its own parser for WoW's saved data format, which is a cut-down version of Lua.

The page shows:

* **Today's alerts** at the top: recipes whose profit went up since your last scan day, with new ones flagged.
* **A card for each profitable recipe**, with how long it has been profitable ("Profitable for 48 days, since 22 Aug"), today's change, the margin, the competition, the mats to buy, and a chart of profit per craft over time.
* **Sales at price** for each recipe, over the last 7, 30 or 90 days or all time. You can hide recipes that haven't sold enough, or sort by them.

The charts work with the keyboard as well as the mouse, and there's a table view of the daily numbers for anyone who'd rather read them. The page follows your system's light or dark theme.

One quirk of WoW is that addons only write their data to disk when you `/reload`, log out or quit. So after a scan, a quick `/reload` and the dashboard picks up the new numbers within 15 seconds.

## What it doesn't do

A few things are left out on purpose:

* **Enchants**, and other recipes that don't create an item, are skipped, because there's nothing to list on the auction house.
* **Optional reagents** are ignored. Only the required mats are counted.
* **Prices are kept per realm and faction**, so a scan on one realm doesn't muddle the numbers on another.

## What's next

More ways to make gold, mainly. Three things are in progress:

* **Vendor flips**: auction house listings priced below what a vendor will pay for the item, so you can buy them and sell them straight on.
* **A shopping list** for a batch of crafts, showing what you already have in your bags and finding each missing mat in the auction house.
* **The deposit**: the fee you lose when an auction expires unsold, taken off the profit as a worst case.

If you play WoW Forever and want to try it, the addon and install steps are on [GitHub](https://github.com/RyanHipkiss/wow-forever-addons).
