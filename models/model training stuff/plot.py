from imports import sbn, plt, pd
import os

def get_absolute_path(filename):
    return os.path.join(os.path.dirname(__file__), filename)

#Date/Frequency and training dataset
df = pd.read_csv(get_absolute_path("training.csv"))
freq = pd.read_csv(get_absolute_path("Frequency.csv"))


#Visuzlize using a scatter plot
def scatter():
    plt.scatter(x=freq['date'], y=freq["count"])
    plt.xlabel('year')
    plt.ylabel("freq")
    plt.title("frequency over the years")
    plt.show()


#visualize using a heatmap
def heat():

    df_copy= df.drop(columns="data_type")

    sbn.heatmap(df_copy.corr())
    plt.show()

scatter()
