/**
 * Earthquake Frequency Prediction Model
 * Exported from Python scikit-learn LinearRegression
 * 
 * Model Performance:
 * - R² Score: 0.8155
 * - Training Date: 2025-10-19
 * 
 * Model Equation: earthquakes = 2325.5792 * year + (-4567900.1855)
 */

class EarthquakePredictionModel {
    constructor() {
        this.intercept = -4567900.18550383;
        this.slope = 2325.5791789432333;
        this.r2Score = 0.8155222961812493;
        this.modelInfo = {
  "model_type": "LinearRegression",
  "training_date": "2025-10-19",
  "features": [
    "date"
  ],
  "target": "earthquake_count",
  "performance_metrics": {
    "r2_score": 0.8155222961812493,
    "mse": 205816826.41892394,
    "rmse": 14346.317521194209,
    "mae": 8824.055677577346
  },
  "model_coefficients": {
    "intercept": -4567900.18550383,
    "slope": 2325.5791789432333
  },
  "usage_instructions": "Use predict_earthquakes.py to make new predictions"
};
    }
    
    /**
     * Predict earthquake frequency for a single year
     * @param {number} year - The year to predict for
     * @returns {number} - Predicted number of earthquakes (rounded to integer)
     */
    predictSingleYear(year) {
        const prediction = this.slope * year + this.intercept;
        return Math.max(0, Math.round(prediction)); // Ensure non-negative integer
    }
    
    /**
     * Predict earthquake frequency for multiple years
     * @param {number[]} years - Array of years to predict for
     * @returns {Object[]} - Array of {year, prediction} objects
     */
    predictMultipleYears(years) {
        return years.map(year => ({
            year: year,
            predictedEarthquakes: this.predictSingleYear(year)
        }));
    }
    
    /**
     * Predict earthquake frequency trend for a range of years
     * @param {number} startYear - Starting year (inclusive)
     * @param {number} endYear - Ending year (inclusive)
     * @returns {Object[]} - Array of {year, prediction} objects
     */
    predictYearRange(startYear, endYear) {
        const years = [];
        for (let year = startYear; year <= endYear; year++) {
            years.push(year);
        }
        return this.predictMultipleYears(years);
    }
    
    /**
     * Get model information and performance metrics
     * @returns {Object} - Model metadata and performance info
     */
    getModelInfo() {
        return {
            modelType: 'Linear Regression',
            r2Score: this.r2Score,
            equation: `earthquakes = ${this.slope.toFixed(2)} × year + ${this.intercept.toFixed(2)}`,
            interpretation: `Earthquake frequency increases by ~${Math.round(this.slope)} events per year`,
            varianceExplained: `${(this.r2Score * 100).toFixed(1)}%`,
            fullInfo: this.modelInfo
        };
    }
    
    /**
     * Validate year input
     * @param {number} year - Year to validate
     * @returns {Object} - Validation result
     */
    validateYear(year) {
        if (typeof year !== 'number' || isNaN(year)) {
            return { valid: false, error: 'Year must be a number' };
        }
        if (year < 1900 || year > 2100) {
            return { 
                valid: false, 
                error: 'Year is outside typical range (1900-2100)',
                warning: true 
            };
        }
        return { valid: true };
    }
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarthquakePredictionModel;
}

// For browser environments
if (typeof window !== 'undefined') {
    window.EarthquakePredictionModel = EarthquakePredictionModel;
}

// Example usage:
/*
const model = new EarthquakePredictionModel();

// Predict for a single year
const prediction2025 = model.predictSingleYear(2025);
console.log(`Predicted earthquakes in 2025: ${prediction2025}`);

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
