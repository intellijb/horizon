#!/usr/bin/env python3
"""
Complete pipeline with tabular display of results.
Processes images and displays all metrics in an easy-to-pick format.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any
import importlib.util

# Import analysis modules
import golden

# Load golden.final module
spec = importlib.util.spec_from_file_location("golden_final", "golden.final.py")
golden_final = importlib.util.module_from_spec(spec)
spec.loader.exec_module(golden_final)


def flatten_json(data: Dict, parent_key: str = '', sep: str = '.') -> Dict:
    """Flatten nested JSON structure with dot notation keys."""
    items = []
    for k, v in data.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        
        if isinstance(v, dict):
            # Special handling for metrics with 'value' field
            if 'value' in v and isinstance(v['value'], (int, float, str)):
                items.append((new_key + '.value', v['value']))
            else:
                items.extend(flatten_json(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            # Handle lists - just take length or first few items
            if v and isinstance(v[0], dict):
                items.append((new_key + '.count', len(v)))
            else:
                items.append((new_key, str(v[:3]) if len(v) > 3 else str(v)))
        else:
            items.append((new_key, v))
    
    return dict(items)


def process_and_display(landmarks_dir: str = "landmarks", output_format: str = "table"):
    """Process landmarks and display results in various formats."""
    
    print("=" * 80)
    print("GOLDEN RATIO ANALYSIS - COMPLETE RESULTS")
    print("=" * 80)
    
    landmark_path = Path(landmarks_dir)
    landmark_files = list(landmark_path.glob("*.landmark"))
    
    if not landmark_files:
        print(f"No .landmark files found in {landmarks_dir}")
        return
    
    print(f"\nProcessing {len(landmark_files)} files...")
    print("-" * 80)
    
    # Process files
    golden.process_landmarks_directory(landmarks_dir)
    golden_final.process_all_golden_files(landmarks_dir)
    
    # Collect all results
    results = []
    final_files = list(landmark_path.glob("*.golden.final.json"))
    
    for file in sorted(final_files):
        try:
            with open(file, 'r') as f:
                data = json.load(f)
            
            # Extract key fields for tabular display
            name = file.stem.replace('.golden.final', '')
            
            # Flatten the JSON for easy field access
            flat_data = flatten_json(data)
            
            # Add to results
            result = {'name': name}
            result.update(flat_data)
            results.append(result)
            
        except Exception as e:
            print(f"Error processing {file}: {e}")
            continue
    
    if not results:
        print("No results to display")
        return
    
    # Display based on format
    if output_format == "table":
        display_table(results)
    elif output_format == "detailed":
        display_detailed(results)
    elif output_format == "json_paths":
        display_json_paths(results)
    elif output_format == "csv":
        display_csv(results)
    else:
        display_summary(results)


def display_table(results: List[Dict]):
    """Display results in a comprehensive table format."""
    
    # Key metrics to display
    key_metrics = [
        ('name', 'Image', '15s'),
        ('summary.facial_harmony_score', 'Harmony', '8s'),
        ('summary.harmony_level', 'Level', '12s'),
        ('symmetry.overall_score', 'Symmetry', '9s'),
        ('symmetry.level', 'Sym Level', '12s'),
        ('golden_ratio_alignment.overall_harmony', 'Golden Ratio', '25s'),
        ('prominent_features.eyes.eye_spacing', 'Eye Space', '12s'),
        ('prominent_features.nose.width', 'Nose Width', '10s'),
        ('prominent_features.mouth.width', 'Mouth Width', '11s'),
        ('proportions.face_shape.overall_shape', 'Face Shape', '15s'),
        ('proportions.face_shape.jawline', 'Jawline', '15s'),
    ]
    
    # Print header
    print("\n" + "=" * 80)
    print("SUMMARY TABLE")
    print("=" * 80)
    
    # Print column headers
    header = ""
    for path, label, width in key_metrics:
        header += f"{label:{width}} "
    print(header)
    print("-" * len(header))
    
    # Print data rows
    for r in results:
        row = ""
        for path, label, width in key_metrics:
            value = r.get(path, 'N/A')
            if value is None:
                value = 'N/A'
            elif isinstance(value, float):
                value = f"{value:.2f}"
            value = str(value)[:int(width[:-1])-1]  # Truncate to fit
            row += f"{value:{width}} "
        print(row)
    
    # Additional metrics table
    print("\n" + "=" * 80)
    print("DETAILED METRICS")
    print("=" * 80)
    
    detailed_metrics = [
        ('name', 'Image', '15s'),
        ('eyes.canthal_tilt_deg_L.value', 'L Eye Tilt', '11s'),
        ('eyes.canthal_tilt_deg_R.value', 'R Eye Tilt', '11s'),
        ('nose.alar_width_over_inter_eye.value', 'Nose/Eye', '9s'),
        ('structure.face_height_over_width.value', 'H/W Ratio', '10s'),
        ('golden_diagnostics.thirds_evenness.value', 'Thirds', '8s'),
        ('golden_diagnostics.fifths_evenness.value', 'Fifths', '8s'),
    ]
    
    # Print column headers
    header = ""
    for path, label, width in detailed_metrics:
        header += f"{label:{width}} "
    print(header)
    print("-" * len(header))
    
    # Print data rows
    for r in results:
        row = ""
        for path, label, width in detailed_metrics:
            value = r.get(path, 'N/A')
            if isinstance(value, float):
                value = f"{value:.2f}"
            elif value is None:
                value = 'N/A'
            value = str(value)[:int(width[:-1])-1]
            row += f"{value:{width}} "
        print(row)


def display_json_paths(results: List[Dict]):
    """Display all available JSON paths for easy field selection."""
    
    print("\n" + "=" * 80)
    print("AVAILABLE JSON PATHS")
    print("=" * 80)
    
    if results:
        # Get all unique keys from first result
        all_keys = sorted(results[0].keys())
        
        # Group by category
        categories = {}
        for key in all_keys:
            if key == 'name':
                continue
            category = key.split('.')[0]
            if category not in categories:
                categories[category] = []
            categories[category].append(key)
        
        # Display by category
        for category, keys in sorted(categories.items()):
            print(f"\n{category.upper()}:")
            for key in sorted(keys):
                sample_value = results[0].get(key, 'N/A')
                if isinstance(sample_value, float):
                    sample_value = f"{sample_value:.4f}"
                elif isinstance(sample_value, str) and len(sample_value) > 30:
                    sample_value = sample_value[:30] + "..."
                print(f"  {key:<60} = {sample_value}")


def display_csv(results: List[Dict]):
    """Display results in CSV format for easy export."""
    
    print("\n" + "=" * 80)
    print("CSV FORMAT (copy and paste to spreadsheet)")
    print("=" * 80)
    
    # Select important fields for CSV
    csv_fields = [
        'name',
        'summary.facial_harmony_score',
        'summary.harmony_level',
        'symmetry.overall_score',
        'symmetry.level',
        'golden_ratio_alignment.overall_harmony',
        'prominent_features.eyes.eye_spacing',
        'prominent_features.nose.width',
        'prominent_features.mouth.width',
        'proportions.face_shape.overall_shape',
        'eyes.canthal_tilt_deg_L.value',
        'eyes.canthal_tilt_deg_R.value',
        'nose.alar_width_over_inter_eye.value',
        'structure.face_height_over_width.value',
    ]
    
    # Print header
    print(",".join(csv_fields))
    
    # Print data
    for r in results:
        values = []
        for field in csv_fields:
            value = r.get(field, '')
            if isinstance(value, float):
                value = f"{value:.4f}"
            elif value is None:
                value = ''
            # Escape commas in strings
            value = str(value).replace(',', ';')
            values.append(value)
        print(",".join(values))


def display_detailed(results: List[Dict]):
    """Display detailed results for each image."""
    
    print("\n" + "=" * 80)
    print("DETAILED ANALYSIS PER IMAGE")
    print("=" * 80)
    
    for r in results:
        print(f"\n{'=' * 40}")
        print(f"IMAGE: {r['name']}")
        print(f"{'=' * 40}")
        
        # Summary
        print("\nSUMMARY:")
        print(f"  Harmony Score: {r.get('summary.facial_harmony_score', 'N/A')}")
        print(f"  Harmony Level: {r.get('summary.harmony_level', 'N/A')}")
        print(f"  Overall Assessment: {r.get('overall_assessment', 'N/A')}")
        
        # Symmetry
        print("\nSYMMETRY:")
        print(f"  Score: {r.get('symmetry.overall_score', 'N/A')}")
        print(f"  Level: {r.get('symmetry.level', 'N/A')}")
        
        # Golden Ratio
        print("\nGOLDEN RATIO:")
        print(f"  Overall: {r.get('golden_ratio_alignment.overall_harmony', 'N/A')}")
        print(f"  Best Match: {r.get('golden_ratio_alignment.best_alignment.feature', 'N/A')}")
        print(f"  Best Deviation: {r.get('golden_ratio_alignment.best_alignment.deviation', 'N/A')}")
        
        # Face Features
        print("\nFACE FEATURES:")
        print(f"  Eye Spacing: {r.get('prominent_features.eyes.eye_spacing', 'N/A')}")
        print(f"  Nose Width: {r.get('prominent_features.nose.width', 'N/A')}")
        print(f"  Mouth Width: {r.get('prominent_features.mouth.width', 'N/A')}")
        print(f"  Face Shape: {r.get('proportions.face_shape.overall_shape', 'N/A')}")
        print(f"  Jawline: {r.get('proportions.face_shape.jawline', 'N/A')}")


def display_summary(results: List[Dict]):
    """Display a summary of all results."""
    
    print("\n" + "=" * 80)
    print("ANALYSIS SUMMARY")
    print("=" * 80)
    
    print(f"\nTotal images analyzed: {len(results)}")
    
    # Calculate averages and distributions
    harmony_scores = []
    symmetry_scores = []
    
    for r in results:
        # Extract numeric values
        harmony = r.get('summary.facial_harmony_score', '0%')
        if isinstance(harmony, str) and '%' in harmony:
            harmony_scores.append(float(harmony.rstrip('%')))
        
        symmetry = r.get('symmetry.overall_score', '0%')
        if isinstance(symmetry, str) and '%' in symmetry:
            symmetry_scores.append(float(symmetry.rstrip('%')))
    
    if harmony_scores:
        print(f"\nHarmony Scores:")
        print(f"  Average: {sum(harmony_scores)/len(harmony_scores):.1f}%")
        print(f"  Best: {max(harmony_scores):.1f}%")
        print(f"  Lowest: {min(harmony_scores):.1f}%")
    
    if symmetry_scores:
        print(f"\nSymmetry Scores:")
        print(f"  Average: {sum(symmetry_scores)/len(symmetry_scores):.1f}%")
        print(f"  Best: {max(symmetry_scores):.1f}%")
        print(f"  Lowest: {min(symmetry_scores):.1f}%")
    
    # Rank by harmony
    sorted_results = sorted(results, 
                           key=lambda x: x.get('summary.facial_harmony_score', '0%'), 
                           reverse=True)
    
    print(f"\nTop 3 by Harmony Score:")
    for i, r in enumerate(sorted_results[:3], 1):
        print(f"  {i}. {r['name']}: {r.get('summary.facial_harmony_score', 'N/A')}")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Analyze landmarks and display results in various formats"
    )
    parser.add_argument(
        "landmarks_dir",
        nargs="?",
        default="landmarks",
        help="Directory containing .landmark files (default: landmarks)"
    )
    parser.add_argument(
        "--format",
        "-f",
        choices=["table", "detailed", "json_paths", "csv", "summary"],
        default="table",
        help="Output format (default: table)"
    )
    parser.add_argument(
        "--all",
        "-a",
        action="store_true",
        help="Show all formats"
    )
    
    args = parser.parse_args()
    
    if args.all:
        # Show all formats
        for fmt in ["table", "summary", "json_paths", "csv"]:
            process_and_display(args.landmarks_dir, fmt)
    else:
        process_and_display(args.landmarks_dir, args.format)
    
    print("\n" + "=" * 80)
    print("TIP: Use --format json_paths to see all available field paths")
    print("TIP: Use --format csv to get data for spreadsheet import")
    print("=" * 80)


if __name__ == "__main__":
    main()