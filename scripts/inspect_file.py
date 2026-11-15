"""Print the real structure of a NASA HDF4 (.hdf) or HDF5 file: datasets, shapes, dtypes, attributes.
Run with the project data venv:  .venv-data/Scripts/python scripts/inspect_file.py <file> [--attrs]
Read-only. Used to confirm variable names, scale factors and fill values BEFORE writing parsers."""
import sys


def inspect_hdf4(path, show_attrs):
    from pyhdf.SD import SD, SDC
    sd = SD(path, SDC.READ)
    print("GLOBAL ATTRIBUTES:")
    for k, v in sd.attributes().items():
        s = str(v)
        print(f"  {k}: {s[:300] + '...' if len(s) > 300 else s}")
    print("DATASETS:")
    for name, (dims, shape, typ, idx) in sd.datasets().items():
        print(f"  {name}: shape={shape} dims={dims} type={typ}")
        if show_attrs:
            for k, v in sd.select(name).attributes().items():
                print(f"      @{k} = {str(v)[:160]}")


def inspect_hdf5(path, show_attrs):
    import h5py
    with h5py.File(path, "r") as f:
        print("ROOT ATTRIBUTES:")
        for k, v in f.attrs.items():
            print(f"  {k}: {str(v)[:200]}")

        def visit(name, obj):
            if isinstance(obj, h5py.Dataset):
                print(f"  {name}: shape={obj.shape} dtype={obj.dtype}")
                if show_attrs:
                    for k, v in obj.attrs.items():
                        print(f"      @{k} = {str(v)[:160]}")
        print("DATASETS:")
        f.visititems(visit)
        for g in f:
            if hasattr(f[g], "attrs") and len(f[g].attrs):
                print(f"GROUP {g} attrs:")
                for k, v in f[g].attrs.items():
                    print(f"  {k}: {str(v)[:200]}")


if __name__ == "__main__":
    p = sys.argv[1]
    attrs = "--attrs" in sys.argv
    with open(p, "rb") as fh:
        magic = fh.read(8)
    print("FILE:", p)
    if magic[:4] == b"\x0e\x03\x13\x01":
        print("FORMAT: HDF4")
        inspect_hdf4(p, attrs)
    elif magic == b"\x89HDF\r\n\x1a\n":
        print("FORMAT: HDF5")
        inspect_hdf5(p, attrs)
    else:
        print("UNKNOWN FORMAT magic=", magic)
