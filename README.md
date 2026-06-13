# TradeMirrorFX
Trader behaviour intelligence & content targeting platform

### Instructions to run
1. Install deps  
`pip install -r requirements.txt`  

2. Generate synthetic data (creates data/synthetic/*.txt)  
`python generate_synthetic_data.py`  

3. Start the server  
`uvicorn main:app --reload --port 8000`  



### Endpoints
`GET  /health`                       → confirms demo session loaded   

`GET  /demo/clients`                    → lists client_A, B, C, D   

`GET  /demo/client/client_B  `          → full analysis for the patience ratio case  

`GET  /demo/broker `                    → full broker session: groups + signals  

`POST /analyze`    (upload one .txt file)  

`POST /broker/upload ` (upload multiple .txt files)
