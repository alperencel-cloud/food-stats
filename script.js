const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const button = form.querySelector("button");
const statusText = document.getElementById("status");
const results = document.getElementById("results");

// Saves results so repeat searches are instant
const cache = {};

// Only ask the API for the data we actually use (smaller = faster)
const FIELDS = "code,product_name,brands,image_front_small_url,nutriscore_grade,nutriments";

// fetch() that gives up after a set time instead of hanging forever
async function fetchWithTimeout(url, milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error("Server answered with status " + response.status);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Tries the fast new search first, then the old one as a backup
async function searchProducts(word) {
  const encoded = encodeURIComponent(word);

  // 1. Fast search
  try {
    const fastUrl = "https://search.openfoodfacts.org/search" +
      "?q=" + encoded + "&page_size=12&fields=" + FIELDS;
    const data = await fetchWithTimeout(fastUrl, 8000);

    if (data.hits && data.hits.length > 0) {
      return { products: data.hits, count: data.count || data.hits.length };
    }
  } catch (error) {
    console.warn("Fast search failed, trying the backup search.", error);
  }

  // 2. Backup: the old, slower search
  const oldUrl = "https://world.openfoodfacts.org/cgi/search.pl" +
    "?search_terms=" + encoded +
    "&search_simple=1&json=1&page_size=12&fields=" + FIELDS;
  const data = await fetchWithTimeout(oldUrl, 15000);

  return { products: data.products || [], count: data.count || 0 };
}

// Runs when you press Search or Enter
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const searchWord = input.value.trim().toLowerCase();
  if (!searchWord) return;

  results.innerHTML = "";

  // Already searched this word? Show the saved results instantly
  if (cache[searchWord]) {
    showResults(cache[searchWord]);
    return;
  }

  // Lock the button so extra clicks don't send extra requests
  button.disabled = true;
  button.textContent = "Searching...";
  statusText.textContent = "Searching... this can take a few seconds.";

  try {
    const result = await searchProducts(searchWord);
    cache[searchWord] = result;
    showResults(result);
  } catch (error) {
    statusText.textContent = "The food database is busy right now. Wait 30 seconds and try again.";
    console.error(error);
  } finally {
    // Always unlock the button, whether it worked or not
    button.disabled = false;
    button.textContent = "Search";
  }
});

// Shows the status line and all the cards
function showResults(result) {
  if (result.products.length === 0) {
    statusText.textContent = "No products found. Try another word.";
    return;
  }

  statusText.textContent = "Found " + result.count + " products (showing " + result.products.length + ")";
  result.products.forEach(showProduct);
}

// Builds one product card
function showProduct(product) {
  const n = product.nutriments || {};
  const grade = product.nutriscore_grade;
  const validGrade = ["a", "b", "c", "d", "e"].includes(grade);

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <img src="${product.image_front_small_url || ""}" alt="${product.product_name || "Product"}">
    <h3>${product.product_name || "Unknown name"}</h3>
    <p class="brand">${product.brands || "Unknown brand"}</p>
    <span class="score ${validGrade ? "score-" + grade : "score-none"}">
      Nutri-Score: ${validGrade ? grade.toUpperCase() : "?"}
    </span>
    <ul>
      <li>Energy: ${n["energy-kcal_100g"] ?? "?"} kcal</li>
      <li>Sugar: ${n.sugars_100g ?? "?"} g</li>
      <li>Fat: ${n.fat_100g ?? "?"} g</li>
      <li>Salt: ${n.salt_100g ?? "?"} g</li>
    </ul>
    <a href="https://world.openfoodfacts.org/product/${product.code}" target="_blank" rel="noopener">More info ↗</a>
  `;
  results.appendChild(card);
}
