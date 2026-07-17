import xml.etree.ElementTree as ET
from typing import Iterator, TypedDict


class Message(TypedDict):
    line: int
    author: str
    time: str
    text: str


class Conversation(TypedDict):
    id: str
    messages: list[Message]


def iter_conversations(xml_path: str) -> Iterator[Conversation]:
    """Stream-parses the PAN12 XML (hundreds of MB) one <conversation> at a time.

    Uses iterparse + elem.clear() so the whole tree never sits in memory at once —
    loading this file with ET.parse()/fromstring() will exhaust memory.
    """
    for _, elem in ET.iterparse(xml_path, events=("end",)):
        if elem.tag != "conversation":
            continue

        messages: list[Message] = []
        for msg_elem in elem.findall("message"):
            author_elem = msg_elem.find("author")
            time_elem = msg_elem.find("time")
            text_elem = msg_elem.find("text")
            messages.append(
                {
                    "line": int(msg_elem.get("line")),
                    "author": (author_elem.text or "").strip() if author_elem is not None else "",
                    "time": (time_elem.text or "").strip() if time_elem is not None else "",
                    "text": (text_elem.text or "").strip() if text_elem is not None else "",
                }
            )

        yield {"id": elem.get("id"), "messages": messages}
        elem.clear()
