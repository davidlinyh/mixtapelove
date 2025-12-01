# 📼 MixTape

**Share music the way it was meant to be shared.**

MixTape is a web app that transforms Spotify playlists into beautiful, nostalgic cassette tapes with full playback. Create personalized mixtapes, customize the design, and share them with anyone — no account required.

## ✨ Features

- 🎵 **Import Spotify Playlists** - Convert any public Spotify playlist into a mixtape
- 📼 **Realistic Cassette Design** - Authentic cassette tape with spinning reels and customizable colors  
- 🎨 **Full Customization** - Choose colors, fonts, backgrounds, and add personal messages
- 🎧 **Full Playback** - Recipients can listen directly in the browser via YouTube
- 💌 **Shareable Links** - Share your mixtape with a unique URL
- 🚀 **No Account Required** - Both creators and listeners need zero authentication

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm
- Spotify Developer Account  
- Google Cloud Account (for YouTube API)
- Supabase Account

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/mixtape.git
   cd mixtape
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**

   Copy \`.env.example\` to \`.env\`:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. **Configure API Keys** (see below)

5. **Run the development server**
   \`\`\`bash
   npm start
   \`\`\`

6. **Open http://localhost:3000**

## 🔑 API Setup

### Spotify API

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy the **Client ID** and **Client Secret**
4. Add to \`.env\`

### YouTube Data API

MixTape uses multiple YouTube API keys for quota rotation (10,000 units/day per key).

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create projects (one per API key)
3. Enable **YouTube Data API v3**
4. Create API keys
5. Add to \`.env\` as \`REACT_APP_YOUTUBE_API_KEY_1\`, \`_2\`, etc.

**Tip**: 5 keys = ~500 songs/day quota

### Supabase

1. Create project at [Supabase](https://supabase.com)
2. Copy **Project URL** and **anon key**
3. Run migrations from SQL Editor:
   - See \`supabase/migrations/\` folder

## 🔄 YouTube Quota Management

Triple-layer caching system:
1. **Memory Cache** - In-session lookups
2. **Database Cache** - Global persistent cache
3. **API Key Rotation** - Auto-switches when quota exceeded

Result: Day 1 = 500 songs, Day 2+ = 90%+ cache hits

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Netlify

1. Push to GitHub  
2. Import to [Netlify](https://netlify.com)
3. Build: \`npm run build\`
4. Publish: \`build\`
5. Add environment variables
6. Deploy!

## 🐛 Troubleshooting

**"All songs unavailable"**
- Check YouTube API keys are valid
- Verify quota in Google Cloud Console
- Add more API keys to \`.env\`

**"Failed to load playlist"**  
- Ensure playlist is public
- Verify Spotify credentials

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

Built with love for music sharing ❤️📼

---

**Made by [Your Name]**
