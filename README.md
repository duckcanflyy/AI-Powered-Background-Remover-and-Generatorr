## Run Flask app with automatically change
_flask --app app.py --debug run_

## Requirement when add a new library
- After add a library, add it to requirements.txt file 
- Run this cmd if your project is lack of some libraries(as npm install):
   _pip install -r requirements.txt_
  
## Recreate .venv 
_python -m venv .venv_

## Run virtual environment
_.venv\Scripts\activate_

## Explain Folders
# model
Contain model functions to import
# static
Contain the css, script files
# templates
Contain the html files
# app.py
The main run app
