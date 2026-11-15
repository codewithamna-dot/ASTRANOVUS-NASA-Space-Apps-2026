"""Human-readable geographic labels for a lat/lon: country (Natural Earth 110m polygons, public domain) plus an
approximate named region (coarse bounding boxes).

This is DISPLAY metadata only (never used in scoring). Labels come from coarse bounding boxes of
well-known land regions; when several boxes contain a point the smallest box wins. Anything not
covered falls back to a plain coordinate label. Boxes are approximate and are reported to the
client with label_basis="approximate named region (bounding box)".
"""
from __future__ import annotations

# (lat_min, lat_max, lon_min, lon_max, name)
_BOXES: list[tuple[float, float, float, float, str]] = [
    (15, 32, -17, 35, "Sahara Desert"),
    (-30, -17, 11, 17, "Namib Desert"),
    (-28, -18, 18, 26, "Kalahari Desert"),
    (-31, -17, -71.5, -67, "Atacama Desert"),
    (-27, -15, -70, -64, "Andean Altiplano"),
    (-55, -39, -74, -65, "Patagonia"),
    (-22, -3, -45, -34, "Northeast Brazil (Caatinga)"),
    (-15, 5, -75, -50, "Amazon Basin"),
    (-5, 5, 10, 30, "Congo Basin"),
    (10, 17, -17, 35, "Sahel"),
    (7, 15, 38, 44, "Afar / Horn of Africa"),
    (-10, 15, 28, 42, "East African Rift region"),
    (14, 30, 35, 60, "Arabian Peninsula"),
    (28, 36, 50, 60, "Iranian Plateau"),
    (36, 46, 53, 70, "Karakum / Kyzylkum Desert"),
    (24, 30, 69, 76, "Thar Desert"),
    (30, 37, 72, 80, "Karakoram / western Himalaya"),
    (28, 37, 78, 100, "Tibetan Plateau"),
    (36, 41, 77, 90, "Taklamakan Desert"),
    (38, 47, 90, 120, "Gobi Desert"),
    (50, 75, 60, 140, "Siberia"),
    (-32, -18, 115, 141, "Australian Outback"),
    (36, 42, -120, -112, "Great Basin (USA)"),
    (30, 37, -118, -109, "Southwest USA deserts"),
    (62, 84, -73, -12, "Greenland"),
    (65, 83, -125, -60, "Canadian Arctic"),
    (55, 72, -168, -141, "Alaska"),
    (76, 81, 10, 28, "Svalbard"),
    (63, 66.6, -24.5, -13, "Iceland"),
    (-90, -60, -180, 180, "Antarctica"),
    (18.5, 22.5, -160.5, -154.5, "Hawaii"),
    (38, 45, 38, 50, "Caucasus / Caspian region"),
    (36, 42, 26, 45, "Anatolian Plateau"),
    (55, 71, 5, 30, "Scandinavia"),
    (35, 55, -10, 30, "Europe"),
    (24, 50, -125, -66, "Contiguous United States"),
    (14, 32, -118, -86, "Mexico"),
    (8, 36, 68, 90, "Indian subcontinent"),
    (-26, -12, 43, 51, "Madagascar"),
    (50, 70, -140, -60, "Northern Canada"),
]


import json
import math
import pathlib

_GEO = pathlib.Path(__file__).resolve().parents[1] / "data/geo/ne_110m_admin_0_countries.geojson"
_COUNTRIES: list | None = None


def _load():
    global _COUNTRIES
    if _COUNTRIES is None:
        _COUNTRIES = []
        if _GEO.exists():
            for f in json.load(open(_GEO, encoding="utf-8"))["features"]:
                g = f["geometry"]
                polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
                for poly in polys:
                    ring = poly[0]
                    lons = [p[0] for p in ring]
                    lats = [p[1] for p in ring]
                    _COUNTRIES.append((f["properties"].get("ADMIN") or f["properties"].get("NAME"), (min(lons), max(lons), min(lats), max(lats)), ring))
    return _COUNTRIES


def _inside(lon, lat, ring):
    c = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-15) + xi:
            c = not c
        j = i
    return c


def country_of(lat: float, lon: float):
    """(country, how) where how is 'inside' or 'near' (nearest boundary vertex within 4 degrees: coast/offshore cell)."""
    best, bd = None, 99.0
    for name, (x0, x1, y0, y1), ring in _load():
        if x0 <= lon <= x1 and y0 <= lat <= y1 and _inside(lon, lat, ring):
            return name, "inside"
    for name, _, ring in _load():
        for x, y in ring[::2]:
            dx = ((x - lon + 180) % 360 - 180) * math.cos(math.radians(lat))
            d = math.hypot(dx, y - lat)
            if d < bd:
                best, bd = name, d
    return (best, "near") if best is not None and bd <= 4.0 else (None, "none")


def label_for(lat: float, lon: float) -> dict:
    best = None
    best_area = None
    for la0, la1, lo0, lo1, name in _BOXES:
        if la0 <= lat <= la1 and lo0 <= lon <= lo1:
            area = (la1 - la0) * (lo1 - lo0)
            if best_area is None or area < best_area:
                best, best_area = name, area
    country, how = country_of(lat, lon)
    ns = "N" if lat >= 0 else "S"
    ew = "E" if lon >= 0 else "W"
    coords = f"{abs(lat):.1f}°{ns}, {abs(lon):.1f}°{ew}"
    region = best if best and best != country else None
    cname = f"near {country}" if how == "near" else country
    parts = [x for x in (region, cname) if x]
    label = f"{', '.join(parts)} ({coords})" if parts else f"Open land near {coords}"
    basis = "country from Natural Earth 110m boundaries" + (" (nearest coast)" if how == "near" else "") if country else "coordinates only"
    if region:
        basis += "; region name is an approximate bounding box"
    return {"label": label, "region_name": region, "country": country, "basis": basis}
