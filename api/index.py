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

# >>> FEATURE LIST (Ensure this matches your React form keys) <<<
FEATURE_NAMES = [
    'anxiety_level', 'self_esteem', 'depression', 'mental_health_history', 
    'sleep_quality', 'headache', 'breathing_problem', 'academic_performance', 
    'study_load', 'future_career_concerns', 'noise_level', 'peer_pressure', 
    'bullying', 'social_support'
]

# --- INITIALIZATION ---
app = Flask(__name__)
CORS(app) 

# Global variables for model and scaler
model = None
scaler = None

def load_models():
    global model, scaler
    if model is None or scaler is None:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)

# --- API ENDPOINT ---
# Changed to /api/predict to match vercel.json rewrites
@app.route('/api/predict', methods=['POST'])
def predict_stress():
    load_models()
    try:
        data = request.get_json(force=True)
        # Extract features in the correct order
        ordered_features = [float(data[name]) for name in FEATURE_NAMES]
        input_data = np.array(ordered_features).reshape(1, -1)
        
        # Scale and Predict
        input_scaled = scaler.transform(input_data)
        prediction = model.predict(input_scaled)
        stress_level = int(prediction[0])
        
        stress_map = {0: "Low Stress", 1: "Moderate Stress", 2: "High Stress"}
        
        return jsonify({
            'predicted_stress_level': stress_level,
            'level_description': stress_map.get(stress_level, "Unknown")
        })

    except KeyError as e:
        return jsonify({'error': f'Missing feature: {e}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# For local testing only; Vercel ignores this block
if __name__ == '__main__':
    app.run(debug=True)