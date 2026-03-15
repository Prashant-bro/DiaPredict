import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, recall_score, roc_auc_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
import shap

def load_and_preprocess_data(filepath='../data.csv'):
    print(f"Loading dataset from {filepath}...")
    df = pd.read_csv(filepath)
    
    # Target definition:
    # Original target "Diabetes_012": 0 = no diabetes, 1 = prediabetes, 2 = diabetes
    # The requirement is binary: 0=No, 1=Yes. So we group 1 and 2 as 1.
    print("Preprocessing target variable...")
    df['Diabetes_Binary'] = df['Diabetes_012'].apply(lambda x: 1 if x > 0 else 0)
    
    # Drop original target
    X = df.drop(['Diabetes_012', 'Diabetes_Binary'], axis=1)
    y = df['Diabetes_Binary']
    
    print(f"Features: {list(X.columns)}")
    print(f"Class distribution before SMOTE: {np.bincount(y)}")
    
    return X, y

def train_model():
    X, y = load_and_preprocess_data()
    
    # Train-test split (stratified)
    print("Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Handle class imbalance with SMOTE
    print("Applying SMOTE to training set...")
    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
    print(f"Class distribution after SMOTE: {np.bincount(y_train_resampled)}")
    
    # Initialize LightGBM Classifier
    print("Training LightGBM Model...")
    model = LGBMClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        n_jobs=-1,
        verbose=-1
    )
    
    model.fit(X_train_resampled, y_train_resampled)
    
    # Predictions
    print("Evaluating model...")
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    f1 = f1_score(y_test, y_pred)
    
    print("n--- Model Performance Metrics ---")
    print(f"Accuracy: {accuracy:.4f} (Target: >0.85)")
    print(f"Recall: {recall:.4f} (Target: >0.80)")
    print(f"AUC-ROC: {roc_auc:.4f} (Target: >0.85)")
    print(f"F1-Score: {f1:.4f} (Target: >0.75)")
    
    print("n--- Classification Report ---")
    print(classification_report(y_test, y_pred))
    
    # Confusion Matrix Visualization
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Confusion Matrix')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.savefig('confusion_matrix.png')
    
    # Feature Importance Visualization
    plt.figure(figsize=(10, 8))
    # LightGBM feature importances
    feat_importances = pd.Series(model.feature_importances_, index=X.columns)
    feat_importances.nlargest(20).plot(kind='barh')
    plt.title('Feature Importances (LightGBM)')
    plt.savefig('feature_importance.png')
    
    # Save the model
    print("Saving model artifact...")
    joblib.dump(model, 'lightgbm_diabetes_model.pkl')
    # Save feature names for FastAPI
    joblib.dump(list(X.columns), 'feature_names.pkl')
    print("Model saved successfully in ml_api directory.")

if __name__ == "__main__":
    train_model()
