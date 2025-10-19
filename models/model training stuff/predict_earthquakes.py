"""
Earthquake Frequency Prediction Script
This script loads the trained model and makes predictions for new dates.
"""

import joblib
import json
import pandas as pd
import numpy as np

class EarthquakePredictionModel:
    def __init__(self, model_path="earthquake_frequency_model.pkl", info_path="model_info.json"):
        """Load the trained model and its metadata."""
        try:
            # Load the trained model
            self.model = joblib.load(model_path)
            print(f"✓ Model loaded successfully from {model_path}")
            
            # Load model info
            with open(info_path, 'r') as f:
                self.model_info = json.load(f)
            print(f"✓ Model info loaded from {info_path}")
            
            # Display model performance
            metrics = self.model_info['performance_metrics']
            print(f"\nModel Performance:")
            print(f"R² Score: {metrics['r2_score']:.4f}")
            print(f"RMSE: {metrics['rmse']:.2f}")
            
        except FileNotFoundError as e:
            print(f"❌ Error: {e}")
            print("Make sure you've run model_training.py first to create the model files.")
            raise
    
    def predict_single_year(self, year):
        """Predict earthquake frequency for a single year."""
        # Convert year to the same format used in training
        year_numeric = float(year)
        prediction = self.model.predict([[year_numeric]])[0]
        return max(0, int(round(prediction)))  # Ensure non-negative integer
    
    def predict_multiple_years(self, years):
        """Predict earthquake frequency for multiple years."""
        years_numeric = [[float(year)] for year in years]
        predictions = self.model.predict(years_numeric)
        return [max(0, int(round(pred))) for pred in predictions]
    
    def predict_future_trend(self, start_year, end_year):
        """Predict earthquake frequency trend for a range of years."""
        years = list(range(start_year, end_year + 1))
        predictions = self.predict_multiple_years(years)
        
        results = pd.DataFrame({
            'Year': years,
            'Predicted_Earthquake_Count': predictions
        })
        return results
    
    def get_model_info(self):
        """Display detailed model information."""
        print("\n" + "="*50)
        print("EARTHQUAKE PREDICTION MODEL INFO")
        print("="*50)
        
        coeffs = self.model_info['model_coefficients']
        print(f"Model Type: {self.model_info['model_type']}")
        print(f"Training Date: {self.model_info['training_date']}")
        print(f"Features: {', '.join(self.model_info['features'])}")
        print(f"Target: {self.model_info['target']}")
        
        print(f"\nModel Equation:")
        print(f"Earthquake Count = {coeffs['slope']:.2f} × Year + {coeffs['intercept']:.2f}")
        
        print(f"\nInterpretation:")
        print(f"• Earthquake frequency increases by ~{coeffs['slope']:.0f} events per year")
        print(f"• Model explains {self.model_info['performance_metrics']['r2_score']*100:.1f}% of the variance")


def main():
    """Example usage of the prediction model."""
    try:
        # Initialize the model
        predictor = EarthquakePredictionModel()
        
        # Show model info
        predictor.get_model_info()
        
        # Example predictions
        print("\n" + "="*50)
        print("EXAMPLE PREDICTIONS")
        print("="*50)
        
        # Predict for specific years
        test_years = [2025, 2026, 2027, 2028, 2029, 2030]
        predictions = predictor.predict_multiple_years(test_years)
        
        print("\nPredicted earthquake frequencies:")
        for year, pred in zip(test_years, predictions):
            print(f"Year {year}: {pred:,} earthquakes")
        
        # Predict future trend (next 10 years)
        print(f"\nFuture trend (2025-2035):")
        trend_df = predictor.predict_future_trend(2025, 2035)
        print(trend_df.to_string(index=False))
        
        # Interactive prediction
        print("\n" + "="*50)
        print("INTERACTIVE PREDICTION")
        print("="*50)
        print("Enter a year to predict earthquake frequency (or 'quit' to exit):")
        
        while True:
            user_input = input("\nEnter year: ").strip()
            
            if user_input.lower() == 'quit':
                break
                
            try:
                year = int(user_input)
                if year < 1900 or year > 2100:
                    print("⚠️  Warning: Year is outside typical range (1900-2100)")
                
                prediction = predictor.predict_single_year(year)
                print(f"📊 Predicted earthquakes in {year}: {prediction:,}")
                
            except ValueError:
                print("❌ Please enter a valid year (number) or 'quit'")
    
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()