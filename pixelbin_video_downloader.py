"""
pixelbin_video_downloader.py
--------------------------------
Replicates what https://www.pixelbin.io/ai-tools/video-generator does:
  - Shows a list of all available demo video templates
  - Lets you pick one (or all) to download
  - Saves the .mp4 files to a 'downloads' folder

NOTE: The public-facing tool only plays pre-made demo videos.
Actual AI generation requires a Pixelbin account / API key.
"""

import os
import sys
import urllib.request

# All video URLs available on the landing page
VIDEOS = {
    "1":  ("image-to-video",       "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/image-to-video.mp4"),
    "2":  ("lemon-sky-view",       "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/lemon-sky-view.mp4"),
    "3":  ("model-eyes-video",     "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/model-eyes-video.mp4"),
    "4":  ("penguin-walking",      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/penguin-walking.mp4"),
    "5":  ("the-quiet-visitor",    "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/the-quiet-visitor.mp4"),
    "6":  ("rooftop-watch",        "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/rooftop-watch.mp4"),
    "7":  ("dragon-watch",         "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/dragon-watch.mp4"),
    "8":  ("dark-matter-watch",    "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/dark-matter-watch.mp4"),
    "9":  ("perfect-intersection", "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/perfect-intersection.mp4"),
    "10": ("white-wolf",           "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/white-wolf.mp4"),
    "11": ("man-in-helicopter",    "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/man-in-helicopter.mp4"),
    "12": ("dessert-terrain",      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/dessert-terrain.mp4"),
    "13": ("the-white-door",       "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/the-white-door.mp4"),
    "14": ("shadow-and-chrome",    "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/shadow-and-chrome.mp4"),
    "15": ("silent-listener",      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/silent-listener.mp4"),
    "16": ("still-in-green",       "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/still-in-green.mp4"),
    "17": ("swimming-dog",         "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/swimming-dog.mp4"),
    "18": ("raven-red",            "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/raven-red.mp4"),
    "19": ("coastal-drive",        "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_console_assets/_video_generator/videos/coastal-drive.mp4"),
}

def progress_hook(block_num, block_size, total_size):
    downloaded = block_num * block_size
    if total_size > 0:
        pct = min(100, downloaded * 100 // total_size)
        bar = "#" * (pct // 2) + "-" * (50 - pct // 2)
        sys.stdout.write(f"\r  [{bar}] {pct}%  ")
        sys.stdout.flush()

def download_video(name, url, folder):
    filename = os.path.join(folder, f"{name}.mp4")
    if os.path.exists(filename):
        print(f"  ⚠️  Already exists: {filename} — skipping.")
        return

    print(f"\n  📥 Downloading: {name}.mp4")
    print(f"     URL: {url}")
    try:
        urllib.request.urlretrieve(url, filename, reporthook=progress_hook)
        size_mb = os.path.getsize(filename) / (1024 * 1024)
        print(f"\n  ✅ Saved to: {filename}  ({size_mb:.1f} MB)")
    except Exception as e:
        print(f"\n  ❌ Failed: {e}")

def main():
    print("=" * 60)
    print("  🎬  Pixelbin Video Generator — Terminal Version")
    print("  Source: https://www.pixelbin.io/ai-tools/video-generator")
    print("=" * 60)
    print("\nAvailable demo videos from Pixelbin CDN:\n")

    for key, (name, _) in VIDEOS.items():
        print(f"  [{key:>2}]  {name}")

    print(f"\n  [ A]  Download ALL videos")
    print(f"  [ Q]  Quit\n")

    choice = input("Enter your choice: ").strip().upper()

    download_folder = "downloads"
    os.makedirs(download_folder, exist_ok=True)

    if choice == "Q":
        print("Bye!")
        return
    elif choice == "A":
        print(f"\n🚀 Downloading all {len(VIDEOS)} videos to '{download_folder}/'...\n")
        for name, url in VIDEOS.values():
            download_video(name, url, download_folder)
    elif choice in VIDEOS:
        name, url = VIDEOS[choice]
        download_video(name, url, download_folder)
    else:
        print("❌ Invalid choice. Please run again and enter a valid number, A, or Q.")
        return

    print("\n\n✨ Done! Your videos are in the 'downloads' folder.")
    print(f"   Full path: {os.path.abspath(download_folder)}")

if __name__ == "__main__":
    main()
