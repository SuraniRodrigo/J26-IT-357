# Research workspace

This directory stores datasets, notebooks, experiments, results, and reports for the research components of OPTICHAIN.

Each module owner should keep separate research outputs for:

- demand forecasting
- supply disruption prediction
- inventory optimization
- production scheduling

## Supply disruption model

Train the garment disruption classifier from the supplied labeled CSV:

```powershell
python research\experiments\train_model.py --data C:\Users\USER\Downloads\sl_garment_productivity_40k.csv
```

The script evaluates the held-out test set and writes the fitted preprocessing
and LightGBM pipeline to `backend/models_artifacts/supply/model.pkl`. Override
the input or output path with `--data` or `--output`. The backend supply
prediction endpoint loads this artifact when it is present.
