import streamlit as st
import pandas as pd
import tabula
from io import BytesIO

# Configure the page
st.set_page_config(
    page_title="File Converter ",
    page_icon="📁",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Excel to CSV conversion function
def excel_to_csv(excel_file):
    try:
        excel_data = pd.read_excel(excel_file)
        csv_data = excel_data.to_csv(index=False)
        return csv_data
    except Exception as e:
        st.error(f"Error occurred: {e}")
        return None

# PDF to CSV conversion function
def pdf_to_csv(pdf_file):
    try:
        tables = tabula.read_pdf(pdf_file, pages='all')
        if not tables:
            st.error("No tables found in the PDF file")
            return None
        csv_data = pd.concat(tables).to_csv(index=False)
        return csv_data
    except Exception as e:
        st.error(f"Error occurred: {e}")
        return None

# Streamlit app
st.title("File Converter 📁")

# Conversion type selection
conversion_type = st.selectbox("Select conversion type", ["Excel to CSV", "PDF to CSV"])

# File upload section
st.header("Upload a file")
uploaded_file = st.file_uploader("Choose a file", type=['xlsx', 'xls', 'pdf'])

if uploaded_file is not None:
    # Determine file type and convert to selected format
    if conversion_type == "Excel to CSV" and (uploaded_file.name.endswith('.xlsx') or uploaded_file.name.endswith('.xls')):
        csv_data = excel_to_csv(uploaded_file)
        if csv_data:
            st.header("Converted CSV data")
            st.code(csv_data)
            st.download_button("Download CSV", csv_data, uploaded_file.name.split('.')[0] + '.csv', 'text/csv')
    elif conversion_type == "PDF to CSV" and uploaded_file.name.endswith('.pdf'):
        csv_data = pdf_to_csv(uploaded_file)
        if csv_data:
            st.header("Converted CSV data")
            st.code(csv_data)
            st.download_button("Download CSV", csv_data, uploaded_file.name.split('.')[0] + '.csv', 'text/csv')
    else:
        st.error("File type not supported for selected conversion")