module.exports = async () => {
  await Promise.all(['students', 'mentors'].map((filename) => { console.log(`|- ${filename}`); require(`./${filename}`)(); }));
}
