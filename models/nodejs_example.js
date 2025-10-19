// Node.js Example Usage
const EarthquakePredictionModel = require('./earthquake_model.js');

const model = new EarthquakePredictionModel();

console.log('=== Earthquake Prediction Model Demo ===\n');

// Show model info
const info = model.getModelInfo();
console.log('Model Info:');
console.log(`- Type: ${info.modelType}`);
console.log(`- Accuracy: ${info.varianceExplained} of variance explained`);
console.log(`- Equation: ${info.equation}`);
console.log(`- Interpretation: ${info.interpretation}\n`);

// Single year prediction
const year = 2025;
const prediction = model.predictSingleYear(year);
console.log(`Predicted earthquakes in ${year}: ${prediction.toLocaleString()}\n`);

// Multiple years
const years = [2025, 2026, 2027, 2028, 2029, 2030];
const predictions = model.predictMultipleYears(years);
console.log('Multi-year predictions:');
predictions.forEach(pred => {
    console.log(`  ${pred.year}: ${pred.predictedEarthquakes.toLocaleString()} earthquakes`);
});

// Range prediction
console.log('\nRange prediction (2025-2035):');
const rangePreds = model.predictYearRange(2025, 2035);
rangePreds.forEach(pred => {
    console.log(`  ${pred.year}: ${pred.predictedEarthquakes.toLocaleString()} earthquakes`);
});
