const aliases = {
  eggs: "egg", steaks: "steak", potatoes: "potato", tomatoes: "tomato",
  manok: "chicken", baka: "beef", baboy: "pork", bangus: "milkfish",
  hipon: "shrimp", itlog: "egg", kanin: "rice cooked", bigas: "rice raw",
  kamote: "sweet potato", patatas: "potato", saging: "banana", talong: "eggplant",
  monggo: "mung beans", munggo: "mung beans", tokwa: "tofu", mais: "corn",
  oatmeal: "oats", aubergine: "eggplant", prawns: "shrimp", courgette: "zucchini",
};
export const normalizeSearch = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function queryWords(query) {
  return normalizeSearch(query).split(/\s+/).filter(Boolean).flatMap(w => (aliases[w] || w).split(" "));
}
export function searchFoods(foods, query, category = "All", preparation = "All") {
  const words = queryWords(query);
  return foods.filter(f => (category === "All" || f.category === category) && (preparation === "All" || f.preparation === preparation))
    .map((food, index) => {
      const name = normalizeSearch(food.name), tokens = name.split(" ");
      // Prefix matches allow chick/chicken and egg/eggs without matching cooked to uncooked.
      const matches = words.every(w => tokens.some(t => t === w || (!['raw','cooked'].includes(w) && t.startsWith(w))));
      return { food, index, score: matches ? (name === words.join(" ") ? 1000 : 0) + (name.startsWith(words.join(" ")) ? 100 : 0) + (food.id ? 30 : 0) + (food.fdcId === 171477 ? 15 : 0) - name.length / 100 : -Infinity };
    }).filter(r => r.score > -Infinity).sort((a,b) => words.length ? b.score-a.score || a.index-b.index : a.index-b.index).map(r => r.food);
}
// Text search is supported by the legacy CGI endpoint, not /api/v2/search.
export function packagedSearchUrl(query) {
  const params = new URLSearchParams({search_terms: query.trim(), search_simple: '1', action: 'process', json: '1', page_size: '30', lc: 'en', fields: 'code,product_name,product_name_en,brands,nutriments,url'});
  return `https://world.openfoodfacts.org/cgi/search.pl?${params}`;
}
