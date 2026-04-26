import os
import json
import subprocess

def get_duration(file_path):
    cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', file_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return float(result.stdout)

voice_data_config = {
    "1": {"ext": "mp3", "count": 15},
    "2": {"ext": "wav", "count": 20},
    "3": {"ext": "mp3", "count": 23},
    "4": {"ext": "wav", "count": 20},
    "5": {"ext": "mp3", "count": 13},
    "6": {"ext": "mp3", "count": 20},
    "7": {"ext": "mp3", "count": 19}
}

sprite_data = {}
GAP_MS = 500

# Process Voices
for vid, config in voice_data_config.items():
    sprite_data[f"voice_{vid}"] = {}
    current_time_ms = 0
    
    for i in range(1, config['count'] + 1):
        filename = f"{vid}_{i}.{config['ext']}"
        path = os.path.join("Voice", vid, filename)
        if os.path.exists(path):
            duration = get_duration(path)
            duration_ms = int(duration * 1000)
            sprite_data[f"voice_{vid}"][str(i)] = [current_time_ms, duration_ms]
            current_time_ms += duration_ms + GAP_MS

# Process Plaps
sprite_data["plaps"] = {}
current_time_ms = 0
for i in range(1, 24):
    path = os.path.join("plaps", f"plap_{i}.wav")
    if os.path.exists(path):
        duration = get_duration(path)
        duration_ms = int(duration * 1000)
        sprite_data["plaps"][str(i)] = [current_time_ms, duration_ms]
        current_time_ms += duration_ms + GAP_MS

with open("sprite_map.json", "w") as f:
    json.dump(sprite_data, f, indent=4)

print("Accurate sprite map generated with 500ms gaps.")
