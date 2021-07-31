const fs = require('fs');

const readMyTextFile = async (dir, type) => {
  // console.log(dir);
  let contents = await (() =>
    new Promise((resolve, reject) => {
      fs.readFile(
        dir,
        {
          encoding: 'utf-8'
        },
        (err, data) => {
          if (err) return reject(err);
          resolve(data);
        }
      );
    }))();

  let rows = contents.split('\n');
  let headings =["ISRC", "Artists", "Title", "Result"]
  let aliasHeadings = `${rows[0]}`.split('\t')
  aliasHeadings[2] = aliasHeadings[2].replace(/(\r)/gm, '');

  if (aliasHeadings[0].toLowerCase() !== 'isrc' && aliasHeadings[1].toLowerCase() !== 'artists' && aliasHeadings[2].toLowerCase() !== 'title'){
    return
  }

  if (type == 'admin') {
    headings.push(...['Mismatch', 'Log Reason']);
  }

  rows.splice(0, 1);
  let newRows = []
  rows.forEach(item => {
    // if (item.split('\t').length === 3 && item.split('\t')[0].length && item.split('\t')[1].length && item.split('\t')[2].length) {
    //   console.log('item', item)
    //   newRows.push(item)
    // }
    const [isrc, artist, title] = item.split('\t');
    if (isrc && artist && title) {
      newRows.push(item);
    }
  })
  // console.log('newRows', newRows);
  return {rows: newRows, headings};
};

module.exports = {readMyTextFile};
