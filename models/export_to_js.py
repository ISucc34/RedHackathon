"""
Export earthquake prediction model to JavaScript
This script creates JavaScript files that can be used directly in JS projects.
"""

import joblib
import json

def export_model_to_javascript():
    """Export the trained model as JavaScript functions"""
    
    # Load model info
    try:
        with open("model_info.json", 'r') as f:
            model_info = json.load(f)
    except FileNotFoundError:
        print("❌ Error: model_info.json not found. Run model_training.py first.")
        return
    
    # Extract coefficients
    intercept = model_info['model_coefficients']['intercept']
    slope = model_info['model_coefficients']['slope']
    r2_score = model_info['performance_metrics']['r2_score']
    
    # Create JavaScript module
    js_code = f'''/**
 * Earthquake Frequency Prediction Model
 * Exported from Python scikit-learn LinearRegression
 * 
 * Model Performance:
 * - R² Score: {r2_score:.4f}
 * - Training Date: {model_info['training_date']}
 * 
 * Model Equation: earthquakes = {slope:.4f} * year + ({intercept:.4f})
 */

class EarthquakePredictionModel {{
    constructor() {{
        this.intercept = {intercept};
        this.slope = {slope};
        this.r2Score = {r2_score};
        this.modelInfo = {json.dumps(model_info, indent=2)};
    }}
    
    /**
     * Predict earthquake frequency for a single year
     * @param {{number}} year - The year to predict for
     * @returns {{number}} - Predicted number of earthquakes (rounded to integer)
     */
    predictSingleYear(year) {{
        const prediction = this.slope * year + this.intercept;
        return Math.max(0, Math.round(prediction)); // Ensure non-negative integer
    }}
    
    /**
     * Predict earthquake frequency for multiple years
     * @param {{number[]}} years - Array of years to predict for
     * @returns {{Object[]}} - Array of {{year, prediction}} objects
     */
    predictMultipleYears(years) {{
        return years.map(year => ({{
            year: year,
            predictedEarthquakes: this.predictSingleYear(year)
        }}));
    }}
    
    /**
     * Predict earthquake frequency trend for a range of years
     * @param {{number}} startYear - Starting year (inclusive)
     * @param {{number}} endYear - Ending year (inclusive)
     * @returns {{Object[]}} - Array of {{year, prediction}} objects
     */
    predictYearRange(startYear, endYear) {{
        const years = [];
        for (let year = startYear; year <= endYear; year++) {{
            years.push(year);
        }}
        return this.predictMultipleYears(years);
    }}
    
    /**
     * Get model information and performance metrics
     * @returns {{Object}} - Model metadata and performance info
     */
    getModelInfo() {{
        return {{
            modelType: 'Linear Regression',
            r2Score: this.r2Score,
            equation: `earthquakes = ${{this.slope.toFixed(2)}} × year + ${{this.intercept.toFixed(2)}}`,
            interpretation: `Earthquake frequency increases by ~${{Math.round(this.slope)}} events per year`,
            varianceExplained: `${{(this.r2Score * 100).toFixed(1)}}%`,
            fullInfo: this.modelInfo
        }};
    }}
    
    /**
     * Validate year input
     * @param {{number}} year - Year to validate
     * @returns {{Object}} - Validation result
     */
    validateYear(year) {{
        if (typeof year !== 'number' || isNaN(year)) {{
            return {{ valid: false, error: 'Year must be a number' }};
        }}
        if (year < 1900 || year > 2100) {{
            return {{ 
                valid: false, 
                error: 'Year is outside typical range (1900-2100)',
                warning: true 
            }};
        }}
        return {{ valid: true }};
    }}
}}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = EarthquakePredictionModel;
}}

// For browser environments
if (typeof window !== 'undefined') {{
    window.EarthquakePredictionModel = EarthquakePredictionModel;
}}

// Example usage:
/*
const model = new EarthquakePredictionModel();

// Predict for a single year
const prediction2025 = model.predictSingleYear(2025);
console.log(`Predicted earthquakes in 2025: ${{prediction2025}}`);

// Predict for multiple years
const predictions = model.predictMultipleYears([2025, 2026, 2027]);
console.log('Multi-year predictions:', predictions);

// Predict for a range
const rangePredictions = model.predictYearRange(2025, 2030);
console.log('Range predictions:', rangePredictions);

// Get model info
const info = model.getModelInfo();
console.log('Model info:', info);
*/
'''
    
    # Write JavaScript file
    with open("earthquake_model.js", "w") as f:
        f.write(js_code)
    
    # Create a simple HTML demo
    html_demo = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Earthquake Prediction Demo</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        input, button {{
            padding: 10px;
            margin: 5px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }}
        button {{
            background-color: #007bff;
            color: white;
            cursor: pointer;
        }}
        button:hover {{
            background-color: #0056b3;
        }}
        .result {{
            margin: 10px 0;
            padding: 10px;
            background-color: #e7f3ff;
            border-left: 4px solid #007bff;
            border-radius: 3px;
        }}
        .model-info {{
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🌍 Earthquake Frequency Prediction</h1>
        <div class="model-info" id="modelInfo"></div>
        
        <h3>Single Year Prediction</h3>
        <input type="number" id="yearInput" placeholder="Enter year (e.g., 2025)" min="1900" max="2100">
        <button onclick="predictSingle()">Predict</button>
        <div id="singleResult"></div>
        
        <h3>Range Prediction</h3>
        <input type="number" id="startYear" placeholder="Start year" min="1900" max="2100">
        <input type="number" id="endYear" placeholder="End year" min="1900" max="2100">
        <button onclick="predictRange()">Predict Range</button>
        <div id="rangeResult"></div>
    </div>

    <script src="earthquake_model.js"></script>
    <script>
        const model = new EarthquakePredictionModel();
        
        // Display model info on load
        document.addEventListener('DOMContentLoaded', function() {{
            const info = model.getModelInfo();
            document.getElementById('modelInfo').innerHTML = `
                <h4>Model Information</h4>
                <p><strong>Type:</strong> ${{info.modelType}}</p>
                <p><strong>Accuracy (R²):</strong> ${{info.varianceExplained}} of variance explained</p>
                <p><strong>Equation:</strong> ${{info.equation}}</p>
                <p><strong>Interpretation:</strong> ${{info.interpretation}}</p>
            `;
        }});
        
        function predictSingle() {{
            const year = parseInt(document.getElementById('yearInput').value);
            const validation = model.validateYear(year);
            
            if (!validation.valid) {{
                document.getElementById('singleResult').innerHTML = 
                    `<div class="result" style="border-left-color: #dc3545; background-color: #f8d7da;">
                        ❌ ${{validation.error}}
                    </div>`;
                return;
            }}
            
            const prediction = model.predictSingleYear(year);
            document.getElementById('singleResult').innerHTML = 
                `<div class="result">
                    📊 Predicted earthquakes in ${{year}}: <strong>${{prediction.toLocaleString()}}</strong>
                </div>`;
        }}
        
        function predictRange() {{
            const startYear = parseInt(document.getElementById('startYear').value);
            const endYear = parseInt(document.getElementById('endYear').value);
            
            if (isNaN(startYear) || isNaN(endYear)) {{
                document.getElementById('rangeResult').innerHTML = 
                    `<div class="result" style="border-left-color: #dc3545; background-color: #f8d7da;">
                        ❌ Please enter valid start and end years
                    </div>`;
                return;
            }}
            
            if (startYear > endYear) {{
                document.getElementById('rangeResult').innerHTML = 
                    `<div class="result" style="border-left-color: #dc3545; background-color: #f8d7da;">
                        ❌ Start year must be less than or equal to end year
                    </div>`;
                return;
            }}
            
            const predictions = model.predictYearRange(startYear, endYear);
            let html = '<div class="result"><h4>Range Predictions:</h4><ul>';
            
            predictions.forEach(pred => {{
                html += `<li>${{pred.year}}: ${{pred.predictedEarthquakes.toLocaleString()}} earthquakes</li>`;
            }});
            
            html += '</ul></div>';
            document.getElementById('rangeResult').innerHTML = html;
        }}
    </script>
</body>
</html>'''
    
    with open("earthquake_demo.html", "w") as f:
        f.write(html_demo)
    
    # Create a Node.js example
    nodejs_example = '''// Node.js Example Usage
const EarthquakePredictionModel = require('./earthquake_model.js');

const model = new EarthquakePredictionModel();

console.log('=== Earthquake Prediction Model Demo ===\\n');

// Show model info
const info = model.getModelInfo();
console.log('Model Info:');
console.log(`- Type: ${info.modelType}`);
console.log(`- Accuracy: ${info.varianceExplained} of variance explained`);
console.log(`- Equation: ${info.equation}`);
console.log(`- Interpretation: ${info.interpretation}\\n`);

// Single year prediction
const year = 2025;
const prediction = model.predictSingleYear(year);
console.log(`Predicted earthquakes in ${year}: ${prediction.toLocaleString()}\\n`);

// Multiple years
const years = [2025, 2026, 2027, 2028, 2029, 2030];
const predictions = model.predictMultipleYears(years);
console.log('Multi-year predictions:');
predictions.forEach(pred => {
    console.log(`  ${pred.year}: ${pred.predictedEarthquakes.toLocaleString()} earthquakes`);
});

// Range prediction
console.log('\\nRange prediction (2025-2035):');
const rangePreds = model.predictYearRange(2025, 2035);
rangePreds.forEach(pred => {
    console.log(`  ${pred.year}: ${pred.predictedEarthquakes.toLocaleString()} earthquakes`);
});
'''
    
    with open("nodejs_example.js", "w") as f:
        f.write(nodejs_example)
    
    print("✓ JavaScript files created successfully!")
    print("\nFiles generated:")
    print("1. earthquake_model.js - Main JavaScript model class")
    print("2. earthquake_demo.html - Interactive web demo")
    print("3. nodejs_example.js - Node.js usage example")
    
    print(f"\nModel coefficients exported:")
    print(f"- Intercept: {intercept:.4f}")
    print(f"- Slope: {slope:.4f}")
    print(f"- R² Score: {r2_score:.4f}")

if __name__ == "__main__":
    export_model_to_javascript()