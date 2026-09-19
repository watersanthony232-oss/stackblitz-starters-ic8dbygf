const fs = require('fs');
const path = 'src/news.ts';
const content = `// G2 Companion - News Module
// Southampton Daily Echo, top 5-6 stories, refreshed periodically.
//
// CONFIRMED via real testing: dailyecho.co.uk's RSS feed blocks direct
// cross-origin fetch() (CORS), and so does the corsproxy.io workaround
// (now needs a paid API key). The one that actually works, tested live,
// is r.jina.ai - a free, no-signup "reader" proxy that fetches a page
// and returns clean text/markdown. This is a real third-party
// dependency outside our control though - not guaranteed to stay free
// or available forever, just confirmed working right now.

const READER_PROXY = 'https://r.jina.ai/';
const FEED_URL = 'https://www.dailyecho.co.uk/news/rss/';
const STORY_COUNT = 6;

export interface NewsStory {
  title: string;
  link: string;
}

export async function fetchTopStories(): Promise<NewsStory[]> {
  try {
    const res = await fetch(READER_PROXY + FEED_URL);
    const text = await res.text();
    // The reader proxy renders each RSS item as a markdown heading link:
    // "### [Story title](https://www.dailyecho.co.uk/news/...)"
    const matches = [...text.matchAll(/^###\\s+\\[([^\\]]+)\\]\\(([^)]+)\\)/gm)];
    return matches.slice(0, STORY_COUNT).map((m) => ({
      title: m[1],
      link: m[2],
    }));
  } catch (e) {
    console.error('news fetch failed', e);
    return [];
  }
}
`;
fs.writeFileSync(path, content);
console.log('PATCHED_OK');
