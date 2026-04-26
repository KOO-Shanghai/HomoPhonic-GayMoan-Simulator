import os
import subprocess
import json

def generate_sprite(category, files, output_file, gap_ms=500):
    if not files:
        return
    
    # Construct filter_complex
    inputs = []
    filter_parts = []
    
    for i, f in enumerate(files):
        inputs.extend(['-i', f])
        # Add a delay to each input except the first one? No, easier to just concat with silence
        # Better: use acrossfade or just concat with silence clips
    
    # Actually, a simpler way for many files:
    # 1. Create a 500ms silence file
    # 2. Concat alternating file and silence
    
    silence_file = "silence_500ms.wav"
    subprocess.run(['ffmpeg', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '0.5', silence_file])
    
    concat_list = []
    for f in files:
        concat_list.append(f)
        concat_list.append(silence_file)
    
    with open(f"concat_{category}.txt", "w") as f:
        for p in concat_list:
            f.write(f"file '{os.path.abspath(p)}'\n")
            
    subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', f"concat_{category}.txt", '-c:a', 'libmp3lame', '-q:a', '2', output_file])
    
    # Cleanup
    os.remove(f"concat_{category}.txt")
    if os.path.exists(silence_file):
        os.remove(silence_file)

# Load config
voice_data_config = {
    "1": {"ext": "mp3", "count": 15},
    "2": {"ext": "wav", "count": 20},
    "3": {"ext": "mp3", "count": 23},
    "4": {"ext": "wav", "count": 20},
    "5": {"ext": "mp3", "count": 13},
    "6": {"ext": "mp3", "count": 20},
    "7": {"ext": "mp3", "count": 19}
}

# Generate Sprites
for vid, config in voice_data_config.items():
    files = [os.path.join("Voice", vid, f"{vid}_{i}.{config['ext']}") for i in range(1, config['count'] + 1)]
    files = [f for f in files if os.path.exists(f)]
    print(f"Generating sprite for Voice {vid}...")
    generate_sprite(f"voice_{vid}", files, f"voice_{vid}_sprite.mp3")

# Plaps
plap_files = [os.path.join("plaps", f"plap_{i}.wav") for i in range(1, 24)]
plap_files = [f for f in plap_files if os.path.exists(f)]
print("Generating sprite for Plaps...")
generate_sprite("plaps", plap_files, "plaps_sprite.mp3")

print("All sprites generated.")
