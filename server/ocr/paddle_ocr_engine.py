#!/usr/bin/env python3
"""
PaddleOCR Production Pipeline for Medical Documents.
Supports: English & Tamil language recognition, PDF page conversion,
confidence score calculation, text cleaning, and language detection.
"""

import sys
import os
import json
import time
import re
import argparse

def detect_language(text):
    if not text:
        return 'unknown'
    tamil_chars = len(re.findall(r'[\u0B80-\u0BFF]', text))
    latin_chars = len(re.findall(r'[a-zA-Z]', text))

    if tamil_chars > 0 and latin_chars > 0:
        if tamil_chars > latin_chars * 0.3:
            return 'en, ta'
        return 'en'
    elif tamil_chars > 0:
        return 'ta'
    elif latin_chars > 0:
        return 'en'
    return 'unknown'

def clean_ocr_text(raw_text):
    if not raw_text:
        return ''
    # Normalize excessive linebreaks and spacing
    lines = raw_text.split('\n')
    cleaned_lines = []
    for line in lines:
        cleaned = re.sub(r'[ \t]+', ' ', line).strip()
        if cleaned:
            cleaned_lines.append(cleaned)
    return '\n'.join(cleaned_lines)

def process_image(image_path, ocr_en, ocr_ta=None):
    results = []
    confidences = []

    # Run English model first
    try:
        res_en = ocr_en.ocr(image_path, cls=True)
        if res_en and res_en[0]:
            for line in res_en[0]:
                box, (txt, conf) = line
                if txt and txt.strip():
                    results.append(txt.strip())
                    confidences.append(float(conf))
    except Exception as e:
        sys.stderr.write(f"English OCR error: {e}\n")

    # If Tamil OCR is configured, attempt Tamil extraction if text is sparse or Tamil script present
    raw_joined = ' '.join(results)
    if ocr_ta and (len(results) == 0 or re.search(r'[\u0B80-\u0BFF]', raw_joined)):
        try:
            res_ta = ocr_ta.ocr(image_path, cls=True)
            if res_ta and res_ta[0]:
                for line in res_ta[0]:
                    box, (txt, conf) = line
                    if txt and txt.strip() and txt.strip() not in results:
                        results.append(txt.strip())
                        confidences.append(float(conf))
        except Exception as e:
            sys.stderr.write(f"Tamil OCR error: {e}\n")

    avg_conf = (sum(confidences) / len(confidences) * 100.0) if confidences else 0.0
    return '\n'.join(results), round(avg_conf, 2)

def main():
    parser = argparse.ArgumentParser(description="PaddleOCR Medical Document Text Extractor")
    parser.add_argument("--file", required=True, help="Path to input medical document (PDF, PNG, JPG, JPEG)")
    args = parser.parse_args()

    file_path = os.path.abspath(args.file)
    if not os.path.exists(file_path):
        print(json.dumps({
            "success": False,
            "error": f"File not found: {file_path}",
            "ocr_confidence": 0,
            "page_count": 0
        }))
        sys.exit(1)

    start_time = time.time()
    ext = os.path.splitext(file_path)[1].lower()

    try:
        # Import PaddleOCR lazily
        from paddleocr import PaddleOCR
        from PIL import Image

        # Initialize English and Tamil OCR engines
        ocr_en = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        ocr_ta = None
        try:
            ocr_ta = PaddleOCR(use_angle_cls=True, lang='ta', show_log=False)
        except Exception:
            pass

        all_text = []
        conf_scores = []
        page_count = 1

        if ext == '.pdf':
            # Handle PDF via pdf2image or fitz
            try:
                from pdf2image import convert_from_path
                images = convert_from_path(file_path)
                page_count = len(images)
                for idx, img in enumerate(images):
                    temp_img_path = f"{file_path}_page_{idx}.png"
                    img.save(temp_img_path, 'PNG')
                    try:
                        p_text, p_conf = process_image(temp_img_path, ocr_en, ocr_ta)
                        if p_text:
                            all_text.append(f"--- Page {idx + 1} ---\n{p_text}")
                            conf_scores.append(p_conf)
                    finally:
                        if os.path.exists(temp_img_path):
                            os.remove(temp_img_path)
            except Exception as pdf_err:
                # Fallback to PyMuPDF if pdf2image lacks poppler
                import fitz
                doc = fitz.open(file_path)
                page_count = len(doc)
                for idx, page in enumerate(doc):
                    pix = page.get_pixmap()
                    temp_img_path = f"{file_path}_page_{idx}.png"
                    pix.save(temp_img_path)
                    try:
                        p_text, p_conf = process_image(temp_img_path, ocr_en, ocr_ta)
                        if p_text:
                            all_text.append(f"--- Page {idx + 1} ---\n{p_text}")
                            conf_scores.append(p_conf)
                    finally:
                        if os.path.exists(temp_img_path):
                            os.remove(temp_img_path)
        else:
            # Direct Image OCR (PNG, JPG, JPEG)
            p_text, p_conf = process_image(file_path, ocr_en, ocr_ta)
            if p_text:
                all_text.append(p_text)
                conf_scores.append(p_conf)

        raw_text = '\n\n'.join(all_text)
        cleaned_text = clean_ocr_text(raw_text)
        avg_confidence = round(sum(conf_scores) / len(conf_scores), 2) if conf_scores else 0.0
        lang_detected = detect_language(cleaned_text)
        duration_ms = int((time.time() - start_time) * 1000)

        if not cleaned_text:
            print(json.dumps({
                "success": False,
                "error": "No readable text detected by OCR engine.",
                "raw_text": "",
                "cleaned_text": "",
                "ocr_confidence": 0,
                "page_count": page_count,
                "language_detected": "unknown",
                "processing_time": duration_ms
            }))
            return

        print(json.dumps({
            "success": True,
            "raw_text": raw_text,
            "cleaned_text": cleaned_text,
            "ocr_confidence": avg_confidence,
            "page_count": max(page_count, 1),
            "language_detected": lang_detected,
            "processing_time": duration_ms
        }))

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        print(json.dumps({
            "success": False,
            "error": str(e),
            "raw_text": "",
            "cleaned_text": "",
            "ocr_confidence": 0,
            "page_count": 0,
            "language_detected": "unknown",
            "processing_time": duration_ms
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
