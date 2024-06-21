# Media Preparation - Encoding

This section covers tools and resources for encoding media files.

## Tools
- [FFmpeg]({{ extra.ffmpeg }})

### FFmpeg
Here's an example of encoding a video file using FFmpeg:

```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4
```