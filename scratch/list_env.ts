console.log("Environment Keys:");
Object.keys(process.env).sort().forEach(key => {
  console.log(`- ${key}`);
});
