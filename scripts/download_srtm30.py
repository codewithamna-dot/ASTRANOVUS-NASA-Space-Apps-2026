"""Download NASA SRTMGL30 v002 (30 arc-second, ~1 km, global; GTOPO30-filled outside 60N-56S) -> data/raw/SRTMGL30/.
27 tiles, a few hundred MB. Needs the stored Earthdata login (scripts/earthdata_login.py). Existing files are skipped."""
import pathlib
import earthaccess

ROOT = pathlib.Path(__file__).resolve().parents[1]
out = ROOT / "data/raw/SRTMGL30"
out.mkdir(parents=True, exist_ok=True)
earthaccess.login(strategy="netrc")
res = earthaccess.search_data(short_name="SRTMGL30", version="002", count=100)
print(len(res), "granules")
earthaccess.download(res, str(out))
print("done:", len(list(out.glob("*.zip"))), "zip files")
