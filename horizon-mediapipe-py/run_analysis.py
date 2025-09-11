#!/usr/bin/env python3
"""
Run golden ratio analysis pipeline on existing landmark files.
This script processes .landmark files through the complete analysis pipeline.
"""

import json
import sys
from pathlib import Path

# Import our analysis modules
import golden
import importlib.util

# Load golden.final module
spec = importlib.util.spec_from_file_location("golden_final", "golden.final.py")
golden_final = importlib.util.module_from_spec(spec)
spec.loader.exec_module(golden_final)


def run_analysis_pipeline(landmarks_dir: str = "landmarks"):
    """
    Run the analysis pipeline on existing landmark files:
    1. Run golden ratio analysis
    2. Generate human-friendly interpretations
    """
    print("=" * 60)
    print("GOLDEN RATIO ANALYSIS PIPELINE")
    print("=" * 60)
    
    landmark_path = Path(landmarks_dir)
    if not landmark_path.exists():
        print(f"Error: Directory {landmarks_dir} does not exist")
        return False
    
    # Check for landmark files
    landmark_files = list(landmark_path.glob("*.landmark"))
    if not landmark_files:
        print(f"No .landmark files found in {landmarks_dir}")
        return False
    
    print(f"\nFound {len(landmark_files)} landmark files to analyze")
    
    # Step 1: Run golden ratio analysis
    print("\nStep 1: Running Golden Ratio Analysis")
    print("-" * 50)
    golden.process_landmarks_directory(landmarks_dir)
    
    # Step 2: Generate human-friendly interpretations
    print("\nStep 2: Generating Human-Friendly Interpretations")
    print("-" * 50)
    golden_final.process_all_golden_files(landmarks_dir)
    
    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)
    
    # Print summary
    golden_files = list(landmark_path.glob("*.golden.json"))
    final_files = list(landmark_path.glob("*.golden.final.json"))
    
    print(f"\nGenerated files:")
    print(f"  - {len(golden_files)} golden ratio analyses")
    print(f"  - {len(final_files)} human-friendly interpretations")
    
    # Show sample results
    if final_files:
        print(f"\nResults saved in: {landmarks_dir}/")
        print("  - *.golden.json: Technical golden ratio metrics")
        print("  - *.golden.final.json: Human-friendly interpretations")
        
        # Display a sample result
        sample_file = final_files[0]
        print(f"\nSample result from {sample_file.name}:")
        print("-" * 40)
        
        try:
            with open(sample_file, 'r') as f:
                data = json.load(f)
            
            if 'overall_assessment' in data:
                print(f"Assessment: {data['overall_assessment']}")
            if 'summary' in data:
                print(f"Harmony Score: {data['summary'].get('facial_harmony_score', 'N/A')}")
            if 'symmetry' in data:
                print(f"Symmetry: {data['symmetry'].get('overall_score', 'N/A')}")
            if 'distinctive_characteristics' in data and data['distinctive_characteristics']:
                print(f"Distinctive: {', '.join(data['distinctive_characteristics'][:3])}")
        except:
            pass
    
    return True


def compare_results(landmarks_dir: str = "landmarks"):
    """Compare golden ratio scores across all analyzed faces."""
    landmark_path = Path(landmarks_dir)
    final_files = list(landmark_path.glob("*.golden.final.json"))
    
    if not final_files:
        print("No final analysis files found")
        return
    
    print("\n" + "=" * 60)
    print("COMPARATIVE ANALYSIS")
    print("=" * 60)
    
    results = []
    for file in final_files:
        try:
            with open(file, 'r') as f:
                data = json.load(f)
            
            name = file.stem.replace('.golden.final', '')
            harmony = data.get('summary', {}).get('facial_harmony_score', 'N/A')
            symmetry = data.get('symmetry', {}).get('overall_score', 'N/A')
            golden = data.get('golden_ratio_alignment', {}).get('overall_harmony', 'N/A')
            
            results.append({
                'name': name,
                'harmony': harmony,
                'symmetry': symmetry,
                'golden': golden
            })
        except:
            continue
    
    # Sort by harmony score
    results.sort(key=lambda x: x['harmony'] if x['harmony'] != 'N/A' else '0%', reverse=True)
    
    # Display table
    print(f"\n{'Image':<20} {'Harmony':<12} {'Symmetry':<12} {'Golden Ratio'}")
    print("-" * 60)
    
    for r in results:
        print(f"{r['name']:<20} {r['harmony']:<12} {r['symmetry']:<12} {r['golden']}")
    
    print("\nInterpretation Guide:")
    print("  Harmony: Overall facial proportion balance (higher is better)")
    print("  Symmetry: Bilateral feature alignment (higher is better)")
    print("  Golden Ratio: Alignment with phi proportions")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Run golden ratio analysis on landmark files"
    )
    parser.add_argument(
        "landmarks_dir",
        nargs="?",
        default="landmarks",
        help="Directory containing .landmark files (default: landmarks)"
    )
    parser.add_argument(
        "--compare",
        "-c",
        action="store_true",
        help="Show comparative analysis of all results"
    )
    
    args = parser.parse_args()
    
    # Run analysis
    success = run_analysis_pipeline(args.landmarks_dir)
    
    # Show comparison if requested
    if success and args.compare:
        compare_results(args.landmarks_dir)


if __name__ == "__main__":
    main()