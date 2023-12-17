async function main() {
  const ss2Data = require("./ss2.json");

  console.log({ ss2Data });
}

main()
  .then(() => {
    console.log("done");
  })
  .catch((e) => {
    console.error(e);
  });

export {};
