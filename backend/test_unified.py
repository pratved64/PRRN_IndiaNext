#!/usr/bin/env python3
"""
Test script to verify the unified backend works
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("Testing imports...")
    
    # Test main import
    from main import app
    print("✓ Successfully imported main app")
    
    # Test sentinel import
    from sentinel_behavior.main import startup_sentinel, router
    print("✓ Successfully imported sentinel startup and router")
    
    # Test pipelines import
    from pipelines.api_routes import router as phishing_router
    print("✓ Successfully imported phishing router")
    
    print("\n✅ All imports successful! The unified backend should work.")
    
except Exception as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()
