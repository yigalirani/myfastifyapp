const { exec } = await import('node:child_process');

exec('npx eslint .  --color',(error, stdout, stderr) => {
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});