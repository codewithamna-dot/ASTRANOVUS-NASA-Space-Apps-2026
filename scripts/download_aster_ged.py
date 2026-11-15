"""Download ONE month of NASA ASTER Global Emissivity Dataset (AG5KMMOH v041, 0.05 deg, ~320 MB) -> data/raw/AG5KMMOH/.
Emissivity of bare ground is almost static, so one mid-year month is enough for a silicate-vs-mafic composition proxy
(vegetated / snow-covered cells are masked using our own MODIS NDVI/snow layers). Needs the stored Earthdata login."""
import pathlib
import sys
import earthaccess

ROOT = pathlib.Path(__file__).resolve().parents[1]
out = ROOT / "data/raw/AG5KMMOH"
out.mkdir(parents=True, exist_ok=True)
earthaccess.login(strategy="netrc")
want = sys.argv[1] if len(sys.argv) > 1 else "A2014182"          # July 2014
res = [g for g in earthaccess.search_data(short_name="AG5KMMOH", count=400) if want in g["umm"]["GranuleUR"]]
print(len(res), "granule(s) for", want, [g["umm"]["GranuleUR"] for g in res])
earthaccess.download(res, str(out))
print("done:", [p.name for p in out.glob("*")])
