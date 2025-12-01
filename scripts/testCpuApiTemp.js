const http = require("http");

async function testCpuApi() {
  console.log("Testing /api/parts/cpus endpoint...\n");

  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/api/parts/cpus",
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const cpus = JSON.parse(data);

          console.log("API Response Received");
          console.log("Total CPUs returned:", cpus.length);

          console.log("\nAll CPUs in API response:");
          cpus.forEach((cpu, i) => {
            const historyLength = cpu.priceHistory?.length || 0;
            console.log(`  ${i + 1}. ${cpu.name || cpu.title} - Price: $${cpu.currentPrice} - History: ${historyLength} points`);
          });

          const target = cpus.find(cpu => (cpu.name || cpu.title || "").includes("13700F"));

          if (target) {
            console.log("\nFOUND i7-13700F:");
            console.log("Name:", target.name || target.title);
            console.log("Price:", target.currentPrice);
            console.log("Has priceHistory:", \!\!target.priceHistory);
            console.log("Price History Length:", target.priceHistory?.length || 0);
          } else {
            console.log("\ni7-13700F NOT FOUND in API response");
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error:", error.message);
      reject(error);
    });

    req.end();
  });
}

testCpuApi()
  .then(() => console.log("\nTest complete"))
  .catch((error) => console.error("\nTest failed:", error));
