"""Verify KMeans clustering on training.csv
Print cluster centers, cluster sizes, and save the fitted model.
"""
from sklearn.cluster import KMeans
import pandas as pd
import joblib
import os

def get_absolute_path(filename):
    return os.path.join(os.path.dirname(__file__), filename)


def main():
    path = get_absolute_path('training.csv')
    df = pd.read_csv(path)

    # Ensure columns
    if not {'latitude', 'longitude'}.issubset(df.columns):
        raise RuntimeError('training.csv missing latitude/longitude columns')

    # Clean coords
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
    df = df.dropna(subset=['latitude','longitude'])

    n_clusters = 8
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    coords = df[['latitude','longitude']]
    labels = kmeans.fit_predict(coords)

    df['cluster'] = labels

    # Print cluster sizes
    counts = df['cluster'].value_counts().sort_index()
    print('Cluster sizes:')
    for i,c in counts.items():
        print(f'  Cluster {i}: {c} points')

    # Print cluster centers
    centers = kmeans.cluster_centers_
    print('\nCluster centers (latitude, longitude):')
    for i,cen in enumerate(centers):
        print(f'  Cluster {i}: {cen[0]:.6f}, {cen[1]:.6f}')

    # Show a few sample points per cluster
    print('\nSample locations per cluster:')
    for i in range(n_clusters):
        sample = df[df['cluster']==i].head(3)[['latitude','longitude','date']]
        print(f'  Cluster {i} samples:')
        if sample.empty:
            print('    (no samples)')
        else:
            for _,row in sample.iterrows():
                print(f'    {row.latitude:.6f}, {row.longitude:.6f}  (year={row.date})')

    # Save kmeans
    out = get_absolute_path('kmeans_model.pkl')
    joblib.dump(kmeans, out)
    print(f"\nSaved KMeans model to: {out}")

if __name__ == '__main__':
    main()
