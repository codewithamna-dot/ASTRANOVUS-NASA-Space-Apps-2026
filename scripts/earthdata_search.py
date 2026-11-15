"""Search-only check that the challenge datasets are reachable (no login needed to search).
pip install earthaccess"""
import earthaccess
BOX = (60.0, 22.0, 80.0, 38.0)   # west,south,east,north  ~ Pakistan; change freely
for short in ["SRTMGL1", "EMITL2BMIN", "HLSL30"]:
    res = earthaccess.search_data(short_name=short, bounding_box=BOX, count=5)
    print(f"{short}: {len(res)} granules found (first 5 shown max)")
# To download later:  earthaccess.login(); earthaccess.download(res, "data/raw/")
