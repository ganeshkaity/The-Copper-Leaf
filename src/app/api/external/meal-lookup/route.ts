import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  const cleanQuery = query.trim();

  try {
    // 1. Fetch from TheMealDB API
    let mealData: any = null;
    try {
      const mealDbRes = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(cleanQuery)}`,
        { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
      );
      if (mealDbRes.ok) {
        const json = await mealDbRes.json();
        if (json?.meals && json.meals.length > 0) {
          mealData = json.meals[0];
        }
      }
    } catch (mealErr) {
      console.warn('TheMealDB fetch warning:', mealErr);
    }

    // 2. Fetch estimated calories from USDA FoodData Central (Public demo key supported by USDA)
    let estimatedCalories: number | null = null;
    try {
      const usdaRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(cleanQuery)}&pageSize=3&api_key=DEMO_KEY`,
        { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
      );
      if (usdaRes.ok) {
        const usdaJson = await usdaRes.json();
        if (usdaJson?.foods && usdaJson.foods.length > 0) {
          const firstFood = usdaJson.foods[0];
          const energyNutrient = firstFood.foodNutrients?.find(
            (n: any) =>
              n.nutrientName?.toLowerCase().includes('energy') &&
              (n.unitName === 'KCAL' || n.nutrientId === 1008 || n.nutrientNumber === '208')
          );
          if (energyNutrient && energyNutrient.value) {
            estimatedCalories = Math.round(Number(energyNutrient.value));
          }
        }
      }
    } catch (usdaErr) {
      console.warn('USDA FoodData Central fetch warning:', usdaErr);
    }

    if (!mealData && !estimatedCalories) {
      return NextResponse.json({
        success: false,
        message: `No public culinary data found for "${cleanQuery}"`,
      });
    }

    // Extract non-empty ingredients and measures from TheMealDB
    const ingredients: string[] = [];
    if (mealData) {
      for (let i = 1; i <= 20; i++) {
        const ing = mealData[`strIngredient${i}`];
        const measure = mealData[`strMeasure${i}`];
        if (ing && typeof ing === 'string' && ing.trim()) {
          ingredients.push(measure && measure.trim() ? `${measure.trim()} ${ing.trim()}` : ing.trim());
        }
      }
    }

    return NextResponse.json({
      success: true,
      found: true,
      data: {
        name: mealData?.strMeal || cleanQuery,
        category: mealData?.strCategory || '',
        area: mealData?.strArea || '',
        instructions: mealData?.strInstructions || '',
        imageUrl: mealData?.strMealThumb || '',
        ingredients,
        estimatedCalories,
      },
    });
  } catch (error: any) {
    console.error('Meal lookup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to lookup culinary data' },
      { status: 500 }
    );
  }
}
