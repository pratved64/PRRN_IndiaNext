#!/usr/bin/env python3
"""
Test script to verify the unified backend works and writes results to file
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

results = []

try:
    results.append("Testing imports...")
    
    # Test main import
    from main import app
    results.append("✓ Successfully imported main app")
    
    # Test sentinel import
    from sentinel_behavior.main import startup_sentinel, router
    results.append("✓ Successfully imported sentinel startup and router")
    
    # Test pipelines import
    from pipelines.api_routes import router as phishing_router
    results.append("✓ Successfully imported phishing router")
    
    results.append("\n✅ All imports successful! The unified backend should work.")
    
except Exception as e:
    results.append(f"❌ Import error: {e}")
    import traceback
    results.append(str(traceback.format_exc()))

# Write results to file
with open("test_results.txt", "w") as f:
    f.write("\n".join(results))
