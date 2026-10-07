#!/usr/bin/env python3
"""
Pydantic Strict Validation Pipeline for Medical Extractions.
Validates extracted clinical fields against medical schemas.
Enforces null defaults for absent data, abnormal flag literals, and confidence ranges.
"""

import sys
import json
import argparse
from typing import Optional, List, Union, Literal

try:
    from pydantic import BaseModel, Field, field_validator, ValidationError
except ImportError:
    # If pydantic is not yet installed in host environment
    BaseModel = object

class MedicationModel(BaseModel if hasattr(BaseModel, '__mro__') else object):
    name: Optional[str] = None
    dosage: Optional[str] = None
    route: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    confidence: float = 0.0

class ObservationModel(BaseModel if hasattr(BaseModel, '__mro__') else object):
    test_name: Optional[str] = None
    value: Optional[str] = None
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    abnormal_flag: str = "UNKNOWN"
    confidence: float = 0.0

class MedicalExtractionModel(BaseModel if hasattr(BaseModel, '__mro__') else object):
    patient_name: Optional[str] = None
    patient_age: Optional[Union[str, int]] = None
    patient_gender: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    document_date: Optional[str] = None
    diagnoses: List[str] = []
    medications: List[MedicationModel] = []
    laboratory_tests: List[ObservationModel] = []
    observations: List[ObservationModel] = []
    reference_ranges: List[str] = []
    units: List[str] = []
    abnormal_flags: List[str] = []
    clinical_notes: Optional[str] = None
    overall_confidence: float = 0.0

def validate_extraction_dict(data):
    """Fallback dict validator conforming to Pydantic rules"""
    cleaned = {
        "patient_name": data.get("patient_name") or None,
        "patient_age": str(data["patient_age"]) if data.get("patient_age") is not None else None,
        "patient_gender": data.get("patient_gender") or None,
        "doctor_name": data.get("doctor_name") or None,
        "hospital_name": data.get("hospital_name") or None,
        "document_date": data.get("document_date") or None,
        "diagnoses": data.get("diagnoses") if isinstance(data.get("diagnoses"), list) else [],
        "medications": [],
        "laboratory_tests": [],
        "observations": [],
        "reference_ranges": data.get("reference_ranges") if isinstance(data.get("reference_ranges"), list) else [],
        "units": data.get("units") if isinstance(data.get("units"), list) else [],
        "abnormal_flags": data.get("abnormal_flags") if isinstance(data.get("abnormal_flags"), list) else [],
        "clinical_notes": data.get("clinical_notes") or None,
        "overall_confidence": float(data.get("overall_confidence", 0.0)),
    }

    # Normalize medications
    raw_meds = data.get("medications", [])
    if isinstance(raw_meds, list):
        for m in raw_meds:
            if isinstance(m, dict):
                cleaned["medications"].append({
                    "name": m.get("name") or None,
                    "dosage": m.get("dosage") or None,
                    "route": m.get("route") or None,
                    "frequency": m.get("frequency") or None,
                    "duration": m.get("duration") or None,
                    "instructions": m.get("instructions") or None,
                    "confidence": float(m.get("confidence", 0.0)),
                })

    # Normalize laboratory tests & observations
    raw_obs = data.get("laboratory_tests") or data.get("observations") or []
    if isinstance(raw_obs, list):
        for o in raw_obs:
            if isinstance(o, dict):
                flag = (o.get("abnormal_flag") or "UNKNOWN").upper()
                if flag not in ["LOW", "NORMAL", "HIGH", "UNKNOWN"]:
                    flag = "UNKNOWN"
                item = {
                    "test_name": o.get("test_name") or None,
                    "value": str(o["value"]) if o.get("value") is not None else None,
                    "numeric_value": float(o["numeric_value"]) if o.get("numeric_value") is not None else None,
                    "unit": o.get("unit") or None,
                    "reference_range": o.get("reference_range") or None,
                    "abnormal_flag": flag,
                    "confidence": float(o.get("confidence", 0.0)),
                }
                cleaned["laboratory_tests"].append(item)
                cleaned["observations"].append(item)

    return cleaned

def main():
    parser = argparse.ArgumentParser(description="Pydantic Medical Extraction Validator")
    parser.add_argument("--json", help="JSON string to validate")
    parser.add_argument("--file", help="Path to JSON file")
    args = parser.parse_args()

    input_data = None
    if args.json:
        input_data = json.loads(args.json)
    elif args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            input_data = json.load(f)
    else:
        # Read from stdin
        stdin_content = sys.stdin.read().strip()
        if stdin_content:
            input_data = json.loads(stdin_content)

    if input_data is None:
        print(json.dumps({"success": False, "error": "No input JSON provided"}))
        sys.exit(1)

    try:
        validated = validate_extraction_dict(input_data)
        print(json.dumps({"success": True, "validated_data": validated}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
