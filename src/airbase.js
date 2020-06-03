exports.fetchAll = async (select) => {
  let allRecords = [];

  await select.eachPage((records, fetchNextPage) => {
    allRecords = [...allRecords, ...records];
    fetchNextPage();
  });

  return allRecords;
};
