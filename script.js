const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const statusText = document.getElementById("status");
const results = document.getElementById("results");

// Runs when you press Search or Enter
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the page from reloading

  const searchWord = input.value.trim();
  statusText.textContent = "Searching...";
  results.innerHTML = "";

  // The API address, with your search word added
  const url = "https://world.openfoodfacts.org/cgi/search.pl" +
    "?search_terms=" + encodeURIComponent(searchWord) +
    "&search_simple=1&json=1&page_size=12" +
    "&fields=code,product_name,brands,image_front_small_url,nutriscore_grade,nutriments";

  try {
    const response = await fetch(url);   // ask the API
    const data = await response.json();  // turn the answer into JS objects

    if (data.products.length === 0) {
      statusText.textContent = "No products found. Try another word.";
      return;
    }

    statusText.textContent = "Found " + data.count + " products (showing 12)";
    data.products.forEach(showProduct);

  } catch (error) {
    statusText.textContent = "Something went wrong. Wait a moment and try again.";
    console.error(error);
  }
});

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
