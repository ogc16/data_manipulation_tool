import streamlit as st

# Configure the page
st.set_page_config(
    page_title="Data Manipulation Tools",
    page_icon="🛠️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Main page content
st.title(" Data Manipulation Tools 🛠️")
st.markdown("---")

st.markdown("""
## Welcome 

This is a comprehensive data processing and analysis application with the following features:

### 📁 File Converter
- Convert Excel files (.xlsx, .xls) to CSV format
- Convert PDF tables to CSV format
- Download converted files instantly

### 📊 Data Analysis
- Upload and analyze CSV/Excel files
- Interactive data visualization with scatter plots and histograms
- Correlation heatmap analysis
- Statistical summaries and data preview

### How to Use
1. **File Converter**: Use this tool to convert your files to CSV format for easier data processing
2. **Data Analysis**: Upload your data files to perform comprehensive analysis and visualization

### Getting Started
Navigate to the pages using the sidebar to access different features of the application.

## Contact
If you have any questions or feedback, please reach out to us at [support@data-tools.com](mailto:support@data-tools.com).

### Contributing
If you would like to contribute to this project, please visit our [GitHub repository](https://github.com/data_manipulation_tool).
            
##### Enjoy exploring !  🚀

""") 

# Sidebar information
with st.sidebar:
   # st.markdown("## Navigation")
    st.markdown("")
    st.markdown("")
    st.markdown("")
    
    st.markdown("---")
    st.markdown("## About")
    st.markdown("Data manipulation tool v1.0")
    st.markdown("This app is designed to help you convert and analyze your data files easily.")

    st.markdown("---")
    st.markdown(
    """
    <div style='text-align: center'>
        <p>
            Maintained by <a href='https://www.techgaetano.com' target='_blank'>TechGaetano</a>
        </p>

    </div>
    """,
    unsafe_allow_html=True
)

# Footer
st.markdown("---")
