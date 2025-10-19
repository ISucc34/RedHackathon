from imports import train_test_split, pd
from imports import plt
import os
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
import joblib
import json
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.model_selection import TimeSeriesSplit, cross_val_score


def get_absolute_path(filename):
    return os.path.join(os.path.dirname(__file__), filename)


def main():
    df = pd.read_csv(filepath_or_buffer=get_absolute_path("training.csv"))
    df.drop("data_type")
    
    
