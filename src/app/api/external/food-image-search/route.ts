import { NextRequest, NextResponse } from 'next/server';

export interface FoodImageResult {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  source: 'TheMealDB' | 'Wikimedia Commons' | 'Wikipedia' | 'Openverse';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('query') || '';

  if (!rawQuery.trim()) {
    return NextResponse.json(
      { success: false, error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  // Strip brand/adjectives like "Copper", "Chef's Special", "Artisanal", "House" if long
  const cleanQuery = rawQuery
    .replace(/\b(copper|artisanal|house|chef's|special|signature|supreme|style|deluxe)\b/gi, '')
    .trim() || rawQuery.trim();

  const results: FoodImageResult[] = [];
  const seenUrls = new Set<string>();

  const addImage = (item: FoodImageResult) => {
    if (!item.url || seenUrls.has(item.url)) return;
    // Skip svgs or icons
    if (item.url.endsWith('.svg') || item.url.includes('icon') || item.url.includes('flag')) return;
    seenUrls.add(item.url);
    results.push(item);
  };

  try {
    // 1. Fetch from TheMealDB
    const mealDbPromise = (async () => {
      try {
        const queriesToTry = [cleanQuery];
        // If cleanQuery has multiple words, also try the last 2 words (e.g. "Butter Chicken")
        const words = cleanQuery.split(/\s+/);
        if (words.length > 2) {
          queriesToTry.push(words.slice(-2).join(' '));
        }

        for (const q of queriesToTry) {
          const res = await fetch(
            `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`,
            { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.meals && Array.isArray(data.meals)) {
              for (const meal of data.meals.slice(0, 6)) {
                if (meal.strMealThumb) {
                  addImage({
                    id: `mealdb-${meal.idMeal}`,
                    title: meal.strMeal,
                    url: meal.strMealThumb,
                    thumbnail: `${meal.strMealThumb}/preview`,
                    source: 'TheMealDB',
                  });
                }
              }
            }
          }
          if (results.length >= 4) break;
        }
      } catch (err) {
        console.warn('TheMealDB image search error:', err);
      }
    })();

    // 2. Fetch from Wikipedia Page Images
    const wikiPromise = (async () => {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          cleanQuery + ' dish'
        )}&gsrlimit=6&prop=pageimages&pithumbsize=800&format=json&origin=*`;
        const res = await fetch(wikiUrl, {
          headers: { 'User-Agent': 'TheCopperLeaf/1.0' },
          next: { revalidate: 3600 },
        });
        if (res.ok) {
          const data = await res.json();
          const pages = data?.query?.pages;
          if (pages) {
            Object.values(pages).forEach((page: any) => {
              if (page.thumbnail?.source) {
                addImage({
                  id: `wiki-${page.pageid}`,
                  title: page.title,
                  url: page.thumbnail.source,
                  thumbnail: page.thumbnail.source,
                  source: 'Wikipedia',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Wikipedia image search error:', err);
      }
    })();

    // 3. Fetch from Wikimedia Commons
    const commonsPromise = (async () => {
      try {
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          cleanQuery + ' food dish'
        )}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
        const res = await fetch(commonsUrl, {
          headers: { 'User-Agent': 'TheCopperLeaf/1.0' },
          next: { revalidate: 3600 },
        });
        if (res.ok) {
          const data = await res.json();
          const pages = data?.query?.pages;
          if (pages) {
            Object.values(pages).forEach((page: any) => {
              const info = page.imageinfo?.[0];
              const imgUrl = info?.thumburl || info?.url;
              if (imgUrl && !imgUrl.endsWith('.svg') && !imgUrl.endsWith('.ogg')) {
                const title = (page.title || '').replace(/^File:/, '').replace(/\.[^/.]+$/, '');
                addImage({
                  id: `commons-${page.pageid}`,
                  title: title,
                  url: imgUrl,
                  thumbnail: imgUrl,
                  source: 'Wikimedia Commons',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Wikimedia Commons image search error:', err);
      }
    })();

    // 4. Fetch from Openverse
    const openversePromise = (async () => {
      try {
        const res = await fetch(
          `https://api.openverse.org/v1/images/?q=${encodeURIComponent(cleanQuery + ' food')}&page_size=8`,
          { headers: { 'User-Agent': 'TheCopperLeaf/1.0' }, next: { revalidate: 3600 } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.results && Array.isArray(data.results)) {
            data.results.forEach((item: any) => {
              if (item.url && item.thumbnail) {
                addImage({
                  id: `openverse-${item.id}`,
                  title: item.title || cleanQuery,
                  url: item.url,
                  thumbnail: item.thumbnail,
                  source: 'Openverse',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Openverse image search error:', err);
      }
    })();

    await Promise.allSettled([mealDbPromise, wikiPromise, commonsPromise, openversePromise]);

    return NextResponse.json({
      success: true,
      query: rawQuery,
      count: results.length,
      images: results,
    });
  } catch (error: any) {
    console.error('Food image search error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search food images' },
      { status: 500 }
    );
  }
}
