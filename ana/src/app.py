import os
import logging
from io import BytesIO
import base64
from dotenv import load_dotenv
from datetime import datetime
import dash
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output, State
import plotly.express as px
import pandas as pd
import matplotlib
from matplotlib import pyplot as plt
import tikzplotlib
from analysis_engine.analysis_engine import AnalysisEngine

matplotlib.use('agg')

available_experiments = ['']
available_indicators = []
available_chart_types = [
    'scatter',
    'bar'
]

if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    analysis_engine = AnalysisEngine().begin_client()
    # TODO clean up the following code
    df = analysis_engine.get_drone_data('f8e303d6')
    # print(df)
    column_list = df.columns.tolist()
    column_list.remove('experiment_id')
    available_indicators = column_list
    available_experiments = df['experiment_id'].unique()

external_stylesheets = ['https://codepen.io/chriddyp/pen/bWLwgP.css']

app = dash.Dash(__name__, external_stylesheets=external_stylesheets)


app.layout = html.Div([
    html.Div([
        html.Div([
            html.H3(
                'mobil-e-Hub', style={'display': 'inline-block', 'margin-right': '20px', 'margin-bottom': 0}
            ),
            html.H6(
                'Analysis Platform', style={'display': 'inline-block', 'color': 'gray'}
            )
        ]
        ),
        html.Hr(style={'margin': '10px 0'}),
        html.Div([
            html.Span('Experiment: '),
            dcc.Dropdown(
                id='experiment',
                options=[{'label': i, 'value': i} for i in available_experiments],
                value=available_experiments[0]
            )
        ], style={'width': '15%', 'margin-right': '20px', 'text-align': 'center', 'display': 'inline-block'}),

        html.Div([
            html.Span('x-Axis: '),
            dcc.Dropdown(
                id='xaxis-column',
                options=[{'label': i, 'value': i} for i in available_indicators],
                value='name'
            )
        ], style={'width': '15%', 'margin-right': '20px', 'text-align': 'center', 'display': 'inline-block'}),

        html.Div([
            html.Span('y-Axis: '),
            dcc.Dropdown(
                id='yaxis-column',
                options=[{'label': i, 'value': i} for i in available_indicators],
                value='position_y'
            )
        ], style={'width': '15%', 'margin-right': '20px', 'text-align': 'center', 'display': 'inline-block'}),

        html.Div([
            html.Span('Chart-Type: '),
            dcc.Dropdown(
                id='bar_type',
                options=[{'label': i, 'value': i} for i in available_chart_types],
                value='scatter',

            )
        ], style={'width': '15%', 'text-align': 'center', 'display': 'inline-block'}),

        html.Div(
            [
                html.Button("Download TIKZ", id="btn_tikz"),
                dcc.Download(id="download-tikz"),
            ], style={'margin-top': '10px'}
        )
    ]),

    dcc.Graph(id='indicator-graphic')

])


@app.callback(
    Output('indicator-graphic', 'figure'),
    Input('xaxis-column', 'value'),
    Input('yaxis-column', 'value'),
    Input('bar_type', 'value'))
def update_graph(xaxis_column_name, yaxis_column_name, bar_type):
    if bar_type == 'bar':
        fig = px.bar(x=df[xaxis_column_name],
                     y=df[yaxis_column_name])
    else:
        fig = px.scatter(x=df[xaxis_column_name],
                         y=df[yaxis_column_name])

    fig.update_xaxes(title=xaxis_column_name)

    fig.update_yaxes(title=yaxis_column_name)

    return fig


@app.callback(
    Output("download-tikz", "data"),
    Input("btn_tikz", "n_clicks"),
    State('xaxis-column', 'value'),
    State('yaxis-column', 'value'),
    State('bar_type', 'value'),
    prevent_initial_call=True
)
def download_tikz(clicks, xaxis_column_name, yaxis_column_name, bar_type):
    if bar_type == 'bar':
        plt.bar(x=df[xaxis_column_name],
                height=df[yaxis_column_name])
    else:
        plt.scatter(x=df[xaxis_column_name],
                    y=df[yaxis_column_name])
    plt.savefig('test/test.png')
    tikzplotlib.save('test/test.tex')
    return dcc.send_file(
        "test.tex"
    )


app.run_server(port=3007, debug=True)
