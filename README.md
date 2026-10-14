# Hushfield

A phone web app that listens to the room and cancels or masks the most annoying sound.

**Open on your phone:** https://raw.githack.com/tempohadesvine-hash/animated-adventure/main/hushfield.html

## What it does

- **Auto** (default): scores every sound by loudness to the ear, tonality and persistence, then picks the right mode for the worst one.
- **Hum Lock**: plays an inverted copy of a steady tone under 1 kHz (fridge, fan, engine, electrical hum) and auto-tunes phase and level.
- **Live Invert**: flips the live mic signal below ~250 Hz for deep rumble.
- **Mask**: brown, pink or white noise that rises with the room level, for voices, clatter and high whines.

Includes a live 20 Hz – 8 kHz spectrum, a reduction readout in dB, a screen wake lock and an idea queue.

## Use

1. Open the link in Chrome (needs https for the microphone).
2. Tap **Start listening** and allow the microphone.
3. Wear wired earbuds — cancellation only works at your ear, not through the phone speaker.
4. Menu → **Add to Home screen** to launch it like an app.

## Limits

Browser audio adds 20–50 ms of latency, so true cancellation only works on steady, low-pitched sound. Voices and sudden noises get masked instead. A native Android build (Oboe) is the next step for lower latency.

---

# Catgotchi

A pixel cat you raise in real time — it keeps living while the app is closed.

**Open on your phone:** https://raw.githack.com/tempohadesvine-hash/animated-adventure/main/cat.html

- Name it and pick a fur colour (ginger, grey, black, cream)
- Stats: food, fun, energy, clean, health — they drop over real hours
- Feed (kibble or fish treat), laser-pointer mini-game, pet (tap the cat), clean, sleep/wake, meds
- Grows from kitten to adult to senior; weight goes up with treats and down with play
- Messes, colds and a day/night window tied to your clock
- Neglect it for about a day and it wanders off; then you can adopt again
- Diary of what happened while you were away, plus an idea queue

---

# Menagerie Poker

Animal-coded poker companion (Cats=Clubs, Dogs=Diamonds, Hogs=Hearts, Snakes=Spades). Source in `menagerie-poker/` (React + TS + Tailwind, `npm install && npm run dev`, `npm test`). Prebuilt single file: `poker.html`.

---

# HireCall site

`hirecall/` — full site for hirecall.netlify.app: home, pricing, signup (Netlify form with resume upload), thanks, privacy, terms, 404. Drag the folder's contents onto Netlify to update the live site, then enable Forms → form detection.
