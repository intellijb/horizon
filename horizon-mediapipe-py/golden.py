#!/usr/bin/env python3
"""
MediaPipe Face Mesh Landmark Analysis with Golden Ratio Diagnostics
Pure computation using stdlib + numpy for scale-invariant facial geometry extraction.
"""

import json
import math
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import numpy as np


PHI = 1.61803398875  # Golden ratio constant

# Fallback indices for MediaPipe Face Mesh
FALLBACK_INDICES = {
    'chin_tip': 152,
    'nose_tip': 4,
    'subnasale': 2,
    'L_eye_outer': 33,
    'L_eye_inner': 133,
    'R_eye_inner': 362,
    'R_eye_outer': 263,
    'L_brow_inner': 70,
    'R_brow_inner': 336,
    'L_brow_outer': 105,
    'R_brow_outer': 334,
    'alare_L': 234,
    'alare_R': 454,
    'labiale_superius': 13,
    'labiale_inferius': 14,
    'stomion': 0,
    'cheilion_L': 61,
    'cheilion_R': 291,
    'L_pupil': 468,  # Approximate center
    'R_pupil': 473,  # Approximate center
    'gonion_L': 172,
    'gonion_R': 397,
    'menton': 175,
    'trichion': 10,  # Approximate hairline
    'nasion': 6,
    'L_ear_top': 93,
    'R_ear_top': 323,
    'L_cheek': 205,
    'R_cheek': 425
}


def dist(p1: np.ndarray, p2: np.ndarray, mode: str = '2D') -> float:
    """Calculate Euclidean distance between two points."""
    if mode == '2D':
        return np.linalg.norm(p1[:2] - p2[:2])
    return np.linalg.norm(p1 - p2)


def safe_ratio(num: float, denom: float, eps: float = 1e-8) -> Optional[float]:
    """Safe division with epsilon threshold."""
    if abs(denom) < eps:
        return None
    return num / denom


def angle_deg(p1: np.ndarray, vertex: np.ndarray, p2: np.ndarray) -> float:
    """Calculate angle in degrees at vertex between p1-vertex-p2."""
    v1 = p1 - vertex
    v2 = p2 - vertex
    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    return np.degrees(np.arccos(cos_angle))


def polyfit_curvature(points: np.ndarray, degree: int = 2) -> float:
    """Estimate curvature using polynomial fit."""
    if len(points) < degree + 1:
        return 0.0
    try:
        x = points[:, 0]
        y = points[:, 1]
        coeffs = np.polyfit(x, y, degree)
        # Second derivative at midpoint for curvature proxy
        if degree >= 2:
            return abs(2 * coeffs[0])
        return 0.0
    except:
        return 0.0


def create_metric(value: Any, method: str, source_points: List[str], 
                 valid: bool = True, confidence: float = 1.0) -> Dict:
    """Create standardized metric dictionary."""
    return {
        'value': value,
        'method': method,
        'source_points': source_points,
        'valid': valid,
        'confidence': confidence
    }


class FaceAnalyzer:
    def __init__(self, landmarks: List[Dict], blendshapes: Optional[List[Dict]] = None,
                 index_map: Optional[Dict[str, int]] = None):
        self.landmarks = landmarks
        self.blendshapes = blendshapes or []
        self.index_map = index_map or FALLBACK_INDICES
        self.fallback_indices_used = index_map is None
        self.visibility_threshold = 0.3
        self.eps = 1e-8
        
        # Convert landmarks to numpy array
        self.points = np.array([[lm['x'], lm['y'], lm['z']] for lm in landmarks])
        # MediaPipe often has visibility as 0.0 but presence as high value
        # Use presence if visibility is all zeros
        visibility_values = np.array([lm.get('visibility', 1.0) for lm in landmarks])
        if (visibility_values == 0.0).all():
            # Use presence values instead
            self.visibility = np.array([lm.get('presence', 1.0) for lm in landmarks])
        else:
            self.visibility = visibility_values
        
        # Apply roll correction
        self._apply_roll_correction()
        
        # Establish scale basis
        self.scale_basis = self._compute_scale_basis()
        
    def _apply_roll_correction(self):
        """Align face horizontally using eye line."""
        try:
            left_eye = self.points[self.index_map.get('L_eye_outer', 33)]
            right_eye = self.points[self.index_map.get('R_eye_outer', 263)]
            
            # Calculate roll angle
            dx = right_eye[0] - left_eye[0]
            dy = right_eye[1] - left_eye[1]
            roll_angle = np.arctan2(dy, dx)
            
            # Rotation matrix for roll correction
            cos_r = np.cos(-roll_angle)
            sin_r = np.sin(-roll_angle)
            rot_matrix = np.array([
                [cos_r, -sin_r, 0],
                [sin_r, cos_r, 0],
                [0, 0, 1]
            ])
            
            # Apply rotation
            self.points = np.dot(self.points, rot_matrix.T)
        except:
            pass  # Keep original if correction fails
    
    def _compute_scale_basis(self) -> float:
        """Compute normalization scale (IPD preferred, face width fallback)."""
        try:
            # Try interpupillary distance (outer eye corners for better stability)
            left_outer = self.points[self.index_map.get('L_eye_outer', 33)]
            right_outer = self.points[self.index_map.get('R_eye_outer', 263)]
            eye_width = dist(left_outer, right_outer, '2D')
            if eye_width > self.eps:
                # This is typically around 0.09-0.12 in normalized coords
                # Use as reference for face width normalization
                return eye_width
        except:
            pass
        
        # Fallback to face width
        try:
            left_cheek = self.points[self.index_map.get('L_cheek', 205)]
            right_cheek = self.points[self.index_map.get('R_cheek', 425)]
            face_width = dist(left_cheek, right_cheek, '2D')
            if face_width > self.eps:
                return face_width
        except:
            pass
        
        return 1.0  # Default if all fails
    
    def _get_point(self, name: str) -> Optional[np.ndarray]:
        """Get point by name with visibility check."""
        try:
            idx = self.index_map.get(name)
            if idx is None:
                return None
            if idx >= len(self.points):
                return None
            # Skip visibility check if all visibility values are 0
            if not (self.visibility == 0.0).all():
                if self.visibility[idx] < self.visibility_threshold:
                    return None
            return self.points[idx]
        except:
            return None
    
    def _compute_glabella(self) -> Optional[np.ndarray]:
        """Compute glabella as midpoint between inner brows."""
        left_brow = self._get_point('L_brow_inner')
        right_brow = self._get_point('R_brow_inner')
        if left_brow is not None and right_brow is not None:
            return (left_brow + right_brow) / 2
        return None
    
    def analyze_eyes(self) -> Dict:
        """Analyze eye-related metrics."""
        eyes = {}
        
        # Eye measurements
        for side, prefix in [('L', 'left'), ('R', 'right')]:
            outer = self._get_point(f'{side}_eye_outer')
            inner = self._get_point(f'{side}_eye_inner')
            
            if outer is not None and inner is not None:
                fissure_length = dist(outer, inner, '2D') / self.scale_basis
                eyes[f'fissure_length_{side}'] = create_metric(
                    fissure_length, '2D', [f'{side}_eye_outer', f'{side}_eye_inner']
                )
                
                # Canthal tilt (positive = upward slant)
                dy = outer[1] - inner[1]
                dx = abs(outer[0] - inner[0])  # Use absolute to avoid sign issues
                if side == 'L':
                    # Left eye: outer is to the left of inner
                    tilt_deg = np.degrees(np.arctan2(dy, dx))
                else:
                    # Right eye: outer is to the right of inner  
                    tilt_deg = np.degrees(np.arctan2(dy, dx))
                eyes[f'canthal_tilt_deg_{side}'] = create_metric(
                    tilt_deg, '2D', [f'{side}_eye_outer', f'{side}_eye_inner']
                )
        
        # Intercanthal distance over eye width
        left_inner = self._get_point('L_eye_inner')
        right_inner = self._get_point('R_eye_inner')
        left_outer = self._get_point('L_eye_outer')
        right_outer = self._get_point('R_eye_outer')
        if all(p is not None for p in [left_inner, right_inner, left_outer, right_outer]):
            intercanthal = dist(left_inner, right_inner, '2D')
            eye_width_total = dist(left_outer, right_outer, '2D')
            ipd_ratio = safe_ratio(intercanthal, eye_width_total)
            if ipd_ratio is not None:
                eyes['intercanthal_over_eye_width'] = create_metric(
                    ipd_ratio, '2D', ['L_eye_inner', 'R_eye_inner', 'L_eye_outer', 'R_eye_outer']
                )
        
        # Brow metrics
        for side in ['L', 'R']:
            brow_inner = self._get_point(f'{side}_brow_inner')
            brow_outer = self._get_point(f'{side}_brow_outer')
            eye_center = self._get_point(f'{side}_eye_inner')
            
            if brow_inner is not None and brow_outer is not None and eye_center is not None:
                # Brow height
                brow_height = abs(brow_inner[1] - eye_center[1]) / self.scale_basis
                eyes[f'brow_height_{side}'] = create_metric(
                    brow_height, '2D', [f'{side}_brow_inner', f'{side}_eye_inner']
                )
                
                # Brow slope
                slope = (brow_outer[1] - brow_inner[1]) / (abs(brow_outer[0] - brow_inner[0]) + self.eps)
                eyes[f'brow_slope_{side}'] = create_metric(
                    slope, '2D', [f'{side}_brow_inner', f'{side}_brow_outer']
                )
        
        return eyes
    
    def analyze_nose(self) -> Dict:
        """Analyze nose-related metrics."""
        nose = {}
        
        nose_tip = self._get_point('nose_tip')
        subnasale = self._get_point('subnasale')
        nasion = self._get_point('nasion')
        alare_l = self._get_point('alare_L')
        alare_r = self._get_point('alare_R')
        
        # Alar width ratios (compared to inter-eye distance)
        if alare_l is not None and alare_r is not None:
            alar_width = dist(alare_l, alare_r, '2D')
            # Use eye width as reference for more realistic ratio
            left_eye_inner = self._get_point('L_eye_inner')
            right_eye_inner = self._get_point('R_eye_inner')
            if left_eye_inner is not None and right_eye_inner is not None:
                inter_eye = dist(left_eye_inner, right_eye_inner, '2D')
                nose['alar_width_over_inter_eye'] = create_metric(
                    safe_ratio(alar_width, inter_eye), '2D', ['alare_L', 'alare_R', 'L_eye_inner', 'R_eye_inner']
                )
            else:
                nose['alar_width_normalized'] = create_metric(
                    alar_width / self.scale_basis, '2D', ['alare_L', 'alare_R']
                )
        
        # Nasal length
        if nasion is not None and subnasale is not None:
            nasal_length = dist(nasion, subnasale, '2D')
            chin_tip = self._get_point('chin_tip')
            if chin_tip is not None:
                face_height = dist(nasion, chin_tip, '2D')
                ratio = safe_ratio(nasal_length, face_height)
                if ratio is not None:
                    nose['nasal_length_over_face_height'] = create_metric(
                        ratio, '2D', ['nasion', 'subnasale', 'chin_tip']
                    )
        
        # Tip projection (3D)
        if nose_tip is not None and subnasale is not None:
            projection = abs(nose_tip[2] - subnasale[2])
            nose['tip_projection_3D_over_IPD'] = create_metric(
                projection / self.scale_basis, '3D', ['nose_tip', 'subnasale']
            )
        
        # Nasolabial angle
        if nose_tip is not None and subnasale is not None:
            upper_lip = self._get_point('labiale_superius')
            if upper_lip is not None:
                angle = angle_deg(nose_tip, subnasale, upper_lip)
                nose['nasal_tip_to_upper_lip_angle_deg'] = create_metric(
                    angle, '2D', ['nose_tip', 'subnasale', 'labiale_superius']
                )
        
        return nose
    
    def analyze_mouth(self) -> Dict:
        """Analyze mouth-related metrics."""
        mouth = {}
        
        left_corner = self._get_point('cheilion_L')
        right_corner = self._get_point('cheilion_R')
        upper_lip = self._get_point('labiale_superius')
        lower_lip = self._get_point('labiale_inferius')
        stomion = self._get_point('stomion')
        
        # Mouth width
        if left_corner is not None and right_corner is not None:
            mouth_width = dist(left_corner, right_corner, '2D')
            mouth['mouth_width_over_IPD'] = create_metric(
                mouth_width / self.scale_basis, '2D', ['cheilion_L', 'cheilion_R']
            )
            
            # Smile arc curvature
            if stomion is not None:
                arc_points = np.array([left_corner[:2], stomion[:2], right_corner[:2]])
                curvature = polyfit_curvature(arc_points)
                mouth['smile_arc_curvature'] = create_metric(
                    curvature, '2D', ['cheilion_L', 'stomion', 'cheilion_R']
                )
        
        # Lip thickness
        if upper_lip is not None and lower_lip is not None and stomion is not None:
            upper_thickness = dist(upper_lip, stomion, '2D')
            lower_thickness = dist(stomion, lower_lip, '2D')
            ratio = safe_ratio(upper_thickness, lower_thickness)
            if ratio is not None:
                mouth['upper_to_lower_lip_ratio'] = create_metric(
                    ratio, '2D', ['labiale_superius', 'stomion', 'labiale_inferius']
                )
        
        # Cupid's bow depth (approximate)
        if upper_lip is not None and stomion is not None:
            bow_depth = abs(upper_lip[1] - stomion[1]) / self.scale_basis
            mouth['cupid_bow_depth'] = create_metric(
                bow_depth, '2D', ['labiale_superius', 'stomion']
            )
        
        return mouth
    
    def analyze_structure(self) -> Dict:
        """Analyze facial structure and proportions."""
        structure = {}
        
        chin_tip = self._get_point('chin_tip')
        nasion = self._get_point('nasion')
        glabella = self._compute_glabella()
        subnasale = self._get_point('subnasale')
        stomion = self._get_point('stomion')
        
        # Facial thirds
        if glabella is not None and subnasale is not None and chin_tip is not None:
            upper_third = dist(glabella, nasion, '2D') if nasion is not None else 0
            middle_third = dist(nasion, subnasale, '2D') if nasion is not None else 0
            lower_third = dist(subnasale, chin_tip, '2D')
            
            if middle_third > self.eps:
                structure['upper_to_middle_third'] = create_metric(
                    safe_ratio(upper_third, middle_third), '2D',
                    ['glabella', 'nasion', 'subnasale']
                )
                structure['lower_to_middle_third'] = create_metric(
                    safe_ratio(lower_third, middle_third), '2D',
                    ['subnasale', 'chin_tip', 'nasion']
                )
        
        # Face height over width
        if chin_tip is not None and nasion is not None:
            face_height = dist(nasion, chin_tip, '2D')
            left_cheek = self._get_point('L_cheek')
            right_cheek = self._get_point('R_cheek')
            if left_cheek is not None and right_cheek is not None:
                face_width = dist(left_cheek, right_cheek, '2D')
                ratio = safe_ratio(face_height, face_width)
                if ratio is not None:
                    structure['face_height_over_width'] = create_metric(
                        ratio, '2D', ['nasion', 'chin_tip', 'L_cheek', 'R_cheek']
                    )
        
        # Jaw metrics
        gonion_l = self._get_point('gonion_L')
        gonion_r = self._get_point('gonion_R')
        menton = self._get_point('menton')
        
        if gonion_l is not None and gonion_r is not None:
            gonial_width = dist(gonion_l, gonion_r, '2D') / self.scale_basis
            structure['gonial_width_normalized'] = create_metric(
                gonial_width, '2D', ['gonion_L', 'gonion_R']
            )
            
            if menton is not None:
                # Mandibular angle
                angle = angle_deg(gonion_l, menton, gonion_r)
                structure['mandibular_angle_deg'] = create_metric(
                    angle, '2D', ['gonion_L', 'menton', 'gonion_R']
                )
        
        # Chin prominence (3D)
        if chin_tip is not None and subnasale is not None:
            chin_projection = abs(chin_tip[2] - subnasale[2]) / self.scale_basis
            structure['chin_prominence_3D'] = create_metric(
                chin_projection, '3D', ['chin_tip', 'subnasale']
            )
        
        return structure
    
    def analyze_symmetry(self) -> Dict:
        """Analyze facial symmetry."""
        symmetry = {}
        
        # Collect paired features
        pairs = [
            ('L_eye_outer', 'R_eye_outer'),
            ('L_eye_inner', 'R_eye_inner'),
            ('L_brow_inner', 'R_brow_inner'),
            ('L_brow_outer', 'R_brow_outer'),
            ('alare_L', 'alare_R'),
            ('cheilion_L', 'cheilion_R'),
            ('gonion_L', 'gonion_R')
        ]
        
        midline_deviations = []
        bilateral_deltas = {}
        
        for left_name, right_name in pairs:
            left_pt = self._get_point(left_name)
            right_pt = self._get_point(right_name)
            
            if left_pt is not None and right_pt is not None:
                # Midline deviation (should be close to 0 for perfect symmetry)
                midpoint = (left_pt + right_pt) / 2
                # Deviation from center (x=0.5 in normalized coords)
                midline_dev = abs(midpoint[0] - 0.5) / self.scale_basis
                midline_deviations.append(midline_dev)
                
                # Bilateral asymmetry
                left_dist = abs(left_pt[0])
                right_dist = abs(right_pt[0])
                delta = abs(left_dist - right_dist) / self.scale_basis
                bilateral_deltas[f'{left_name}_vs_{right_name}'] = delta
        
        if midline_deviations:
            # Clamp the score between 0 and 1
            avg_deviation = np.mean(midline_deviations)
            # Normalize: small deviations = high score
            score = max(0.0, min(1.0, 1.0 - (avg_deviation / 5.0)))  # Scale factor of 5
            symmetry['midline_symmetry_score'] = create_metric(
                score, '2D',
                [p[0] for p in pairs] + [p[1] for p in pairs]
            )
        
        symmetry['bilateral_feature_deltas'] = bilateral_deltas
        
        return symmetry
    
    def analyze_profile(self) -> Dict:
        """Analyze profile metrics (3D)."""
        profile = {}
        
        nose_tip = self._get_point('nose_tip')
        chin_tip = self._get_point('chin_tip')
        upper_lip = self._get_point('labiale_superius')
        lower_lip = self._get_point('labiale_inferius')
        
        if nose_tip is not None and chin_tip is not None:
            # E-line (Ricketts' esthetic plane)
            if upper_lip is not None:
                # Distance from upper lip to nose-chin line (simplified 2D projection)
                e_line_upper = abs(upper_lip[2] - ((nose_tip[2] + chin_tip[2]) / 2))
                profile['e_line_upper_lip'] = create_metric(
                    e_line_upper / self.scale_basis, '3D',
                    ['nose_tip', 'chin_tip', 'labiale_superius']
                )
            
            if lower_lip is not None:
                e_line_lower = abs(lower_lip[2] - ((nose_tip[2] + chin_tip[2]) / 2))
                profile['e_line_lower_lip'] = create_metric(
                    e_line_lower / self.scale_basis, '3D',
                    ['nose_tip', 'chin_tip', 'labiale_inferius']
                )
            
            # Tip vs chin projection
            tip_projection = abs(nose_tip[2])
            chin_projection = abs(chin_tip[2])
            ratio = safe_ratio(tip_projection, chin_projection)
            if ratio is not None:
                profile['tip_projection_over_chin_projection'] = create_metric(
                    ratio, '3D', ['nose_tip', 'chin_tip']
                )
        
        # Midface depth
        left_cheek = self._get_point('L_cheek')
        right_cheek = self._get_point('R_cheek')
        if left_cheek is not None and right_cheek is not None:
            midface_depth = (abs(left_cheek[2]) + abs(right_cheek[2])) / 2
            face_width = dist(left_cheek, right_cheek, '2D')
            ratio = safe_ratio(midface_depth, face_width)
            if ratio is not None:
                profile['midface_depth_over_face_width'] = create_metric(
                    ratio, '3D', ['L_cheek', 'R_cheek']
                )
        
        return profile
    
    def analyze_golden_diagnostics(self) -> Dict:
        """Compute golden ratio diagnostic metrics."""
        golden = {}
        
        # Collect various ratios
        ratios_to_check = []
        
        # Eye to mouth width
        left_eye_outer = self._get_point('L_eye_outer')
        right_eye_outer = self._get_point('R_eye_outer')
        left_mouth = self._get_point('cheilion_L')
        right_mouth = self._get_point('cheilion_R')
        
        if all(p is not None for p in [left_eye_outer, right_eye_outer, left_mouth, right_mouth]):
            eye_width = dist(left_eye_outer, right_eye_outer, '2D')
            mouth_width = dist(left_mouth, right_mouth, '2D')
            ratio = safe_ratio(eye_width, mouth_width)
            if ratio is not None:
                ratios_to_check.append(('eye_to_mouth_width', ratio))
        
        # Face height to width
        chin_tip = self._get_point('chin_tip')
        nasion = self._get_point('nasion')
        left_cheek = self._get_point('L_cheek')
        right_cheek = self._get_point('R_cheek')
        
        if all(p is not None for p in [chin_tip, nasion, left_cheek, right_cheek]):
            face_height = dist(nasion, chin_tip, '2D')
            face_width = dist(left_cheek, right_cheek, '2D')
            ratio = safe_ratio(face_height, face_width)
            if ratio is not None:
                ratios_to_check.append(('face_height_to_width', ratio))
        
        # Nose to mouth height
        subnasale = self._get_point('subnasale')
        stomion = self._get_point('stomion')
        
        if subnasale is not None and stomion is not None and chin_tip is not None:
            nose_to_mouth = dist(subnasale, stomion, '2D')
            mouth_to_chin = dist(stomion, chin_tip, '2D')
            ratio = safe_ratio(nose_to_mouth, mouth_to_chin)
            if ratio is not None:
                ratios_to_check.append(('nose_mouth_to_mouth_chin', ratio))
        
        # Calculate deviations from phi
        phi_deviations = {}
        for name, ratio in ratios_to_check:
            deviation = abs(ratio - PHI) / PHI
            phi_deviations[f'{name}_phi_deviation'] = create_metric(
                deviation, '2D', [], valid=True, confidence=0.8
            )
        
        golden['phi_deviations'] = phi_deviations
        
        # Facial thirds evenness
        thirds_ratios = []
        if 'upper_to_middle_third' in self.structure:
            thirds_ratios.append(self.structure['upper_to_middle_third'].get('value', 1.0))
        if 'lower_to_middle_third' in self.structure:
            thirds_ratios.append(self.structure['lower_to_middle_third'].get('value', 1.0))
        
        if thirds_ratios:
            evenness = 1.0 - np.std(thirds_ratios)
            golden['thirds_evenness'] = create_metric(
                evenness, '2D', [], valid=True, confidence=0.7
            )
        
        # Facial fifths analysis
        left_outer = self._get_point('L_eye_outer')
        left_inner = self._get_point('L_eye_inner')
        right_inner = self._get_point('R_eye_inner')
        right_outer = self._get_point('R_eye_outer')
        
        if all(p is not None for p in [left_outer, left_inner, right_inner, right_outer]):
            # Approximate facial fifths
            total_width = dist(left_outer, right_outer, '2D')
            eye_width_l = dist(left_outer, left_inner, '2D')
            eye_width_r = dist(right_inner, right_outer, '2D')
            intercanthal = dist(left_inner, right_inner, '2D')
            
            fifths = [eye_width_l, intercanthal, eye_width_r]
            ideal_fifth = total_width / 5
            
            fifth_deviations = [abs(f - ideal_fifth) / ideal_fifth for f in fifths]
            golden['fifths_evenness'] = create_metric(
                1.0 - np.mean(fifth_deviations), '2D',
                ['L_eye_outer', 'L_eye_inner', 'R_eye_inner', 'R_eye_outer']
            )
        
        return golden
    
    def analyze_blendshapes(self) -> Dict:
        """Summarize blendshape information if available."""
        if not self.blendshapes:
            return {}
        
        summary = {
            'total_blendshapes': len(self.blendshapes),
            'active_blendshapes': []
        }
        
        for bs in self.blendshapes:
            if bs.get('score', 0) > 0.1:  # Threshold for active
                summary['active_blendshapes'].append({
                    'name': bs.get('category_name', 'unknown'),
                    'score': bs.get('score', 0)
                })
        
        return summary
    
    def analyze(self) -> Dict:
        """Main analysis function."""
        # Analyze all components
        self.eyes = self.analyze_eyes()
        self.nose = self.analyze_nose()
        self.mouth = self.analyze_mouth()
        self.structure = self.analyze_structure()
        self.symmetry = self.analyze_symmetry()
        self.profile = self.analyze_profile()
        self.golden = self.analyze_golden_diagnostics()
        self.blendshape_summary = self.analyze_blendshapes()
        
        # Estimate pose
        pose = self._estimate_pose()
        
        # Compile results
        return {
            'normalization': {
                'scale_basis': self.scale_basis,
                'fallback_indices_used': self.fallback_indices_used,
                'visibility_threshold': self.visibility_threshold
            },
            'pose_estimation': pose,
            'eyes': self.eyes,
            'nose': self.nose,
            'mouth': self.mouth,
            'structure': self.structure,
            'symmetry': self.symmetry,
            'profile': self.profile,
            'golden_diagnostics': self.golden,
            'blendshape_summary': self.blendshape_summary
        }
    
    def _estimate_pose(self) -> Dict:
        """Estimate head pose (roll, yaw, pitch)."""
        try:
            # Simplified pose estimation using key points
            nose_tip = self._get_point('nose_tip')
            chin_tip = self._get_point('chin_tip')
            left_ear = self._get_point('L_ear_top')
            right_ear = self._get_point('R_ear_top')
            
            pose = {}
            
            # Roll (already corrected, should be near 0)
            if left_ear is not None and right_ear is not None:
                roll = np.degrees(np.arctan2(
                    right_ear[1] - left_ear[1],
                    right_ear[0] - left_ear[0]
                ))
                pose['roll_deg'] = roll
            
            # Yaw (left-right rotation)
            if nose_tip is not None:
                # Use nose tip x-position as proxy
                yaw = np.degrees(np.arcsin(np.clip(nose_tip[0] * 2, -1, 1)))
                pose['yaw_deg'] = yaw
            
            # Pitch (up-down rotation)
            if nose_tip is not None and chin_tip is not None:
                # Use vertical angle between nose and chin
                pitch = np.degrees(np.arctan2(
                    chin_tip[1] - nose_tip[1],
                    abs(chin_tip[2] - nose_tip[2]) + self.eps
                ))
                pose['pitch_deg'] = pitch
            
            return pose
        except:
            return {}


def analyze_face_ratios(landmarks: List[Dict], 
                        blendshapes: Optional[List[Dict]] = None,
                        index_map: Optional[Dict[str, int]] = None) -> Dict:
    """
    Main entry point for facial ratio analysis.
    
    Args:
        landmarks: List of landmark dictionaries with x, y, z, visibility, presence
        blendshapes: Optional list of blendshape dictionaries
        index_map: Optional custom index mapping
    
    Returns:
        Dictionary with computed metrics
    """
    try:
        analyzer = FaceAnalyzer(landmarks, blendshapes, index_map)
        return analyzer.analyze()
    except Exception as e:
        import traceback
        return {
            'error': str(e),
            'traceback': traceback.format_exc(),
            'status': 'failed'
        }


def process_landmark_file(filepath: str) -> Dict:
    """Process a single .landmark file."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Extract landmarks (handle nested structure)
        if 'face_landmarks' in data:
            landmarks = data['face_landmarks'][0] if data['face_landmarks'] else []
        else:
            landmarks = data.get('landmarks', [])
        
        # Extract blendshapes if available
        blendshapes = None
        if 'face_blendshapes' in data:
            blendshapes = data['face_blendshapes'][0] if data['face_blendshapes'] else None
        
        # Perform analysis
        result = analyze_face_ratios(landmarks, blendshapes)
        result['source_file'] = filepath
        
        return result
    except Exception as e:
        return {
            'source_file': filepath,
            'error': str(e),
            'status': 'failed'
        }


def process_landmarks_directory(directory: str = 'landmarks') -> None:
    """Process all .landmark files in a directory."""
    landmark_dir = Path(directory)
    
    if not landmark_dir.exists():
        print(f"Directory {directory} does not exist")
        return
    
    landmark_files = list(landmark_dir.glob('*.landmark'))
    
    if not landmark_files:
        print(f"No .landmark files found in {directory}")
        return
    
    print(f"Found {len(landmark_files)} landmark files")
    
    results = []
    for filepath in landmark_files:
        print(f"Processing {filepath.name}...")
        result = process_landmark_file(str(filepath))
        results.append(result)
        
        # Save individual result
        output_path = filepath.with_suffix('.golden.json')
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        if 'error' not in result:
            print(f"  ✓ Saved analysis to {output_path.name}")
        else:
            print(f"  ✗ Error: {result['error']}")
    
    # Save summary
    summary_path = landmark_dir / 'golden_analysis_summary.json'
    with open(summary_path, 'w') as f:
        json.dump({
            'total_files': len(results),
            'successful': sum(1 for r in results if 'error' not in r),
            'failed': sum(1 for r in results if 'error' in r),
            'results': results
        }, f, indent=2)
    
    print(f"\nSummary saved to {summary_path}")
    print(f"Successfully processed {sum(1 for r in results if 'error' not in r)}/{len(results)} files")


if __name__ == '__main__':
    # Test with synthetic data
    print("Testing with synthetic face landmarks...")
    
    # Create synthetic test landmarks (simplified face)
    test_landmarks = []
    for i in range(468):
        test_landmarks.append({
            'x': 0.5 + 0.1 * np.sin(i * 0.1),
            'y': 0.5 + 0.1 * np.cos(i * 0.1),
            'z': 0.01 * np.sin(i * 0.05),
            'visibility': 0.99,
            'presence': 0.99
        })
    
    # Run analysis
    result = analyze_face_ratios(test_landmarks)
    
    # Display sample results
    print("\nSample output structure:")
    for key in result.keys():
        if isinstance(result[key], dict):
            print(f"  {key}: {len(result[key])} metrics")
        else:
            print(f"  {key}: {type(result[key]).__name__}")
    
    # Process actual landmark files if directory exists
    if os.path.exists('landmarks'):
        print("\n" + "="*50)
        print("Processing actual landmark files...")
        process_landmarks_directory('landmarks')
        
        # Automatically run golden.final.py for human-friendly interpretations
        print("\n" + "="*50)
        print("Generating human-friendly interpretations...")
        import subprocess
        import sys
        try:
            subprocess.run([sys.executable, 'golden.final.py', 'landmarks'], check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error running golden.final.py: {e}")
        except FileNotFoundError:
            print("golden.final.py not found in current directory")
    else:
        print("\nNo 'landmarks' directory found. Create it and add .landmark files to process.")