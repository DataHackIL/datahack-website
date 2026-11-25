"""Patch only syllabus text nodes in the desktop and mobile captures."""
from collections import Counter
from html.parser import HTMLParser
from itertools import accumulate


# Public, read-only applicant syllabi; never use a private or editable copy.
CARDS = {
    "item1": None,  # XAI
    "item-j9ples3e": None,  # Time Series
    "item-j9plerjk": None,  # NLP
    "item-m92pcfdl": None,  # Graphs
    "item-m92pcgmn": ("Speech Recognition", "https://docs.google.com/document/d/1UUdgRW9x9_efGvJPv0pl4dt7G73EXRk2fVMIkkzyR1Q/preview"),
    "item-m92pcoaa": None,  # DS Management
    "item-m92pjbf3": None,  # DS in the Real World
    "item-m92pjch1": None,  # Reinforcement Learning
    "item-m92pjdf0": ("Computer Vision", "https://drive.google.com/file/d/16ThaHcLySPI7iSNgs5cAcVQER-gTF7qX/view"),
}


class Labels(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.lines = [0, *accumulate(map(len, source.splitlines(keepends=True)))]
        self.card = None
        self.counts = Counter()
        self.edits = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("role") == "listitem":
            self.card = attrs.get("id", "").removeprefix("comp-m92ohnik6__")

    def handle_data(self, text):
        if text.strip().casefold() != "course syllabus":
            return
        course = CARDS[self.card]
        line, col = self.getpos()
        start = self.lines[line - 1] + col
        self.counts[self.card] += 1
        replacement = ""
        if course:
            name, url = course
            replacement = f'<a href="{url}" aria-label="{name} course syllabus" style="color:inherit;text-decoration:underline">{text.strip()}</a>'
        self.edits.append((start, start + len(text), replacement))


def apply_syllabi(source):
    parser = Labels(source)
    parser.feed(source)
    parser.close()
    if parser.counts != Counter({card: 2 for card in CARDS}):
        raise ValueError("Unexpected syllabus cards; review desktop and mobile captures")
    for start, end, replacement in reversed(parser.edits):
        source = source[:start] + replacement + source[end:]
    # An empty decorative box overlays the program cards in both Wix captures.
    css = '<style>[id="comp-m92ogs6s4"],[id="comp-m92ogs6s4"] *{pointer-events:none!important}a[aria-label$="course syllabus"]{position:relative;z-index:1}</style>'
    return source.replace("</head>", css + "</head>", 1)
