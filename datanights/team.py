from html import unescape
import re


PROFILES = {
    "nataly kuritz": "nataly-kuritz",
    "gal hever": "gal-hever",
    "shay palachy": "shaypalachy",
    "sharon cooper": "coopersh",
    "peleg eliyahou": "peleg-eliyahou",
    "amnon wahle": "amnon-wahle",
    "yaara cohen": "yaaraco",
    "yaron scherf": "yaron-scherf-60644bb0",
    "noga gshur": "noga-gshur",
    "hila paz herszfang": "hilapaz",
    "achinoam soroker": "achinoam-soroker",
}


def link_team_names(source):
    seen = set()

    def heading(match):
        body = match["body"]
        name = unescape(re.sub(r"<[^>]+>", "", body)).strip().casefold()
        if name not in PROFILES:
            return match[0]
        seen.add(name)
        if re.search(r"<a\b", body):
            if f"/in/{PROFILES[name]}/" not in body:
                raise ValueError(f"Conflicting profile for {name}")
            return match[0]
        link = f'<a href="https://www.linkedin.com/in/{PROFILES[name]}/" style="color:inherit;text-decoration:underline" target="_blank" rel="noopener noreferrer">{body}</a>'
        return match["open"] + link + match["close"]

    result = re.sub(r"(?P<open><(?P<tag>h[36])\b[^>]*>)(?P<body>.*?)(?P<close></(?P=tag)>)", heading, source, flags=re.S)
    if seen != PROFILES.keys():
        raise ValueError("Team headings no longer match the profile list")
    return result
