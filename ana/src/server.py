from flask import Flask
import os
import logging
from dotenv import load_dotenv
from datetime import datetime

from analysis_engine.analysis_engine import AnalysisEngine

app = Flask(__name__)

if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    mqtt = AnalysisEngine().begin_client()


@app.route('/ping')
def ping():
    return {'analyzer': 'pong'}


app.run(port=3007, debug=True)
