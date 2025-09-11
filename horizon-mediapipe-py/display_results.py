#!/usr/bin/env python3
"""
Display comprehensive tabular results from golden ratio analysis.
Combines technical metrics from .golden.json with human-friendly .golden.final.json
"""

import json
from pathlib import Path
from typing import Dict, List, Any
import sys


def load_all_results(landmarks_dir: str = "landmarks") -> List[Dict]:
    """Load and combine results from both golden.json and golden.final.json files."""
    
    landmark_path = Path(landmarks_dir)
    results = []
    
    # Find all golden.json files
    golden_files = sorted(landmark_path.glob("*.golden.json"))
    golden_files = [f for f in golden_files if 'summary' not in f.name]
    
    for golden_file in golden_files:
        name = golden_file.stem.replace('.golden', '')
        final_file = golden_file.parent / f"{name}.golden.final.json"
        
        result = {'name': name}
        
        # Load technical metrics from golden.json
        try:
            with open(golden_file, 'r') as f:
                golden_data = json.load(f)
            
            # Extract key technical metrics
            if 'error' not in golden_data:
                # Eyes
                eyes = golden_data.get('eyes', {})
                result['canthal_tilt_L'] = eyes.get('canthal_tilt_deg_L', {}).get('value')
                result['canthal_tilt_R'] = eyes.get('canthal_tilt_deg_R', {}).get('value')
                result['eye_fissure_L'] = eyes.get('fissure_length_L', {}).get('value')
                result['eye_fissure_R'] = eyes.get('fissure_length_R', {}).get('value')
                result['intercanthal_ratio'] = eyes.get('intercanthal_over_eye_width', {}).get('value')
                
                # Nose
                nose = golden_data.get('nose', {})
                result['alar_width_ratio'] = nose.get('alar_width_over_inter_eye', {}).get('value')
                result['nasal_length_ratio'] = nose.get('nasal_length_over_face_height', {}).get('value')
                result['nasal_projection'] = nose.get('tip_projection_3D_over_IPD', {}).get('value')
                
                # Structure
                structure = golden_data.get('structure', {})
                result['face_height_width'] = structure.get('face_height_over_width', {}).get('value')
                result['upper_third'] = structure.get('upper_to_middle_third', {}).get('value')
                result['lower_third'] = structure.get('lower_to_middle_third', {}).get('value')
                result['mandibular_angle'] = structure.get('mandibular_angle_deg', {}).get('value')
                
                # Golden diagnostics
                golden_diag = golden_data.get('golden_diagnostics', {})
                result['thirds_evenness'] = golden_diag.get('thirds_evenness', {}).get('value')
                result['fifths_evenness'] = golden_diag.get('fifths_evenness', {}).get('value')
                
                # Symmetry
                symmetry = golden_data.get('symmetry', {})
                result['symmetry_score_raw'] = symmetry.get('midline_symmetry_score', {}).get('value')
                
        except Exception as e:
            print(f"Error loading {golden_file}: {e}", file=sys.stderr)
        
        # Load human-friendly interpretations from golden.final.json
        try:
            with open(final_file, 'r') as f:
                final_data = json.load(f)
            
            # Extract interpretations
            result['harmony_score'] = final_data.get('summary', {}).get('facial_harmony_score', 'N/A')
            result['harmony_level'] = final_data.get('summary', {}).get('harmony_level', 'N/A')
            result['symmetry_score'] = final_data.get('symmetry', {}).get('overall_score', 'N/A')
            result['symmetry_level'] = final_data.get('symmetry', {}).get('level', 'N/A')
            result['golden_harmony'] = final_data.get('golden_ratio_alignment', {}).get('overall_harmony', 'N/A')
            
            # Features
            eyes_feat = final_data.get('prominent_features', {}).get('eyes', {})
            result['eye_spacing'] = eyes_feat.get('eye_spacing', 'N/A')
            result['eye_tilt_desc_L'] = eyes_feat.get('left_eye_tilt', 'N/A')
            result['eye_tilt_desc_R'] = eyes_feat.get('right_eye_tilt', 'N/A')
            
            nose_feat = final_data.get('prominent_features', {}).get('nose', {})
            result['nose_width_desc'] = nose_feat.get('width', 'N/A')
            result['nose_projection_desc'] = nose_feat.get('projection', 'N/A')
            
            mouth_feat = final_data.get('prominent_features', {}).get('mouth', {})
            result['mouth_width_desc'] = mouth_feat.get('width', 'N/A')
            
            face_shape = final_data.get('proportions', {}).get('face_shape', {})
            result['face_shape'] = face_shape.get('overall_shape', 'N/A')
            result['jawline'] = face_shape.get('jawline', 'N/A')
            
        except Exception as e:
            print(f"Error loading {final_file}: {e}", file=sys.stderr)
        
        results.append(result)
    
    return results


def display_main_table(results: List[Dict]):
    """Display main summary table."""
    
    print("\n" + "=" * 140)
    print("MAIN SUMMARY TABLE")
    print("=" * 140)
    
    # Define columns with width
    columns = [
        ('name', 'Image', 12),
        ('harmony_score', 'Harmony', 8),
        ('harmony_level', 'Level', 10),
        ('symmetry_score', 'Symmetry', 9),
        ('golden_harmony', 'Golden Ratio', 20),
        ('face_shape', 'Face Shape', 15),
        ('eye_spacing', 'Eyes', 12),
        ('nose_width_desc', 'Nose', 8),
        ('mouth_width_desc', 'Mouth', 8),
        ('jawline', 'Jawline', 15),
    ]
    
    # Print header
    header = ""
    for field, label, width in columns:
        header += f"{label:<{width}} "
    print(header)
    print("-" * len(header))
    
    # Print rows
    for r in results:
        row = ""
        for field, label, width in columns:
            value = r.get(field, 'N/A')
            if value is None:
                value = 'N/A'
            elif isinstance(value, float):
                value = f"{value:.2f}"
            value = str(value)[:width]
            row += f"{value:<{width}} "
        print(row)


def display_technical_table(results: List[Dict]):
    """Display technical metrics table."""
    
    print("\n" + "=" * 140)
    print("TECHNICAL METRICS TABLE")
    print("=" * 140)
    
    # Define columns
    columns = [
        ('name', 'Image', 12),
        ('canthal_tilt_L', 'L-Tilt°', 8),
        ('canthal_tilt_R', 'R-Tilt°', 8),
        ('alar_width_ratio', 'Nose/Eye', 9),
        ('face_height_width', 'H/W', 6),
        ('thirds_evenness', 'Thirds', 7),
        ('fifths_evenness', 'Fifths', 7),
        ('mandibular_angle', 'Jaw°', 7),
        ('nasal_projection', 'NoseProj', 9),
        ('symmetry_score_raw', 'SymRaw', 7),
    ]
    
    # Print header
    header = ""
    for field, label, width in columns:
        header += f"{label:<{width}} "
    print(header)
    print("-" * len(header))
    
    # Print rows
    for r in results:
        row = ""
        for field, label, width in columns:
            value = r.get(field, 'N/A')
            if value is None:
                value = 'N/A'
            elif isinstance(value, float):
                if 'tilt' in field or 'angle' in field:
                    value = f"{value:.1f}"
                else:
                    value = f"{value:.3f}"
            value = str(value)[:width]
            row += f"{value:<{width}} "
        print(row)


def display_proportions_table(results: List[Dict]):
    """Display facial proportions table."""
    
    print("\n" + "=" * 140)
    print("FACIAL PROPORTIONS TABLE")
    print("=" * 140)
    
    columns = [
        ('name', 'Image', 12),
        ('upper_third', 'Upper/Mid', 10),
        ('lower_third', 'Lower/Mid', 10),
        ('thirds_evenness', 'Thirds Even', 11),
        ('fifths_evenness', 'Fifths Even', 11),
        ('face_height_width', 'Height/Width', 12),
        ('intercanthal_ratio', 'Eye Spacing', 11),
        ('nasal_length_ratio', 'Nose Length', 11),
    ]
    
    # Print header
    header = ""
    for field, label, width in columns:
        header += f"{label:<{width}} "
    print(header)
    print("-" * len(header))
    
    # Print rows
    for r in results:
        row = ""
        for field, label, width in columns:
            value = r.get(field, 'N/A')
            if value is None:
                value = 'N/A'
            elif isinstance(value, float):
                value = f"{value:.3f}"
            value = str(value)[:width]
            row += f"{value:<{width}} "
        print(row)


def display_csv_export(results: List[Dict]):
    """Display CSV format for easy export."""
    
    print("\n" + "=" * 140)
    print("CSV EXPORT (copy to spreadsheet)")
    print("=" * 140)
    
    # Define all fields to export
    fields = [
        'name', 'harmony_score', 'harmony_level', 'symmetry_score', 'symmetry_level',
        'golden_harmony', 'face_shape', 'jawline', 'eye_spacing', 'nose_width_desc',
        'mouth_width_desc', 'canthal_tilt_L', 'canthal_tilt_R', 'alar_width_ratio',
        'face_height_width', 'thirds_evenness', 'fifths_evenness', 'mandibular_angle',
        'upper_third', 'lower_third', 'nasal_projection', 'intercanthal_ratio'
    ]
    
    # Print header
    print(",".join(fields))
    
    # Print data
    for r in results:
        values = []
        for field in fields:
            value = r.get(field, '')
            if value is None:
                value = ''
            elif isinstance(value, float):
                value = f"{value:.4f}"
            # Escape commas
            value = str(value).replace(',', ';')
            values.append(value)
        print(",".join(values))


def display_ranking(results: List[Dict]):
    """Display ranking by different metrics."""
    
    print("\n" + "=" * 140)
    print("RANKINGS")
    print("=" * 140)
    
    # Sort by harmony score
    def get_score(r, field):
        val = r.get(field, '0%')
        if isinstance(val, str) and '%' in val:
            return float(val.rstrip('%'))
        return 0
    
    # Harmony ranking
    harmony_sorted = sorted(results, key=lambda x: get_score(x, 'harmony_score'), reverse=True)
    print("\nTop 5 by Harmony Score:")
    for i, r in enumerate(harmony_sorted[:5], 1):
        print(f"  {i}. {r['name']:<15} {r.get('harmony_score', 'N/A'):<8} ({r.get('harmony_level', 'N/A')})")
    
    # Symmetry ranking
    symmetry_sorted = sorted(results, key=lambda x: get_score(x, 'symmetry_score'), reverse=True)
    print("\nTop 5 by Symmetry Score:")
    for i, r in enumerate(symmetry_sorted[:5], 1):
        print(f"  {i}. {r['name']:<15} {r.get('symmetry_score', 'N/A'):<8} ({r.get('symmetry_level', 'N/A')})")
    
    # Statistics
    print("\n" + "-" * 40)
    print("STATISTICS:")
    
    harmony_scores = [get_score(r, 'harmony_score') for r in results if r.get('harmony_score') != 'N/A']
    symmetry_scores = [get_score(r, 'symmetry_score') for r in results if r.get('symmetry_score') != 'N/A']
    
    if harmony_scores:
        print(f"  Harmony - Avg: {sum(harmony_scores)/len(harmony_scores):.1f}%, "
              f"Max: {max(harmony_scores):.1f}%, Min: {min(harmony_scores):.1f}%")
    
    if symmetry_scores:
        print(f"  Symmetry - Avg: {sum(symmetry_scores)/len(symmetry_scores):.1f}%, "
              f"Max: {max(symmetry_scores):.1f}%, Min: {min(symmetry_scores):.1f}%")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Display comprehensive golden ratio analysis results"
    )
    parser.add_argument(
        "landmarks_dir",
        nargs="?",
        default="landmarks",
        help="Directory containing analysis files (default: landmarks)"
    )
    parser.add_argument(
        "--format",
        "-f",
        choices=["all", "main", "technical", "proportions", "csv", "ranking"],
        default="all",
        help="Display format (default: all)"
    )
    
    args = parser.parse_args()
    
    # Load all results
    results = load_all_results(args.landmarks_dir)
    
    if not results:
        print("No results found!")
        return
    
    print(f"Loaded {len(results)} analysis results from {args.landmarks_dir}/")
    
    # Display based on format
    if args.format == "all":
        display_main_table(results)
        display_technical_table(results)
        display_proportions_table(results)
        display_ranking(results)
        print("\n" + "=" * 140)
        print("TIP: Use --format csv to get data for spreadsheet import")
        print("=" * 140)
    elif args.format == "main":
        display_main_table(results)
    elif args.format == "technical":
        display_technical_table(results)
    elif args.format == "proportions":
        display_proportions_table(results)
    elif args.format == "csv":
        display_csv_export(results)
    elif args.format == "ranking":
        display_ranking(results)


if __name__ == "__main__":
    main()