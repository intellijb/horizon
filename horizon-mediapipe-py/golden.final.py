#!/usr/bin/env python3
"""
Golden Ratio Analysis Interpreter
Transforms technical golden.json metrics into human-friendly insights.
"""

import json
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any


PHI = 1.61803398875  # Golden ratio constant


def interpret_value(value: float, ranges: List[Tuple[float, float, str]]) -> str:
    """Map a value to a descriptive interpretation based on ranges."""
    for min_val, max_val, description in ranges:
        if min_val <= value <= max_val:
            return description
    return "unusual"


def percentage_to_description(value: float) -> str:
    """Convert percentage (0-1) to descriptive text."""
    if value >= 0.95:
        return "nearly perfect"
    elif value >= 0.85:
        return "excellent"
    elif value >= 0.75:
        return "very good"
    elif value >= 0.65:
        return "good"
    elif value >= 0.55:
        return "moderate"
    elif value >= 0.45:
        return "fair"
    else:
        return "needs improvement"


def deviation_to_harmony(deviation: float) -> str:
    """Convert deviation from golden ratio to harmony description."""
    if deviation <= 0.05:
        return "perfect golden ratio alignment"
    elif deviation <= 0.15:
        return "excellent harmony"
    elif deviation <= 0.25:
        return "good harmony"
    elif deviation <= 0.40:
        return "moderate harmony"
    elif deviation <= 0.60:
        return "some deviation from ideal"
    else:
        return "significant variation from golden ratio"


def angle_to_description(angle: float, feature: str) -> str:
    """Convert angle measurements to descriptions based on feature type."""
    if feature == "canthal_tilt":
        if -5 <= angle <= 5:
            return "neutral"
        elif 5 < angle <= 10:
            return "slightly upward"
        elif angle > 10:
            return "upward slanting"
        elif -10 <= angle < -5:
            return "slightly downward"
        else:
            return "downward slanting"
    elif feature == "nasolabial":
        if 90 <= angle <= 100:
            return "acute"
        elif 100 < angle <= 110:
            return "ideal"
        elif 110 < angle <= 120:
            return "slightly obtuse"
        else:
            return "obtuse"
    elif feature == "mandibular":
        if angle < 100:
            return "sharp jawline"
        elif 100 <= angle <= 120:
            return "defined jawline"
        elif 120 < angle <= 140:
            return "soft jawline"
        else:
            return "round jawline"
    return f"{angle:.0f} degrees"


class GoldenInterpreter:
    def __init__(self, golden_data: Dict):
        self.data = golden_data
        self.insights = {
            "summary": {},
            "facial_harmony": {},
            "prominent_features": {},
            "proportions": {},
            "symmetry": {},
            "golden_ratio_alignment": {},
            "distinctive_characteristics": [],
            "overall_assessment": ""
        }
    
    def interpret(self) -> Dict:
        """Generate human-friendly interpretation of golden ratio analysis."""
        self._analyze_facial_harmony()
        self._analyze_eyes()
        self._analyze_nose()
        self._analyze_mouth()
        self._analyze_face_shape()
        self._analyze_symmetry()
        self._analyze_golden_ratios()
        self._generate_overall_assessment()
        
        return self.insights
    
    def _safe_get(self, *keys, default=None):
        """Safely navigate nested dictionaries."""
        current = self.data
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        return current
    
    def _analyze_facial_harmony(self):
        """Analyze overall facial harmony metrics."""
        harmony_scores = []
        
        # Thirds evenness
        thirds = self._safe_get('golden_diagnostics', 'thirds_evenness', 'value')
        if thirds is not None:
            harmony_scores.append(thirds)
            self.insights['facial_harmony']['vertical_balance'] = {
                'score': f"{thirds:.0%}",
                'interpretation': percentage_to_description(thirds),
                'meaning': "How evenly the face divides into upper, middle, and lower thirds"
            }
        
        # Fifths evenness
        fifths = self._safe_get('golden_diagnostics', 'fifths_evenness', 'value')
        if fifths is not None:
            harmony_scores.append(fifths)
            self.insights['facial_harmony']['horizontal_balance'] = {
                'score': f"{fifths:.0%}",
                'interpretation': percentage_to_description(fifths),
                'meaning': "How evenly the face divides into five equal vertical sections"
            }
        
        # Calculate overall harmony
        if harmony_scores:
            avg_harmony = sum(harmony_scores) / len(harmony_scores)
            self.insights['summary']['facial_harmony_score'] = f"{avg_harmony:.0%}"
            self.insights['summary']['harmony_level'] = percentage_to_description(avg_harmony)
    
    def _analyze_eyes(self):
        """Analyze eye-related features."""
        eyes = self._safe_get('eyes', default={})
        if not eyes:
            return
        
        eye_features = {}
        
        # Eye shape and tilt
        for side in ['L', 'R']:
            side_name = 'left' if side == 'L' else 'right'
            
            tilt = self._safe_get('eyes', f'canthal_tilt_deg_{side}', 'value')
            if tilt is not None:
                eye_features[f'{side_name}_eye_tilt'] = angle_to_description(tilt, 'canthal_tilt')
            
            fissure = self._safe_get('eyes', f'fissure_length_{side}', 'value')
            if fissure is not None:
                if fissure > 0.6:
                    eye_features[f'{side_name}_eye_size'] = "large"
                elif fissure > 0.4:
                    eye_features[f'{side_name}_eye_size'] = "medium"
                else:
                    eye_features[f'{side_name}_eye_size'] = "petite"
        
        # Intercanthal ratio
        intercanthal = self._safe_get('eyes', 'intercanthal_over_eye_width', 'value')
        if intercanthal is None:
            # Fallback to old name
            intercanthal = self._safe_get('eyes', 'intercanthal_over_IPD', 'value')
        if intercanthal is not None:
            if 0.28 <= intercanthal <= 0.35:  # Adjusted for eye width ratio
                eye_features['eye_spacing'] = "ideally spaced"
            elif intercanthal < 0.28:
                eye_features['eye_spacing'] = "close-set"
            else:
                eye_features['eye_spacing'] = "wide-set"
        
        # Brow characteristics
        for side in ['L', 'R']:
            side_name = 'left' if side == 'L' else 'right'
            
            brow_height = self._safe_get('eyes', f'brow_height_{side}', 'value')
            if brow_height is not None:
                if brow_height > 0.6:
                    eye_features[f'{side_name}_brow_position'] = "high"
                elif brow_height > 0.4:
                    eye_features[f'{side_name}_brow_position'] = "medium"
                else:
                    eye_features[f'{side_name}_brow_position'] = "low"
            
            brow_slope = self._safe_get('eyes', f'brow_slope_{side}', 'value')
            if brow_slope is not None:
                if abs(brow_slope) < 0.1:
                    eye_features[f'{side_name}_brow_shape'] = "straight"
                elif brow_slope > 0:
                    eye_features[f'{side_name}_brow_shape'] = "arched"
                else:
                    eye_features[f'{side_name}_brow_shape'] = "angled"
        
        if eye_features:
            self.insights['prominent_features']['eyes'] = eye_features
    
    def _analyze_nose(self):
        """Analyze nose characteristics."""
        nose = self._safe_get('nose', default={})
        if not nose:
            return
        
        nose_features = {}
        
        # Nasal width
        alar_width = self._safe_get('nose', 'alar_width_over_inter_eye', 'value')
        if alar_width is None:
            # Fallback to old name
            alar_width = self._safe_get('nose', 'alar_width_over_IPD', 'value')
        if alar_width is not None:
            if alar_width < 1.3:
                nose_features['width'] = "narrow"
            elif alar_width < 1.5:
                nose_features['width'] = "medium"
            else:
                nose_features['width'] = "wide"
        
        # Nasal length
        nasal_length = self._safe_get('nose', 'nasal_length_over_face_height', 'value')
        if nasal_length is not None:
            if nasal_length < 0.43:
                nose_features['length'] = "short"
            elif nasal_length < 0.47:
                nose_features['length'] = "proportionate"
            else:
                nose_features['length'] = "long"
        
        # Tip projection
        tip_projection = self._safe_get('nose', 'tip_projection_3D_over_IPD', 'value')
        if tip_projection is not None:
            if tip_projection < 0.25:
                nose_features['projection'] = "low profile"
            elif tip_projection < 0.35:
                nose_features['projection'] = "moderate projection"
            else:
                nose_features['projection'] = "prominent"
        
        # Nasolabial angle
        nasolabial = self._safe_get('nose', 'nasal_tip_to_upper_lip_angle_deg', 'value')
        if nasolabial is not None:
            nose_features['tip_angle'] = angle_to_description(nasolabial, 'nasolabial')
        
        if nose_features:
            self.insights['prominent_features']['nose'] = nose_features
    
    def _analyze_mouth(self):
        """Analyze mouth and lip characteristics."""
        mouth = self._safe_get('mouth', default={})
        if not mouth:
            return
        
        mouth_features = {}
        
        # Mouth width
        mouth_width = self._safe_get('mouth', 'mouth_width_over_IPD', 'value')
        if mouth_width is not None:
            if mouth_width < 1.4:
                mouth_features['width'] = "small"
            elif mouth_width < 1.6:
                mouth_features['width'] = "medium"
            else:
                mouth_features['width'] = "full"
        
        # Lip ratio
        lip_ratio = self._safe_get('mouth', 'upper_to_lower_lip_ratio', 'value')
        if lip_ratio is not None:
            if 0.9 <= lip_ratio <= 1.1:
                mouth_features['lip_balance'] = "balanced"
            elif lip_ratio < 0.9:
                mouth_features['lip_balance'] = "fuller lower lip"
            else:
                mouth_features['lip_balance'] = "fuller upper lip"
        
        # Smile arc
        smile_arc = self._safe_get('mouth', 'smile_arc_curvature', 'value')
        if smile_arc is not None:
            if smile_arc < 50:
                mouth_features['smile_type'] = "subtle"
            elif smile_arc < 150:
                mouth_features['smile_type'] = "gentle curve"
            else:
                mouth_features['smile_type'] = "pronounced curve"
        
        # Cupid's bow
        cupid_bow = self._safe_get('mouth', 'cupid_bow_depth', 'value')
        if cupid_bow is not None:
            if cupid_bow < 0.2:
                mouth_features['cupids_bow'] = "subtle"
            elif cupid_bow < 0.4:
                mouth_features['cupids_bow'] = "defined"
            else:
                mouth_features['cupids_bow'] = "pronounced"
        
        if mouth_features:
            self.insights['prominent_features']['mouth'] = mouth_features
    
    def _analyze_face_shape(self):
        """Analyze overall face shape and structure."""
        structure = self._safe_get('structure', default={})
        if not structure:
            return
        
        face_shape = {}
        
        # Face height to width ratio
        ratio = self._safe_get('structure', 'face_height_over_width', 'value')
        if ratio is not None:
            if ratio < 1.3:
                face_shape['overall_shape'] = "round or square"
            elif ratio < 1.5:
                face_shape['overall_shape'] = "oval"
            elif ratio < 1.7:
                face_shape['overall_shape'] = "oblong"
            else:
                face_shape['overall_shape'] = "long"
        
        # Jawline
        mandibular = self._safe_get('structure', 'mandibular_angle_deg', 'value')
        if mandibular is not None:
            face_shape['jawline'] = angle_to_description(mandibular, 'mandibular')
        
        # Chin prominence
        chin = self._safe_get('structure', 'chin_prominence_3D', 'value')
        if chin is not None:
            if chin < 0.2:
                face_shape['chin'] = "recessed"
            elif chin < 0.35:
                face_shape['chin'] = "balanced"
            else:
                face_shape['chin'] = "prominent"
        
        # Facial thirds analysis
        upper_third = self._safe_get('structure', 'upper_to_middle_third', 'value')
        lower_third = self._safe_get('structure', 'lower_to_middle_third', 'value')
        
        if upper_third is not None and lower_third is not None:
            # Ideal is close to 1.0 for both
            if 0.9 <= upper_third <= 1.1 and 0.9 <= lower_third <= 1.1:
                face_shape['vertical_proportions'] = "ideally balanced thirds"
            elif upper_third < 0.9:
                face_shape['vertical_proportions'] = "shorter forehead"
            elif lower_third > 1.1:
                face_shape['vertical_proportions'] = "longer lower face"
            else:
                face_shape['vertical_proportions'] = "unique proportions"
        
        if face_shape:
            self.insights['proportions']['face_shape'] = face_shape
    
    def _analyze_symmetry(self):
        """Analyze facial symmetry."""
        symmetry = self._safe_get('symmetry', default={})
        if not symmetry:
            return
        
        symmetry_analysis = {}
        
        # Overall symmetry score
        symmetry_score = self._safe_get('symmetry', 'midline_symmetry_score', 'value')
        if symmetry_score is not None:
            # Convert to positive percentage
            if symmetry_score < 0:
                symmetry_score = 0
            elif symmetry_score > 1:
                symmetry_score = 1
            
            symmetry_analysis['overall_score'] = f"{symmetry_score:.0%}"
            symmetry_analysis['level'] = percentage_to_description(symmetry_score)
        
        # Bilateral feature analysis
        deltas = self._safe_get('symmetry', 'bilateral_feature_deltas', default={})
        if deltas:
            asymmetries = []
            for feature, delta in deltas.items():
                if delta > 0.5:  # Significant asymmetry threshold
                    feature_name = feature.replace('_vs_', ' vs ').replace('_', ' ')
                    asymmetries.append(feature_name)
            
            if asymmetries:
                symmetry_analysis['notable_asymmetries'] = asymmetries[:3]  # Top 3
            else:
                symmetry_analysis['notable_asymmetries'] = ["highly symmetric features"]
        
        if symmetry_analysis:
            self.insights['symmetry'] = symmetry_analysis
    
    def _analyze_golden_ratios(self):
        """Analyze golden ratio alignments."""
        phi_deviations = self._safe_get('golden_diagnostics', 'phi_deviations', default={})
        if not phi_deviations:
            return
        
        golden_analysis = {}
        alignments = []
        
        for ratio_name, data in phi_deviations.items():
            if isinstance(data, dict) and 'value' in data:
                deviation = data['value']
                
                # Clean up ratio name
                clean_name = ratio_name.replace('_phi_deviation', '').replace('_', ' ')
                
                harmony = deviation_to_harmony(deviation)
                alignments.append({
                    'feature': clean_name,
                    'alignment': harmony,
                    'deviation': f"{deviation:.0%}"
                })
        
        # Sort by best alignment
        alignments.sort(key=lambda x: float(x['deviation'].rstrip('%')))
        
        if alignments:
            golden_analysis['best_alignment'] = alignments[0]
            golden_analysis['all_alignments'] = alignments
            
            # Calculate overall golden ratio score
            avg_deviation = sum(float(a['deviation'].rstrip('%'))/100 for a in alignments) / len(alignments)
            golden_analysis['overall_harmony'] = deviation_to_harmony(avg_deviation)
        
        self.insights['golden_ratio_alignment'] = golden_analysis
    
    def _generate_overall_assessment(self):
        """Generate comprehensive assessment."""
        assessments = []
        distinctive = []
        
        # Collect notable features
        harmony = self.insights.get('summary', {}).get('harmony_level')
        if harmony:
            assessments.append(f"Facial harmony: {harmony}")
        
        # Face shape
        shape = self._safe_get('proportions', 'face_shape', 'overall_shape')
        if shape:
            distinctive.append(f"{shape} face shape")
        
        # Eye characteristics
        eye_spacing = self._safe_get('prominent_features', 'eyes', 'eye_spacing')
        if eye_spacing:
            distinctive.append(f"{eye_spacing} eyes")
        
        # Jawline
        jawline = self._safe_get('proportions', 'face_shape', 'jawline')
        if jawline:
            distinctive.append(jawline)
        
        # Golden ratio
        golden_harmony = self._safe_get('golden_ratio_alignment', 'overall_harmony')
        if golden_harmony:
            assessments.append(f"Golden ratio: {golden_harmony}")
        
        # Symmetry
        symmetry_level = self._safe_get('symmetry', 'level')
        if symmetry_level:
            assessments.append(f"Symmetry: {symmetry_level}")
        
        # Build overall assessment
        if assessments:
            self.insights['overall_assessment'] = ". ".join(assessments)
        
        if distinctive:
            self.insights['distinctive_characteristics'] = distinctive
        
        # Add interpretation guide
        self.insights['interpretation_note'] = (
            "This analysis examines facial proportions based on classical aesthetic principles "
            "including the golden ratio. All faces are unique and beautiful in their own way. "
            "These measurements are purely geometric observations, not judgments of attractiveness."
        )


def process_golden_file(filepath: str) -> Dict:
    """Process a single .golden.json file and create human-friendly interpretation."""
    try:
        with open(filepath, 'r') as f:
            golden_data = json.load(f)
        
        # Skip failed analyses
        if 'error' in golden_data:
            return {
                'source_file': filepath,
                'status': 'skipped',
                'reason': golden_data.get('error', 'Unknown error')
            }
        
        # Interpret the golden ratio analysis
        interpreter = GoldenInterpreter(golden_data)
        insights = interpreter.interpret()
        
        # Add metadata
        insights['metadata'] = {
            'source_golden_file': filepath,
            'original_landmark_file': golden_data.get('source_file', 'unknown'),
            'analysis_version': '1.0'
        }
        
        return insights
        
    except Exception as e:
        return {
            'source_file': filepath,
            'status': 'failed',
            'error': str(e)
        }


def process_all_golden_files(directory: str = 'landmarks') -> None:
    """Process all .golden.json files in directory."""
    landmark_dir = Path(directory)
    
    if not landmark_dir.exists():
        print(f"Directory {directory} does not exist")
        return
    
    golden_files = list(landmark_dir.glob('*.golden.json'))
    
    # Exclude summary file
    golden_files = [f for f in golden_files if 'summary' not in f.name]
    
    if not golden_files:
        print(f"No .golden.json files found in {directory}")
        return
    
    print(f"Found {len(golden_files)} golden analysis files")
    print("Generating human-friendly interpretations...")
    
    results = []
    for filepath in golden_files:
        print(f"  Processing {filepath.name}...")
        result = process_golden_file(str(filepath))
        
        # Save individual interpretation
        output_path = filepath.with_suffix('.final.json')
        output_path = Path(str(output_path).replace('.golden.final.json', '.golden.final.json'))
        
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        results.append(result)
        
        if 'error' not in result and result.get('status') != 'failed':
            print(f"    ✓ Created {output_path.name}")
        else:
            print(f"    ✗ Skipped: {result.get('reason', result.get('error', 'Unknown'))}")
    
    # Create summary of all interpretations
    summary = {
        'total_analyzed': len(results),
        'successful': sum(1 for r in results if 'error' not in r and r.get('status') != 'failed'),
        'interpretation_summaries': []
    }
    
    for result in results:
        if 'error' not in result and result.get('status') != 'failed':
            summary['interpretation_summaries'].append({
                'file': result.get('metadata', {}).get('original_landmark_file', 'unknown'),
                'overall_assessment': result.get('overall_assessment', 'No assessment'),
                'harmony_score': result.get('summary', {}).get('facial_harmony_score', 'N/A'),
                'distinctive_features': result.get('distinctive_characteristics', [])
            })
    
    # Save summary
    summary_path = landmark_dir / 'golden_interpretations_summary.json'
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nSummary saved to {summary_path}")
    print(f"Successfully interpreted {summary['successful']}/{len(results)} files")


def main():
    """Main entry point for processing golden ratio interpretations."""
    import sys
    
    # Check if being run after golden.py
    if len(sys.argv) > 1:
        directory = sys.argv[1]
    else:
        directory = 'landmarks'
    
    process_all_golden_files(directory)


if __name__ == '__main__':
    main()