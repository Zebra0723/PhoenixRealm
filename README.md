# Phoenix Realm

A professional multi-page marketing website for **Phoenix Realm**, a fictional
mythology-themed theme park. *Three Realms. One Myth.*

This site is a prototype marketing asset built for a school financial education
presentation. It is designed to feel like a real theme park website while
running entirely locally with no backend or build step.

## Pages

| Page | File | Purpose |
| --- | --- | --- |
| Home | `index.html` | Sells the feeling of the park: hero, slogan, realm previews. |
| Explore Realms | `realms.html` | In-depth look at the three realms. |
| Plan Your Visit | `plan.html` | Facilities, food & dining, mini-map, guest comfort. |
| Book Now | `book.html` | Prototype ticket booking with live total and a fake checkout. |

## The three realms

- **Mythos Family Realm** — bright, welcoming, adventurous (families & younger visitors)
- **HydroRealm** — mysterious, refreshing, aquatic (water enthusiasts & families)
- **Adolescent Abyss** — darker, intense, dramatic (thrill-seekers aged 12+)

## Running it

No installation or build step is required. Either:

1. Open `index.html` directly in any modern browser, **or**
2. Serve the folder for clean routing:

   ```bash
   python3 -m http.server 8000
   # then visit http://localhost:8000
   ```

## Tech & structure

Plain, dependency-free HTML, CSS and JavaScript so it runs anywhere.

```
.
├── index.html        # Home
├── realms.html       # Explore Realms
├── plan.html         # Plan Your Visit
├── book.html         # Book Now
├── css/styles.css    # Design system (colours, components, responsive)
├── js/main.js        # Nav, scroll reveals, booking total, modal
└── assets/logo.svg   # Brand logo (also used as favicon)
```

### Design system

- **Colours:** coral-red (headings/buttons), teal (navigation/accents),
  pale gold (highlights), off-white background, charcoal/navy text.
- **Fonts:** Sora for display headings, Inter for body text (Google Fonts,
  with system fallbacks if offline).
- Soft shadows, clean cards, subtle line icons, smooth hover/transition states,
  responsive for desktop and tablet, and accessible contrast.

> The booking page is a non-functional prototype — "Continue to Checkout" shows
> an availability notice. There is no payment processing.
