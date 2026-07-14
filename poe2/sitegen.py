from pathlib import Path
from html import escape
from datetime import date

ADSENSE_CLIENT = "ca-pub-1111218417177666"

SITE = {
    "name": "PoE2 Build Lab",
    "tagline": "Clear Path of Exile 2 starter guides, build checklists, and patch-aware beginner notes.",
    "url": "https://brickerp.github.io/",
    "updated": "2026-06-16",
    "patch": "0.5.2 Early Access"
}

NAV = [
    ("Home", "index.html"),
    ("Beginner Builds", "builds/best-beginner-builds.html"),
    ("Beginner Guide", "guides/beginner-guide.html"),
    ("Currency", "guides/currency-guide.html"),
    ("Checklist", "tools/beginner-build-checklist.html"),
    ("About", "about.html"),
]

pages = [
    {
        "path": "index.html",
        "title": "PoE2 Build Lab: Path of Exile 2 Beginner Builds and Guides",
        "description": "Patch-aware Path of Exile 2 beginner builds, leveling notes, currency basics, and checklists for new and returning players.",
        "hero": True,
        "content": """
<section class=\"grid cards\">
  <article class=\"card highlight\"><p class=\"eyebrow\">Start here</p><h2>Best beginner build archetypes</h2><p>Pick a simple, forgiving build direction before spending your first passive points.</p><a class=\"button\" href=\"builds/best-beginner-builds.html\">Read beginner builds</a></article>
  <article class=\"card\"><p class=\"eyebrow\">New player guide</p><h2>What to do first</h2><p>A quick path through skills, support gems, defenses, and early upgrades.</p><a href=\"guides/beginner-guide.html\">Open guide</a></article>
  <article class=\"card\"><p class=\"eyebrow\">Systems</p><h2>Currency basics</h2><p>Understand common crafting and upgrade currencies before you waste valuable items.</p><a href=\"guides/currency-guide.html\">Learn currency</a></article>
</section>
<section class=\"content-block\">
  <h2>Current editorial stance</h2>
  <p>PoE2 Build Lab is starting as a focused beginner resource for Path of Exile 2 Early Access. Guides are written to be version-labeled and easy to update after patches. We avoid claiming a build is the absolute best unless it has been checked against current patch notes and in-game evidence.</p>
  <div class=\"notice\"><strong>Patch context:</strong> The site currently tracks <b>0.5.2 Early Access</b>. Treat all build advice as a starting point and verify before investing expensive currency.</div>
</section>
<section class=\"grid cards\">
  <article class=\"card\"><h3>Classes explained</h3><p>Choose a class based on playstyle, range, defense, and early learning curve.</p><a href=\"guides/classes-explained.html\">Compare classes</a></article>
  <article class=\"card\"><h3>Skill gems explained</h3><p>Skill gems, support gems, and why links matter more than raw tooltip damage.</p><a href=\"guides/skill-gems-explained.html\">Read systems guide</a></article>
  <article class=\"card\"><h3>Beginner checklist</h3><p>A practical act-by-act checklist for defenses, flasks, gems, and upgrades.</p><a href=\"tools/beginner-build-checklist.html\">Use checklist</a></article>
</section>
"""
    },
    {
        "path": "builds/best-beginner-builds.html",
        "title": "Best Path of Exile 2 Beginner Build Archetypes for Patch 0.5.2",
        "description": "Beginner-friendly Path of Exile 2 build archetypes for patch 0.5.2, with pros, risks, and safe gearing priorities.",
        "heading": "Best PoE2 beginner build archetypes",
        "content": """
<p class=\"lede\">If you are new to Path of Exile 2, your first build should be simple to pilot, cheap to repair, and forgiving when your gear is bad. This page ranks <em>archetypes</em>, not unverified exact meta builds.</p>
<div class=\"notice\"><strong>Updated:</strong> 2026-06-16 · <strong>Patch:</strong> 0.5.2 Early Access · This page is meant as a safe starter direction, not a promise of endgame dominance.</div>
<table>
<thead><tr><th>Starter direction</th><th>Why it is beginner-friendly</th><th>Main risk</th><th>First gearing priority</th></tr></thead>
<tbody>
<tr><td>Ranged elemental caster</td><td>Clear targeting, easier boss spacing, strong learning value for skill/support gems.</td><td>Can feel fragile if you ignore life, resistances, and movement.</td><td>Life, resistances, cast speed, relevant elemental damage.</td></tr>
<tr><td>Minion / companion-oriented Witch</td><td>Extra bodies reduce pressure while you learn enemy attacks.</td><td>Minion scaling can be confusing and patch-sensitive.</td><td>Gem levels, minion damage/survivability, defensive stats on gear.</td></tr>
<tr><td>Ranged projectile Ranger / Mercenary</td><td>Good for learning positioning, kiting, and screen control.</td><td>Requires movement discipline and weapon upgrades.</td><td>Weapon damage, attack speed, life, resistances.</td></tr>
<tr><td>Simple melee bruiser</td><td>Teaches stun windows, dodge timing, and defensive gearing.</td><td>More punishing for brand-new players because you stand closer to danger.</td><td>Weapon DPS, armour/evasion as appropriate, life, recovery.</td></tr>
</tbody>
</table>
<h2>Fast recommendation</h2>
<p>For a first character, start with a ranged elemental caster or minion-oriented Witch-style build. They let you learn boss patterns without also fighting melee range, weapon breakpoints, and perfect dodge timing at the same time.</p>
<h2>What makes a good starter build?</h2>
<ul>
<li><strong>Low currency dependence:</strong> it should function on campaign rares, not require a rare unique item.</li>
<li><strong>Simple buttons:</strong> one main damage skill, one movement/defense plan, one boss setup.</li>
<li><strong>Clear scaling:</strong> you understand whether to upgrade gem levels, weapon DPS, elemental damage, minion stats, or defenses.</li>
<li><strong>Patch resilience:</strong> if one support gem gets nerfed, the build should still be playable.</li>
</ul>
<h2>Beginner mistakes to avoid</h2>
<ul>
<li>Following an endgame showcase without checking whether it works during leveling.</li>
<li>Spending all currency on damage while entering acts with weak resistances and low life.</li>
<li>Changing several systems at once; change one skill/support setup, then test.</li>
<li>Trusting an old guide without checking the patch date.</li>
</ul>
<h2>Next step</h2>
<p>Pick one archetype, finish Act 1 with it, and keep notes on deaths: one-shot, damage too low, mana issues, or unclear mechanics. Those notes tell you what to fix before copying a more advanced build.</p>
"""
    },
    {
        "path": "guides/beginner-guide.html",
        "title": "Path of Exile 2 Beginner Guide: What to Do First",
        "description": "A practical Path of Exile 2 beginner guide covering skills, support gems, defenses, gear upgrades, and early progression habits.",
        "heading": "PoE2 beginner guide: what to do first",
        "content": """
<p class=\"lede\">Path of Exile 2 is easier when you treat the campaign as a learning lab. Your goal is not to copy a perfect build immediately; your goal is to keep damage, defenses, and movement improving together.</p>
<div class=\"notice\"><strong>Quick answer:</strong> Choose one main skill, support it properly, keep defenses current, upgrade weapons or gem levels often, and read boss attacks instead of face-tanking.</div>
<h2>1. Pick one main damage plan</h2>
<p>New players often equip every interesting skill and end up with no coherent scaling. Start with one main damage skill, one support setup, and one utility or movement option.</p>
<h2>2. Support gems matter</h2>
<p>A support gem can change how a skill behaves, how it scales, or how safe it feels. When comparing supports, test on the same enemy type and ask: does this improve clear speed, boss damage, uptime, or survival?</p>
<h2>3. Upgrade defenses before you feel stuck</h2>
<ul>
<li>Keep life or equivalent survivability on gear.</li>
<li>Watch elemental resistances as you enter harder zones.</li>
<li>Use flasks/recovery deliberately; do not wait until every fight is desperate.</li>
<li>Practice dodge timing against bosses before blaming your build.</li>
</ul>
<h2>4. Replace weak gear frequently</h2>
<p>During leveling, a plain rare item with the right stats can beat a flashy item with irrelevant modifiers. If your damage suddenly falls off, check your weapon, gem level, and support setup first.</p>
<h2>5. Learn from deaths</h2>
<table><thead><tr><th>Death pattern</th><th>Likely issue</th><th>Fix</th></tr></thead><tbody>
<tr><td>Boss one-shots you</td><td>Too little defense or missing dodge window</td><td>Add life/resists, learn telegraphs, improve spacing</td></tr>
<tr><td>Packs overwhelm you</td><td>Weak clear or poor crowd control</td><td>Improve AoE support, positioning, or utility skill</td></tr>
<tr><td>Fights take too long</td><td>Damage scaling behind curve</td><td>Upgrade weapon/gem/supports, simplify rotation</td></tr>
<tr><td>Always out of resource</td><td>Cost/recovery mismatch</td><td>Change supports, add recovery, avoid over-linking early</td></tr>
</tbody></table>
<h2>Beginner rule</h2>
<p>If a guide cannot explain how the build works before expensive items, do not use it as your first character.</p>
"""
    },
    {
        "path": "guides/classes-explained.html",
        "title": "Path of Exile 2 Classes Explained for Beginners",
        "description": "A beginner-friendly explanation of Path of Exile 2 class choice, playstyle, range, defenses, and learning curve.",
        "heading": "PoE2 classes explained for beginners",
        "content": """
<p class=\"lede\">Your class is your starting point on the passive tree and your early identity. It does not permanently lock every decision, but it strongly shapes your first hours.</p>
<table><thead><tr><th>Playstyle question</th><th>Beginner-friendly answer</th></tr></thead><tbody>
<tr><td>Do you want safer spacing?</td><td>Start ranged: caster, bow/projectile, or minion direction.</td></tr>
<tr><td>Do you enjoy timing and close-range pressure?</td><td>Melee can be satisfying, but it is less forgiving while learning bosses.</td></tr>
<tr><td>Do you want fewer active decisions?</td><td>Minions/companions can reduce pressure, but scaling details still matter.</td></tr>
<tr><td>Do you want fast clear?</td><td>Projectile or AoE spell directions often feel smoother for early mapping-style content.</td></tr>
</tbody></table>
<h2>How to choose your first class</h2>
<ol>
<li>Pick the combat range you enjoy.</li>
<li>Check whether the build needs a specific item to function.</li>
<li>Prefer clear scaling words: spell damage, elemental damage, minion damage, projectile damage, attack weapon DPS.</li>
<li>Avoid a build that needs three mechanics you do not understand yet.</li>
</ol>
<h2>What not to overthink</h2>
<p>Do not restart every time a tier list changes. In Early Access, patches move numbers around often. A stable learning build that reaches later content teaches more than rerolling into every trend.</p>
"""
    },
    {
        "path": "guides/skill-gems-explained.html",
        "title": "Path of Exile 2 Skill Gems and Support Gems Explained",
        "description": "Understand Path of Exile 2 skill gems, support gems, main skills, utility skills, and how to test gem setups safely.",
        "heading": "Skill gems and support gems explained",
        "content": """
<p class=\"lede\">Most beginner builds fail because the player swaps skills randomly instead of understanding the role of each gem.</p>
<h2>The simple model</h2>
<ul>
<li><strong>Main skill:</strong> the button that kills most enemies.</li>
<li><strong>Boss skill or setup:</strong> extra damage or uptime against tougher enemies.</li>
<li><strong>Support gems:</strong> modifiers that change damage, behavior, cost, or reliability.</li>
<li><strong>Utility:</strong> movement, defense, exposure, curse-like effects, crowd control, or recovery.</li>
</ul>
<h2>How to test a support gem</h2>
<ol>
<li>Change only one support at a time.</li>
<li>Test against a similar pack or boss phase.</li>
<li>Watch clear speed, resource cost, safety, and boss uptime.</li>
<li>Keep notes if the result is patch-sensitive.</li>
</ol>
<h2>Common beginner trap</h2>
<p>The highest tooltip number is not always the best support. A support that makes a skill easier to land, cheaper to sustain, or safer to use can be better during campaign progression.</p>
"""
    },
    {
        "path": "guides/currency-guide.html",
        "title": "Path of Exile 2 Currency Guide for Beginners",
        "description": "A beginner-friendly Path of Exile 2 currency guide explaining how to think about crafting, upgrades, trading value, and waste prevention.",
        "heading": "PoE2 currency guide for beginners",
        "content": """
<p class=\"lede\">Currency in Path of Exile 2 is not just money. Many currency items are crafting actions. The beginner goal is to avoid wasting valuable items on gear you will replace quickly.</p>
<div class=\"notice\"><strong>Rule:</strong> During campaign, use common upgrade tools to fix weak slots. Save rare/high-value currency until you understand what item base and modifiers you are chasing.</div>
<h2>How to think about currency</h2>
<table><thead><tr><th>Use case</th><th>Beginner approach</th></tr></thead><tbody>
<tr><td>Fixing a bad weapon</td><td>Worth spending common resources if your damage is blocking progress.</td></tr>
<tr><td>Improving resistances</td><td>Often worth it; defenses keep your build playable.</td></tr>
<tr><td>Rolling random endgame items</td><td>Avoid until you know bases, affixes, and current market value.</td></tr>
<tr><td>Trading</td><td>Check multiple listings and avoid panic-buying after one hard boss.</td></tr>
</tbody></table>
<h2>Beginner spending priorities</h2>
<ol>
<li>Keep your main weapon or gem scaling current.</li>
<li>Patch holes in life/resistances.</li>
<li>Improve movement/recovery if deaths come from being trapped or too slow.</li>
<li>Only then chase luxury damage stats.</li>
</ol>
<h2>When to save currency</h2>
<p>If you cannot explain why an item base is good, why a modifier matters, and how long you will keep the item, save your expensive currency.</p>
"""
    },
    {
        "path": "tools/beginner-build-checklist.html",
        "title": "Path of Exile 2 Beginner Build Checklist",
        "description": "A practical PoE2 beginner build checklist for damage, defenses, gems, gear, resources, and patch-safe guide following.",
        "heading": "PoE2 beginner build checklist",
        "content": """
<p class=\"lede\">Use this checklist before deciding your build is broken. Most early problems are caused by one missing layer, not by the entire character being doomed.</p>
<section class=\"checklist\">
<label><input type=\"checkbox\"> I have one main damage skill, not five half-supported skills.</label>
<label><input type=\"checkbox\"> My supports improve real gameplay, not just tooltip damage.</label>
<label><input type=\"checkbox\"> My weapon or gem level has been updated recently.</label>
<label><input type=\"checkbox\"> My gear has life or relevant survivability.</label>
<label><input type=\"checkbox\"> My elemental resistances are not obviously neglected.</label>
<label><input type=\"checkbox\"> I know whether deaths come from one-shots, crowd pressure, resource issues, or low damage.</label>
<label><input type=\"checkbox\"> The guide I follow has a recent patch date.</label>
<label><input type=\"checkbox\"> I have not spent rare currency on a temporary item without a reason.</label>
</section>
<h2>How to use it</h2>
<p>If two or more boxes are unchecked, fix those before rerolling. If all boxes are checked and the build still fails, the issue may be a bad archetype for the current patch, a missing key mechanic, or content that expects stronger gear.</p>
"""
    },
    {
        "path": "about.html",
        "title": "About PoE2 Build Lab",
        "description": "About PoE2 Build Lab, an independent Path of Exile 2 beginner guide site.",
        "heading": "About PoE2 Build Lab",
        "content": """
<p>PoE2 Build Lab is an independent beginner-focused Path of Exile 2 guide site. The goal is to publish practical, patch-labeled guides that help new and returning players make better early decisions.</p>
<p>This site is not affiliated with Grinding Gear Games. Path of Exile 2 names and related marks belong to their respective owners.</p>
<h2>Editorial policy</h2>
<ul>
<li>Pages should show an updated date and patch context when advice may change.</li>
<li>We avoid copying forum, wiki, or Reddit text.</li>
<li>Build claims should be updated when official patch notes change the underlying mechanic.</li>
<li>Future hands-on screenshots and testing notes will be added as the site grows.</li>
</ul>
"""
    },
    {
        "path": "contact.html",
        "title": "Contact PoE2 Build Lab",
        "description": "Contact information for PoE2 Build Lab corrections, guide updates, and feedback.",
        "heading": "Contact",
        "content": """
<p>For corrections, outdated patch notes, or guide suggestions, open an issue on the site repository or contact the maintainer through the linked GitHub profile.</p>
<p><a href=\"https://github.com/BrickerP/poe2-build-lab\">GitHub repository</a></p>
"""
    },
    {
        "path": "privacy-policy.html",
        "title": "Privacy Policy for PoE2 Build Lab",
        "description": "Privacy policy for PoE2 Build Lab, including analytics and advertising readiness notes.",
        "heading": "Privacy Policy",
        "content": """
<p><strong>Effective date:</strong> 2026-06-16</p>
<p>PoE2 Build Lab is a static informational website. At launch, the site does not collect account registrations, comments, payments, or direct personal information.</p>
<h2>Analytics</h2>
<p>The site may use Google Search Console to understand how pages appear in Google Search. Search Console reports aggregated search performance and does not create user accounts on this site.</p>
<h2>Advertising</h2>
<p>The site includes Google AdSense code using publisher ID <code>pub-1111218417177666</code>. Google and its advertising partners may use cookies or similar technologies to serve and measure ads when Google enables ad serving for this site.</p>
<h2>External links</h2>
<p>The site links to external resources such as official game pages, patch notes, and GitHub. External sites have their own privacy policies.</p>
<h2>Contact</h2>
<p>For privacy questions or corrections, contact the maintainer through the GitHub repository.</p>
"""
    },
]

def depth_prefix(path):
    parts = Path(path).parts
    return "../" * (len(parts)-1)

def nav_html(prefix, current):
    items=[]
    for label, href in NAV:
        url = prefix + href
        cls = ' class="active"' if href == current else ''
        items.append(f'<a{cls} href="{url}">{escape(label)}</a>')
    return ''.join(items)

def render_page(page):
    path = page['path']
    prefix = depth_prefix(path)
    canonical = SITE['url'] + ('' if path == 'index.html' else path)
    heading = page.get('heading', SITE['name'])
    hero = page.get('hero', False)
    nav = nav_html(prefix, path)
    if hero:
        main_intro = f'''
<section class="hero">
  <p class="eyebrow">Patch-aware beginner guides · Updated {SITE['updated']}</p>
  <h1>{SITE['name']}</h1>
  <p>{SITE['tagline']}</p>
  <div class="hero-actions"><a class="button" href="builds/best-beginner-builds.html">Start with builds</a><a class="button secondary" href="tools/beginner-build-checklist.html">Open checklist</a></div>
</section>
'''
    else:
        main_intro = f'<section class="page-title"><p class="eyebrow">Updated {SITE["updated"]} · {SITE["patch"]}</p><h1>{escape(heading)}</h1></section>'
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(page['title'])}</title>
  <meta name="description" content="{escape(page['description'])}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:title" content="{escape(page['title'])}">
  <meta property="og:description" content="{escape(page['description'])}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{canonical}">
  <link rel="stylesheet" href="{prefix}styles.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT}" crossorigin="anonymous"></script>
  <script type="application/ld+json">{{"@context":"https://schema.org","@type":"WebPage","name":{page['title']!r},"description":{page['description']!r},"url":{canonical!r},"dateModified":"{SITE['updated']}"}}</script>
</head>
<body>
  <header class="site-header"><a class="brand" href="{prefix}index.html">PoE2 Build Lab</a><nav>{nav}</nav></header>
  <main>{main_intro}<article class="article">{page['content']}</article></main>
  <footer><p>Independent Path of Exile 2 beginner guide site. Not affiliated with Grinding Gear Games.</p><p><a href="{prefix}privacy-policy.html">Privacy Policy</a> · <a href="{prefix}contact.html">Contact</a> · <a href="{prefix}sitemap.xml">Sitemap</a></p></footer>
</body>
</html>'''
    return html

for p in pages:
    out = Path(p['path'])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_page(p), encoding='utf-8')

Path('styles.css').write_text(r'''
:root{--bg:#0d1117;--panel:#161b22;--panel2:#1f2937;--text:#e6edf3;--muted:#9da7b3;--accent:#f59e0b;--accent2:#60a5fa;--line:#30363d;--good:#34d399}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at top left,#1d2a3a 0,#0d1117 36rem);color:var(--text);line-height:1.65}.site-header{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:1rem clamp(1rem,4vw,4rem);background:rgba(13,17,23,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.brand{font-weight:800;color:var(--text);text-decoration:none;letter-spacing:.02em}nav{display:flex;gap:.85rem;flex-wrap:wrap}nav a,footer a,.article a{color:#93c5fd;text-decoration:none}nav a{font-size:.93rem;color:var(--muted)}nav a.active,nav a:hover{color:var(--text)}main{max-width:1120px;margin:auto;padding:2.5rem clamp(1rem,4vw,3rem)}.hero{padding:4rem 0 3rem;max-width:860px}.hero h1,.page-title h1{font-size:clamp(2.4rem,7vw,5.4rem);line-height:1;margin:.25rem 0 1rem;letter-spacing:-.06em}.hero p{font-size:1.22rem;color:var(--muted);max-width:760px}.eyebrow{color:var(--accent);text-transform:uppercase;font-size:.78rem;font-weight:800;letter-spacing:.12em}.hero-actions{display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem}.button{display:inline-block;background:linear-gradient(135deg,#f59e0b,#f97316);color:#111827!important;padding:.78rem 1rem;border-radius:999px;font-weight:800;text-decoration:none}.button.secondary{background:#243244;color:var(--text)!important;border:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.card,.content-block,.article{background:rgba(22,27,34,.78);border:1px solid var(--line);border-radius:20px;padding:1.25rem;box-shadow:0 20px 60px rgba(0,0,0,.18)}.card.highlight{background:linear-gradient(160deg,rgba(245,158,11,.18),rgba(22,27,34,.9));border-color:rgba(245,158,11,.45)}.card h2,.card h3{line-height:1.15;margin:.3rem 0}.content-block{margin:1rem 0}.page-title{padding:2rem 0 1rem}.article{max-width:880px;margin:auto}.article .lede{font-size:1.2rem;color:#c9d1d9}.notice{border-left:4px solid var(--accent);background:rgba(245,158,11,.08);padding:1rem;border-radius:12px;margin:1rem 0}table{width:100%;border-collapse:collapse;margin:1.25rem 0;background:rgba(15,23,42,.4);border-radius:14px;overflow:hidden}th,td{border-bottom:1px solid var(--line);padding:.8rem;text-align:left;vertical-align:top}th{color:#facc15;background:rgba(255,255,255,.04)}tr:last-child td{border-bottom:0}h2{margin-top:2rem;line-height:1.2}ul,ol{padding-left:1.35rem}.checklist{display:grid;gap:.75rem}.checklist label{display:flex;gap:.65rem;align-items:flex-start;background:rgba(255,255,255,.04);padding:.85rem;border-radius:12px;border:1px solid var(--line)}input[type=checkbox]{margin-top:.35rem}footer{max-width:1120px;margin:2rem auto;padding:2rem clamp(1rem,4vw,3rem);color:var(--muted);border-top:1px solid var(--line)}@media(max-width:820px){.site-header{align-items:flex-start;gap:1rem;flex-direction:column}.grid{grid-template-columns:1fr}.hero{padding-top:2rem}th,td{display:block;width:100%}th{display:none}td{border-bottom:0;padding:.55rem .8rem}tr{display:block;border-bottom:1px solid var(--line);padding:.45rem 0}}
'''.strip()+"\n", encoding='utf-8')

# Search and crawling helpers
urls = []
for p in pages:
    loc = SITE['url'] + ('' if p['path']=='index.html' else p['path'])
    urls.append(f"  <url><loc>{loc}</loc><lastmod>{SITE['updated']}</lastmod></url>")
Path('sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n', encoding='utf-8')
Path('robots.txt').write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE['url']}sitemap.xml\n", encoding='utf-8')
Path('ads.txt').write_text("google.com, pub-1111218417177666, DIRECT, f08c47fec0942fa0\n", encoding='utf-8')
Path('404.html').write_text(render_page({"path":"404.html","title":"Page not found - PoE2 Build Lab","description":"Page not found.","heading":"Page not found","content":"<p>The page you requested does not exist yet. Start from the <a href=\"index.html\">homepage</a>.</p>"}), encoding='utf-8')
Path('README.md').write_text(f"""# PoE2 Build Lab\n\nStatic beginner-guide site for Path of Exile 2.\n\nLive URL target: {SITE['url']}\n\n## Launch checklist\n\n- [x] Static pages\n- [x] SEO titles/descriptions\n- [x] `robots.txt` and `sitemap.xml`\n- [x] About / Contact / Privacy Policy\n- [x] Google Search Console URL-prefix property and verification\n- [x] AdSense publisher ID configured in site code\n\n## AdSense status\n\nAdSense publisher ID `pub-1111218417177666` is configured in the site code and `ads.txt`; actual ad serving still depends on Google site review and Auto ads status.\n""", encoding='utf-8')
