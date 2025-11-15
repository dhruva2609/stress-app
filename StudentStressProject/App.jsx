import React, { useState, useMemo } from 'react';
import { Smile, Meh, Frown, Brain, Heart, BookOpen, Users, AlertTriangle, Loader, Server, Zap, BarChart3 } from 'lucide-react';

// --- 1. CONFIGURATION AND INITIAL STATE ---

// Define the structure for all input groups and their fields
// NOTE: This list of IDs MUST be consistent across React and Python.
const INPUT_CONFIG = {
  psychological: {
    title: "Psychological Well-being",
    icon: <Brain className="w-6 h-6 text-orange-500" />,
    fields: [
      { id: 'anxiety_level', name: 'Anxiety Level', range: [1, 21], type: 'number', negativeFactor: true },
      { id: 'self_esteem', name: 'Self Esteem', range: [1, 30], type: 'number', negativeFactor: false }, // Higher is better
      { id: 'depression', name: 'Depression Score', range: [0, 27], type: 'number', negativeFactor: true },
      { id: 'mental_health_history', name: 'Mental Health History', range: [0, 1], type: 'select', options: [{ label: 'No History (0)', value: 0 }, { label: 'Has History (1)', value: 1 }], negativeFactor: true },
    ],
  },
  physiological: {
    title: "Physiological Indicators",
    icon: <Heart className="w-6 h-6 text-red-500" />,
    fields: [
      { id: 'sleep_quality', name: 'Sleep Quality (0=Poor, 5=Excellent)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: false }, // Good factor
      { id: 'headache', name: 'Headache Frequency (0=Never, 5=Daily)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: true },
      { id: 'breathing_problem', name: 'Breathing Problem Severity (0-5)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: true },
    ],
  },
  academic: {
    title: "Academic & Environmental Factors",
    icon: <BookOpen className="w-6 h-6 text-teal-500" />,
    fields: [
      { id: 'academic_performance', name: 'Academic Performance (0=Poor, 5=Excellent)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: false }, // Good factor
      { id: 'study_load', name: 'Study Load (0=Low, 5=Very High)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: true },
      { id: 'future_career_concerns', name: 'Future Career Concerns (0-5)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: true },
      { id: 'noise_level', name: 'Noise Level (1=Quiet, 5=Loud)', range: [1, 5], type: 'select', options: Array.from({ length: 5 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 })), negativeFactor: true },
    ],
  },
  social: {
    title: "Social Dynamics",
    icon: <Users className="w-6 h-6 text-purple-500" />,
    fields: [
      { id: 'peer_pressure', name: 'Peer Pressure (0=None, 5=High)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: true },
      { id: 'bullying', name: 'Bullying Frequency (0=None, 5=High)', range: [0, 5], type: 'select', options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: true },
      { id: 'social_support', name: 'Social Support (0=None, 3=High)', range: [0, 3], type: 'select', options: Array.from({ length: 4 }, (_, i) => ({ label: `${i}`, value: i })), negativeFactor: false }, // Good factor
    ],
  },
};

// Create a flat initial state object
const getInitialState = () => {
  const state = {};
  Object.values(INPUT_CONFIG).forEach(group => {
    group.fields.forEach(field => {
      // Set initial value to the lowest end of the range
      state[field.id] = field.type === 'number' ? field.range[0] : field.options[0].value;
    });
  });
  return state;
};

// Helper to collect all feature IDs in the defined order (13 features)
const FEATURE_IDS_ORDERED = Object.values(INPUT_CONFIG)
  .flatMap(group => group.fields)
  .map(field => field.id);

// --- 2. API INTERACTION LOGIC ---

// Map the numeric output (0, 1, 2) from the model to visual styles and text
const getResultStyle = (levelIndex) => {
    let level, color, icon, description, badgeColor;

    if (levelIndex === 2) {
        level = 'High Stress (Level 2)';
        color = 'bg-red-600';
        icon = <Frown className="w-8 h-8" />;
        description = "The model predicts a significantly HIGH stress level. Intervention and self-care are highly recommended.";
        badgeColor = 'bg-red-200 text-red-800';
    } else if (levelIndex === 1) {
        level = 'Moderate Stress (Level 1)';
        color = 'bg-orange-500';
        icon = <Meh className="w-8 h-8" />;
        description = "The model predicts a MODERATE stress level. Attention is needed to prevent escalation.";
        badgeColor = 'bg-orange-200 text-orange-800';
    } else { // levelIndex === 0
        level = 'Low Stress (Level 0)';
        color = 'bg-teal-600';
        icon = <Smile className="w-8 h-8" />;
        description = "The model predicts a LOW stress level. Continue practicing healthy habits.";
        badgeColor = 'bg-teal-200 text-teal-800';
    }

    return { level, color, icon, description, badgeColor };
};


// --- 3. REACT COMPONENTS ---

// Custom Input Field Component
const InputField = ({ id, name, value, onChange, range, type, options }) => {
    const [min, max] = range;

    // Round the displayed value for range inputs
    const displayedValue = type === 'number' ? value.toFixed(2) : value;

    let inputElement;

    if (type === 'select') {
        inputElement = (
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(id, parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-200 shadow-sm appearance-none cursor-pointer bg-white text-gray-700"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    } else {
        inputElement = (
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step="0.01" 
                value={value}
                onChange={(e) => onChange(id, parseFloat(e.target.value))}
                // Modernized slider styling with blue accent
                className="w-full h-2 bg-blue-100 rounded-full appearance-none cursor-pointer transition-all
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-lg
                             [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:shadow-lg"
            />
        );
    }

    return (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg shadow-inner transition-all hover:bg-white border border-gray-100">
            <label htmlFor={id} className="block text-sm font-semibold text-gray-800 mb-2 flex justify-between items-center">
                {name}
                <span className="text-sm font-bold text-white bg-blue-600 px-3 py-0.5 rounded-full shadow-md">{displayedValue}</span>
            </label>
            {inputElement}
            <p className="mt-1 text-xs text-gray-400">Range: {min} to {max}</p>
        </div>
    );
};

// Input Visualization Component (Bar Chart) - FINAL FIX FOR DISPLAY INVERSION
const InputVisualization = ({ inputs }) => {
    // Collect all fields and normalize their input values to a 0-100 scale for charting
    const chartData = Object.values(INPUT_CONFIG).flatMap(group => 
        group.fields.map(field => {
            const value = inputs[field.id];
            const [min, max] = field.range;
            
            // 1. Calculate normalized value (0 to 1)
            let normalized = (value - min) / (max - min);

            // 2. CRITICAL FIX: INVERT SCALE FOR VISUAL IMPACT
            // If it's a positive factor (e.g., Self Esteem), high value means LOW stress impact, so we invert.
            if (!field.negativeFactor) {
                normalized = 1 - normalized;
            }

            // Calculate bar height (minimum 5% to avoid vanishing bars)
            const barHeight = Math.max(5, normalized * 100); 
            
            // Determine color based on normalized STRESS impact (higher is redder)
            const barColor = normalized > 0.7 ? 'bg-red-600' : normalized > 0.4 ? 'bg-orange-500' : 'bg-teal-600';

            return {
                name: field.name.split('(')[0].trim(), // Use short name for chart
                height: barHeight,
                color: barColor,
            };
        })
    );

    return (
        <div className="mt-12 bg-white p-6 rounded-2xl shadow-2xl border-t-8 border-blue-500/50">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
                Current Stress Factor Impact
            </h2>
            <p className="text-sm text-gray-600 mb-6">Visualizing the relative impact of factors (higher bar = **higher simulated stress impact**).</p>
            
            <div className="flex overflow-x-auto pb-4 space-x-2 sm:space-x-4">
                {chartData.map((item, index) => (
                    <div key={index} className="flex flex-col items-center flex-shrink-0 w-16">
                        <div className="relative w-full h-40 bg-gray-100 rounded-lg flex items-end overflow-hidden">
                            <div
                                className={`w-full ${item.color} rounded-lg transition-all duration-500 ease-out`}
                                style={{ height: `${item.height}%` }}
                                title={`${item.name}: ${item.height.toFixed(0)}% impact`}
                            ></div>
                        </div>
                        <p className="text-xs text-gray-700 mt-2 text-center font-medium leading-tight">
                            {item.name}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};


// Result Box component 
const ResultBox = ({ apiResult, isLoading, apiError }) => {
    
    const baseClasses = "mt-10 p-6 rounded-3xl shadow-2xl transition-all duration-500 border-b-8 border-t-8";

    // Initial state before any prediction
    if (!apiResult && !isLoading && !apiError) {
        return (
            <div className={`${baseClasses} border-gray-300 bg-white`}>
                <div className="flex items-center justify-center text-gray-500 h-24">
                    <Zap className="w-8 h-8 mr-4 animate-bounce text-blue-500" />
                    <p className="text-xl font-medium">Ready to predict stress level.</p>
                </div>
            </div>
        );
    }
    
    // Loading State
    if (isLoading) {
        return (
            <div className={`${baseClasses} border-blue-400 bg-blue-50 animate-pulse`}>
                <div className="flex items-center justify-center text-blue-700 h-24">
                    <Loader className="w-8 h-8 mr-4 animate-spin" />
                    <p className="text-xl font-medium">Analyzing inputs with ML model...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (apiError) {
        return (
            <div className={`${baseClasses} border-red-500 bg-red-100`}>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-red-700 flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-2" /> API Connection Error
                    </h2>
                </div>
                <p className="text-sm text-red-800 font-mono break-words">{apiError}</p>
                <p className="text-xs mt-2 text-red-600 font-semibold">Ensure the Flask server is running and accessible.</p>
            </div>
        );
    }

    // Success State
    if (apiResult) {
        const { level, color, icon, description, badgeColor } = getResultStyle(apiResult.predicted_stress_level);
        
        // Use the style mapping but display the description/level from the API if provided
        const finalDescription = apiResult.level_description || description;
        
        return (
            <div className={`${baseClasses} ${color.replace('bg-', 'border-')} bg-white`}>
                <div className="flex items-start justify-between">
                    {/* Icon and Main Text */}
                    <div className="flex items-center flex-grow">
                        <div className={`p-4 rounded-full ${color} text-white mr-4 shadow-lg flex-shrink-0`}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900 mb-1">{level}</h3>
                            <p className="text-base text-gray-600">{finalDescription}</p>
                        </div>
                    </div>
                    {/* Level Badge */}
                    <div className={`text-xl font-bold px-4 py-1.5 rounded-full shadow-lg self-start ${badgeColor}`}>
                        LEVEL {apiResult.predicted_stress_level}
                    </div>
                </div>
            </div>
        );
    }
    
    return null;
};


// Main App Component
const App = () => {
    const [inputs, setInputs] = useState(getInitialState);
    const [apiResult, setApiResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState(null);

    const handleInputChange = (id, value) => {
        setInputs(prev => ({ ...prev, [id]: value }));
    };

    // New API prediction handler
    const handleApiPrediction = async () => {
        setIsLoading(true);
        setApiResult(null);
        setApiError(null);
        
        // 1. Construct the payload in the correct order/structure expected by Flask
        // NOTE: The inversion happens on the server, we just send the raw values here.
        const payload = FEATURE_IDS_ORDERED.reduce((acc, key) => {
            acc[key] = parseFloat(inputs[key] || 0); // Ensure value is a float
            return acc;
        }, {});
        
        try {
            // 2. Send POST request to Flask endpoint
            const response = await fetch('http://127.0.0.1:5000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            // 3. Handle response
            if (response.ok) {
                setApiResult(data);
            } else {
                setApiError(data.error || `Server returned error status ${response.status}`);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setApiError("Could not connect to the API server. Please ensure 'api_server.py' is running.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
            <header className="text-center mb-10 pt-4">
                <h1 className="text-5xl font-extrabold text-blue-700 tracking-tight">
                    Student Stress Predictor
                </h1>
                <p className="text-gray-600 mt-2 text-xl">
                    Adjust the factors below and click "Get Prediction" to analyze via the Python ML model.
                </p>
            </header>

            <div className="max-w-7xl mx-auto">
                {/* Result Section */}
                <ResultBox 
                    apiResult={apiResult}
                    isLoading={isLoading}
                    apiError={apiError}
                />
                
                {/* Prediction Button */}
                <div className="mt-8 mb-12 text-center">
                    <button
                        onClick={handleApiPrediction}
                        disabled={isLoading}
                        className="px-12 py-4 text-xl font-bold rounded-full shadow-2xl shadow-blue-400/50 
                                   bg-blue-600 text-white hover:bg-blue-700 transition-all transform hover:scale-105 
                                   disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                    >
                        {isLoading ? (
                            <Loader className="w-6 h-6 mr-3 animate-spin" />
                        ) : (
                            <Server className="w-6 h-6 mr-3" />
                        )}
                        {isLoading ? 'ANALYZING...' : 'GET PREDICTION FROM SERVER'}
                    </button>
                </div>
                
                {/* Graph/Visualization Section */}
                {/* The graph should now correctly reflect that high self-esteem means LOW stress impact */}
                <InputVisualization inputs={inputs} />


                {/* Input Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
                    {Object.entries(INPUT_CONFIG).map(([key, group]) => (
                        <div key={key} className="bg-white p-6 rounded-2xl shadow-2xl border-t-8 border-blue-500/50 hover:shadow-blue-300 transition-shadow">
                            <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center">
                                {group.icon}
                                <span className="ml-3">{group.title}</span>
                            </h2>
                            <div className="space-y-4">
                                {group.fields.map(field => (
                                    <InputField
                                        key={field.id}
                                        {...field}
                                        value={inputs[field.id]}
                                        onChange={handleInputChange}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <footer className="text-center mt-12 text-sm text-gray-400">
                <p>Prediction powered by Random Forest Classifier model running on a Flask server.</p>
                <p>Designed with React, Tailwind CSS, and Lucide Icons.</p>
            </footer>
        </div>
    );
};

export default App;
