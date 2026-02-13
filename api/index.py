import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS 
import numpy as np 

import os

# --- CONFIGURATION ---
MODEL_FILENAME = 'final_stress_predictor_rf.joblib'
SCALER_FILENAME = 'scaler.joblib'

# Use absolute paths for Vercel environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, MODEL_FILENAME)
SCALER_PATH = os.path.join(BASE_DIR, SCALER_FILENAME)

# >>> CRITICAL FIX: FEATURE ORDER LIST (13 Features) <<<
# This list MUST match the 13 columns in your training script and React frontend.
FEATURE_NAMES = [
    'anxiety_level', 
    'self_esteem', 
    'depression', 
    'mental_health_history', 
    'sleep_quality', 
    'headache', 
    'breathing_problem', 
    'academic_performance', 
    'study_load', 
    'future_career_concerns', 
    'noise_level', 
    'peer_pressure', 
    'bullying', 
    'social_support'
]
# >>> END CRITICAL FIX <<<

# --- INITIALIZATION ---
app = Flask(__name__)
CORS(app) 

# Load the trained model and scaler objects
try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print(f"Loaded Model: {MODEL_PATH}")
    print(f"Loaded Scaler: {SCALER_PATH}")
except FileNotFoundError:
    print("ERROR: Model or Scaler files not found. Run the Python ML script first!")
    exit()


# --- API ENDPOINT ---
@app.route('/predict', methods=['POST'])
def predict_stress():
    """Receives student features and returns the predicted stress level."""
    
    # 1. Get data from POST request
    try:
        data = request.get_json(force=True)
        
        # 2. Re-order and prepare the data using the defined FEATURE_NAMES
        ordered_features = [data[name] for name in FEATURE_NAMES]
        
        # Convert to numpy array and reshape for the scaler (1 sample, 13 features)
        input_data = np.array(ordered_features).reshape(1, -1)
        
    except KeyError as e:
        return jsonify({'error': f'Missing feature in input: {e}. Please ensure all {len(FEATURE_NAMES)} fields are sent.'}), 400
    except Exception as e:
        return jsonify({'error': f'Invalid input format or processing error. Error: {e}'}), 400

    # 3. Scale the input data
    # The UserWarning about feature names is expected and can be ignored.
    input_scaled = scaler.transform(input_data)

    # 4. Make prediction
    prediction = model.predict(input_scaled)
    stress_level = int(prediction[0])
    
    # Map the stress level to a readable string
    stress_map = {0: "Low Stress", 1: "Moderate Stress", 2: "High Stress"}
    
    # 5. Return the result
    return jsonify({
        'predicted_stress_level': stress_level,
        'level_description': stress_map.get(stress_level, "Unknown")
    })

# --- RUN THE APP ---
if __name__ == '__main__':
    print("Flask server running on http://127.0.0.1:5000/predict")
    app.run(debug=True)
