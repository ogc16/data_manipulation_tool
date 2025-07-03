import streamlit as st
import pandas as pd
import plotly.express as px

# Configure the page
st.set_page_config(
    page_title="Data Analysis Tool",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Function to load data
def load_data(file):
    try:
        if file.name.endswith(".csv"):
            df = pd.read_csv(file)
        elif file.name.endswith(".xlsx"):
            df = pd.read_excel(file)
        else:
            st.error("Unsupported file type")
            return None
        return df
    except Exception as e:
        st.error(f"Error loading data: {str(e)}")
        return None

# Function to display data
def display_data(df):
    st.write(df.head())
    st.write(df.describe())

# Function to plot data
def plot_data(df):
    columns = df.columns.tolist()
    x_axis = st.selectbox("Select X-axis", columns)
    y_axis = st.selectbox("Select Y-axis", columns)

    if x_axis and y_axis:
        try:
            fig = px.scatter(df, x=x_axis, y=y_axis)
            st.plotly_chart(fig)
        except Exception as e:
            st.error(f"Error plotting scatter plot: {str(e)}")

    column = st.selectbox("Select column for histogram", columns)
    if column:
        try:
            fig = px.histogram(df, x=column)
            st.plotly_chart(fig)
        except Exception as e:
            st.error(f"Error plotting histogram: {str(e)}")

# Function to plot correlation heatmap
def plot_correlation_heatmap(df):
    try:
        corr_matrix = df.corr()
        fig = px.imshow(corr_matrix, text_auto=True)
        st.plotly_chart(fig)
    except Exception as e:
        st.error(f"Error plotting correlation heatmap: {str(e)}")

# Streamlit app
st.title("Data Analysis Tool 📊")

# File uploader
file = st.file_uploader("Upload a file", type=["csv", "xlsx"])

if file is not None:
    df = load_data(file)
    if df is not None:
        display_data(df)
        plot_data(df)
        plot_correlation_heatmap(df)