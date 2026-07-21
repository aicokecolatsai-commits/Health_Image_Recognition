"""
Usage: python test_pose.py <video_path>
Example: python test_pose.py D:\videos\test.mp4
"""
import sys, json, time
from pathlib import Path

from app.core.pose_2d import PoseDetector2D
from app.config import settings

video_path = sys.argv[1] if len(sys.argv) > 1 else None
if not video_path or not Path(video_path).exists():
    print("Usage: python test_pose.py <video_path>")
    print(f"  File not found: {video_path}")
    sys.exit(1)

print(f"Video: {video_path}")
print(f"Compute mode: {settings.compute_mode}")

# Load detector
detector = PoseDetector2D()
detector.load_model()

# Process
start = time.time()

def on_progress(frame, total):
    pct = round(frame / max(total, 1) * 100)
    bar = "#" * (pct // 5) + "." * (20 - pct // 5)
    print(f"\r[{bar}] {pct}%  frame {frame}/{total}", end="")
    sys.stdout.flush()

frames = detector.process_video(video_path, progress_callback=on_progress)
elapsed = time.time() - start

print(f"\n\nResults: {len(frames)} frames processed in {elapsed:.1f}s ({len(frames)/elapsed:.1f} fps)")

# Stats
total_kps = sum(len(f["keypoints"]) for f in frames)
frames_with_detection = sum(1 for f in frames if len(f["keypoints"]) > 0)
print(f"Frames with person detected: {frames_with_detection}/{len(frames)}")
print(f"Total keypoints: {total_kps}")

# Show first frame details
if frames_with_detection > 0:
    first = next(f for f in frames if len(f["keypoints"]) > 0)
    print(f"\nFirst detected frame #{first['frame_idx']}:")
    for kp in first["keypoints"][:5]:
        from app.core.pose_2d import LANDMARK_NAMES
        name = LANDMARK_NAMES[kp["id"]] if kp["id"] < len(LANDMARK_NAMES) else f"kp_{kp['id']}"
        print(f"  {name:20s} x={kp['x']:.3f} y={kp['y']:.3f} conf={kp['visibility']:.2f}")
    print(f"  ... and {len(first['keypoints']) - 5} more keypoints")

# Save JSON snapshot
out = Path(video_path).with_suffix(".pose.json")
summary = {
    "video": str(video_path),
    "frames_processed": len(frames),
    "frames_with_detection": frames_with_detection,
    "total_keypoints": total_kps,
    "elapsed_sec": round(elapsed, 2),
    "fps": round(len(frames) / elapsed, 1) if elapsed > 0 else 0,
}
out.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\nSummary saved to: {out}")

detector.unload()
