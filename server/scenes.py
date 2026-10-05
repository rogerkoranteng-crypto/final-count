"""The four demo scenes. Media and licences come from research/SOURCES.md.
`declared` is the team's count as entered at the count point."""
SCENES = [
 {"id": "backtable", "title": "Back table, field surgery", "point": "Before closing the cavity",
  "image": "dvids.jpg", "video": "backtable.mp4",
  "credit": "US Army, DVIDS 1005790 (public domain)",
  "declared": {"sponges": 8, "needles": 0, "instruments": 14}},
 {"id": "theatre", "title": "Instrument table, theatre", "point": "Before closing fascia",
  "image": "theatre.jpg", "video": None,
  "credit": "Ibrahim Achiri, Wikimedia Commons (CC BY-SA 4.0)",
  "declared": {"sponges": 3, "needles": 0, "instruments": 14}},
 {"id": "rack", "title": "Instrument rack, close view", "point": "Before skin closure",
  "image": "tray-rack.jpg", "video": None,
  "credit": "Wikimedia Commons, Surgical Instruments 01 (CC0), cropped",
  "declared": {"sponges": 0, "needles": 0, "instruments": 2}},
]
IMAGE_FOR_READ = {"backtable": "dvids.jpg"}
