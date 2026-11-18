"""One-time importer for public Wix content. The regular build is offline."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.request import urlopen
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup

BASE = Path(__file__).parent
ORIGIN = "https://www.datahack.org.il"
ASSETS = {}


def read(url):
    with urlopen(url, timeout=25) as response:
        return response.read()


def entries(url):
    return BeautifulSoup(read(ORIGIN + url), "html.parser")


def asset(tag, prefix, width):
    if not tag:
        return None
    url = tag.get("src", "").split("/v1/")[0]
    if urlsplit(url).hostname != "static.wixstatic.com":
        return None
    name = prefix + ".webp"
    ASSETS[name] = url + f"/v1/fit/w_{width},h_{width},q_85/image.webp"
    return name


def write_asset(pair):
    name, url = pair
    data = read(url)
    if not (data.startswith(b"RIFF") and data[8:12] == b"WEBP"):
        raise ValueError(f"Unexpected format: {name}")
    (BASE / "assets" / name).write_bytes(data)


def main():
    home, team = entries("/"), entries("/team")
    source_logo = home.select_one("header a svg")
    logo = ET.Element("svg", xmlns="http://www.w3.org/2000/svg", viewBox=source_logo["viewbox"])
    for path in source_logo.select("path"):
        fill, coords = path["fill"], path["d"]
        assert re.fullmatch(r"#[0-9A-Fa-f]{6}", fill) and re.fullmatch(r"[a-zA-Z0-9., +\-]+", coords)
        ET.SubElement(logo, "path", fill=fill, d=coords)
    ET.ElementTree(logo).write(BASE / "assets" / "logo.svg", encoding="unicode")
    images = home.select("main img")
    partner_names = [
        "Lightricks", "Technion", "Check Point", "Hebrew University of Jerusalem",
        "Dell EMC", "Salesforce", "Eastech", "Onvego", "AKA", "Partner logo",
        "Ragis", "PayPal", "Hasoub", "Michal Sela Forum", "Wix", "University of Notre Dame",
        "Baot", "Gav-Yam", "MEET", "Yerushalmit", "Nubius", "FemForward", "itworks",
        "Harmonya",
    ]
    assert len(images) == len(partner_names) + 4, "Review image list before importing"
    programs = [
        ("DataCoach", "Coaching for Arab STEM students and graduates on their way to a first data science role.", "https://www.datacoach.org.il/"),
        ("DataNights", "Hands-on AI courses by and for women working in the field.", "https://www.datanights.org.il/"),
        ("DataProject", "Industry-backed data science team projects for Arab students.", "https://linkedin.com/company/dataproject-il"),
        ("DataTalks", "Technical machine learning meetups featuring speakers from research and industry.", "https://www.meetup.com/DataHack/"),
        ("DataConnectIL", "An AI and cybersecurity community for new and veteran immigrants to Israel.", "https://dataconnect.org.il/"),
        ("DataForBetter", "Data scientists and early-career practitioners build AI solutions for social initiatives.", None),
    ]
    data = dict(
        hero=asset(images[0], "hero", 1600),
        supporters=[dict(name="Bustan", asset=asset(images[3], "bustan", 340))],
        partners=[dict(name=name, asset=asset(tag, f"partner-{n:02d}", 340))
                  for n, (tag, name) in enumerate(zip(images[4:], partner_names), 1)],
        programs=[dict(name=name, description=description, url=url) for name, description, url in programs],
        social=[],
        team=[],
        advisors=[],
    )
    for name in ("LinkedIn", "Facebook", "YouTube", "Newsletter"):
        tag = home.find("a", string=lambda text: text and text.strip() == name)
        if tag is None:
            tag = next((a for a in home.select("footer a") if a.get_text(strip=True) == name), None)
        if tag is not None:
            data["social"].append(dict(name=name, url=tag["href"]))

    for n, item in enumerate(team.select("main .wixui-repeater__item")):
        fields = item.select(".wixui-rich-text")
        if len(fields) != 2:
            continue
        name, description = (" ".join(f.get_text(" ", strip=True).split()) for f in fields)
        if not name or not description:
            continue
        advisor = fields[0].find("h6") is not None
        people = data["advisors"] if advisor else data["team"]
        if any(x["name"].casefold() == name.casefold() for x in people):
            continue
        photos = item.select("img")
        person = dict(name=name, description=description)
        if photos and not advisor:
            person["asset"] = asset(photos[-1], f"person-{n:02d}", 520)
        people.append(person)
    assert len(data["team"]) >= 18 and len(data["advisors"]) == 6, "Review changed Wix team markup"
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(write_asset, ASSETS.items()))
    (BASE / "content.json").write_text(json.dumps(data, indent=2) + "\n")


if __name__ == "__main__":
    main()
