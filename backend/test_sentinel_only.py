#!/usr/bin/env python3
"""
Test script to verify only the sentinel behavior module works
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

results = []

try:
    results.append("Testing sentinel behavior imports...")
    
    # Test sentinel import only
    from sentinel_behavior.main import startup_sentinel, router
    results.append("✓ Successfully imported sentinel startup and router")
    
    # Check router endpoints
    routes = [route.path for route in router.routes]
    results.append(f"✓ Router has {len(routes)} routes: {routes}")
    
    results.append("\n✅ Sentinel behavior module works!")
    
except Exception as e:
    results.append(f"❌ Import error: {e}")
    import traceback
    results.append(str(traceback.format_exc()))

# Write results to file
with open("sentinel_test_results.txt", "w") as f:
    f.write("\n".join(results))
