import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import numpy as np
import joblib 
import matplotlib.pyplot as plt
import seaborn as sns

# --- CONFIGURATION ---
FILE_NAME = 'StressLevelDataset.csv'
TARGET_COLUMN = 'stress_level'
TEST_SIZE = 0.2
RANDOM_STATE = 42

# >>> CRITICAL FIX: FINAL 13-FEATURE LIST <<<
FEATURE_COLUMNS = [
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

# ==============================================================================
# PHASE 1 & 2: DATA LOADING AND PREPROCESSING 
# ==============================================================================
print("--- PHASE 1 & 2: Data Loading and Preprocessing Started ---")
try:
    df = pd.read_csv(FILE_NAME)
    
    # 1. Handle Missing Values (Median Imputation)
    numeric_cols = df.select_dtypes(include=np.number).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    
    # 2. Outlier Handling (Clipping)
    for col in df.columns.drop(TARGET_COLUMN):
        if df[col].dtype != 'object':
            lower_bound = df[col].quantile(0.05)
            upper_bound = df[col].quantile(0.95)
            df[col] = np.clip(df[col], lower_bound, upper_bound)
            
except FileNotFoundError:
    print(f"Error: {FILE_NAME} not found.")
    exit()

# ENFORCE THE COLUMN ORDER HERE:
X = df[FEATURE_COLUMNS] 
y = df[TARGET_COLUMN]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("Data cleaning, scaling, and splitting complete.")
print("-" * 60)

# ==============================================================================
# PHASE 3: MODEL DEVELOPMENT (FINAL ASYMMETRIC WEIGHTING)
# ==============================================================================
print("--- PHASE 3: Training Random Forest Classifier (Final Asymmetric Weights) ---")

# CRITICAL FIX: EXTREME MANUAL CLASS WEIGHTING (Favors Level 2, makes Level 1 less conservative)
manual_class_weights = {
    0: 1.0,  # Low Stress (Baseline)
    1: 3.0,  # Moderate Stress (3x more weight to correctly predict boundary cases)
    2: 5.0   # High Stress (5x more important to catch severe cases)
}
print(f"Manual Class Weights Applied: {manual_class_weights}")


# 1. Hyperparameter Tuning (Randomized Search)
param_grid = {
    'n_estimators': [100, 200],
    'max_depth': [10, 20, None],
    'min_samples_split': [2, 5],
    'min_samples_leaf': [1, 2]
}

rf = RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1, class_weight=manual_class_weights)

random_search = RandomizedSearchCV(estimator=rf, 
                                   param_distributions=param_grid, 
                                   n_iter=10, 
                                   cv=5, 
                                   verbose=0, 
                                   random_state=RANDOM_STATE, 
                                   n_jobs=-1,
                                   scoring='accuracy')

print("\nStarting Hyperparameter Search...")
random_search.fit(X_train_scaled, y_train)

model = random_search.best_estimator_
print(f"\nBest Hyperparameters Found: {random_search.best_params_}")

print("Model training complete.")
print("-" * 60)

# 2. Evaluation
y_pred = model.predict(X_test_scaled)
print("\n" + "="*60)
print("FINAL OPTIMIZED MODEL PERFORMANCE")
print("="*60)

accuracy = accuracy_score(y_test, y_pred)
print(f"Overall Classification Accuracy: {accuracy:.4f}\n")

print("Classification Report (Performance per Stress Level):")
target_names = [f'Low Stress ({i})' for i in sorted(y.unique())]
print(classification_report(y_test, y_pred, target_names=target_names))
print("-" * 60)

# 3. MODEL SAVING 
joblib.dump(model, 'final_stress_predictor_rf.joblib')
joblib.dump(scaler, 'scaler.joblib')

print("STEP: Saved the Final Aggressively Weighted Model.")
print("============================================================")
