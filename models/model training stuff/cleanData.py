from imports import pd
import os

# Get the absolute path of the current script
def get_absolute_path(filename):
    return os.path.join(os.path.dirname(__file__), filename)


#take out unnecceasry data points
def dataCleaner():
    training = pd.read_csv(filepath_or_buffer=get_absolute_path("earthquakes.csv"))

    # Drop unnecessary columns
    training.drop(columns=["depth","significance","tsunami", "time", "status", "place", "state"], inplace=True)

    training['date'] = training['date'].str[:4]
    
    training = training[training["data_type"] == "earthquake"]
    training = training[training["magnitudo"] >= 3.5]
    
    training.to_csv("training.csv")

    
#turn to csv
def modify():
    df = pd.read_csv(get_absolute_path("training.csv"))

    frequency_Dates = df["date"].value_counts()
    frequency_Dates.to_csv(get_absolute_path("Frequency.csv"))



