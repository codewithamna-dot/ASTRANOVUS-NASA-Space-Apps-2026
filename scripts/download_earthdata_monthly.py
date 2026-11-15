"""Download the NASA Earthdata products from our data plan (Boy 1 runs this on his own PC).
    pip install earthaccess
    python scripts/download_earthdata_monthly.py            # all, year 2024
    python scripts/download_earthdata_monthly.py MOD10CM    # only one product
Needs a free Earthdata login (asks once). Files go to data/raw/<PRODUCT>/ (gitignored).
Size warning: MOD11C3 / MOD13C2 ~ 100 MB per month. Start with ONE month (--months 1) to test.
"""
import sys, argparse, earthaccess
PRODUCTS = {  # short_name: (version, what it gives us)
    "MOD11C3":  ("061", "land surface temperature day/night, 0.05 deg monthly -> D1_cold, D8_thermal_swing"),
    "MOD13C2":  ("061", "NDVI vegetation, 0.05 deg monthly -> D3_barren"),
    "MOD10CM":  ("061", "snow cover, 0.05 deg monthly -> D6_ice"),
    "GPM_3IMERGM": ("07", "precipitation monthly 0.1 deg -> D2_aridity"),
}
ap = argparse.ArgumentParser(); ap.add_argument("only", nargs="?"); ap.add_argument("--year", default="2024"); ap.add_argument("--months", type=int, default=12)
ap.add_argument("--pick", default="", help="comma list of months, e.g. 1,7 = only January and July")
a = ap.parse_args()
earthaccess.login()
for name, (ver, what) in PRODUCTS.items():
    if a.only and a.only != name: continue
    res = []
    for v in dict.fromkeys([ver, ver.lstrip("0"), None]):          # '061' -> '61' -> any version
        kw = dict(short_name=name, temporal=(f"{a.year}-01-01", f"{a.year}-12-31"))
        if v: kw["version"] = v
        res = earthaccess.search_data(**kw)
        if res:
            print(f"  {name}: search found {len(res)} granules (version={v})"); break
    if a.pick:
        import datetime
        want = []
        for m in [int(x) for x in a.pick.split(",")]:
            doy = datetime.date(int(a.year), m, 1).timetuple().tm_yday
            want.append((f"A{a.year}{doy:03d}", f"{a.year}{m:02d}01"))
        res = [r for r in res if any(t1 in str(r.data_links()) or t2 in str(r.data_links()) for t1, t2 in want)]
    else:
        res = res[:a.months]
    print(f"{name}: {len(res)} files  ({what})")
    if not res:
        print(f"  !! {name}: no files found. Send me the lines printed above."); continue
    earthaccess.download(res, f"data/raw/{name}")
print("done. Next: python scripts/inspect_file.py data/raw/<PRODUCT>/<file>  and send me the printed text")
