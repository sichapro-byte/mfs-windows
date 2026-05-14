async function run() {
  const res = await fetch("https://www.pinterest.com/pin/594053007106535240/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  const text = await res.text();
  const matches = text.match(/https:\/\/i\.pinimg\.com\/originals\/[a-f0-9\/]+\.jpg/g);
  if (matches) {
    console.log(matches[0]);
  } else {
    const backup = text.match(/https:\/\/i\.pinimg\.com\/[a-z0-9\/_x]+\.jpg/g);
    console.log(backup ? backup[0] : "Not found at all");
  }
}
run();

