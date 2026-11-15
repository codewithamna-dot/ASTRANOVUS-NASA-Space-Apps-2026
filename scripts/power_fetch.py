"""Fetch NASA POWER climatology for one point (no login). Boy 1 loops this / uses the regional endpoint for the grid.
Docs: https://power.larc.nasa.gov/docs/services/api/"""
import requests, sys
lat, lon = float(sys.argv[1]), float(sys.argv[2])
url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
p = {"parameters": "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN", "community": "RE",
     "latitude": lat, "longitude": lon, "format": "JSON"}
r = requests.get(url, params=p, timeout=60); r.raise_for_status()
print(r.json()["properties"]["parameter"]["T2M"]["ANN"], "deg C annual mean")
