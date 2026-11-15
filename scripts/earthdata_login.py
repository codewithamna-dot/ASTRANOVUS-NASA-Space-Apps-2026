"""One-time Earthdata Login. Run it in YOUR terminal: it asks for your username/password and stores them in ~/.netrc,
so later scripts (download_earthdata_monthly.py, stage2_srtm.py) run without prompting. Credentials never pass through chat."""
import earthaccess

auth = earthaccess.login(persist=True)
print("Logged in:", bool(auth.authenticated))
